const round = (value, digits = 4) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return Number(number.toFixed(digits));
};

const mean = (values = [], digits = 4) => {
  const numeric = values
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  if (!numeric.length) return "";
  return round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length, digits);
};

const asNumber = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
};

const boolValue = (value) => {
  if (value === true) return 1;
  if (value === false) return 0;
  return "";
};

const isoDate = (value) => (value ? new Date(value).toISOString() : "");

const idOf = (value) => String(value?._id || value || "");

const getLabelForAttempt = (attempt, labelMap = {}) => labelMap[idOf(attempt._id)] || null;

const getTaskFamily = (attempt = {}) => {
  const task = String(attempt.taskType || "").toLowerCase();
  const game = String(attempt.gameType || "").toLowerCase();
  const text = String(attempt.targetText || "").trim();
  if (task.includes("pseudo") || game.includes("pseudo")) return "pseudoword";
  if (task.includes("sentence") || game.includes("sentence") || text.includes(" ")) return "sentence";
  if (task.includes("minimal") || game.includes("minimal")) return "minimal_pair";
  if (task.includes("first_sound") || game.includes("first_sound")) return "first_sound";
  return "word";
};

const getCharErrorRate = (wordReading = {}) => {
  const targetLength = String(wordReading.normalizedTargetWord || wordReading.targetWord || "").length;
  if (!targetLength) return "";
  return round(Number(wordReading.editDistance || 0) / targetLength, 4);
};

const getWordErrorRate = (wordReading = {}) => {
  if (!wordReading?.attemptStatus || !["valid", "asr_empty"].includes(wordReading.attemptStatus)) {
    return "";
  }
  return wordReading.wordCorrect ? 0 : 1;
};

const ATTEMPT_FEATURE_COLUMNS = [
  "attempt_id",
  "session_id",
  "student_id",
  "student_username",
  "grade",
  "mode",
  "activity_id",
  "game_type",
  "task_type",
  "task_family",
  "prompt_id",
  "target_text",
  "attempt_no",
  "valid_audio",
  "invalid_reason",
  "server_audio_duration_ms",
  "speech_duration_sec",
  "silence_ratio",
  "pause_count",
  "audio_quality_score",
  "audio_quality_label",
  "word_reading_target_word",
  "word_reading_asr_text",
  "word_reading_correct",
  "word_reading_edit_distance",
  "word_reading_similarity_score",
  "character_error_rate",
  "word_error_rate",
  "possible_error",
  "phoneme_status",
  "target_phonemes",
  "asr_phonemes",
  "phoneme_edit_distance",
  "phoneme_error_rate",
  "phoneme_initial_sound_error",
  "phoneme_final_sound_error",
  "phoneme_vowel_mismatch",
  "phoneme_consonant_cluster_error",
  "phoneme_deletion_count",
  "phoneme_insertion_count",
  "phoneme_substitution_count",
  "phoneme_error_pattern",
  "phoneme_confidence",
  "phoneme_warnings",
  "pronunciation_model_prediction",
  "pronunciation_model_score",
  "stars_earned",
  "manual_item_correct",
  "manual_teacher_transcript",
  "manual_error_type",
  "speech_support_label",
  "label_confidence",
  "label_notes",
  "labelled_by",
  "labelled_at",
  "created_at",
  "sentence_target_text",
  "sentence_asr_text",
  "sentence_word_error_rate",
  "sentence_word_coverage",
  "sentence_similarity",
  "sentence_words_per_minute",
  "sentence_omitted_word_count",
  "sentence_inserted_word_count",
  "sentence_substitution_count",
  "sentence_status",
];

const SESSION_FEATURE_COLUMNS = [
  "session_id",
  "student_id",
  "student_username",
  "grade",
  "mode",
  "activity_id",
  "status",
  "total_attempts",
  "valid_attempts",
  "invalid_attempts",
  "retry_rate",
  "word_accuracy",
  "pseudoword_accuracy",
  "sentence_accuracy",
  "mean_character_error_rate",
  "mean_word_error_rate",
  "mean_partial_match_score",
  "mean_phoneme_error_rate",
  "initial_sound_error_rate",
  "final_sound_error_rate",
  "vowel_mismatch_rate",
  "consonant_cluster_error_rate",
  "common_phoneme_error_pattern",
  "mean_speech_duration_sec",
  "mean_pause_count",
  "mean_audio_quality_score",
  "mean_pronunciation_model_score",
  "labelled_attempt_count",
  "speech_support_label",
  "label_confidence",
  "dataset_ready",
  "created_at",
  "completed_at",
  "mean_sentence_word_error_rate",
  "mean_sentence_word_coverage",
  "mean_sentence_similarity",
  "mean_sentence_words_per_minute",
];

