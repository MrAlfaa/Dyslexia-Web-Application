#!/usr/bin/env python
"""Run LexiLand pronunciation support prototype prediction.

Stdout is reserved for one JSON object so the Node.js bridge can parse it.
Diagnostic details should go to stderr only.
"""

import argparse
import json
import os
import sys
from pathlib import Path


MODEL_VERSION = "pronunciation_support_v1"
MODEL_NAME = "pronunciation_support_classifier"


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False))


def fail(message):
    emit({"status": "failed", "error": str(message)})
    return 1


def resolve_artifact_dir(model_dir):
    root = Path(model_dir).resolve()
    candidates = [root, root / "model_artifacts"]
    required = [
        "pronunciation_support_classifier.joblib",
        "support_label_encoder.joblib",
        "feature_columns.json",
    ]
    for candidate in candidates:
        if all((candidate / name).exists() for name in required):
            return candidate
    raise FileNotFoundError(
        "Model artifacts not found. Expected pronunciation_support_classifier.joblib, "
        "support_label_encoder.joblib, and feature_columns.json in the model directory "
        "or model_artifacts subdirectory."
    )


def safe_float(value, default=0.0):
    try:
        if value is None:
            return default
        number = float(value)
        if number != number:
            return default
        return number
    except Exception:
        return default


def stats(values):
    import numpy as np

    if values is None or len(values) == 0:
        return 0.0, 0.0
    return float(np.mean(values)), float(np.std(values))


def extract_audio_features(audio_path):
    import librosa
    import numpy as np
    import soundfile as sf

    info = sf.info(str(audio_path))
    y, sr = librosa.load(str(audio_path), sr=16000, mono=True)
    if y.size == 0:
        raise ValueError("Audio file contains no samples")

    duration_sec = float(librosa.get_duration(y=y, sr=sr))
    rms = librosa.feature.rms(y=y)[0]
    zcr = librosa.feature.zero_crossing_rate(y=y)[0]
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
    spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)

    intervals = librosa.effects.split(y, top_db=35)
    speech_duration_sec = float(
        sum((end - start) / sr for start, end in intervals)
    )
    silence_duration_sec = max(duration_sec - speech_duration_sec, 0.0)
    silence_ratio = silence_duration_sec / duration_sec if duration_sec else 0.0
    gaps = []
    for index in range(1, len(intervals)):
        gap = (intervals[index][0] - intervals[index - 1][1]) / sr
        if gap >= 0.25:
            gaps.append(gap)

    rms_mean, rms_std = stats(rms)
    zcr_mean, zcr_std = stats(zcr)
    centroid_mean, centroid_std = stats(spectral_centroid)
    bandwidth_mean, bandwidth_std = stats(spectral_bandwidth)
    rolloff_mean, rolloff_std = stats(spectral_rolloff)

    features = {
        "duration_sec": duration_sec,
        "rms_mean": rms_mean,
        "rms_std": rms_std,
        "zcr_mean": zcr_mean,
        "zcr_std": zcr_std,
        "spectral_centroid_mean": centroid_mean,
        "spectral_centroid_std": centroid_std,
        "spectral_bandwidth_mean": bandwidth_mean,
        "spectral_bandwidth_std": bandwidth_std,
        "spectral_rolloff_mean": rolloff_mean,
        "spectral_rolloff_std": rolloff_std,
        "speech_duration_sec": speech_duration_sec,
        "silence_duration_sec": silence_duration_sec,
        "silence_ratio": silence_ratio,
        "speech_segment_count": int(len(intervals)),
        "pause_count": int(len(gaps)),
        "clipping_ratio": float(np.mean(np.abs(y) >= 0.98)),
        "peak_amplitude": float(np.max(np.abs(y))),
    }

    for idx in range(13):
        mean_value, std_value = stats(mfcc[idx])
        column_no = idx + 1
        features[f"mfcc_{column_no}_mean"] = mean_value
        features[f"mfcc_{column_no}_std"] = std_value

    # Keep useful debugging context in the summary only; the model columns still
    # come strictly from feature_columns.json.
    features["_sample_rate"] = int(sr)
    features["_source_sample_rate"] = int(info.samplerate or sr)
    features["_channels"] = int(info.channels or 1)
    return features


def decode_label(label_encoder, value):
    try:
      if isinstance(value, str):
          return value
      return str(label_encoder.inverse_transform([value])[0])
    except Exception:
      return str(value)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model-dir", required=True)
    args = parser.parse_args()

    try:
        import joblib
        import pandas as pd
    except Exception as exc:
        return fail(f"Python dependency missing: {exc}")

    try:
        audio_path = Path(args.audio).resolve()
        if not audio_path.exists():
            return fail(f"Audio file not found: {audio_path}")

        artifact_dir = resolve_artifact_dir(args.model_dir)
        classifier = joblib.load(artifact_dir / "pronunciation_support_classifier.joblib")
        label_encoder = joblib.load(artifact_dir / "support_label_encoder.joblib")
        with open(artifact_dir / "feature_columns.json", "r", encoding="utf-8") as handle:
            feature_columns = json.load(handle)

        regressor = None
        regressor_path = artifact_dir / "pronunciation_score_regressor.joblib"
        if regressor_path.exists():
            regressor = joblib.load(regressor_path)

        extracted = extract_audio_features(audio_path)
        row = {column: safe_float(extracted.get(column), 0.0) for column in feature_columns}
        frame = pd.DataFrame([row], columns=feature_columns)

        raw_prediction = classifier.predict(frame)[0]
        prediction = decode_label(label_encoder, raw_prediction)

        probabilities = {}
        if hasattr(classifier, "predict_proba"):
            proba = classifier.predict_proba(frame)[0]
            classes = getattr(classifier, "classes_", [])
            for raw_class, value in zip(classes, proba):
                probabilities[decode_label(label_encoder, raw_class)] = float(value)

        predicted_score = None
        if regressor is not None:
            predicted_score = float(regressor.predict(frame)[0])

        emit({
            "status": "success",
            "modelName": MODEL_NAME,
            "modelVersion": MODEL_VERSION,
            "prediction": prediction,
            "probabilities": probabilities,
            "predictedPronunciationScore": predicted_score,
            "featuresUsedCount": len(feature_columns),
            "audioFeaturesSummary": {
                "duration_sec": safe_float(extracted.get("duration_sec")),
                "speech_duration_sec": safe_float(extracted.get("speech_duration_sec")),
                "silence_ratio": safe_float(extracted.get("silence_ratio")),
                "pause_count": int(safe_float(extracted.get("pause_count"), 0)),
                "rms_mean": safe_float(extracted.get("rms_mean")),
            },
        })
        return 0
    except Exception as exc:
        return fail(exc)


if __name__ == "__main__":
    sys.exit(main())
