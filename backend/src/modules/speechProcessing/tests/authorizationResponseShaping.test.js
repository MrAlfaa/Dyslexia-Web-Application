const test = require("node:test");
const assert = require("node:assert/strict");

const controller = require("../controllers/speechProcessing.controller");
const SpeechAttempt = require("../models/speechAttempt.model");
const SpeechManualLabel = require("../models/speechManualLabel.model");
const SpeechSession = require("../models/speechSession.model");
const Student = require("../../common/models/student.model");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const createQuery = (value) => ({
  populate() {
    return this;
  },
  sort() {
    return this;
  },
  async lean() {
    return value;
  },
});

const privateSession = () => ({
  _id: "session-1",
  studentId: {
    _id: "child-1",
    fullName: "Sample Child",
    username: "sample-child",
    email: "child@example.test",
    grade: "4",
    guardianId: "guardian-1",
    createdByAdmin: "guardian-1",
    futureStudentSecret: "deny-me",
  },
  teacherId: "teacher-private",
  assignmentId: "assignment-private",
  activityId: "leo_story_roar",
  grade: "4",
  mode: "identification",
  status: "completed",
  snapshotStatus: "ready",
  supportLevel: "medium_support",
  supportScore: 0.7,
  starsEarned: 3,
  promptSet: ["private-prompt"],
  modelName: "private-model",
  modelVersion: "private-version",
  predictionSource: "private-source",
  featureSchemaVersion: "private-schema",
  calibrationVerified: false,
  probabilities: { high_support: 0.8 },
  confidence: 0.8,
  audioStorage: { originalPublicId: "private-storage-id" },
  processingError: "private-processing-error",
  futureMongooseField: "deny-me",
  pronunciationSummary: {
    status: "ready",
    dominantPrediction: "medium_support",
    meanPronunciationScore: 0.68,
    validPredictionCount: 3,
    meanProbabilities: { medium_support: 0.8 },
    modelVersion: "private-pronunciation-version",
    error: "private-model-error",
  },
  startedAt: "2026-08-29T01:00:00.000Z",
  completedAt: "2026-08-29T01:10:00.000Z",
  createdAt: "2026-08-29T01:00:00.000Z",
});

const assertNormalAdminSessionIsAllowlisted = (session, extraKeys = []) => {
  assert.deepEqual(Object.keys(session).sort(), [
    "_id",
    "activityId",
    "completedAt",
    "createdAt",
    "grade",
    "mode",
    "pronunciationSummary",
    "snapshotStatus",
    "starsEarned",
    "startedAt",
    "status",
    "studentId",
    "supportLevel",
    "supportScore",
    ...extraKeys,
  ].sort());
  assert.deepEqual(Object.keys(session.studentId).sort(), [
    "_id",
    "email",
    "fullName",
    "grade",
    "username",
  ].sort());
  assert.deepEqual(session.pronunciationSummary, {
    status: "ready",
    dominantPrediction: "medium_support",
    meanPronunciationScore: 0.68,
    validPredictionCount: 3,
  });
};

test("normal admin results use explicit session and nested student allowlists", async () => {
  const originals = {
    studentFind: Student.find,
    sessionFind: SpeechSession.find,
    attemptFind: SpeechAttempt.find,
    labelFind: SpeechManualLabel.find,
  };
  try {
    Student.find = () => ({ select: async () => [{ _id: "child-1" }] });
    SpeechSession.find = () => createQuery([privateSession()]);
    SpeechAttempt.find = () => createQuery([
      { sessionId: "session-1", validAudio: true, futureAttemptSecret: "deny-me" },
    ]);
    SpeechManualLabel.find = () => createQuery([
      { sessionId: "session-1", speechSupportLabel: "medium_support" },
    ]);

    const res = createResponse();
    await controller.getAdminResults(
      { query: {}, user: { id: "guardian-1", type: "admin", role: "guardian" } },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assertNormalAdminSessionIsAllowlisted(res.body.data[0], [
      "attemptSummary",
      "manualLabelCount",
    ]);
    assert.deepEqual(res.body.data[0].attemptSummary, {
      validAttemptCount: 1,
      totalAttemptCount: 1,
    });
    assert.equal(res.body.data[0].manualLabelCount, 1);
    assert.equal(res.body.data[0].totalAttemptCount, undefined);
  } finally {
    Student.find = originals.studentFind;
    SpeechSession.find = originals.sessionFind;
    SpeechAttempt.find = originals.attemptFind;
    SpeechManualLabel.find = originals.labelFind;
  }
});

test("normal admin cannot filter speech results to a child they do not own", async () => {
  const originals = {
    studentFind: Student.find,
    sessionFind: SpeechSession.find,
  };
  try {
    Student.find = () => ({ select: async () => [{ _id: "child-1" }] });
    SpeechSession.find = () => {
      throw new Error("session query should not run for an unowned child");
    };

    const res = createResponse();
    await controller.getAdminResults(
      {
        query: { studentId: "child-2" },
        user: { id: "guardian-1", type: "admin", role: "guardian" },
      },
      res
    );

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { success: false, message: "Access denied" });
  } finally {
    Student.find = originals.studentFind;
    SpeechSession.find = originals.sessionFind;
  }
});

