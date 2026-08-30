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
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import (
    ExtraTreesClassifier,
    GradientBoostingClassifier,
    HistGradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    log_loss,
)
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.utils.class_weight import compute_sample_weight


LABEL_COLUMN = "speech_support_label"
PARTICIPANT_COLUMN = "participant_code"
SESSION_ID_COLUMN = "session_id"
OUTPUT_DIR = Path("final_speech_support_model_artifacts")
CANDIDATE_OUTPUT_DIR = Path("final_speech_support_candidate_artifacts")
ARTIFACT_VERSION = "final_speech_support_v1"
VALID_LABELS = {"low_support", "medium_support", "high_support"}
MIN_LABELLED_ROWS = 30
MIN_CLASS_RECALL = 0.40
MAX_EXPECTED_CALIBRATION_ERROR = 0.15
REQUIRED_COLUMNS = {SESSION_ID_COLUMN, PARTICIPANT_COLUMN, LABEL_COLUMN}
APPROVED_TRAINING_INPUT_COLUMNS = {
    "activity_id",
    "common_phoneme_error_pattern",
    "completed_at",
    "consonant_cluster_error_rate",
    "created_at",
    "dataset_ready",
    "final_sound_error_rate",
    "grade",
    "initial_sound_error_rate",
    "invalid_attempts",
    "is_dummy_data",
    "label_confidence",
    "labelled_attempt_count",
    LABEL_COLUMN,
    "mean_audio_quality_score",
    "mean_character_error_rate",
    "mean_partial_match_score",
    "mean_pause_count",
    "mean_phoneme_error_rate",
    "mean_pronunciation_model_score",
    "mean_speech_duration_sec",
    "mean_word_error_rate",
    "mode",
    PARTICIPANT_COLUMN,
    "pseudoword_accuracy",
    "retry_rate",
    SESSION_ID_COLUMN,
    "sentence_accuracy",
    "status",
    "total_attempts",
    "valid_attempts",
    "vowel_mismatch_rate",
    "word_accuracy",
}
PROHIBITED_DIRECT_IDENTIFIER_COLUMNS = {
    "address",
    "child_phone_number",
    "email",
    "full_name",
    "guardian_email",
    "guardian_name",
    "guardian_phone",
    "name",
    "parent_email",
    "parent_name",
    "parent_phone",
    "phone",
    "student_id",
    "student_email",
    "student_name",
    "student_username",
}
NON_FEATURE_COLUMNS = {
    "completed_at",
    "created_at",
    "dataset_ready",
    "is_dummy_data",
    "label_confidence",
    LABEL_COLUMN,
    PARTICIPANT_COLUMN,
    SESSION_ID_COLUMN,
    "status",
}.union(PROHIBITED_DIRECT_IDENTIFIER_COLUMNS)
DEIDENTIFICATION_PREPARATION_MESSAGE = (
    "The de-identified training input must be prepared with participant_code "
    "and prohibited identifier columns removed."
)


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
    prohibited_columns = sorted(
        column
        for column in data.columns
        if str(column).strip().lower() in PROHIBITED_DIRECT_IDENTIFIER_COLUMNS
    )
    unknown_columns = sorted(
        str(column)
        for column in data.columns
        if column not in APPROVED_TRAINING_INPUT_COLUMNS
    )
    if missing_columns or prohibited_columns or unknown_columns:
        issues = []
        if missing_columns:
            issues.append(f"missing required columns: {', '.join(missing_columns)}")
        if prohibited_columns:
            issues.append(
                "prohibited direct-identifier columns: " + ", ".join(prohibited_columns)
            )
        if unknown_columns:
            issues.append(
                "unknown columns not allowed by the session training contract: "
                + ", ".join(unknown_columns)
            )
        raise ValueError(
            "Training data cannot be used because it contains "
            + "; ".join(issues)
            + ". "
            + DEIDENTIFICATION_PREPARATION_MESSAGE
        )

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

    expected_labels = set(validated[LABEL_COLUMN])
    missing_from_train = sorted(expected_labels.difference(train_data[LABEL_COLUMN]))
    missing_from_test = sorted(expected_labels.difference(test_data[LABEL_COLUMN]))
    coverage_errors = []
    if missing_from_train:
        coverage_errors.append(
            "Grouped split training partition is missing support classes: "
            + ", ".join(missing_from_train)
        )
    if missing_from_test:
        coverage_errors.append(
            "Grouped split evaluation partition is missing support classes: "
            + ", ".join(missing_from_test)
        )
    if coverage_errors:
        raise ValueError("; ".join(coverage_errors))
    return train_data, test_data


