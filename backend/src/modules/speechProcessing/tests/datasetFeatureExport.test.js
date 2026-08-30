const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ATTEMPT_FEATURE_COLUMNS,
  SESSION_FEATURE_COLUMNS,
  buildAttemptFeatureRows,
  buildSessionFeatureRows,
} = require("../services/speechDatasetExport.service");

const LEGACY_ATTEMPT_FEATURE_COLUMNS = [
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
];

const SENTENCE_ATTEMPT_FEATURE_COLUMNS = [
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

const LEGACY_SESSION_FEATURE_COLUMNS = [
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
];

const SENTENCE_SESSION_FEATURE_COLUMNS = [
  "mean_sentence_word_error_rate",
  "mean_sentence_word_coverage",
  "mean_sentence_similarity",
  "mean_sentence_words_per_minute",
];

test("attempt feature rows include audio, ASR, model, and manual label fields", () => {
  const attempt = {
    _id: "attempt1",
    sessionId: { _id: "session1", grade: "3", mode: "identification" },
    studentId: { _id: "student1", username: "child01", grade: "3" },
    promptId: "SP001",
    taskType: "read_aloud_word",
    targetText: "bat",
    attemptNo: 1,
    validAudio: true,
    serverAudioDurationMs: 1200,
    silenceFeatures: { estimatedSpeechSec: 0.9, silenceRatio: 0.25, pauseCount: 1 },
    audioQuality: { qualityScore: 0.82, qualityLabel: "good" },
    wordReading: {
      targetWord: "bat",
      asrText: "pat",
      normalizedTargetWord: "bat",
      normalizedAsrText: "pat",
      wordCorrect: false,
      editDistance: 1,
      similarityScore: 0.67,
      possibleError: "initial sound confusion: b -> p",
      attemptStatus: "valid",
    },
    phonemeComparison: {
      status: "completed",
      targetPhonemes: ["B", "A", "T"],
      asrPhonemes: ["P", "A", "T"],
      phonemeEditDistance: 1,
      phonemeErrorRate: 0.333,
      initialSoundError: true,
      finalSoundError: false,
      vowelMismatch: false,
      consonantClusterError: false,
      deletionCount: 0,
      insertionCount: 0,
      substitutionCount: 1,
      errorPattern: "initial_sound_pattern",
      confidence: "medium_high",
      warnings: [],
    },
    pronunciationModel: { prediction: "medium_support", predictedPronunciationScore: 6.5 },
    itemResult: { starsEarned: 2 },
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const labelMap = {
    attempt1: {
      itemCorrect: false,
      teacherTranscript: "pat",
      errorType: "initial_substitution",
      speechSupportLabel: "medium_support",
      labelConfidence: 4,
      labelNotes: "Initial sound confusion observed",
      labeledByAdmin: { email: "teacher@example.com" },
      labelledAt: "2026-06-02T00:00:00.000Z",
    },
  };

  const [row] = buildAttemptFeatureRows({ attempts: [attempt], labelMap });

  assert.equal(row.word_reading_correct, 0);
  assert.equal(row.character_error_rate, 0.3333);
  assert.equal(row.word_error_rate, 1);
  assert.equal(row.phoneme_error_rate, 0.333);
  assert.equal(row.phoneme_initial_sound_error, 1);
  assert.equal(row.phoneme_error_pattern, "initial_sound_pattern");
  assert.equal(row.speech_support_label, "medium_support");
  assert.equal(row.label_confidence, 4);
  assert.equal(row.labelled_by, "teacher@example.com");
});

test("invalid audio attempt exports safely without ASR values", () => {
  const [row] = buildAttemptFeatureRows({
    attempts: [
      {
        _id: "attempt2",
        sessionId: "session2",
        studentId: "student2",
        taskType: "read_aloud_word",
        targetText: "cat",
        validAudio: false,
        invalidReason: "too_short",
      },
    ],
  });

  assert.equal(row.valid_audio, 0);
  assert.equal(row.invalid_reason, "too_short");
  assert.equal(row.word_error_rate, "");
  assert.equal(row.character_error_rate, "");
});

test("session feature rows aggregate accuracy, retries, and labels", () => {
  const sessions = [
    {
      _id: "session1",
      studentId: { _id: "student1", username: "child01", grade: "3" },
      grade: "3",
      mode: "improvement",
      status: "completed",
      activityId: "leo_robot_words",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ];
  const attemptsBySession = {
    session1: [
      {
        _id: "a1",
        sessionId: "session1",
        taskType: "pseudoword_read",
        targetText: "mip",
        attemptNo: 1,
        validAudio: true,
        wordReading: { attemptStatus: "valid", wordCorrect: true, similarityScore: 1, editDistance: 0, normalizedTargetWord: "mip" },
        phonemeComparison: { status: "completed", phonemeErrorRate: 0, errorPattern: "none" },
        audioQuality: { qualityScore: 0.9 },
        silenceFeatures: { estimatedSpeechSec: 0.7, pauseCount: 0 },
        pronunciationModel: { predictedPronunciationScore: 7 },
      },
      {
        _id: "a2",
        sessionId: "session1",
        taskType: "sentence_read",
        targetText: "The cat sat.",
        attemptNo: 2,
        validAudio: true,
        wordReading: { attemptStatus: "valid", wordCorrect: false, similarityScore: 0.5, editDistance: 2, normalizedTargetWord: "the" },
        phonemeComparison: { status: "completed", phonemeErrorRate: 0.5, finalSoundError: true, errorPattern: "final_sound_pattern" },
        audioQuality: { qualityScore: 0.7 },
        silenceFeatures: { estimatedSpeechSec: 1.4, pauseCount: 2 },
        pronunciationModel: { predictedPronunciationScore: 5 },
      },
    ],
  };
  const labelsBySession = {
    session1: [{ speechSupportLabel: "high_support", labelConfidence: 5 }],
  };

  const [row] = buildSessionFeatureRows({ sessions, attemptsBySession, labelsBySession });

  assert.equal(row.valid_attempts, 2);
  assert.equal(row.retry_rate, 0.5);
  assert.equal(row.pseudoword_accuracy, 1);
  assert.equal(row.sentence_accuracy, 0);
  assert.equal(row.mean_audio_quality_score, 0.8);
  assert.equal(row.mean_phoneme_error_rate, 0.25);
  assert.equal(row.final_sound_error_rate, 0.5);
  assert.equal(row.common_phoneme_error_pattern, "final_sound_pattern");
  assert.equal(row.speech_support_label, "high_support");
  assert.equal(row.dataset_ready, 1);
});

test("sentence columns append after every legacy attempt and session header", () => {
  assert.deepEqual(
    ATTEMPT_FEATURE_COLUMNS,
    [...LEGACY_ATTEMPT_FEATURE_COLUMNS, ...SENTENCE_ATTEMPT_FEATURE_COLUMNS]
  );
  assert.deepEqual(
    SESSION_FEATURE_COLUMNS,
    [...LEGACY_SESSION_FEATURE_COLUMNS, ...SENTENCE_SESSION_FEATURE_COLUMNS]
  );
});

test("sentence attempt rows export the persisted transcript and token counts", () => {
  const [row] = buildAttemptFeatureRows({
    attempts: [{
      _id: "sentence-attempt",
      sessionId: "sentence-session",
      studentId: "student-4",
      taskType: "sentence_read",
      targetText: "The little bird can sing.",
      sentenceReading: {
        targetText: "The little bird can sing.",
        asrText: "the bird sings",
        wordErrorRate: 0.6,
        wordCoverage: 0.4,
        sentenceSimilarity: 0.5,
        wordsPerMinute: 72,
        omittedWordCount: 2,
        insertedWordCount: 0,
        substitutedWordCount: 1,
        status: "valid",
      },
    }],
  });

  assert.equal(row.sentence_target_text, "The little bird can sing.");
  assert.equal(row.sentence_asr_text, "the bird sings");
  assert.equal(row.sentence_word_error_rate, 0.6);
  assert.equal(row.sentence_word_coverage, 0.4);
  assert.equal(row.sentence_similarity, 0.5);
  assert.equal(row.sentence_words_per_minute, 72);
  assert.equal(row.sentence_omitted_word_count, 2);
  assert.equal(row.sentence_inserted_word_count, 0);
  assert.equal(row.sentence_substitution_count, 1);
  assert.equal(row.sentence_status, "valid");
});

test("sentence session means ignore unavailable evidence without fabricating zeros", () => {
  const sessions = [{ _id: "sentence-session", studentId: "student-4" }];
  const attemptsBySession = {
    "sentence-session": [
      {
        taskType: "sentence_read",
        sentenceReading: {
          wordErrorRate: 0.25,
          wordCoverage: 0.75,
          sentenceSimilarity: 0.8,
          wordsPerMinute: 84,
          status: "valid",
        },
      },
      {
        taskType: "sentence_read",
        sentenceReading: {
          wordErrorRate: null,
          wordCoverage: null,
          sentenceSimilarity: null,
          wordsPerMinute: null,
          status: "processing",
        },
      },
    ],
  };

  const [row] = buildSessionFeatureRows({ sessions, attemptsBySession });

  assert.equal(row.mean_sentence_word_error_rate, 0.25);
  assert.equal(row.mean_sentence_word_coverage, 0.75);
  assert.equal(row.mean_sentence_similarity, 0.8);
  assert.equal(row.mean_sentence_words_per_minute, 84);

  const [unavailable] = buildSessionFeatureRows({
    sessions,
    attemptsBySession: {
      "sentence-session": [{
        taskType: "sentence_read",
        sentenceReading: {
          wordErrorRate: null,
          wordCoverage: undefined,
          sentenceSimilarity: "",
          wordsPerMinute: null,
          status: "processing",
        },
      }],
    },
  });

  assert.equal(unavailable.mean_sentence_word_error_rate, "");
  assert.equal(unavailable.mean_sentence_word_coverage, "");
  assert.equal(unavailable.mean_sentence_similarity, "");
  assert.equal(unavailable.mean_sentence_words_per_minute, "");
});