test("normal admin session list cannot expose model, storage, error, or future fields", async () => {
  const originals = {
    studentFind: Student.find,
    sessionFind: SpeechSession.find,
    attemptAggregate: SpeechAttempt.aggregate,
  };
  try {
    Student.find = () => ({ select: async () => [{ _id: "child-1" }] });
    SpeechSession.find = () => createQuery([privateSession()]);
    SpeechAttempt.aggregate = async () => [{ _id: "session-1", totalAttemptCount: 4 }];

    const res = createResponse();
    await controller.getAdminSessions(
      { query: {}, user: { id: "guardian-1", type: "admin", role: "guardian" } },
      res
    );

    assert.equal(res.statusCode, 200);
    assertNormalAdminSessionIsAllowlisted(res.body.data[0], ["totalAttemptCount"]);
    assert.equal(res.body.data[0].totalAttemptCount, 4);
    assert.equal(res.body.data[0].attemptSummary, undefined);
    assert.equal(res.body.data[0].manualLabelCount, undefined);
  } finally {
    Student.find = originals.studentFind;
    SpeechSession.find = originals.sessionFind;
    SpeechAttempt.aggregate = originals.attemptAggregate;
  }
});

test("legacy guardian identification response uses the safe pronunciation summary", async () => {
  const originals = {
    studentFindById: Student.findById,
    sessionFindOne: SpeechSession.findOne,
    attemptFind: SpeechAttempt.find,
  };
  try {
    const child = {
      _id: "child-1",
      fullName: "Sample Child",
      username: "sample-child",
      grade: "4",
      guardianId: "guardian-1",
      createdByAdmin: "guardian-1",
      lexilandProgress: {
        speech: {
          identificationStatus: "completed",
          supportLevel: "medium_support",
          supportScore: 0.7,
          recommendedActivityIds: ["leo_story_roar"],
        },
      },
    };
    Student.findById = () => ({
      select() {
        return this;
      },
      async lean() {
        return child;
      },
    });
    SpeechSession.findOne = () => createQuery(privateSession());
    SpeechAttempt.find = () => createQuery([]);

    const res = createResponse();
    await controller.getGuardianIdentificationResult(
      {
        params: { childId: "child-1" },
        user: { id: "guardian-1", type: "admin", role: "guardian" },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(Object.keys(res.body.data.recentSession).sort(), [
      "attemptSummary",
      "completedAt",
      "id",
      "mode",
      "pronunciationSummary",
      "snapshotStatus",
      "status",
      "supportLevel",
      "supportScore",
    ].sort());
    assert.deepEqual(res.body.data.recentSession.pronunciationSummary, {
      status: "ready",
      dominantPrediction: "medium_support",
      meanPronunciationScore: 0.68,
      validPredictionCount: 3,
    });
    assert.equal(res.body.data.recentSession.snapshotStatus, "ready");
  } finally {
    Student.findById = originals.studentFindById;
    SpeechSession.findOne = originals.sessionFindOne;
    SpeechAttempt.find = originals.attemptFind;
  }
});

test("super-admin results retain diagnostic session fields", async () => {
  const originals = {
    sessionFind: SpeechSession.find,
    attemptFind: SpeechAttempt.find,
    labelFind: SpeechManualLabel.find,
  };
  try {
    SpeechSession.find = () => createQuery([privateSession()]);
    SpeechAttempt.find = () => createQuery([]);
    SpeechManualLabel.find = () => createQuery([]);

    const res = createResponse();
    await controller.getAdminResults(
      { query: {}, user: { id: "super-1", type: "admin", role: "super admin" } },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data[0].modelVersion, "private-version");
    assert.deepEqual(res.body.data[0].probabilities, { high_support: 0.8 });
    assert.equal(res.body.data[0].futureMongooseField, "deny-me");
  } finally {
    SpeechSession.find = originals.sessionFind;
    SpeechAttempt.find = originals.attemptFind;
    SpeechManualLabel.find = originals.labelFind;
  }
});
