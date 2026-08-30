const mongoose = require("mongoose");

const sentenceTokenErrorsSchema = new mongoose.Schema(
  {
    omittedWords: { type: [String], default: [] },
    insertedWords: { type: [String], default: [] },
    substitutions: {
      type: [
        new mongoose.Schema(
          {
            expected: { type: String, default: "" },
            heard: { type: String, default: "" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

const sentenceReadingSchema = new mongoose.Schema(
  {
    targetText: { type: String, default: "" },
    asrText: { type: String, default: "" },
    normalizedTargetText: { type: String, default: "" },
    normalizedAsrText: { type: String, default: "" },
    targetWordCount: { type: Number, default: null },
    recognizedWordCount: { type: Number, default: null },
    matchedWordCount: { type: Number, default: null },
    omittedWordCount: { type: Number, default: null },
    insertedWordCount: { type: Number, default: null },
    substitutedWordCount: { type: Number, default: null },
    tokenEditDistance: { type: Number, default: null },
    wordErrorRate: { type: Number, default: null },
    wordCoverage: { type: Number, default: null },
    sentenceSimilarity: { type: Number, default: null },
    exactMatch: { type: Boolean, default: false },
    partialMatch: { type: Boolean, default: false },
    wordsPerMinute: { type: Number, default: null },
    tokenErrors: { type: sentenceTokenErrorsSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["valid", "asr_empty", "invalid_audio", "processing", "skipped"],
      default: "skipped",
    },
    warnings: { type: [String], default: [] },
    asrProvider: { type: String, default: "" },
    asrModel: { type: String, default: "" },
  },
  { _id: false, timestamps: true }
);

const speechAttemptSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpeechSession",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpeechAssignment",
    },
    activityId: String,
    attemptPhase: {
      type: String,
      enum: ["baseline", "training", "checkpoint"],
      default: "training",
      index: true,
    },
    promptId: {
      type: String,
      required: true,
    },
    taskType: {
      type: String,
      required: true,
    },
    targetText: {
      type: String,
      required: true,
    },
    gameType: String,
    selectedAnswer: String,
    selectedCorrect: Boolean,
    targetPhonemes: [String],
    attemptNo: {
      type: Number,
      required: true,
    },
    audioOriginalName: String,
    audioMimeType: String,
    audioSizeBytes: Number,
    audioFilePath: String,
    audioUrl: String,
    normalizedAudioPath: String,
    normalizedAudioUrl: String,
    audioStorage: {
      provider: {
        type: String,
        default: "local",
      },
      uploadStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "skipped"],
        default: "pending",
      },
      originalPublicId: String,
      originalSecureUrl: String,
      normalizedPublicId: String,
      normalizedSecureUrl: String,
      bytes: Number,
      format: String,
      uploadError: String,
      syncedAt: Date,
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    processingSteps: {
      audioQuality: {
        type: String,
        default: "pending",
      },
      cloudinary: {
        type: String,
        default: "pending",
      },
      asr: {
        type: String,
        default: "pending",
      },
      pronunciationModel: {
        type: String,
        default: "pending",
      },
    },
    audioDurationMs: {
      type: Number,
      required: true,
    },
    serverAudioDurationMs: Number,
    frontendAudioDurationMs: Number,
    durationMismatchMs: Number,
    audioMetadata: mongoose.Schema.Types.Mixed,
    volumeFeatures: mongoose.Schema.Types.Mixed,
    silenceFeatures: mongoose.Schema.Types.Mixed,
    audioQuality: mongoose.Schema.Types.Mixed,
    extractionVersion: {
      type: String,
      default: "basic_audio_v1",
    },
    extractionStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    extractionError: String,
    validAudio: {
      type: Boolean,
      required: true,
    },
    invalidReason: String,
    playedAudioFirst: {
      type: Boolean,
      default: false,
    },
    features: mongoose.Schema.Types.Mixed,
    itemResult: mongoose.Schema.Types.Mixed,
    starsEarned: Number,
    childFeedback: String,
    audioQualitySummary: mongoose.Schema.Types.Mixed,
    pronunciationModel: {
      status: {
        type: String,
        enum: ["not_run", "success", "failed", "skipped"],
        default: "not_run",
      },
      modelName: String,
      modelVersion: String,
      prediction: String,
      probabilities: mongoose.Schema.Types.Mixed,
      predictedPronunciationScore: Number,
      featuresUsedCount: Number,
      audioFeaturesSummary: mongoose.Schema.Types.Mixed,
      error: String,
      predictedAt: Date,
    },
    wordReading: {
      targetWord: String,
      asrText: String,
      normalizedTargetWord: String,
      normalizedAsrText: String,
      wordCorrect: Boolean,
      possibleError: String,
      initialSoundError: Boolean,
      finalSoundError: Boolean,
      editDistance: Number,
      similarityScore: Number,
      attemptStatus: String,
      asrProvider: String,
      asrModel: String,
      error: String,
      createdAt: Date,
    },
    sentenceReading: {
      type: sentenceReadingSchema,
      default: undefined,
    },
    phonemeComparison: {
      status: String,
      targetPhonemes: [String],
      asrPhonemes: [String],
      phonemeEditDistance: Number,
      phonemeErrorRate: Number,
      initialSoundError: Boolean,
      finalSoundError: Boolean,
      vowelMismatch: Boolean,
      consonantClusterError: Boolean,
      deletionCount: Number,
      insertionCount: Number,
      substitutionCount: Number,
      errorPattern: String,
      confidence: String,
      warnings: [String],
      createdAt: Date,
    },
    manualLabelStatus: {
      type: String,
      enum: ["unlabeled", "labeled"],
      default: "unlabeled",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpeechAttempt", speechAttemptSchema);