const DATA_COLLECTION_TEMPLATE_COLUMNS = [
  "student_code",
  "grade",
  "session_id",
  "attempt_id",
  "activity_id",
  "task_type",
  "target_text",
  "teacher_transcript",
  "item_correct",
  "error_type",
  "speech_support_label",
  "label_confidence",
  "label_notes",
  "consent_confirmed",
];

const DATA_COLLECTION_TEMPLATE_ROWS = [
  {
    student_code: "S001",
    grade: "3",
    session_id: "",
    attempt_id: "",
    activity_id: "leo_first_check",
    task_type: "read_aloud_word",
    target_text: "cat",
    teacher_transcript: "",
    item_correct: "",
    error_type: "none",
    speech_support_label: "low_support|medium_support|high_support|needs_review",
    label_confidence: "1-5",
    label_notes: "Use anonymous child codes only. Do not enter names.",
    consent_confirmed: "yes/no",
  },
];

const buildAttemptFeatureRows = ({ attempts = [], labelMap = {} } = {}) =>
  attempts.map((attempt) => {
    const label = getLabelForAttempt(attempt, labelMap);
    const wordReading = attempt.wordReading || {};
    const sentenceReading = attempt.sentenceReading || {};
    const phonemeComparison = attempt.phonemeComparison || {};
    return {
      attempt_id: idOf(attempt._id),
      session_id: idOf(attempt.sessionId),
      student_id: idOf(attempt.studentId),
      student_username: attempt.studentId?.username || "",
      grade: attempt.sessionId?.grade || attempt.studentId?.grade || "",
      mode: attempt.sessionId?.mode || "",
      activity_id: attempt.activityId || "",
      game_type: attempt.gameType || "",
      task_type: attempt.taskType || "",
      task_family: getTaskFamily(attempt),
      prompt_id: attempt.promptId || "",
      target_text: attempt.targetText || "",
      attempt_no: asNumber(attempt.attemptNo),
      valid_audio: boolValue(attempt.validAudio),
      invalid_reason: attempt.invalidReason || "",
      server_audio_duration_ms: asNumber(attempt.serverAudioDurationMs),
      speech_duration_sec: asNumber(attempt.silenceFeatures?.estimatedSpeechSec),
      silence_ratio: asNumber(attempt.silenceFeatures?.silenceRatio),
      pause_count: asNumber(attempt.silenceFeatures?.pauseCount),
      audio_quality_score: asNumber(attempt.audioQuality?.qualityScore),
      audio_quality_label: attempt.audioQuality?.qualityLabel || "",
      word_reading_target_word: wordReading.targetWord || "",
      word_reading_asr_text: wordReading.asrText || "",
      word_reading_correct: boolValue(wordReading.wordCorrect),
      word_reading_edit_distance: asNumber(wordReading.editDistance),
      word_reading_similarity_score: asNumber(wordReading.similarityScore),
      character_error_rate: getCharErrorRate(wordReading),
      word_error_rate: getWordErrorRate(wordReading),
      possible_error: wordReading.possibleError || "",
      phoneme_status: phonemeComparison.status || "",
      target_phonemes: (phonemeComparison.targetPhonemes || []).join(" "),
      asr_phonemes: (phonemeComparison.asrPhonemes || []).join(" "),
      phoneme_edit_distance: asNumber(phonemeComparison.phonemeEditDistance),
      phoneme_error_rate: asNumber(phonemeComparison.phonemeErrorRate),
      phoneme_initial_sound_error: boolValue(phonemeComparison.initialSoundError),
      phoneme_final_sound_error: boolValue(phonemeComparison.finalSoundError),
      phoneme_vowel_mismatch: boolValue(phonemeComparison.vowelMismatch),
      phoneme_consonant_cluster_error: boolValue(phonemeComparison.consonantClusterError),
      phoneme_deletion_count: asNumber(phonemeComparison.deletionCount),
      phoneme_insertion_count: asNumber(phonemeComparison.insertionCount),
      phoneme_substitution_count: asNumber(phonemeComparison.substitutionCount),
      phoneme_error_pattern: phonemeComparison.errorPattern || "",
      phoneme_confidence: phonemeComparison.confidence || "",
      phoneme_warnings: (phonemeComparison.warnings || []).join("|"),
      pronunciation_model_prediction: attempt.pronunciationModel?.prediction || "",
      pronunciation_model_score: asNumber(attempt.pronunciationModel?.predictedPronunciationScore),
      stars_earned: asNumber(attempt.starsEarned ?? attempt.itemResult?.starsEarned),
      manual_item_correct: boolValue(label?.itemCorrect),
      manual_teacher_transcript: label?.teacherTranscript || "",
      manual_error_type: label?.errorType || "",
      speech_support_label: label?.speechSupportLabel || "",
      label_confidence: asNumber(label?.labelConfidence ?? label?.teacherConfidence),
      label_notes: label?.labelNotes || label?.comment || "",
      labelled_by: label?.labeledByAdmin?.email || label?.labeledByAdmin?.fullName || idOf(label?.labeledByAdmin),
      labelled_at: isoDate(label?.labelledAt || label?.updatedAt || label?.createdAt),
      created_at: isoDate(attempt.createdAt),
      sentence_target_text: sentenceReading.targetText || "",
      sentence_asr_text: sentenceReading.asrText || "",
      sentence_word_error_rate: asNumber(sentenceReading.wordErrorRate),
      sentence_word_coverage: asNumber(sentenceReading.wordCoverage),
      sentence_similarity: asNumber(sentenceReading.sentenceSimilarity),
      sentence_words_per_minute: asNumber(sentenceReading.wordsPerMinute),
      sentence_omitted_word_count: asNumber(sentenceReading.omittedWordCount),
      sentence_inserted_word_count: asNumber(sentenceReading.insertedWordCount),
      sentence_substitution_count: asNumber(sentenceReading.substitutedWordCount),
      sentence_status: sentenceReading.status || "",
    };
  });

