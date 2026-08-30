const mongoose = require("mongoose");

const comparisonSchema = new mongoose.Schema(
  {
    status: String,
    improvedMetrics: [String],
    worsenedMetrics: [String],
    stableMetrics: [String],
    deltas: mongoose.Schema.Types.Mixed,
    supportNeedDelta: Number,
  },
  { _id: false }
);

const speechAssessmentSnapshotSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpeechSession",
      required: true,
      index: true,
    },
    activityId: String,
    kind: {
      type: String,
      enum: ["baseline", "activity_estimate", "checkpoint"],
      required: true,
    },
    sequenceNo: {
      type: Number,
      default: 0,
      min: 0,
    },
    revision: {
      type: Number,
      default: 1,
      min: 1,
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
    supersededAt: Date,
    status: {
      type: String,
      enum: ["processing", "ready", "insufficient_data", "needs_review", "failed"],
      default: "processing",
      index: true,
    },
    baselineSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpeechAssessmentSnapshot",
    },
    previousSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpeechAssessmentSnapshot",
    },
    modelName: String,
    modelVersion: String,
    featureSchemaVersion: {
      type: String,
      default: "speech_assessment_v1",
    },
    calibrationVerified: {
      type: Boolean,
      default: false,
    },
    supportLevel: {
      type: String,
      enum: ["unknown", "low_support", "medium_support", "high_support"],
      default: "unknown",
    },
    supportNeedScore: Number,
    confidence: Number,
    probabilities: mongoose.Schema.Types.Mixed,
    metrics: mongoose.Schema.Types.Mixed,
    qualityGate: mongoose.Schema.Types.Mixed,
    baselineComparison: comparisonSchema,
    previousComparison: comparisonSchema,
    trendStatus: {
      type: String,
      enum: [
        "processing",
        "positive_trend",
        "stable",
        "mixed",
        "needs_review",
        "insufficient_data",
      ],
      default: "processing",
    },
    meaningfulDecision: {
      type: Boolean,
      default: false,
    },
    crossVersionComparisonBlocked: {
      type: Boolean,
      default: false,
    },
    comparisonReason: String,
    finalizedAt: Date,
    error: String,
  },
  { timestamps: true }
);

speechAssessmentSnapshotSchema.index(
  { sessionId: 1, kind: 1, sequenceNo: 1, revision: 1 },
  { unique: true }
);
speechAssessmentSnapshotSchema.index({ studentId: 1, kind: 1, isCurrent: 1, sequenceNo: -1 });

module.exports = mongoose.model("SpeechAssessmentSnapshot", speechAssessmentSnapshotSchema);
