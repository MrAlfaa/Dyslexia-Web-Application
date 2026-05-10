const mongoose = require("mongoose");

const speechManualLabelSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpeechAttempt",
      required: true,
      unique: true,
    },
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
    labeledByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    itemCorrect: Boolean,
    teacherTranscript: {
      type: String,
      trim: true,
    },
    errorType: {
      type: String,
      enum: [
        "none",
        "initial_substitution",
        "final_omission",
        "vowel_error",
        "consonant_cluster_error",
        "repetition",
        "self_correction",
        "no_response",
        "invalid_audio",
        "other",
      ],
      default: "none",
    },
    expectedPhoneme: {
      type: String,
      trim: true,
    },
    spokenPhoneme: {
      type: String,
      trim: true,
    },
    teacherConfidence: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpeechManualLabel", speechManualLabelSchema);