const getAccuracy = (attempts = []) => {
  const analyzed = attempts.filter((attempt) => attempt.wordReading?.attemptStatus === "valid");
  if (!analyzed.length) return "";
  const correct = analyzed.filter((attempt) => attempt.wordReading?.wordCorrect).length;
  return round(correct / analyzed.length, 4);
};

const getPhonemeSummary = (attempts = []) => {
  const analyzed = attempts.filter((attempt) =>
    ["completed", "asr_empty"].includes(attempt.phonemeComparison?.status)
  );
  if (!analyzed.length) {
    return {
      meanPhonemeErrorRate: "",
      initialSoundErrorRate: "",
      finalSoundErrorRate: "",
      vowelMismatchRate: "",
      consonantClusterErrorRate: "",
      commonErrorPattern: "",
    };
  }
  const countFlag = (field) =>
    analyzed.filter((attempt) => attempt.phonemeComparison?.[field]).length / analyzed.length;
  const errorCounts = {};
  analyzed.forEach((attempt) => {
    const pattern = attempt.phonemeComparison?.errorPattern;
    if (pattern && pattern !== "none") errorCounts[pattern] = (errorCounts[pattern] || 0) + 1;
  });

  return {
    meanPhonemeErrorRate: mean(analyzed.map((attempt) => attempt.phonemeComparison?.phonemeErrorRate)),
    initialSoundErrorRate: round(countFlag("initialSoundError"), 4),
    finalSoundErrorRate: round(countFlag("finalSoundError"), 4),
    vowelMismatchRate: round(countFlag("vowelMismatch"), 4),
    consonantClusterErrorRate: round(countFlag("consonantClusterError"), 4),
    commonErrorPattern:
      Object.entries(errorCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "",
  };
};

const getDominantLabel = (labels = []) => {
  const labelled = labels.filter((label) => label.speechSupportLabel);
  if (!labelled.length) return null;
  return labelled
    .slice()
    .sort((left, right) => {
      const confidenceDiff =
        Number(right.labelConfidence || right.teacherConfidence || 0) -
        Number(left.labelConfidence || left.teacherConfidence || 0);
      if (confidenceDiff) return confidenceDiff;
      return new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0);
    })[0];
};

