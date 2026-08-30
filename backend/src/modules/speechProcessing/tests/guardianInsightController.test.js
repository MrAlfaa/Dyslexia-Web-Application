const test = require("node:test");
const assert = require("node:assert/strict");

const controller = require("../controllers/guardianInsight.controller");
const Student = require("../../common/models/student.model");
const SpeechSession = require("../models/speechSession.model");
const SpeechAttempt = require("../models/speechAttempt.model");
const SpeechAssessmentSnapshot = require("../models/speechAssessmentSnapshot.model");
const SpeechGuardianInsight = require("../models/speechGuardianInsight.model");

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const query = (value) => ({
  select() { return this; },
  sort() { return this; },
  async lean() { return value; },
});

test("guardian insight denies access to a child owned by another guardian", async () => {
  const original = Student.findById;
  try {
    Student.findById = () => query({
      _id: "child-1",
      grade: "4",
      guardianId: "guardian-2",
      createdByAdmin: "guardian-2",
    });
    const res = response();
    await controller.getGuardianInsight({
      params: { childId: "child-1" },
      query: {},
      user: { id: "guardian-1", type: "admin", role: "guardian" },
    }, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
  } finally {
    Student.findById = original;
  }
});

test("guardian insight returns a matching cached allowlisted result", async () => {
  const originals = {
    student: Student.findById,
    session: SpeechSession.findOne,
    attempts: SpeechAttempt.find,
    snapshots: SpeechAssessmentSnapshot.find,
    insight: SpeechGuardianInsight.findOne,
  };
  try {
    Student.findById = () => query({
      _id: "child-1",
      grade: "4",
      guardianId: "guardian-1",
      createdByAdmin: "guardian-1",
      lexilandProgress: { speech: { checkpointCount: 1 } },
    });
    SpeechSession.findOne = () => query({
      _id: "session-1",
      wordReadingSummary: {},
      phonemeSummary: {},
      pronunciationSummary: {},
    });
    SpeechAttempt.find = () => query([]);
    SpeechAssessmentSnapshot.find = () => query([{
      _id: "snapshot-1",
      status: "ready",
      trendStatus: "stable",
      sequenceNo: 1,
      createdAt: new Date("2026-08-29T00:00:00.000Z"),
      metrics: { wordAccuracy: 0.75, retryRate: 0.2 },
    }]);
    SpeechGuardianInsight.findOne = () => query({
      _id: "insight-1",
      status: "ready",
      source: "ollama_cloud",
      insight: {
        summary: "Cached summary",
        strengths: ["Cached strength"],
        focusAreas: ["Cached focus"],
        homeActivities: [
          { title: "One", instruction: "Practice one", minutes: 5 },
          { title: "Two", instruction: "Practice two", minutes: 5 },
        ],
        disclaimer: "Not a diagnosis",
      },
      generatedAt: new Date("2026-08-29T01:00:00.000Z"),
      model: "test-model",
    });

    const res = response();
    await controller.getGuardianInsight({
      params: { childId: "child-1" },
      query: { locale: "si-LK" },
      user: { id: "guardian-1", type: "admin", role: "guardian" },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.cached, true);
    assert.equal(res.body.data.insight.summary, "Cached summary");
    assert.equal(res.body.data.inputHash, undefined);
    assert.equal(res.body.data.studentId, undefined);
  } finally {
    Student.findById = originals.student;
    SpeechSession.findOne = originals.session;
    SpeechAttempt.find = originals.attempts;
    SpeechAssessmentSnapshot.find = originals.snapshots;
    SpeechGuardianInsight.findOne = originals.insight;
  }
});
