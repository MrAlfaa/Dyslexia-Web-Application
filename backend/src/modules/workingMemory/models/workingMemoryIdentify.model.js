const mongoose = require("mongoose");

const workingMemoryIdentifySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    grade: {
      type: String,
      enum: ["2", "3", "4"],
      required: true,
    },

    totalScore: Number,
    totalQuestions: Number,

    questionResults: [
      {
        questionId: String,
        category: String,

        isCorrect: Boolean,
        timeTaken: Number,

        userAnswer: mongoose.Schema.Types.Mixed,
        correctAnswer: mongoose.Schema.Types.Mixed,

        errorType: {
          type: String,
          enum: [
            "correct",
            "partial_recall",
            "wrong_order",
            "skipped",
            "incorrect",
            "guess",
          ],
        },
      },
    ],

    totalTimeTaken: Number,

    // 🔥 FINAL SCORING + ML FEATURES
    metrics: {
      recallAccuracy: Number,
      avgResponseTime: Number,
      digitSpan: Number,
      digitSpanScore: Number,
      sequenceScore: Number,
      instructionScore: Number,
      patternScore: Number,
      timeScore: Number,
      finalScore: Number,
      riskLevel: {
        type: String,
        enum: ["Low", "Moderate", "High"],
      },
      weakAreas: [String],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "WorkingMemoryIdentify",
  workingMemoryIdentifySchema
);