const buildSessionFeatureRows = ({ sessions = [], attemptsBySession = {}, labelsBySession = {} } = {}) =>
  sessions.map((session) => {
    const attempts = attemptsBySession[idOf(session._id)] || [];
    const labels = labelsBySession[idOf(session._id)] || [];
    const validAttempts = attempts.filter((attempt) => attempt.validAudio);
    const labelledAttemptCount = labels.filter((label) => label.speechSupportLabel).length;
    const dominantLabel = getDominantLabel(labels);
    const wordAttempts = attempts.filter((attempt) => getTaskFamily(attempt) === "word");
    const pseudowordAttempts = attempts.filter((attempt) => getTaskFamily(attempt) === "pseudoword");
    const sentenceAttempts = attempts.filter((attempt) => getTaskFamily(attempt) === "sentence");
    const phonemeSummary = getPhonemeSummary(attempts);

    return {
      session_id: idOf(session._id),
      student_id: idOf(session.studentId),
      student_username: session.studentId?.username || "",
      grade: session.grade || session.studentId?.grade || "",
      mode: session.mode || "",
      activity_id: session.activityId || "",
      status: session.status || "",
      total_attempts: attempts.length,
      valid_attempts: validAttempts.length,
      invalid_attempts: attempts.length - validAttempts.length,
      retry_rate: attempts.length
        ? round(attempts.filter((attempt) => Number(attempt.attemptNo || 1) > 1).length / attempts.length, 4)
        : "",
      word_accuracy: getAccuracy(wordAttempts),
      pseudoword_accuracy: getAccuracy(pseudowordAttempts),
      sentence_accuracy: getAccuracy(sentenceAttempts),
      mean_character_error_rate: mean(attempts.map((attempt) => getCharErrorRate(attempt.wordReading))),
      mean_word_error_rate: mean(attempts.map((attempt) => getWordErrorRate(attempt.wordReading))),
      mean_partial_match_score: mean(attempts.map((attempt) => attempt.wordReading?.similarityScore)),
      mean_phoneme_error_rate: phonemeSummary.meanPhonemeErrorRate,
      initial_sound_error_rate: phonemeSummary.initialSoundErrorRate,
      final_sound_error_rate: phonemeSummary.finalSoundErrorRate,
      vowel_mismatch_rate: phonemeSummary.vowelMismatchRate,
      consonant_cluster_error_rate: phonemeSummary.consonantClusterErrorRate,
      common_phoneme_error_pattern: phonemeSummary.commonErrorPattern,
      mean_speech_duration_sec: mean(attempts.map((attempt) => attempt.silenceFeatures?.estimatedSpeechSec)),
      mean_pause_count: mean(attempts.map((attempt) => attempt.silenceFeatures?.pauseCount)),
      mean_audio_quality_score: mean(attempts.map((attempt) => attempt.audioQuality?.qualityScore)),
      mean_pronunciation_model_score: mean(
        attempts.map((attempt) => attempt.pronunciationModel?.predictedPronunciationScore)
      ),
      labelled_attempt_count: labelledAttemptCount,
      speech_support_label: dominantLabel?.speechSupportLabel || "",
      label_confidence: asNumber(dominantLabel?.labelConfidence ?? dominantLabel?.teacherConfidence),
      dataset_ready: dominantLabel?.speechSupportLabel && validAttempts.length ? 1 : 0,
      created_at: isoDate(session.createdAt),
      completed_at: isoDate(session.completedAt),
      mean_sentence_word_error_rate: mean(
        sentenceAttempts.map((attempt) => attempt.sentenceReading?.wordErrorRate)
      ),
      mean_sentence_word_coverage: mean(
        sentenceAttempts.map((attempt) => attempt.sentenceReading?.wordCoverage)
      ),
      mean_sentence_similarity: mean(
        sentenceAttempts.map((attempt) => attempt.sentenceReading?.sentenceSimilarity)
      ),
      mean_sentence_words_per_minute: mean(
        sentenceAttempts.map((attempt) => attempt.sentenceReading?.wordsPerMinute)
      ),
    };
  });

module.exports = {
  ATTEMPT_FEATURE_COLUMNS,
  SESSION_FEATURE_COLUMNS,
  DATA_COLLECTION_TEMPLATE_COLUMNS,
  DATA_COLLECTION_TEMPLATE_ROWS,
  buildAttemptFeatureRows,
  buildSessionFeatureRows,
};
