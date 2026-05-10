const mongoose = require("mongoose");

const speechSessionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpeechAssignment",
    },
    activityId: String,
    gameType: String,
    skillFocus: String,
    recommendationReason: String,
    grade: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["demo", "assigned", "data_collection", "identification", "improvement"],
      default: "demo",
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    promptSet: [String],
    supportLevel: {
      type: String,
      enum: ["low_support", "medium_support", "high_support", "unknown"],
      default: "unknown",
    },
    supportScore: Number,
    modelVersion: {
      type: String,
      default: "placeholder_v1",
    },
    predictionSource: {
      type: String,
      default: "placeholder_rule_based",
    },
    recommendations: [String],
    starsEarned: {
      type: Number,
      default: 0,
    },
    activityCompleted: {
      type: Boolean,
      default: false,
    },
    pronunciationSummary: {
      status: String,
      dominantPrediction: String,
      meanPronunciationScore: Number,
      meanProbabilities: mongoose.Schema.Types.Mixed,
      validPredictionCount: Number,
      modelVersion: String,
      updatedAt: Date,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpeechSession", speechSessionSchema);
