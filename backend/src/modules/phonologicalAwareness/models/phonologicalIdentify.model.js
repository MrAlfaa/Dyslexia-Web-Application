const mongoose = require("mongoose");

const phonologicalIdentifySchema = new mongoose.Schema(
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
    totalScore: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    questionResults: [
      {
        questionId: String,
        category: String,
        isCorrect: Boolean,
        timeTaken: Number, // In milliseconds
        userAnswer: mongoose.Schema.Types.Mixed,
        correctAnswer: mongoose.Schema.Types.Mixed,
      },
    ],
    totalTimeTaken: {
      type: Number, // In milliseconds
      required: true,
    },
    metrics: {
      totalQuestions: Number,
      totalCorrect: Number,
      overallAccuracy: Number,
      avgResponseTime: Number,
      totalTimeTaken: Number,
      categoryScores: mongoose.Schema.Types.Mixed,
      categoryTimes: mongoose.Schema.Types.Mixed,
      timeScore: Number,
      finalScore: Number,
      riskLevel: String,
      weakAreas: [String],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PhonologicalIdentify", phonologicalIdentifySchema);
