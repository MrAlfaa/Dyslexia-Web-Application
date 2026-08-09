# LexiLand Final Speech Support Model Training Guide

This folder supports research-stage training of a session-level oral-reading and
pronunciation support classifier. It estimates a support class for educational
follow-up or dyslexia-risk screening; it does **not** directly diagnose dyslexia
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
