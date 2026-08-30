const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
    },
    grade: {
      type: String,
      required: true,
      enum: ["2", "3", "4", "5"],
    },
    school: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    accountStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    role: {
      type: String,
      enum: ["student"],
      default: "student",
    },
    profilePhoto: {
      type: String,
    },
    lexilandProgress: {
      overallIdentificationStatus: {
        type: String,
        enum: ["not_started", "in_progress", "completed"],
        default: "not_started",
      },
      overallSupportLevel: {
        type: String,
        enum: ["unknown", "low", "medium", "high"],
        default: "unknown",
      },
      improvementUnlocked: {
        type: Boolean,
        default: false,
      },
      speech: {
        identificationStatus: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        supportLevel: {
          type: String,
          enum: ["unknown", "low_support", "medium_support", "high_support"],
          default: "unknown",
        },
        supportScore: Number,
        identificationCompletedAt: Date,
        improvementUnlocked: {
          type: Boolean,
          default: false,
        },
        recommendedActivityIds: [String],
        completedActivityIds: [String],
        currentActivityId: String,
        stars: {
          type: Number,
          default: 0,
        },
        weakSkillFocus: String,
        baselineSnapshotId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SpeechAssessmentSnapshot",
        },
        latestCheckpointSnapshotId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SpeechAssessmentSnapshot",
        },
        checkpointCount: {
          type: Number,
          default: 0,
        },
        activitiesSinceCheckpoint: {
          type: Number,
          default: 0,
        },
        baselineRetestRequired: {
          type: Boolean,
          default: false,
        },
        activityProgress: [
          {
            activityId: String,
            status: {
              type: String,
              enum: ["locked", "available", "recommended", "current", "completed"],
              default: "locked",
            },
            starsEarned: {
              type: Number,
              default: 0,
            },
            attemptsCompleted: {
              type: Number,
              default: 0,
            },
            bestScore: Number,
            stars: {
              type: Number,
              default: 0,
            },
            completedAt: Date,
            lastPlayedAt: Date,
          },
        ],
      },
      // TODO: Wire Working Memory identification output into LexiLand progress.
      // TODO: Wire Phonological Awareness identification output into LexiLand progress.
      // TODO: Wire Reading Processing identification output into LexiLand progress.
    },
  },
  { timestamps: true }
);

studentSchema.statics.ensureCompatibleIndexes = async function ensureCompatibleIndexes() {
  await this.createCollection();
  const indexes = await this.collection.indexes();
  const emailIndex = indexes.find((index) => index.name === "email_1");

  if (emailIndex?.unique && !emailIndex.sparse) {
    await this.collection.dropIndex("email_1");
  }

  await this.collection.createIndex(
    { email: 1 },
    { unique: true, sparse: true, name: "email_1" }
  );
  await this.collection.createIndex(
    { username: 1 },
    { unique: true, sparse: true, name: "username_1" }
  );
};

module.exports = mongoose.model("Student", studentSchema);
