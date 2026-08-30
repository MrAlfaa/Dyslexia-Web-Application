# LexiLand Final Speech Support Model Training Guide

This folder supports research-stage training of a session-level oral-reading and
pronunciation support classifier. It estimates a speech-reading support class for educational
follow-up and contributes one bounded signal to wider screening; it does **not** diagnose dyslexia
or replace professional assessment.

## Package Index

- [Detailed collection and training guide](DETAILED_DATA_COLLECTION_AND_TRAINING_GUIDE.md): governance, repeated-session protocol, workbook workflow, de-identification, Colab commands, and interpretation limits.
- [Final workbook](LexiLand_Final_Speech_Model_Data_Collection_Template.xlsx): real-entry sheets, dummy examples, controlled lists, feature dictionary, and quality checks.
- [Attempt dummy CSV](LexiLand_Speech_Attempt_Collection_Dummy_Data.csv): reviewed attempt examples only; all rows have `is_dummy_data=1`.
- [Session dummy CSV](LexiLand_Speech_Session_Training_Dummy_Data.csv): reviewed schema examples only; all rows have `is_dummy_data=1`.
- [Colab trainer](train_final_speech_support_model_colab.py): validates the de-identified input, applies a participant-group split, and writes artifacts.
- [Trainer contract tests](test_training_pipeline.py): validates schema, dummy-data rejection, labels, and participant isolation.

## Backend Exports and Required Preparation

The super-admin backend routes are:

```text
GET /api/speech-processing/admin/export/dataset/attempt-features.csv
GET /api/speech-processing/admin/export/dataset/session-features.csv
GET /api/speech-processing/admin/export/dataset/data-collection-template.csv
```

`attempt-features.csv` is for evidence/review. Start session-level preparation
from `session-features.csv`, but **do not upload it directly**: it contains
`student_id` and `student_username`, and it lacks `participant_code` and
`is_dummy_data`.

Before training, a data steward must de-identify the session export, add a
stable anonymous `participant_code`, remove prohibited direct-identifier
columns, set `is_dummy_data=0`, and map the result exactly to the workbook's
`Session Training Data` schema. The complete preparation cell is in the
[detailed guide](DETAILED_DATA_COLLECTION_AND_TRAINING_GUIDE.md#backend-export-to-session-training-data).

Train only `low_support`, `medium_support`, and `high_support`.
`needs_review` must be adjudicated or excluded. Keep every session from one
participant in one split; never use random row splitting for repeated sessions.

## Colab Run

Upload the prepared `Session_Training_Data.csv`, trainer, and test file to a
new Colab notebook, then run:

```python
!pip install -q pandas numpy scikit-learn joblib
!python -m unittest test_training_pipeline.py -v
!cp Session_Training_Data.csv session_features.csv
!python train_final_speech_support_model_colab.py
```

Review macro F1, balanced accuracy, per-class recall, and the confusion matrix;
accuracy alone is insufficient for uneven support classes. The script rejects
dummy rows, direct identifiers, unknown columns, missing participant codes, and
participant overlap.

The trainer compares a baseline Random Forest with tuned Random Forest, Extra
Trees, HistGradientBoosting, Gradient Boosting, and a group-calibrated SVM. Its
deployment gate requires all of the following on the same participant-disjoint
held-out split:

- macro F1 at least 0.01 above the baseline candidate;
- every class recall at least 0.40;
- expected calibration error no worse than the baseline and no more than 0.15.

If the gate fails, artifacts are written to
`final_speech_support_candidate_artifacts/`, not the deployment folder. Do not
rename or copy those candidate files into the backend runtime folder.

## Current Prototype Audit

The checked-in pronunciation prototype reports accuracy `0.678125` and macro
F1 `0.590336`. Those values remain provisional because this repository does not
contain the original source feature rows, participant/speaker identifiers,
confusion matrix, per-class metrics, or calibration evidence needed to
reproduce the split. The backend therefore exposes it as
`prototype_v1_unverified_split`, and longitudinal trend scoring ignores its raw
probabilities unless `PRONUNCIATION_MODEL_CALIBRATED=true` is set after a real
calibration audit.

Do not compare the prototype's `0.590336` macro F1 directly with a model trained
on local expert labels: the label sources differ. Candidate selection in this
script uses a same-data, same-split baseline instead.

## Expected Artifacts

```text
final_speech_support_classifier.joblib
final_speech_label_encoder.joblib
final_speech_feature_columns.json
final_speech_training_summary.json
```

After review, place them under:

```text
ML_Model/final_speech_support_model_artifacts/
```

Passing the trainer's technical minimum of 30 labelled sessions, two
participants, and two labels is not evidence of clinical validity, fairness, or
deployment readiness. Follow the detailed guide's pilot and stronger-evidence
requirements before reporting or using results.
