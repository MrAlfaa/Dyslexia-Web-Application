"""
LexiLand Final Speech-Reading Support Model Training Script

Use in Google Colab after exporting session_features.csv from the LexiLand backend.
This trains a research-stage final speech component classifier only from locally
collected and labelled Grade 2-5 data.
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder


LABEL_COLUMN = "speech_support_label"
PARTICIPANT_COLUMN = "participant_code"
SESSION_ID_COLUMN = "session_id"
OUTPUT_DIR = Path("final_speech_support_model_artifacts")
ARTIFACT_VERSION = "final_speech_support_v1"
VALID_LABELS = {"low_support", "medium_support", "high_support"}
MIN_LABELLED_ROWS = 30
REQUIRED_COLUMNS = {SESSION_ID_COLUMN, PARTICIPANT_COLUMN, LABEL_COLUMN}


def _is_dummy_value(value):
    if pd.isna(value):
        return False
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y"}
    return bool(value)


def validate_training_data(data: pd.DataFrame) -> pd.DataFrame:
    """Validate and normalize session-level data before model training."""
    if not isinstance(data, pd.DataFrame):
        raise ValueError("Training data must be provided as a pandas DataFrame.")

    missing_columns = sorted(REQUIRED_COLUMNS.difference(data.columns))
    if missing_columns:
        raise ValueError(f"Missing required training columns: {', '.join(missing_columns)}")

    validated = data.copy()
    if "is_dummy_data" in validated.columns and validated["is_dummy_data"].map(_is_dummy_value).any():
        raise ValueError("Training data must not include dummy rows.")

    for column in (SESSION_ID_COLUMN, PARTICIPANT_COLUMN):
        values = validated[column].astype("string").str.strip()
        if values.isna().any() or values.eq("").any():
            raise ValueError(f"{column} must be present for every training row.")
        validated[column] = values

    if validated[SESSION_ID_COLUMN].duplicated().any():
        raise ValueError("Duplicate session_id values are not allowed in training data.")

    labels = validated[LABEL_COLUMN].astype("string").str.strip()
    if labels.isna().any() or labels.eq("").any():
        raise ValueError("speech_support_label must be present for every training row.")
    invalid_labels = sorted(set(labels.dropna()).difference(VALID_LABELS))
    if invalid_labels:
        raise ValueError(
            "Unsupported speech_support_label values: " + ", ".join(invalid_labels)
        )
    validated[LABEL_COLUMN] = labels

    if len(validated) < MIN_LABELLED_ROWS:
        raise ValueError(
            f"Need at least {MIN_LABELLED_ROWS} labelled rows before training. Found {len(validated)}."
        )
    if validated[PARTICIPANT_COLUMN].nunique() < 2:
        raise ValueError("Training requires at least two participant_code values.")
    if validated[LABEL_COLUMN].nunique() < 2:
        raise ValueError("Training requires at least two support classes.")
    return validated


def split_by_participant(data, test_size=0.25, random_state=42):
    """Create a participant-disjoint train/test split for repeated sessions."""
    validated = validate_training_data(data)
    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_indices, test_indices = next(
        splitter.split(
            validated,
            validated[LABEL_COLUMN],
            validated[PARTICIPANT_COLUMN],
        )
    )
    train_data = validated.iloc[train_indices].copy()
    test_data = validated.iloc[test_indices].copy()
    overlap = set(train_data[PARTICIPANT_COLUMN]).intersection(test_data[PARTICIPANT_COLUMN])
    if overlap:
        raise AssertionError(f"Participant overlap detected in grouped split: {sorted(overlap)}")
    return train_data, test_data


def load_session_features(path="session_features.csv"):
    data = pd.read_csv(path)
    return validate_training_data(data)


def build_feature_table(data):
    excluded = {
        "session_id",
        "student_id",
        "student_username",
        "status",
        "created_at",
        "completed_at",
        LABEL_COLUMN,
        PARTICIPANT_COLUMN,
        "is_dummy_data",
        "dataset_ready",
    }
    numeric_columns = []
    for column in data.columns:
        if column in excluded:
            continue
        converted = pd.to_numeric(data[column], errors="coerce")
        if converted.notna().any():
            data[column] = converted.fillna(0)
            numeric_columns.append(column)
    if not numeric_columns:
        raise ValueError("No numeric feature columns found.")
    return data[numeric_columns].fillna(0), numeric_columns


def train_and_select_model(x_train, y_train, x_test, y_test):
    candidates = {
        "random_forest": RandomForestClassifier(
            n_estimators=300,
            random_state=42,
            class_weight="balanced",
            max_depth=None,
        ),
        "gradient_boosting": GradientBoostingClassifier(random_state=42),
    }

    results = {}
    for name, model in candidates.items():
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)
        results[name] = {
            "model": model,
            "accuracy": accuracy_score(y_test, predictions),
            "balanced_accuracy": balanced_accuracy_score(y_test, predictions),
            "macro_f1": f1_score(y_test, predictions, average="macro", zero_division=0),
            "classification_report": classification_report(
                y_test,
                predictions,
                output_dict=True,
                zero_division=0,
            ),
            "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
            "predictions": predictions,
        }

    best_name = max(
        results,
        key=lambda item: (
            results[item]["macro_f1"],
            results[item]["balanced_accuracy"],
            results[item]["accuracy"],
        ),
    )
    return best_name, results[best_name], results


def get_feature_importance(model, feature_columns):
    importances = getattr(model, "feature_importances_", None)
    if importances is None:
        return []
    pairs = sorted(zip(feature_columns, importances), key=lambda item: item[1], reverse=True)
    return [{"feature": feature, "importance": float(value)} for feature, value in pairs]


def main():
    data = load_session_features()
    x, feature_columns = build_feature_table(data)
    encoder = LabelEncoder()
    encoder.fit(data[LABEL_COLUMN])
    train_data, test_data = split_by_participant(data)
    x_train = x.loc[train_data.index]
    x_test = x.loc[test_data.index]
    y_train = encoder.transform(train_data[LABEL_COLUMN])
    y_test = encoder.transform(test_data[LABEL_COLUMN])

    best_name, best_result, all_results = train_and_select_model(x_train, y_train, x_test, y_test)
    best_model = best_result["model"]
    predictions = best_result["predictions"]

    labels = encoder.inverse_transform(np.arange(len(encoder.classes_))).tolist()
    report = classification_report(
        y_test,
        predictions,
        labels=np.arange(len(labels)),
        target_names=labels,
        output_dict=True,
        zero_division=0,
    )
    matrix = confusion_matrix(y_test, predictions, labels=np.arange(len(labels))).tolist()

    OUTPUT_DIR.mkdir(exist_ok=True)
    joblib.dump(best_model, OUTPUT_DIR / "final_speech_support_classifier.joblib")
    joblib.dump(encoder, OUTPUT_DIR / "final_speech_label_encoder.joblib")
    (OUTPUT_DIR / "final_speech_feature_columns.json").write_text(
      json.dumps(feature_columns, indent=2),
      encoding="utf-8",
    )
    summary = {
        "model_name": "final_speech_support_classifier",
        "model_version": ARTIFACT_VERSION,
        "selected_model": best_name,
        "rows_used": int(len(data)),
        "label_distribution": data[LABEL_COLUMN].value_counts().to_dict(),
        "labels": labels,
        "accuracy": float(best_result["accuracy"]),
        "balanced_accuracy": float(best_result["balanced_accuracy"]),
        "macro_f1": float(best_result["macro_f1"]),
        "candidate_metrics": {
            name: {
                "accuracy": float(result["accuracy"]),
                "balanced_accuracy": float(result["balanced_accuracy"]),
                "macro_f1": float(result["macro_f1"]),
            }
            for name, result in all_results.items()
        },
        "classification_report": report,
        "confusion_matrix": matrix,
        "feature_columns": feature_columns,
        "feature_importance": get_feature_importance(best_model, feature_columns),
        "note": "Speech component support classifier; not a standalone clinical diagnosis model.",
    }
    (OUTPUT_DIR / "final_speech_training_summary.json").write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )

    print("Training complete.")
    print(json.dumps({
        "selected_model": best_name,
        "accuracy": summary["accuracy"],
        "balanced_accuracy": summary["balanced_accuracy"],
        "macro_f1": summary["macro_f1"],
        "rows_used": summary["rows_used"],
        "output_dir": str(OUTPUT_DIR),
    }, indent=2))


if __name__ == "__main__":
    main()
