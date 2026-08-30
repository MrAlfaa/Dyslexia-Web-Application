const SpeechAssessmentSnapshot = require("../models/speechAssessmentSnapshot.model");
const SpeechAttempt = require("../models/speechAttempt.model");
const {
  buildAssessmentSnapshot,
} = require("./speechAssessment.service");
const {
  compareAssessmentSnapshots,
} = require("./speechProgressComparison.service");

const isCalibrationVerified = () =>
  String(process.env.PRONUNCIATION_MODEL_CALIBRATED || "false").toLowerCase() === "true";

const toComparableSnapshot = (snapshot) =>
  snapshot
    ? {
        status: snapshot.status,
        modelVersion: snapshot.modelVersion,
        supportNeedScore: snapshot.supportNeedScore,
        metrics: snapshot.metrics || {},
      }
    : null;

const getSnapshotKind = (session) => {
  if (session.assessmentRole === "checkpoint") return "checkpoint";
  if (session.mode === "identification" || session.assessmentRole === "baseline") return "baseline";
  return "activity_estimate";
};

const getPendingAttemptCount = (attempts) =>
  attempts.filter(
    (attempt) =>
      ["pending", "processing"].includes(attempt.processingStatus) ||
      ["pending", "processing"].includes(attempt.processingSteps?.pronunciationModel)
  ).length;

const finalizeSessionSnapshot = async ({ session, force = false, kindOverride } = {}) => {
  const kind = kindOverride || getSnapshotKind(session);
  const sequenceNo = kind === "checkpoint" ? Number(session.checkpointSequence || 0) : 0;
  const existing = await SpeechAssessmentSnapshot.findOne({
    sessionId: session._id,
    kind,
    sequenceNo,
    isCurrent: true,
  }).sort({ revision: -1 });
  const existingFinalized = existing && ["ready", "insufficient_data", "needs_review"].includes(existing.status);
  if (existingFinalized && !force) return existing;
  const revision = existingFinalized && force ? Number(existing.revision || 1) + 1 : Number(existing?.revision || 1);

  const attemptQuery = { sessionId: session._id };
  if (kind === "checkpoint") attemptQuery.attemptPhase = "checkpoint";
  if (kind === "activity_estimate") attemptQuery.attemptPhase = "training";
  const attempts = await SpeechAttempt.find(attemptQuery).sort({ createdAt: 1 }).lean();
  const pendingAttemptCount = getPendingAttemptCount(attempts);
  const assessment = buildAssessmentSnapshot({
    attempts,
    kind,
    calibrationVerified: isCalibrationVerified(),
    minimumValidAttemptRatio: 0.7,
    minimumModelPredictions: 2,
    expectedPromptCount:
      kind === "checkpoint"
        ? session.checkpointPromptSet?.length
        : session.promptSet?.length,
  });

  const baseline = kind === "baseline"
    ? null
    : await SpeechAssessmentSnapshot.findOne({
        studentId: session.studentId,
        kind: "baseline",
        status: "ready",
        isCurrent: true,
      }).sort({ createdAt: 1 });
  const previous = kind === "checkpoint"
    ? await SpeechAssessmentSnapshot.findOne({
        studentId: session.studentId,
        kind: "checkpoint",
        status: "ready",
        isCurrent: true,
        sequenceNo: { $lt: sequenceNo },
      }).sort({ sequenceNo: -1 })
    : null;

  const comparison = kind === "checkpoint"
    ? compareAssessmentSnapshots({
        baseline: toComparableSnapshot(baseline),
        previous: toComparableSnapshot(previous),
        current: assessment,
      })
    : null;
  const status = assessment.status === "ready"
    ? "ready"
    : pendingAttemptCount && !force
      ? "processing"
      : "insufficient_data";

  const update = {
    studentId: session.studentId,
    sessionId: session._id,
    activityId: session.activityId || "",
    kind,
    sequenceNo,
    revision,
    isCurrent: true,
    status,
    baselineSnapshotId: baseline?._id,
    previousSnapshotId: previous?._id,
    modelName: assessment.modelName,
    modelVersion: assessment.modelVersion,
    calibrationVerified: assessment.calibrationVerified,
    supportLevel: assessment.supportLevel,
    supportNeedScore: assessment.supportNeedScore,
    confidence: assessment.confidence,
    probabilities: assessment.probabilities,
    metrics: assessment.metrics,
    qualityGate: assessment.qualityGate,
    baselineComparison: comparison?.baselineComparison,
    previousComparison: comparison?.previousComparison,
    trendStatus: comparison?.status || (status === "ready" ? "stable" : status),
    meaningfulDecision: comparison?.meaningfulDecision || false,
    crossVersionComparisonBlocked: comparison?.crossVersionComparisonBlocked || false,
    comparisonReason: comparison?.reason || "",
    finalizedAt: status === "ready" || status === "insufficient_data" ? new Date() : undefined,
    error: "",
  };

  if (existingFinalized && force) {
    await SpeechAssessmentSnapshot.findByIdAndUpdate(existing._id, {
      $set: { isCurrent: false, supersededAt: new Date() },
    });
  }

  return SpeechAssessmentSnapshot.findOneAndUpdate(
    { sessionId: session._id, kind, sequenceNo, revision },
    { $set: update },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );
};

const refreshPendingSnapshots = async (studentId) => {
  const pending = await SpeechAssessmentSnapshot.find({
    studentId,
    status: "processing",
    isCurrent: true,
  }).populate("sessionId");
  const refreshed = [];
  for (const snapshot of pending) {
    if (snapshot.sessionId) {
      refreshed.push(
        await finalizeSessionSnapshot({
          session: snapshot.sessionId,
          kindOverride: snapshot.kind,
        })
      );
    }
  }
  return refreshed;
};

module.exports = {
  finalizeSessionSnapshot,
  getSnapshotKind,
  refreshPendingSnapshots,
};
