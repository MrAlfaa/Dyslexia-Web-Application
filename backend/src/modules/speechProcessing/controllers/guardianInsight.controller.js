const crypto = require("crypto");

const Student = require("../../common/models/student.model");
const SpeechSession = require("../models/speechSession.model");
const SpeechAttempt = require("../models/speechAttempt.model");
const SpeechAssessmentSnapshot = require("../models/speechAssessmentSnapshot.model");
const SpeechGuardianInsight = require("../models/speechGuardianInsight.model");
const { buildGuardianInsightPayload } = require("../services/guardianInsightPayload.service");
const {
  generateGuardianInsight,
  getOllamaGuardianConfig,
} = require("../services/ollamaGuardianInsight.service");

const PROMPT_VERSION = "guardian_guide_v1";

const isSuperAdmin = (req) => req.user?.role === "super admin";

const canAccessChild = (req, child) => {
  if (!child) return false;
  if (isSuperAdmin(req)) return true;
  return (
    String(child.guardianId || "") === String(req.user?.id || "") ||
    String(child.createdByAdmin || "") === String(req.user?.id || "")
  );
};

const mean = (values) => {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (!numbers.length) return undefined;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(4));
};

const summarizeAttempts = (attempts = []) => {
  const validWordAttempts = attempts.filter((attempt) => attempt.wordReading?.attemptStatus === "valid");
  const validPhonemeAttempts = attempts.filter((attempt) =>
    ["completed", "asr_empty"].includes(attempt.phonemeComparison?.status)
  );
  const validSentenceAttempts = attempts.filter((attempt) => attempt.sentenceReading?.status === "valid");
  const correctWordCount = validWordAttempts.filter((attempt) => attempt.wordReading?.wordCorrect).length;
  const errorCounts = {};
  validPhonemeAttempts.forEach((attempt) => {
    const pattern = attempt.phonemeComparison?.errorPattern;
    if (pattern && pattern !== "none") errorCounts[pattern] = (errorCounts[pattern] || 0) + 1;
  });

  return {
    attemptSummary: {
      totalAttemptCount: attempts.length,
      validAttemptCount: attempts.filter((attempt) => attempt.validAudio).length,
    },
    wordReadingSummary: {
      analyzedAttemptCount: validWordAttempts.length,
      wordReadingAccuracy: validWordAttempts.length
        ? Number((correctWordCount / validWordAttempts.length).toFixed(4))
        : undefined,
      meanSimilarityScore: mean(validWordAttempts.map((attempt) => attempt.wordReading?.similarityScore)),
    },
    phonemeSummary: {
      analyzedAttemptCount: validPhonemeAttempts.length,
      meanPhonemeErrorRate: mean(
        validPhonemeAttempts.map((attempt) => attempt.phonemeComparison?.phonemeErrorRate)
      ),
      commonErrorPattern: Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0],
    },
    sentenceSummary: {
      analyzedAttemptCount: validSentenceAttempts.length,
      meanCoverageScore: mean(validSentenceAttempts.map((attempt) => attempt.sentenceReading?.wordCoverage)),
      meanWordErrorRate: mean(validSentenceAttempts.map((attempt) => attempt.sentenceReading?.wordErrorRate)),
    },
  };
};

const loadInsightContext = async (req) => {
  const child = await Student.findById(req.params.childId)
    .select("grade guardianId createdByAdmin lexilandProgress")
    .lean();
  if (!child) return { errorStatus: 404, errorMessage: "Child not found" };
  if (!canAccessChild(req, child)) return { errorStatus: 403, errorMessage: "Access denied" };

  const [latestSession, snapshots] = await Promise.all([
    SpeechSession.findOne({ studentId: child._id }).sort({ createdAt: -1 }).lean(),
    SpeechAssessmentSnapshot.find({ studentId: child._id, isCurrent: true })
      .sort({ createdAt: 1, sequenceNo: 1 })
      .lean(),
  ]);
  const attempts = latestSession
    ? await SpeechAttempt.find({ sessionId: latestSession._id }).sort({ createdAt: 1 }).lean()
    : [];
  const latestSnapshot = snapshots[snapshots.length - 1] || null;
  const speech = child.lexilandProgress?.speech || {};
  const attemptEvidence = summarizeAttempts(attempts);
  const recommendation = {
    skillFocus: speech.weakSkillFocus,
    recommendedActivities: (speech.recommendedActivityIds || []).map((activityId) => ({ activityId })),
    nextActivity: speech.currentActivityId ? { activityId: speech.currentActivityId } : null,
  };
  const locale = req.query?.locale === "en-US" ? "en-US" : "si-LK";
  const payload = buildGuardianInsightPayload({
    child,
    latestSession: latestSession ? { ...latestSession, ...attemptEvidence } : attemptEvidence,
    latestSnapshot,
    checkpointCount: Number(speech.checkpointCount || 0),
    recommendation,
    locale,
  });
  return { child, latestSnapshot, payload, locale };
};

const hashPayload = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const shapeInsightResponse = (record, { cached }) => ({
  id: record._id,
  status: record.status,
  source: record.source,
  model: record.model,
  insight: record.insight,
  generatedAt: record.generatedAt,
  cached,
});

const resolveInsight = async (req, { forceRefresh = false } = {}) => {
  const context = await loadInsightContext(req);
  if (context.errorStatus) return context;

  const config = getOllamaGuardianConfig();
  const inputHash = hashPayload(context.payload);
  const cacheFilter = {
    studentId: context.child._id,
    inputHash,
    locale: context.locale,
    model: config.model,
    promptVersion: PROMPT_VERSION,
  };

  if (!forceRefresh) {
    const cached = await SpeechGuardianInsight.findOne(cacheFilter).sort({ generatedAt: -1 }).lean();
    if (cached) return { data: shapeInsightResponse(cached, { cached: true }) };
  }

  const generated = await generateGuardianInsight({ payload: context.payload, config });
  const recordData = {
    ...cacheFilter,
    snapshotId: context.latestSnapshot?._id,
    status: generated.status,
    source: generated.source,
    reason: generated.reason,
    insight: generated.insight,
    generatedAt: new Date(),
  };

  let saved = recordData;
  try {
    saved = await SpeechGuardianInsight.findOneAndUpdate(
      cacheFilter,
      { $set: recordData },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
  } catch (error) {
    console.error("Guardian insight cache save failed:", error.message);
  }

  return { data: shapeInsightResponse(saved, { cached: false }) };
};

const sendInsight = async (req, res, options) => {
  try {
    const result = await resolveInsight(req, options);
    if (result.errorStatus) {
      return res.status(result.errorStatus).json({ success: false, message: result.errorMessage });
    }
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Guardian insight error:", error.message);
    return res.status(500).json({ success: false, message: "Leo could not prepare the guardian guide" });
  }
};

exports.getGuardianInsight = (req, res) => sendInsight(req, res, { forceRefresh: false });
exports.refreshGuardianInsight = (req, res) => sendInsight(req, res, { forceRefresh: true });
exports.hashPayload = hashPayload;
exports.summarizeAttempts = summarizeAttempts;
