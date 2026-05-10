const mongoose = require("mongoose");

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
    manualLabelStatus: {
      type: String,
      enum: ["unlabeled", "labeled"],
      default: "unlabeled",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpeechAttempt", speechAttemptSchema);
