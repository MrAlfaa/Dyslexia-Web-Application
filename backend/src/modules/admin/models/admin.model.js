const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["school admin", "super admin"],
      required: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ["individual", "plus", "premium"],
      default: "individual",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "trial"],
      default: "trial",
    },
    childLimit: {
      type: Number,
      default: 1,
    },
    planStartedAt: {
      type: Date,
      default: Date.now,
    },
    planExpiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