def load_session_features(path="session_features.csv"):
    data = pd.read_csv(path)
    return validate_training_data(data)


def build_feature_table(data):
    validated = validate_training_data(data)
    numeric_columns = []
    for column in validated.columns:
        if column in NON_FEATURE_COLUMNS:
            continue
        converted = pd.to_numeric(validated[column], errors="coerce")
        if converted.notna().any():
            validated[column] = converted.fillna(0)
            numeric_columns.append(column)
    if not numeric_columns:
        raise ValueError("No numeric feature columns found.")
    return validated[numeric_columns].fillna(0), numeric_columns


def expected_calibration_error(y_true, probabilities, bins=10):
    """Compute top-label ECE for a compact multiclass calibration check."""
    probabilities = np.asarray(probabilities)
    confidence = probabilities.max(axis=1)
    predictions = probabilities.argmax(axis=1)
    correctness = (predictions == np.asarray(y_true)).astype(float)
    edges = np.linspace(0, 1, bins + 1)
    ece = 0.0
    for lower, upper in zip(edges[:-1], edges[1:]):
        selected = (confidence > lower) & (confidence <= upper)
        if selected.any():
            ece += selected.mean() * abs(correctness[selected].mean() - confidence[selected].mean())
    return float(ece)


def train_and_select_model(x_train, y_train, x_test, y_test, groups_train=None):
    sample_weight = compute_sample_weight(class_weight="balanced", y=y_train)
    groups_train = np.asarray(groups_train) if groups_train is not None else np.arange(len(y_train))
    unique_groups = np.unique(groups_train)
    if len(unique_groups) < 2:
        raise ValueError("Calibrated candidate training requires at least two training participant groups.")
    calibration_splits = list(
        GroupKFold(n_splits=min(3, len(unique_groups))).split(x_train, y_train, groups_train)
    )
    for fold_no, (fit_indices, calibration_indices) in enumerate(calibration_splits, start=1):
        if len(np.unique(y_train[fit_indices])) != len(np.unique(y_train)):
            raise ValueError(f"Calibration fold {fold_no} training partition is missing a support class.")
        if len(np.unique(y_train[calibration_indices])) != len(np.unique(y_train)):
            raise ValueError(f"Calibration fold {fold_no} validation partition is missing a support class.")
    calibrated_svm = CalibratedClassifierCV(
        estimator=make_pipeline(
            StandardScaler(),
            SVC(C=2.0, kernel="rbf", class_weight="balanced"),
        ),
        method="sigmoid",
        cv=calibration_splits,
    )
    candidates = {
        "random_forest_baseline": RandomForestClassifier(
            n_estimators=300,
            random_state=42,
            class_weight="balanced",
        ),
        "tuned_random_forest": RandomForestClassifier(
            n_estimators=500,
            random_state=42,
            class_weight="balanced",
            min_samples_leaf=2,
            max_features="sqrt",
        ),
        "extra_trees": ExtraTreesClassifier(
            n_estimators=500,
            random_state=42,
            class_weight="balanced",
            min_samples_leaf=2,
            max_features="sqrt",
        ),
        "hist_gradient_boosting": HistGradientBoostingClassifier(
            learning_rate=0.06,
            max_iter=300,
            max_leaf_nodes=15,
            l2_regularization=0.2,
            random_state=42,
        ),
        "gradient_boosting": GradientBoostingClassifier(random_state=42),
        "calibrated_svm": calibrated_svm,
    }

    results = {}
    for name, model in candidates.items():
        if name in {"random_forest_baseline", "tuned_random_forest", "extra_trees", "hist_gradient_boosting", "gradient_boosting"}:
            model.fit(x_train, y_train, sample_weight=sample_weight)
        else:
            model.fit(x_train, y_train)
        predictions = model.predict(x_test)
        probabilities = model.predict_proba(x_test)
        report = classification_report(
            y_test,
            predictions,
            output_dict=True,
            zero_division=0,
        )
        class_recalls = [
            values["recall"]
            for key, values in report.items()
            if key.isdigit() and isinstance(values, dict)
        ]
        results[name] = {
            "model": model,
            "accuracy": accuracy_score(y_test, predictions),
            "balanced_accuracy": balanced_accuracy_score(y_test, predictions),
            "macro_f1": f1_score(y_test, predictions, average="macro", zero_division=0),
            "classification_report": report,
            "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
            "log_loss": log_loss(y_test, probabilities, labels=np.arange(probabilities.shape[1])),
            "calibration_error": expected_calibration_error(y_test, probabilities),
            "minimum_class_recall": min(class_recalls) if class_recalls else 0.0,
            "predictions": predictions,
        }

    best_name = max(
        results,
        key=lambda item: (
            results[item]["macro_f1"],
            results[item]["balanced_accuracy"],
            -results[item]["calibration_error"],
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
    encoder = LabelEncoder()
    encoder.fit(data[LABEL_COLUMN])
    train_data, test_data = split_by_participant(data)
    x, feature_columns = build_feature_table(data)
    x_train = x.loc[train_data.index]
    x_test = x.loc[test_data.index]
    y_train = encoder.transform(train_data[LABEL_COLUMN])
    y_test = encoder.transform(test_data[LABEL_COLUMN])

    best_name, best_result, all_results = train_and_select_model(
        x_train,
        y_train,
        x_test,
        y_test,
        groups_train=train_data[PARTICIPANT_COLUMN].to_numpy(),
    )
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

    baseline_result = all_results["random_forest_baseline"]
    deployment_gate = {
        "speaker_disjoint_split": True,
        "macro_f1_above_same_split_baseline": bool(
            best_result["macro_f1"] >= baseline_result["macro_f1"] + 0.01
        ),
        "minimum_class_recall_passed": bool(best_result["minimum_class_recall"] >= MIN_CLASS_RECALL),
        "calibration_improved_and_acceptable": bool(
            best_result["calibration_error"] <= baseline_result["calibration_error"]
            and best_result["calibration_error"] <= MAX_EXPECTED_CALIBRATION_ERROR
        ),
    }
    deployment_gate["passed"] = all(deployment_gate.values())

    artifact_output_dir = OUTPUT_DIR if deployment_gate["passed"] else CANDIDATE_OUTPUT_DIR
    artifact_output_dir.mkdir(exist_ok=True)
    joblib.dump(best_model, artifact_output_dir / "final_speech_support_classifier.joblib")
    joblib.dump(encoder, artifact_output_dir / "final_speech_label_encoder.joblib")
    (artifact_output_dir / "final_speech_feature_columns.json").write_text(
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
        "minimum_class_recall": float(best_result["minimum_class_recall"]),
        "log_loss": float(best_result["log_loss"]),
        "expected_calibration_error": float(best_result["calibration_error"]),
        "participant_disjoint_split_verified": True,
        "deployment_gate": deployment_gate,
        "same_split_baseline": {
            "macro_f1": float(baseline_result["macro_f1"]),
            "balanced_accuracy": float(baseline_result["balanced_accuracy"]),
            "minimum_class_recall": float(baseline_result["minimum_class_recall"]),
            "expected_calibration_error": float(baseline_result["calibration_error"]),
        },
        "provisional_current_artifact_note": "The reported 0.5903 macro F1 used different proxy labels and is not a valid deployment comparator for local expert-labelled data.",
        "candidate_metrics": {
            name: {
                "accuracy": float(result["accuracy"]),
                "balanced_accuracy": float(result["balanced_accuracy"]),
                "macro_f1": float(result["macro_f1"]),
                "minimum_class_recall": float(result["minimum_class_recall"]),
                "log_loss": float(result["log_loss"]),
                "expected_calibration_error": float(result["calibration_error"]),
            }
            for name, result in all_results.items()
        },
        "classification_report": report,
        "confusion_matrix": matrix,
        "feature_columns": feature_columns,
        "feature_importance": get_feature_importance(best_model, feature_columns),
        "note": "Speech component support classifier; not a standalone clinical diagnosis model.",
    }
    (artifact_output_dir / "final_speech_training_summary.json").write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )

    print("Training complete.")
    print(json.dumps({
        "selected_model": best_name,
        "accuracy": summary["accuracy"],
        "balanced_accuracy": summary["balanced_accuracy"],
        "macro_f1": summary["macro_f1"],
        "deployment_gate_passed": deployment_gate["passed"],
        "rows_used": summary["rows_used"],
        "output_dir": str(artifact_output_dir),
    }, indent=2))


if __name__ == "__main__":
    main()
