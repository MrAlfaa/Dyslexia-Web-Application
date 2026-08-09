# LexiLand Speech-Reading Support Data Collection and Training Guide

## Purpose and Scope

This guide is the reproducible workflow for LexiLand's final session-level
speech-reading support classifier. It is for researchers, teachers, expert
reviewers, supervisors, and the model-training operator.

The model uses oral-reading and pronunciation-derived signals to estimate
`low_support`, `medium_support`, or `high_support`. It may help prioritise
educational follow-up or dyslexia-risk screening. It does **not** directly diagnose dyslexia,
replace qualified professional assessment, or establish a clinical condition.
Support labels are explicitly not diagnostic truth; they are expert-assigned
educational categories.

Attempt records preserve the evidence used in review. The trainer uses one
de-identified row per session in the `Session Training Data` schema.

## Package Map

| Resource | Use |
| --- | --- |
| [Final workbook](LexiLand_Final_Speech_Model_Data_Collection_Template.xlsx) | Controlled collection, review, quality control, and session-row preparation. |
| [Attempt dummy CSV](LexiLand_Speech_Attempt_Collection_Dummy_Data.csv) | Illustrative evidence only; every row has `is_dummy_data=1`. |
| [Session dummy CSV](LexiLand_Speech_Session_Training_Dummy_Data.csv) | Illustrative session schema only; never train or report performance from it. |
| [Colab trainer](train_final_speech_support_model_colab.py) | Validates session data, creates a participant-disjoint split, compares models, and writes artifacts. |
| [Trainer tests](test_training_pipeline.py) | Tests the schema, dummy-data rejection, labels, and participant isolation. |

Super-admin backend routes:

```text
GET /api/speech-processing/admin/export/dataset/attempt-features.csv
GET /api/speech-processing/admin/export/dataset/session-features.csv
GET /api/speech-processing/admin/export/dataset/data-collection-template.csv
```

The attempt export is review evidence. The session export starts training-data
preparation, but it is **not upload-ready**: it contains `student_id` and
`student_username`, and lacks `participant_code` and `is_dummy_data`.

## Sinhala Quick Start

1. `participant_code` පමණක් භාවිතා කර, අනුමතිය ලැබුණු පසු sessions සහ attempts එකතු කරන්න. නම, email, phone, username, student ID වැනි හඳුනාගත හැකි තොරතුරු ML CSV එකට දාන්න එපා.
2. එක් දරුවෙකුට identification සහ improvement sessions කිහිපයක් ලබාගෙන, සියලු attempts සහ invalid-audio records තබා ගන්න.
3. Teacher/expert review එකෙන් `low_support`, `medium_support`, `high_support`, හෝ `needs_review` යොදන්න. `needs_review` training සඳහා භාවිතා නොකරන්න.
4. Backend `session-features.csv` export එක සෘජුව Colab වෙත upload නොකරන්න. IDs ඉවත් කර `participant_code` එකතු කර, `Session Training Data` schema එකට map කර `is_dummy_data=0` දාන්න.
5. Training split එක `participant_code` අනුවය. එකම දරුවාගේ sessions train සහ test දෙකටම යා නොහැක.

## Governance, Ethics, and Privacy

### Consent and approval

- Obtain required institutional ethics approval and parent/guardian consent
  before recording, importing, or reviewing audio. Explain purpose, voluntary
  participation, withdrawal, retention, audio handling, and access in
  appropriate language.
- In the workbook record only `consent_confirmed=yes` and `consent_date`.
  Keep consent forms and the identity-to-code register outside the ML workspace
  in an access-controlled research record.
- On withdrawal, mark the participant inactive/excluded; locate their audio,
  attempts, sessions, labels, prepared rows, and affected training run through
  the restricted linkage key; then remove or exclude records as the approval
  requires and retrain before reusing results.

### De-identification and roles

- Create a stable, meaningless anonymous `participant_code` before
  collection. Reuse it for every session from the same participant, but never
  derive it from a name, admission number, date of birth, or other meaningful
  identifier.
- ML tables, artifact directories, and training uploads must never contain
  names, emails, phone numbers, addresses, guardian contacts, student IDs, or
  usernames. Keep the identity-to-code key separately under restricted access.
- Separate duties where practical: collector, teacher/expert reviewer, data
  steward, and training operator. Record reviewer role/code rather than
  personal contact details.
- `participant_code`, IDs, timestamps, status, labels, confidence, readiness
  flags, and dummy flags are linkage/audit fields, not predictive features.

### Audio security and retention

- Store raw audio only in the approved access-controlled service or repository;
  use encrypted transfer/storage where available. Never copy raw audio, consent
  records, or linkage files to the model-artifact directory.
