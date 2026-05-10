const mongoose = require("mongoose");

const taskTypes = [
  "listen_repeat",
  "read_aloud_word",
  "pseudoword_read",
  "minimal_pair_read",
  "sentence_read",
];

const grades = ["2", "3", "4", "5"];

const speechPromptSchema = new mongoose.Schema(
  {
    promptId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    taskType: {
      type: String,
      enum: taskTypes,
      required: true,
    },
    targetText: {
      type: String,
      required: true,
      trim: true,
    },
    targetPhonemes: [String],
    gradeMin: {
      type: String,
      enum: grades,
      required: true,
    },
    gradeMax: {
      type: String,
      enum: grades,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    skill: {
      type: String,
      trim: true,
    },
    targetSound: {
      type: String,
      trim: true,
    },
    confusionGroup: {
      type: String,
      trim: true,
    },
    referenceAudioUrl: {
      type: String,
      trim: true,
    },
    instructionSi: {
      type: String,
      trim: true,
    },
    instructionEn: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpeechPrompt", speechPromptSchema);
