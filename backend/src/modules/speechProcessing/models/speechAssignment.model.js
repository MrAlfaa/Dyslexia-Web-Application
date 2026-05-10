const mongoose = require("mongoose");

const speechAssignmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "Speech Activity",
    },
    description: {
      type: String,
      trim: true,
    },
    promptIds: [String],
    targetSkill: {
      type: String,
      trim: true,
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ["assigned", "in_progress", "completed", "cancelled"],
      default: "assigned",
    },
    mode: {
      type: String,
      enum: ["assigned", "practice"],
      default: "assigned",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpeechAssignment", speechAssignmentSchema);