- Apply the ethics-approved retention schedule to source exports, prepared CSVs,
  audio, linkage records, and artifacts. The retention duration is a
  supervisor/ethics decision, not a model setting.

## Repeated-Session Protocol

Collect repeated sessions per participant. A practical sequence is an initial
`identification` baseline, one or more `improvement` sessions during
practice, and a follow-up identification/review session when approved by the
study protocol. These sessions are longitudinal evidence, not independent
children.

Use a comparable, grade-appropriate prompt mix of words, pseudowords, and
sentences, with minimal-pair or targeted-phoneme prompts when applicable.
Version the prompt bank and record approved deviations in de-identified
`session_notes` or `label_notes`. Before recording, confirm consent, code,
grade, mode, and activity. In `session_notes`, record only de-identified
context that could affect interpretation: study-device code/model, microphone,
quiet/noisy environment, interruption, or connection issue.

For every prompt:

- Use unique `attempt_id`, linked `session_id`, and `attempt_no`; retain
  retries rather than overwriting the first attempt. The export derives
  `retry_rate` from attempts numbered greater than one.
- Retain invalid attempts for audit: use `valid_audio=0`, a controlled
  `invalid_reason` such as `background_noise`, `microphone_timeout`, or
  `too_short`, and leave unavailable ASR/phoneme fields blank. Invalid audio
  is not a reading error.
- Treat ASR-empty separately: audio can be valid while ASR returns no text.
  Preserve the blank ASR text, `phoneme_status=asr_empty` where produced,
  quality measures, and a route to expert review. Do not invent a transcript.

Teachers or authorised experts review prompt evidence and permitted audio, then
record item correctness/transcript/error type and a session support label with
confidence and review state. Use `needs_review` for unresolved cases. It must
be adjudicated to a trainable label or excluded before supervised training.
The backend selects the highest-confidence, most recently updated session label;
supervisors should still audit disagreement rather than treating that rule as
clinical adjudication.

## Workbook Workflow and Field Families

Work top-to-bottom. Real-entry sheets begin empty. Never copy dummy rows into a
real sheet.

| Sheet | Entry or output | Field families and use |
| --- | --- | --- |
| `README` | Reference | Purpose, privacy/consent rules, label boundary, colour legend, inventory. |
| `Participants` | Manual real entry | `participant_code`, grade, age, consent confirmation/date, review state, de-identified notes, active flag. |
| `Sessions` | Manual plus derived counts | Session/code, grade/date/mode/activity/status/review state, total/valid/invalid attempts, consent verification, de-identified notes. |
| `Attempts` | Backend/imported evidence plus expert review | IDs, prompt/task context, audio measures, ASR/word/phoneme results, model score, manual review, anonymous code, dummy flag. |
| `Expert Labels` | Teacher/expert entry | Session/code, support label, confidence, review state, reviewer role/code, time, adjudication notes. |
| `Session Training Data` | Prepared real output | Exact 33-column trainer contract: aggregates, label/confidence/readiness, timestamps, code, `is_dummy_data=0`. |
| `Dummy Attempts` | Reference only | Reviewed correct/error/ASR-empty/retry/invalid examples, each `is_dummy_data=1`. |
| `Dummy Sessions` | Reference only | Reviewed Grades 2-5 support-class examples, each `is_dummy_data=1`. |
| `Feature Dictionary` | Reference | Definition, type, required status, allowed values/range, role, derivation, training use. |
| `Code Lists` | Reference | Controlled grades, consent, modes, task families, quality, labels, confidence, review/status/boolean values. |
| `Quality Checks` | Formula output | Consent, linkage, duplicate, missing-label, distribution, dummy-data, and training-readiness checks. |

| Field family | Examples | Handling |
| --- | --- | --- |
| Anonymous identifiers | `participant_code`, `session_id`, `attempt_id`, `prompt_id`, `activity_id` | Required linkage/audit. Keep code for group splitting; trainer excludes identifiers from features. |
| Manual context | grade, mode, session date, consent/review state, de-identified notes | Enter under protocol using controlled values; grade is 2-5. |
| Backend-derived attempt measures | duration, silence/pause/quality, ASR, word correctness, error/similarity rates, phoneme flags, score | Import/generated evidence; never manufacture values when processing did not run. |
| Calculated session features | counts, retry rate, family accuracies, mean error/quality/duration/pause/score, common pattern | Derived from linked attempts and labels; backend aggregation is authoritative. |
| Expert labels | item correctness/transcript/error type, support label, confidence, review state, notes | Enter after review. Only three support labels train. |
| Quality flags | `valid_audio`, `invalid_reason`, `dataset_ready`, `is_dummy_data` | Preserve for audit. Dummy rows are rejected; readiness is not a feature. |

