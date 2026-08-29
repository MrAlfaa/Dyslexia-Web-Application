const test = require("node:test");
const assert = require("node:assert/strict");

const controller = require("../controllers/speechProcessing.controller");
const SpeechAttempt = require("../models/speechAttempt.model");
const SpeechManualLabel = require("../models/speechManualLabel.model");
const SpeechSession = require("../models/speechSession.model");
const Student = require("../../common/models/student.model");

let SpeechAssessmentSnapshot = null;
try {
  SpeechAssessmentSnapshot = require("../models/speechAssessmentSnapshot.model");
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
}

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
  select() { return this; },
  sort() { return this; },
  async lean() { return value; },
});

const child = {
  _id: "child-1",
  fullName: "Sample Child",
  username: "sample-child",
  grade: "4",
  guardianId: "guardian-1",
  createdByAdmin: "guardian-1",
};

const session = {
  _id: "session-1",
  activityId: "leo_story_roar",
  mode: "identification",
  status: "completed",
  starsEarned: 3,
  modelVersion: "private-version",
  probabilities: { high_support: 0.8 },
};

const attempt = {
  _id: "attempt-1",
  sessionId: "session-1",
  promptId: "prompt-1",
  taskType: "word_read",
  targetText: "cat",
  validAudio: true,
  audioStorage: { originalSecureUrl: "https://audio.example.test/cat.wav" },
  normalizedAudioPath: "private-normalized.wav",
  processingStatus: "completed",
  processingSteps: { asr: "completed" },
  audioQuality: { qualityLabel: "good", qualityScore: 0.94 },
  pronunciationModel: {
    modelVersion: "private-attempt-model",
    probabilities: { medium_support: 0.8 },
    featuresUsedCount: 44,
  },
  wordReading: {
    asrText: "cat",
    normalizedAsrText: "cat",
    wordCorrect: true,
    similarityScore: 1,
    editDistance: 0,
    asrProvider: "private-provider",
  },
  phonemeComparison: {
    targetPhonemes: ["K", "AE", "T"],
    asrPhonemes: ["K", "AE", "T"],
    phonemeEditDistance: 0,
    confidence: "high",
    initialSoundError: false,
    finalSoundError: false,
    vowelMismatch: false,
    consonantClusterError: false,
  },
};

const installDataStubs = ({ superAdmin = false } = {}) => {
  const originals = {
    studentFindById: Student.findById,
    sessionFind: SpeechSession.find,
    attemptFind: SpeechAttempt.find,
    labelFind: SpeechManualLabel.find,
    snapshotFind: SpeechAssessmentSnapshot?.find,
  };
  Student.findById = () => createQuery(child);
  SpeechSession.find = () => createQuery([session]);
  SpeechAttempt.find = () => createQuery([attempt]);
  SpeechManualLabel.find = () => createQuery([]);
  if (superAdmin && SpeechAssessmentSnapshot) {
    SpeechAssessmentSnapshot.find = () => createQuery([]);
  }
  return () => {
    Student.findById = originals.studentFindById;
    SpeechSession.find = originals.sessionFind;
    SpeechAttempt.find = originals.attemptFind;
    SpeechManualLabel.find = originals.labelFind;
    if (SpeechAssessmentSnapshot) {
      SpeechAssessmentSnapshot.find = originals.snapshotFind;
    }
  };
};

test("guardian history capability is false and its payload excludes technical evidence", async () => {
  const restore = installDataStubs();
  try {
    const res = createResponse();
    await controller.getGuardianSessionHistory(
      { params: { childId: "child-1" }, user: { id: "guardian-1", role: "guardian" } },
      res
    );

    assert.deepEqual(res.body.data.viewer, { canViewTechnical: false });
    const safeSession = res.body.data.sessions[0];
    assert.equal(safeSession.datasetReadiness, undefined);
    assert.equal(safeSession.pronunciationSummary, undefined);
    assert.equal(safeSession.modelVersion, undefined);
    assert.equal(safeSession.probabilities, undefined);
    const safeAttempt = safeSession.attempts[0];
    for (const field of ["processingStatus", "processingSteps", "pronunciationModel", "normalizedAudioPath"]) {
      assert.equal(safeAttempt[field], undefined);
    }
    assert.equal(safeAttempt.wordReading.editDistance, undefined);
    assert.equal(safeAttempt.wordReading.asrProvider, undefined);
    assert.equal(safeAttempt.wordReading.normalizedAsrText, undefined);
    assert.equal(safeAttempt.phonemeComparison.targetPhonemes, undefined);
    assert.equal(safeAttempt.phonemeComparison.asrPhonemes, undefined);
    assert.equal(safeAttempt.phonemeComparison.phonemeEditDistance, undefined);
    assert.equal(safeAttempt.phonemeComparison.confidence, undefined);
    assert.equal(safeAttempt.audioUrl, "https://audio.example.test/cat.wav");
    assert.equal(safeAttempt.targetText, "cat");
    assert.equal(safeAttempt.wordReading.asrText, "cat");
    assert.equal(safeAttempt.wordReading.wordCorrect, true);
    assert.equal(safeAttempt.wordReading.similarityScore, 1);
    assert.equal(safeAttempt.phonemeComparison.initialSoundError, false);
  } finally {
    restore();
  }
});

test("super-admin history capability is true and retains technical evidence", async () => {
  const restore = installDataStubs({ superAdmin: true });
  try {
    const res = createResponse();
    await controller.getGuardianSessionHistory(
      { params: { childId: "child-1" }, user: { id: "super-1", role: "super admin" } },
      res
    );

    assert.deepEqual(res.body.data.viewer, { canViewTechnical: true });
    assert.equal(res.body.data.sessions[0].modelVersion, "private-version");
    assert.equal(res.body.data.sessions[0].attempts[0].processingStatus, "completed");
    assert.equal(
      res.body.data.sessions[0].attempts[0].pronunciationModel.modelVersion,
      "private-attempt-model"
    );
  } finally {
    restore();
  }
});
