const mongoose = require("mongoose");

const homeActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 80 },
    instruction: { type: String, required: true, maxlength: 260 },
    minutes: { type: Number, min: 3, max: 15, default: 5 },
  },
  { _id: false }
);

const guardianInsightSchema = new mongoose.Schema(
  {
    summary: { type: String, required: true, maxlength: 600 },
    strengths: [{ type: String, maxlength: 220 }],
    focusAreas: [{ type: String, maxlength: 220 }],
    homeActivities: [homeActivitySchema],
    disclaimer: { type: String, required: true, maxlength: 260 },
  },
  { _id: false }
);

const speechGuardianInsightSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    snapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpeechAssessmentSnapshot",
    },
    inputHash: { type: String, required: true },
    locale: { type: String, enum: ["si-LK", "en-US"], default: "si-LK" },
    promptVersion: { type: String, default: "guardian_guide_v1" },
    model: { type: String, required: true },
    status: {
      type: String,
      enum: ["ready", "fallback", "disabled", "insufficient_data"],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["ollama_cloud", "deterministic_fallback"],
      required: true,
    },
    reason: { type: String, maxlength: 80 },
    insight: { type: guardianInsightSchema, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

speechGuardianInsightSchema.index(
  { studentId: 1, inputHash: 1, locale: 1, model: 1, promptVersion: 1 },
  { unique: true }
);

module.exports = mongoose.model("SpeechGuardianInsight", speechGuardianInsightSchema);