### Attempt examples

| Case | Key fields | Correct handling |
| --- | --- | --- |
| Correct | `valid_audio=1`, ASR equals target, `word_reading_correct=1`, phoneme rate 0, pattern `none` | Keep as valid evidence; expert confirms/corrects item label. |
| Initial error | Target `blaf`, ASR `baf`, `phoneme_initial_sound_error=1`, pattern `initial_deletion` | Retain observed ASR/phoneme values and expert error type. |
| Final error | Target ends `falls`, ASR ends `fall`, `phoneme_final_sound_error=1`, pattern `final_deletion` | Preserve the observed attempt; expert verifies the final-sound label. |
| ASR-empty | `valid_audio=1`, blank ASR, `phoneme_status=asr_empty` | Retain quality measures and request review; audio is not automatically invalid. |
| Invalid audio | `valid_audio=0`, reason `background_noise` or `microphone_timeout`, analysis `not_run`/blank | Retain for audit and invalid count; never encode it as a speech error. |

## Data Sufficiency and Evidence Boundaries

The trainer's technical gate is at least 30 labelled session rows, two
`participant_code` values, and two support classes. Passing it only proves
that the script can start. It does not establish predictive performance,
fairness, clinical validity, or deployment readiness.

For a pilot, pre-specify the collection purpose, labels, exclusions, split, and
error analysis. Include Grades 2-5 wherever the study makes that claim, all
three trainable support classes where feasible, and multiple distinct
participants in each represented grade/support cell. Inspect missingness,
invalid-audio rates, disagreement, and participant/class counts before
interpreting metrics.

Stronger evidence requires a recruitment and analysis plan reviewed by the
supervisor and, where appropriate, a statistical advisor. It should cover
participant diversity across Grades 2-5, support classes, settings, recording
conditions, and time; independent or later-time evaluation; subgroup/error
analysis; calibration/threshold review if decisions are made; and a responsible
human follow-up path. Session count cannot substitute for participant diversity:
many sessions from few children are still few independent participant groups.

## Backend Export to Session Training Data

Never upload backend `session_features.csv` directly. It includes prohibited
`student_id` and `student_username`, and it does not contain
`participant_code` or `is_dummy_data`. A data steward must create a
restricted mapping containing exactly `session_id,participant_code`, from the
protected consent/linkage record. Do not put names, student IDs, usernames,
emails, phones, addresses, or guardian details in this mapping. Keep it outside
the training-artifact folder; give the training operator only the prepared CSV.

The target header is exactly the workbook's `Session Training Data` schema:

```text
session_id,grade,mode,activity_id,status,total_attempts,valid_attempts,invalid_attempts,retry_rate,word_accuracy,pseudoword_accuracy,sentence_accuracy,mean_character_error_rate,mean_word_error_rate,mean_partial_match_score,mean_phoneme_error_rate,initial_sound_error_rate,final_sound_error_rate,vowel_mismatch_rate,consonant_cluster_error_rate,common_phoneme_error_pattern,mean_speech_duration_sec,mean_pause_count,mean_audio_quality_score,mean_pronunciation_model_score,labelled_attempt_count,speech_support_label,label_confidence,dataset_ready,created_at,completed_at,participant_code,is_dummy_data
```

After saving the raw route export as `session_features_raw.csv` and the
restricted mapping as `restricted_session_participant_map.csv`, run this
preparation cell in a controlled environment. It rejects drift rather than
silently dropping unexpected columns.

```python
from pathlib import Path
import pandas as pd

RAW = Path("session_features_raw.csv")
MAP = Path("restricted_session_participant_map.csv")
OUT = Path("Session_Training_Data.csv")
SCHEMA = [
    "session_id", "grade", "mode", "activity_id", "status", "total_attempts",
    "valid_attempts", "invalid_attempts", "retry_rate", "word_accuracy",
    "pseudoword_accuracy", "sentence_accuracy", "mean_character_error_rate",
    "mean_word_error_rate", "mean_partial_match_score", "mean_phoneme_error_rate",
    "initial_sound_error_rate", "final_sound_error_rate", "vowel_mismatch_rate",
    "consonant_cluster_error_rate", "common_phoneme_error_pattern",
    "mean_speech_duration_sec", "mean_pause_count", "mean_audio_quality_score",
    "mean_pronunciation_model_score", "labelled_attempt_count",
    "speech_support_label", "label_confidence", "dataset_ready", "created_at",
    "completed_at", "participant_code", "is_dummy_data",
]
PROHIBITED = {"student_id", "student_username"}
RAW_SCHEMA = set(SCHEMA) - {"participant_code", "is_dummy_data"} | PROHIBITED

raw = pd.read_csv(RAW)
mapping = pd.read_csv(MAP)
if set(raw.columns) != RAW_SCHEMA:
    raise ValueError(f"Unexpected backend session-export schema: {sorted(raw.columns)}")
if set(mapping.columns) != {"session_id", "participant_code"}:
    raise ValueError("Mapping must contain exactly session_id and participant_code.")
if mapping["session_id"].duplicated().any() or mapping["participant_code"].isna().any():
    raise ValueError("Mapping has duplicate session_id or missing participant_code.")
if not raw["session_id"].is_unique:
    raise ValueError("Backend export has duplicate session_id values.")

prepared = raw.drop(columns=sorted(PROHIBITED)).merge(
    mapping, on="session_id", how="left", validate="one_to_one"
)
if prepared["participant_code"].isna().any() or prepared["participant_code"].astype(str).str.strip().eq("").any():
    raise ValueError("Every exported session must have a non-empty participant_code.")
prepared["participant_code"] = prepared["participant_code"].astype(str).str.strip()
prepared["is_dummy_data"] = 0
prepared = prepared.loc[:, SCHEMA]
if set(prepared.columns) != set(SCHEMA) or prepared["is_dummy_data"].ne(0).any():
    raise ValueError("Prepared data does not meet the Session Training Data contract.")
prepared.to_csv(OUT, index=False)
print(f"Wrote {len(prepared)} de-identified rows to {OUT}")
```

Open the output in the workbook's `Session Training Data` sheet or a
controlled CSV viewer. Confirm `is_dummy_data=0`, resolve `needs_review`,
and clear all relevant `Quality Checks` actions before training.

## Google Colab Training and Evaluation

In a new Colab notebook, upload only `Session_Training_Data.csv`,
`train_final_speech_support_model_colab.py`, and
`test_training_pipeline.py`. Do not upload raw exports, linkage mappings,
identity records, or audio.

```python
from google.colab import files
files.upload()
```

```python
!pip install -q pandas numpy scikit-learn joblib
!python -m unittest test_training_pipeline.py -v
!cp Session_Training_Data.csv session_features.csv
!python train_final_speech_support_model_colab.py
```

The script validates the 33-column allowed schema; required IDs/code/label;
direct-identifier and unknown columns; dummy rows; duplicate sessions; the
30-row/two-participant/two-label gate; and allowable labels. It uses
`GroupShuffleSplit(test_size=0.25, random_state=42)` by `participant_code`,
asserts no train/test participant overlap, and fails if a split lacks a support
class. The fixed seed is reproducible for a fixed CSV, not broader validation.

It compares Random Forest and Gradient Boosting, selecting by macro F1, then
balanced accuracy, then plain accuracy. Review the saved summary:

| Measure | Meaning | Why accuracy alone is insufficient |
| --- | --- | --- |
| Macro F1 | Unweighted mean of class F1 scores | Gives each support class equal importance. |
| Balanced accuracy | Mean per-class recall | Exposes unequal recovery under class imbalance. |
| Per-class recall | Recall for each support label in `classification_report` | Reveals a support class that is frequently missed. |
| Confusion matrix | True-label rows and predicted-label columns in saved label order | Shows which support classes are confused. |
| Plain accuracy | Overall correct fraction | A common class can make it look acceptable while another is poorly recognized. |

Do not turn observed metrics into a clinical capability, generalization claim,
or deployment claim. Record dataset version/date, participant counts by grade
and label, split seed, exclusions, model version, metrics, confusion matrix,
and limitations with every research result.

The run writes:

```text
final_speech_support_classifier.joblib
final_speech_label_encoder.joblib
final_speech_feature_columns.json
final_speech_training_summary.json
```

```python
from google.colab import files
from pathlib import Path

for path in Path("final_speech_support_model_artifacts").iterdir():
    files.download(str(path))
```

After review, place artifacts under
`ML_Model/final_speech_support_model_artifacts/`. Store the prepared CSV and
restricted study records under the approved retention plan; never place raw
audio, consent forms, or linkage mappings in the artifact directory.

## Pre-Training Checklist

- Ethics approval and consent are confirmed for every included participant.
- Real ML tables use anonymous `participant_code` values only.
- Direct identifiers, identity mappings, and raw audio are outside the training
  workspace and unavailable to the training operator.
- Repeated sessions use the same code, and the group split has zero overlap.
- Attempts retain retries, invalid-audio, ASR-empty, and expert-review evidence.
- `needs_review` is adjudicated or excluded.
- Prepared data matches the exact 33-column schema, has `is_dummy_data=0`,
  and has no direct or unknown columns.
- Workbook quality actions are resolved. Results remain pilot/research evidence
  unless stronger, independently reviewed evidence exists.
