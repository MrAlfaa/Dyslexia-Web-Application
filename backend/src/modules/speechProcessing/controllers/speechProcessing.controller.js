const path = require("path");

const SpeechPrompt = require("../models/speechPrompt.model");
const SpeechAssignment = require("../models/speechAssignment.model");
const SpeechSession = require("../models/speechSession.model");
const SpeechAttempt = require("../models/speechAttempt.model");
const SpeechManualLabel = require("../models/speechManualLabel.model");
const Student = require("../../common/models/student.model");
const defaultPromptBank = require("../data/defaultPromptBank");
const legacyPromptBank = require("../data/promptBank");
const systemSpeechActivities = require("../data/systemSpeechActivities");
const leoIdentificationPrompts = require("../data/leoIdentificationPrompts");
const leoImprovementPrompts = require("../data/leoImprovementPrompts");
const {
  extractPlaceholderFeatures,
  getInvalidAudioChildFeedback,
} = require("../services/placeholderFeatureExtractor.service");
const {
  analyzeAudio,
} = require("../services/audioFeatureExtractor.service");
const { saveUploadedAudio } = require("../middleware/audioUpload.middleware");
const {
  aggregateSupportLevel,
  createItemResult,
} = require("../services/placeholderClassifier.service");
const {
  getActivityPlan,
  buildActivityMap,
} = require("../services/leoActivityRecommendation.service");
const { getLeoActivityAccess } = require("../services/leoActivityAccess.service");
const { getLeoAttemptProgress } = require("../services/leoAttemptProgress.service");
const {
  getActivityAward,
  mergeActivityProgress,
} = require("../services/leoActivityProgress.service");
const {
  predictPronunciationSupport,
} = require("../services/pronunciationModel.service");

const MODEL_VERSION = "placeholder_v1";
const PREDICTION_SOURCE = "placeholder_rule_based";
const TASK_TYPES = [
  "listen_repeat",
  "read_aloud_word",
  "pseudoword_read",
  "minimal_pair_read",
  "sentence_read",
];

const toBoolean = (value) => value === true || value === "true";

const isSuperAdminRequest = (req) => req.user?.role === "super admin";

const getLeoRecommendationIds = (supportLevel) => {
  if (supportLevel === "high_support") {
    return ["leo_first_sound_hunt", "leo_echo_roar", "leo_robot_words"];
  }
  if (supportLevel === "medium_support") {
    return ["leo_sound_twins", "leo_robot_words"];
  }
  return ["leo_story_roar"];
};

const getGuardianChildIds = async (req) => {
  if (isSuperAdminRequest(req)) return null;
  const children = await Student.find({
    $or: [{ guardianId: req.user.id }, { createdByAdmin: req.user.id }],
  }).select("_id");
  return children.map((child) => child._id);
};

const canAccessChild = (req, child) => {
  if (!child) return false;
  if (req.user?.type === "student") return String(child._id) === String(req.user.id);
  if (isSuperAdminRequest(req)) return true;
  return (
    String(child.guardianId || "") === String(req.user.id) ||
    String(child.createdByAdmin || "") === String(req.user.id)
  );
};

const getLeoPromptsForGrade = (grade) => {
  const childGrade = Number(grade);
  if (!childGrade) return leoIdentificationPrompts;

  const filtered = leoIdentificationPrompts.filter((prompt) => {
    const min = Number(prompt.gradeMin || "2");
    const max = Number(prompt.gradeMax || "5");
    return childGrade >= min && childGrade <= max;
  });

  return filtered.length ? filtered : leoIdentificationPrompts;
};

const getPromptById = (promptId) =>
  leoIdentificationPrompts.find((prompt) => prompt.promptId === promptId);

const leoActivitySequence = [
  "leo_first_sound_hunt",
  "leo_echo_roar",
  "leo_robot_words",
  "leo_sound_twins",
  "leo_story_roar",
];

const getImprovementActivities = () =>
  systemSpeechActivities.filter((activity) => activity.mode === "improvement");

const getActivityById = (activityId) =>
  getImprovementActivities().find((activity) => activity.activityId === activityId);

const getActivityPrompts = (activityId) => leoImprovementPrompts[activityId] || [];

const getImprovementUnlocked = (child) =>
  Boolean(
    child?.lexilandProgress?.improvementUnlocked ||
      child?.lexilandProgress?.speech?.improvementUnlocked ||
      process.env.LEXILAND_DEV_UNLOCK === "true"
  );

const getExpectedAnswer = (prompt) =>
  prompt?.targetSound || prompt?.correctAnswer || prompt?.targetText || "";

const buildActivityStates = (speech = {}) => {
  const plan = getActivityPlan({ speech });
  return buildActivityMap({ speech, plan });
};

const updateSpeechProgressFromAggregate = async (studentId, aggregate) => {
  const recommendedActivityIds =
    aggregate.recommendedActivityIds?.length
      ? aggregate.recommendedActivityIds
      : getLeoRecommendationIds(aggregate.supportLevel);
  await Student.findByIdAndUpdate(studentId, {
    $set: {
      "lexilandProgress.overallIdentificationStatus": "in_progress",
      "lexilandProgress.speech.identificationStatus": "completed",
      "lexilandProgress.speech.supportLevel": aggregate.supportLevel,
      "lexilandProgress.speech.supportScore": aggregate.supportScore,
      "lexilandProgress.speech.identificationCompletedAt": new Date(),
      "lexilandProgress.speech.improvementUnlocked": false,
      "lexilandProgress.speech.recommendedActivityIds": recommendedActivityIds,
      "lexilandProgress.speech.currentActivityId": recommendedActivityIds[0] || "",
    },
  });
  return recommendedActivityIds;
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const escapeCsv = (value) => {
  if (value === undefined || value === null) return "";
  const text = Array.isArray(value) ? value.join("|") : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const sendCsv = (res, filename, columns, rows) => {
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(",")),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
};

const promptQuery = ({ grade, taskType, skill, includeInactive = false }) => {
  const query = {};
  if (!includeInactive) query.isActive = true;
  if (taskType) query.taskType = taskType;
  if (skill) query.skill = skill;
  if (grade) {
    query.gradeMin = { $lte: String(grade) };
    query.gradeMax = { $gte: String(grade) };
  }
  return query;
};

const normalizePromptPayload = (body, adminId) => ({
  promptId: String(body.promptId || "").trim().toUpperCase(),
  taskType: body.taskType,
  targetText: String(body.targetText || "").trim(),
  targetPhonemes: parseJsonArray(body.targetPhonemes),
  gradeMin: String(body.gradeMin || "2"),
  gradeMax: String(body.gradeMax || "5"),
  difficulty: body.difficulty || "easy",
  skill: body.skill || "",
  targetSound: body.targetSound || "",
  confusionGroup: body.confusionGroup || "",
  referenceAudioUrl: body.referenceAudioUrl || "",
  instructionSi: body.instructionSi || "",
  instructionEn: body.instructionEn || "",
  createdByAdmin: adminId,
});

const getPromptMap = async (promptIds) => {
  const prompts = await SpeechPrompt.find({ promptId: { $in: promptIds } }).lean();
  return prompts.reduce((map, prompt) => {
    map[prompt.promptId] = prompt;
    return map;
  }, {});
};

const getRelativeUploadPath = (file) => {
  if (!file?.filename) return "";
  return path.posix.join("uploads", "speech", file.filename);
};

const getAudioUrl = (file) => {
  if (!file?.filename) return "";
  return `/uploads/speech/${file.filename}`;
};

const analyzeSavedAudio = async (savedFile, frontendAudioDurationMs) => {
  if (!savedFile?.path) return null;
  return analyzeAudio({
    filePath: savedFile.path,
    frontendAudioDurationMs:
      frontendAudioDurationMs !== undefined && frontendAudioDurationMs !== ""
        ? Number(frontendAudioDurationMs)
        : undefined,
  });
};

const getAttemptAudioAnalysisFields = (audioAnalysis) => {
  if (!audioAnalysis) {
    return {
      extractionStatus: "pending",
    };
  }

  return {
    normalizedAudioPath: audioAnalysis.normalizedAudioPath || "",
    normalizedAudioUrl: audioAnalysis.normalizedAudioUrl || "",
    serverAudioDurationMs: audioAnalysis.serverAudioDurationMs,
    frontendAudioDurationMs: audioAnalysis.frontendAudioDurationMs,
    durationMismatchMs: audioAnalysis.durationMismatchMs,
    audioMetadata: audioAnalysis.audioMetadata || {},
    volumeFeatures: audioAnalysis.volumeFeatures || {},
    silenceFeatures: audioAnalysis.silenceFeatures || {},
    audioQuality: audioAnalysis.audioQuality || {},
    extractionVersion: audioAnalysis.extractionVersion || "basic_audio_v1",
    extractionStatus: audioAnalysis.extractionStatus || "failed",
    extractionError: audioAnalysis.extractionError || "",
  };
};

const getSavedDurationMs = (audioAnalysis, fallbackDurationMs) =>
  Number(audioAnalysis?.serverAudioDurationMs || fallbackDurationMs || 0);

const getPronunciationModelResult = async ({ features, audioAnalysis }) =>
  predictPronunciationSupport({
    validAudio: Boolean(features?.validAudio),
    normalizedAudioPath: audioAnalysis?.normalizedAudioPath,
  });

const aggregatePronunciationSummary = (attempts = []) => {
  const successful = attempts.filter(
    (attempt) => attempt.pronunciationModel?.status === "success"
  );

  if (!successful.length) {
    return {
      status: "no_predictions",
      validPredictionCount: 0,
      updatedAt: new Date(),
    };
  }

  const counts = {};
  const probabilitySums = {};
  const scores = [];
  let modelVersion = "";

  successful.forEach((attempt) => {
    const model = attempt.pronunciationModel || {};
    if (model.prediction) counts[model.prediction] = (counts[model.prediction] || 0) + 1;
    if (model.modelVersion && !modelVersion) modelVersion = model.modelVersion;
    if (Number.isFinite(Number(model.predictedPronunciationScore))) {
      scores.push(Number(model.predictedPronunciationScore));
    }
    Object.entries(model.probabilities || {}).forEach(([label, value]) => {
      probabilitySums[label] = (probabilitySums[label] || 0) + Number(value || 0);
    });
  });

  const dominantPrediction = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
  const meanProbabilities = Object.entries(probabilitySums).reduce((summary, [label, total]) => {
    summary[label] = Number((total / successful.length).toFixed(4));
    return summary;
  }, {});
  const meanPronunciationScore = scores.length
    ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(3))
    : undefined;

  return {
    status: "success",
    dominantPrediction,
    meanPronunciationScore,
    meanProbabilities,
    validPredictionCount: successful.length,
    modelVersion,
    updatedAt: new Date(),
  };
};

const getChildAudioFeedback = (features, fallbackValidMessage) => {
  if (!features.validAudio) {
    return getInvalidAudioChildFeedback(features.invalidReason);
  }
  return features.childFeedback || fallbackValidMessage;
};

const summarizeAudioQuality = (attempts = []) => {
  const summary = {
    good: 0,
    fair: 0,
    poor: 0,
    invalid: 0,
    completedExtractions: 0,
    failedExtractions: 0,
  };

  attempts.forEach((attempt) => {
    const label = attempt.audioQuality?.qualityLabel || (attempt.validAudio ? "unknown" : "invalid");
    if (summary[label] !== undefined) summary[label] += 1;
    if (attempt.extractionStatus === "completed") summary.completedExtractions += 1;
    if (attempt.extractionStatus === "failed") summary.failedExtractions += 1;
  });

  return summary;
};

const getRecentImprovementAttempts = async (studentId, limit = 30) =>
  SpeechAttempt.find({ studentId, activityId: { $exists: true, $ne: "" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

const buildAttemptFromUpload = async ({
  req,
  studentId,
  teacherUpload = false,
}) => {
  const {
    sessionId,
    assignmentId,
    promptId,
    taskType,
    targetText,
    attemptNo,
    audioDurationMs,
  } = req.body;

  if (!sessionId || !promptId || !taskType || !targetText || !attemptNo) {
    return { status: 400, message: "Missing required attempt fields" };
  }

  const sessionQuery = { _id: sessionId, studentId };
  if (!teacherUpload) sessionQuery.studentId = req.user.id;
  const session = await SpeechSession.findOne(sessionQuery);

  if (!session) {
    return { status: 404, message: "Speech session not found" };
  }

  if (!teacherUpload && String(session.studentId) !== String(req.user.id)) {
    return { status: 403, message: "Cannot upload to another student's session" };
  }

  const savedFile = saveUploadedAudio({
    file: req.file,
    studentId,
    sessionId,
    promptId,
    attemptNo,
  });
  const audioAnalysis = await analyzeSavedAudio(savedFile, audioDurationMs);

  const features = extractPlaceholderFeatures({
    file: savedFile,
    fileMetadata: {
      audioSizeBytes: savedFile?.size || 0,
    },
    audioAnalysis,
    audioDurationMs,
    attemptNo,
    taskType,
    promptId,
    targetText,
    playedAudioFirst: toBoolean(req.body.playedAudioFirst),
  });
  const itemResult = createItemResult(features);
  const pronunciationModel = await getPronunciationModelResult({ features, audioAnalysis });

  const attempt = await SpeechAttempt.create({
    sessionId,
    studentId,
    assignmentId: assignmentId || session.assignmentId,
    promptId,
    taskType,
    targetText,
    targetPhonemes: parseJsonArray(req.body.targetPhonemes),
    attemptNo,
    audioOriginalName: savedFile?.originalname || "",
    audioMimeType: savedFile?.mimetype || "",
    audioSizeBytes: savedFile?.size || 0,
    audioFilePath: getRelativeUploadPath(savedFile),
    audioUrl: getAudioUrl(savedFile),
    ...getAttemptAudioAnalysisFields(audioAnalysis),
    audioDurationMs: getSavedDurationMs(audioAnalysis, audioDurationMs),
    validAudio: features.validAudio,
    invalidReason: features.invalidReason,
    playedAudioFirst: toBoolean(req.body.playedAudioFirst),
    features,
    itemResult,
    pronunciationModel,
  });

  if (session.assignmentId) {
    await SpeechAssignment.findByIdAndUpdate(session.assignmentId, {
      status: "in_progress",
    });
  }

  return {
    attempt,
    features,
    itemResult,
  };
};

exports.getPrompts = async (req, res) => {
  try {
    const prompts = await SpeechPrompt.find(promptQuery(req.query)).sort({
      promptId: 1,
    });

    if (prompts.length) {
      return res.status(200).json({ success: true, data: prompts });
    }

    const { grade, taskType, skill } = req.query;
    const fallback = legacyPromptBank.filter((prompt) => {
      const gradeOk = !grade || prompt.grade === String(grade);
      const taskOk = !taskType || prompt.taskType === taskType;
      const skillOk = !skill || prompt.skill === skill;
      return gradeOk && taskOk && skillOk;
    });
    res.status(200).json({ success: true, data: fallback });
  } catch (error) {
    console.error("Speech prompts error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch prompts" });
  }
};

exports.getMyAssignments = async (req, res) => {
  try {
    const assignments = await SpeechAssignment.find({
      studentId: req.user.id,
      status: { $in: ["assigned", "in_progress"] },
    })
      .sort({ createdAt: -1 })
      .lean();
    const promptIds = [...new Set(assignments.flatMap((item) => item.promptIds || []))];
    const promptMap = await getPromptMap(promptIds);

    res.status(200).json({
      success: true,
      data: assignments.map((assignment) => ({
        ...assignment,
        prompts: (assignment.promptIds || []).map((id) => promptMap[id]).filter(Boolean),
      })),
    });
  } catch (error) {
    console.error("Speech assignments error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch assignments" });
  }
};

exports.startSession = async (req, res) => {
  try {
    const { grade, mode = "demo", assignmentId, promptSet = [] } = req.body;

    if (!grade) {
      return res.status(400).json({ success: false, message: "Grade is required" });
    }

    if (!["demo", "assigned", "data_collection", "identification", "improvement"].includes(mode)) {
      return res.status(400).json({ success: false, message: "Invalid session mode" });
    }

    let assignment = null;
    if (assignmentId) {
      assignment = await SpeechAssignment.findOne({
        _id: assignmentId,
        studentId: req.user.id,
      });
      if (!assignment) {
        return res.status(404).json({ success: false, message: "Assignment not found" });
      }
    }

    const session = await SpeechSession.create({
      studentId: req.user.id,
      assignmentId: assignmentId || undefined,
      teacherId: assignment?.teacherId,
      grade,
      mode,
      promptSet,
      status: "in_progress",
      modelVersion: MODEL_VERSION,
      predictionSource: PREDICTION_SOURCE,
      startedAt: new Date(),
    });

    if (assignment) {
      assignment.status = "in_progress";
      await assignment.save();
    }

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        modelVersion: MODEL_VERSION,
        predictionSource: PREDICTION_SOURCE,
      },
    });
  } catch (error) {
    console.error("Speech session start error:", error);
    res.status(500).json({ success: false, message: "Failed to start speech session" });
  }
};

exports.uploadAttempt = async (req, res) => {
  try {
    const result = await buildAttemptFromUpload({
      req,
      studentId: req.user.id,
      teacherUpload: false,
    });

    if (result.status) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    res.status(201).json({
      success: true,
      data: {
        attemptId: result.attempt._id,
        audioUrl: result.attempt.audioUrl,
        normalizedAudioUrl: result.attempt.normalizedAudioUrl,
        validAudio: result.features.validAudio,
        audioQuality: result.attempt.audioQuality,
        features: result.features,
        itemResult: result.itemResult,
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Speech attempt upload error:", error);
    res.status(500).json({ success: false, message: "Failed to upload speech attempt" });
  }
};

exports.analyzeAttempt = async (req, res) => {
  try {
    const {
      sessionId,
      promptId,
      taskType,
      targetText,
      audioDurationMs,
      attemptNo,
    } = req.body;

    if (!sessionId || !promptId || !taskType || !targetText || audioDurationMs === undefined || !attemptNo) {
      return res.status(400).json({ success: false, message: "Missing required attempt fields" });
    }

    const session = await SpeechSession.findOne({ _id: sessionId, studentId: req.user.id });
    if (!session) {
      return res.status(404).json({ success: false, message: "Speech session not found" });
    }

    const features = extractPlaceholderFeatures({
      audioDurationMs,
      attemptNo,
      taskType,
      fileMetadata: { audioSizeBytes: 1 },
    });
    const itemResult = createItemResult(features);
    const promptIndex = Array.isArray(session.promptSet)
      ? session.promptSet.findIndex((item) => item === promptId)
      : -1;

    const attempt = await SpeechAttempt.create({
      sessionId,
      studentId: req.user.id,
      assignmentId: session.assignmentId,
      promptId,
      taskType,
      targetText,
      attemptNo,
      audioDurationMs,
      validAudio: features.validAudio,
      invalidReason: features.invalidReason,
      features,
      itemResult,
    });

    res.status(201).json({
      success: true,
      data: { attemptId: attempt._id, features, itemResult, modelVersion: MODEL_VERSION },
    });
  } catch (error) {
    console.error("Speech attempt analysis error:", error);
    res.status(500).json({ success: false, message: "Failed to analyze speech attempt" });
  }
};

exports.completeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await SpeechSession.findOne({ _id: sessionId, studentId: req.user.id });

    if (!session) {
      return res.status(404).json({ success: false, message: "Speech session not found" });
    }

    const attempts = await SpeechAttempt.find({ sessionId }).sort({ createdAt: 1 });
    const aggregate = aggregateSupportLevel(attempts);
    const pronunciationSummary = aggregatePronunciationSummary(attempts);

    session.supportLevel = aggregate.supportLevel;
    session.supportScore = aggregate.supportScore;
    session.pronunciationSummary = pronunciationSummary;
    // TODO: Final Speech-Reading Support Classifier will later use pronunciationSummary as one input feature.
    session.completedAt = new Date();
    session.status = "completed";

    let recommendedActivityIds = [];
    if (session.mode === "identification") {
      recommendedActivityIds = await updateSpeechProgressFromAggregate(req.user.id, aggregate);
    }
    session.recommendations = recommendedActivityIds.length
      ? recommendedActivityIds
      : aggregate.recommendations;
    await session.save();

    if (session.assignmentId) {
      await SpeechAssignment.findByIdAndUpdate(session.assignmentId, {
        status: "completed",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        ...aggregate,
        recommendedActivityIds,
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Speech session completion error:", error);
    res.status(500).json({ success: false, message: "Failed to complete speech session" });
  }
};

exports.completeAdminSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await SpeechSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: "Speech session not found" });
    }

    const attempts = await SpeechAttempt.find({ sessionId }).sort({ createdAt: 1 });
    const aggregate = aggregateSupportLevel(attempts);
    const pronunciationSummary = aggregatePronunciationSummary(attempts);

    session.supportLevel = aggregate.supportLevel;
    session.supportScore = aggregate.supportScore;
    session.recommendations = aggregate.recommendations;
    session.pronunciationSummary = pronunciationSummary;
    // TODO: Final Speech-Reading Support Classifier will later use pronunciationSummary as one input feature.
    session.completedAt = new Date();
    session.status = "completed";
    await session.save();

    if (session.assignmentId) {
      await SpeechAssignment.findByIdAndUpdate(session.assignmentId, {
        status: "completed",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        ...aggregate,
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Admin speech session completion error:", error);
    res.status(500).json({ success: false, message: "Failed to complete speech session" });
  }
};

exports.getMyProgress = async (req, res) => {
  try {
    const sessions = await SpeechSession.find({ studentId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error("Speech progress error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch speech progress" });
  }
};

exports.getChildSpeechProgress = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select("fullName username grade lexilandProgress");
    if (!child) {
      return res.status(404).json({ success: false, message: "Child not found" });
    }

    const sessions = await SpeechSession.find({ studentId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        child,
        speech: child.lexilandProgress?.speech || {},
        overall: {
          overallIdentificationStatus: child.lexilandProgress?.overallIdentificationStatus || "not_started",
          improvementUnlocked: Boolean(child.lexilandProgress?.improvementUnlocked),
        },
        sessions,
      },
    });
  } catch (error) {
    console.error("Child speech progress error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch child speech progress" });
  }
};

exports.getSystemActivities = async (req, res) => {
  res.json({ success: true, data: systemSpeechActivities });
};

exports.getIdentificationStatus = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select(
      "grade accountStatus lexilandProgress"
    );
    if (!child) {
      return res.status(404).json({ success: false, message: "Child not found" });
    }

    const speech = child.lexilandProgress?.speech || {};
    res.json({
      success: true,
      data: {
        identificationStatus: speech.identificationStatus || "not_started",
        supportLevel: speech.supportLevel || "unknown",
        supportScore: speech.supportScore,
        identificationCompletedAt: speech.identificationCompletedAt,
        improvementUnlocked: Boolean(
          child.lexilandProgress?.improvementUnlocked ||
            speech.improvementUnlocked
        ),
        recommendedActivityIds: speech.recommendedActivityIds || [],
        accountStatus: child.accountStatus,
      },
    });
  } catch (error) {
    console.error("Speech identification status error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Leo's sound check status" });
  }
};

exports.getIdentificationPrompts = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select("grade accountStatus");
    if (!child || child.accountStatus !== "active") {
      return res.status(401).json({ success: false, message: "Child account is inactive" });
    }

    res.json({
      success: true,
      data: getLeoPromptsForGrade(child.grade),
    });
  } catch (error) {
    console.error("Speech identification prompts error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Leo's prompts" });
  }
};

exports.startIdentification = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select("grade lexilandProgress accountStatus");
    if (!child || child.accountStatus !== "active") {
      return res.status(401).json({ success: false, message: "Child account is inactive" });
    }

    if (child.lexilandProgress?.speech?.identificationStatus === "completed") {
      return res.status(409).json({
        success: false,
        message: "Leo's First Sound Check is already completed.",
      });
    }

    const grade = String(child.grade || req.body.grade || "2");
    const prompts = getLeoPromptsForGrade(grade);
    const promptSet = prompts.map((prompt) => prompt.promptId);
    const existingSession = await SpeechSession.findOne({
      studentId: req.user.id,
      mode: "identification",
      status: "in_progress",
    }).sort({ createdAt: -1 });

    if (existingSession) {
      return res.status(200).json({
        success: true,
        data: {
          sessionId: existingSession._id,
          prompts,
          activity: systemSpeechActivities.find((activity) => activity.activityId === "leo_first_check"),
          modelVersion: MODEL_VERSION,
        },
      });
    }

    const session = await SpeechSession.create({
      studentId: req.user.id,
      grade,
      mode: "identification",
      promptSet,
      status: "in_progress",
      modelVersion: MODEL_VERSION,
      predictionSource: PREDICTION_SOURCE,
      startedAt: new Date(),
    });

    await Student.findByIdAndUpdate(req.user.id, {
      $set: {
        "lexilandProgress.overallIdentificationStatus": "in_progress",
        "lexilandProgress.speech.identificationStatus": "in_progress",
      },
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        prompts,
        activity: systemSpeechActivities.find((activity) => activity.activityId === "leo_first_check"),
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Start speech identification error:", error);
    res.status(500).json({ success: false, message: "Failed to start Leo's sound check" });
  }
};

exports.submitIdentificationAttempt = async (req, res) => {
  try {
    const {
      sessionId,
      promptId,
      taskType,
      targetText,
      attemptNo,
      audioDurationMs,
    } = req.body;

    if (!sessionId || !promptId || !attemptNo || audioDurationMs === undefined) {
      return res.status(400).json({
        success: false,
        message: "Session, prompt, attempt number, and audio duration are required",
      });
    }

    const session = await SpeechSession.findOne({
      _id: sessionId,
      studentId: req.user.id,
      mode: "identification",
      status: "in_progress",
    });
    if (!session) {
      return res.status(404).json({ success: false, message: "Leo's sound check session was not found" });
    }

    const prompt = getPromptById(promptId);
    if (!prompt) {
      return res.status(400).json({ success: false, message: "Unknown Leo prompt" });
    }

    if (session.promptSet?.length && !session.promptSet.includes(promptId)) {
      return res.status(400).json({ success: false, message: "Prompt is not part of this sound check" });
    }

    const promptIndexFromSession = Array.isArray(session.promptSet)
      ? session.promptSet.findIndex((item) => item === promptId)
      : -1;
    const promptIndexFromGrade = getLeoPromptsForGrade(session.grade).findIndex(
      (item) => item.promptId === promptId
    );
    const promptIndex =
      promptIndexFromSession >= 0
        ? promptIndexFromSession
        : Math.max(promptIndexFromGrade, 0);

    const savedFile = saveUploadedAudio({
      file: req.file,
      studentId: req.user.id,
      sessionId,
      promptId,
      attemptNo,
    });
    const audioAnalysis = await analyzeSavedAudio(savedFile, audioDurationMs);
    const allowPlaceholderAudio =
      !req.file &&
      (process.env.NODE_ENV !== "production" || toBoolean(req.body.placeholderMode));

    const features = extractPlaceholderFeatures({
      file: savedFile,
      fileMetadata: {
        audioSizeBytes: savedFile?.size || 0,
      },
      audioAnalysis,
      audioDurationMs,
      attemptNo,
      taskType: taskType || prompt.taskType,
      promptId,
      targetText: targetText || prompt.targetText,
      targetPhonemes: parseJsonArray(req.body.targetPhonemes).length
        ? parseJsonArray(req.body.targetPhonemes)
        : prompt.targetPhonemes,
      skill: prompt.skill,
      mode: "identification",
      allowPlaceholderAudio,
    });
    const itemResult = createItemResult(features);
    const pronunciationModel = await getPronunciationModelResult({ features, audioAnalysis });

    const attempt = await SpeechAttempt.create({
      sessionId,
      studentId: req.user.id,
      promptId,
      taskType: taskType || prompt.taskType,
      targetText: targetText || prompt.targetText,
      targetPhonemes: prompt.targetPhonemes,
      attemptNo,
      audioOriginalName: savedFile?.originalname || "",
      audioMimeType: savedFile?.mimetype || "",
      audioSizeBytes: savedFile?.size || 0,
      audioFilePath: getRelativeUploadPath(savedFile),
      audioUrl: getAudioUrl(savedFile),
      ...getAttemptAudioAnalysisFields(audioAnalysis),
      audioDurationMs: getSavedDurationMs(audioAnalysis, audioDurationMs),
      validAudio: features.validAudio,
      invalidReason: features.invalidReason,
      features,
      itemResult,
      pronunciationModel,
    });

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        promptId,
        audioUrl: attempt.audioUrl,
        normalizedAudioUrl: attempt.normalizedAudioUrl,
        starsEarned: itemResult.starsEarned,
        childFeedback: getChildAudioFeedback(features, "Great roar! Leo heard you."),
        leoMessage: features.validAudio
          ? "Let's try the next sound."
          : getInvalidAudioChildFeedback(features.invalidReason),
        validAudio: features.validAudio,
        levelCompleted: features.validAudio,
        retryRequired: !features.validAudio,
        nextPromptUnlocked: features.validAudio,
        nextPromptIndex: features.validAudio ? promptIndex + 1 : Math.max(promptIndex, 0),
        levelState: features.validAudio ? "completed" : "invalid_retry",
        audioQuality: attempt.audioQuality,
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Speech identification attempt error:", error);
    res.status(500).json({ success: false, message: "Failed to save Leo's sound" });
  }
};

exports.completeIdentification = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session is required" });
    }

    const session = await SpeechSession.findOne({
      _id: sessionId,
      studentId: req.user.id,
      mode: "identification",
    });
    if (!session) {
      return res.status(404).json({ success: false, message: "Identification session not found" });
    }

    if (session.status === "completed") {
      return res.status(409).json({
        success: false,
        message: "Leo's First Sound Check is already complete.",
      });
    }

    const attempts = await SpeechAttempt.find({ sessionId }).sort({ createdAt: 1 });
    if (!attempts.length) {
      return res.status(400).json({
        success: false,
        message: "Please send at least one sound before finishing Leo's check.",
      });
    }

    const aggregate = aggregateSupportLevel(attempts, { mode: "identification" });
    const pronunciationSummary = aggregatePronunciationSummary(attempts);
    const recommendedActivityIds = await updateSpeechProgressFromAggregate(req.user.id, aggregate);

    session.supportLevel = aggregate.supportLevel;
    session.supportScore = aggregate.supportScore;
    session.recommendations = recommendedActivityIds;
    session.pronunciationSummary = pronunciationSummary;
    // TODO: Final Speech-Reading Support Classifier will later use pronunciationSummary as one input feature.
    session.completedAt = new Date();
    session.status = "completed";
    await session.save();

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        starsEarned: Math.max(1, Math.min(3, Math.round((aggregate.supportScore || 0.5) * 3))),
        starsEarnedTotal: attempts.reduce(
          (total, attempt) => total + (attempt.itemResult?.starsEarned || 0),
          0
        ),
        childMessage: "Leo found your sound path!",
        guardianMessage: "Your guardian can see your learning plan.",
        nextStep: "Return to LexiLand map",
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Complete speech identification error:", error);
    res.status(500).json({ success: false, message: "Failed to complete Leo's sound check" });
  }
};

exports.getGuardianIdentificationResult = async (req, res) => {
  try {
    const child = await Student.findById(req.params.childId)
      .select("fullName username grade guardianId createdByAdmin lexilandProgress")
      .lean();
    if (!child) {
      return res.status(404).json({ success: false, message: "Child not found" });
    }
    if (!canAccessChild(req, child)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const session = await SpeechSession.findOne({
      studentId: child._id,
      mode: "identification",
    })
      .sort({ completedAt: -1, createdAt: -1 })
      .lean();

    const attempts = session
      ? await SpeechAttempt.find({ sessionId: session._id }).sort({ createdAt: 1 }).lean()
      : [];
    const validAttemptCount = attempts.filter((attempt) => attempt.validAudio).length;
    const speech = child.lexilandProgress?.speech || {};

    res.json({
      success: true,
      data: {
        child: {
          id: child._id,
          fullName: child.fullName,
          username: child.username,
          grade: child.grade,
        },
        identificationStatus: speech.identificationStatus || "not_started",
        supportLevel: speech.supportLevel || "unknown",
        supportScore: speech.supportScore,
        completedAt: speech.identificationCompletedAt || session?.completedAt,
        recommendedActivityIds: speech.recommendedActivityIds || [],
        recentSession: session
          ? {
              id: session._id,
              status: session.status,
              mode: session.mode,
              supportScore: session.supportScore,
              supportLevel: session.supportLevel,
              modelVersion: session.modelVersion,
              predictionSource: session.predictionSource,
              pronunciationSummary: session.pronunciationSummary,
              completedAt: session.completedAt,
              attemptSummary: {
                totalAttemptCount: attempts.length,
                validAttemptCount,
                audioQualitySummary: summarizeAudioQuality(attempts),
              },
            }
          : null,
        attemptsSummary: {
          totalAttemptCount: attempts.length,
          validAttemptCount,
          invalidAttemptCount: attempts.length - validAttemptCount,
          audioQualitySummary: summarizeAudioQuality(attempts),
        },
      },
    });
  } catch (error) {
    console.error("Guardian speech identification result error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Leo's result" });
  }
};

exports.getImprovementStatus = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select("grade accountStatus lexilandProgress");
    if (!child || child.accountStatus !== "active") {
      return res.status(401).json({ success: false, message: "Child account is inactive" });
    }

    const speech = child.lexilandProgress?.speech || {};
    const identificationCompleted = speech.identificationStatus === "completed";
    const improvementUnlocked = getImprovementUnlocked(child);
    const recentAttempts = await getRecentImprovementAttempts(req.user.id);
    const plan = getActivityPlan({ speech, recentAttempts });
    const activities = buildActivityMap({ speech, plan });

    res.json({
      success: true,
      data: {
        identificationCompleted,
        improvementUnlocked,
        currentActivityId: plan.nextActivityId,
        recommendedActivityIds: plan.recommendedActivityIds,
        completedActivityIds: speech.completedActivityIds || [],
        stars: speech.stars || 0,
        weakSkillFocus: plan.skillFocus || speech.weakSkillFocus || "",
        recommendation: {
          nextActivity: plan.nextActivity,
          childMessage: plan.childMessage,
          guardianReason: plan.guardianReason,
          reasonCode: plan.reasonCode,
          skillFocus: plan.skillFocus,
        },
        activities,
      },
    });
  } catch (error) {
    console.error("Speech improvement status error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Leo's training status" });
  }
};

exports.getImprovementActivities = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select("lexilandProgress accountStatus");
    if (!child || child.accountStatus !== "active") {
      return res.status(401).json({ success: false, message: "Child account is inactive" });
    }

    const speech = child.lexilandProgress?.speech || {};
    const recentAttempts = await getRecentImprovementAttempts(req.user.id);
    const plan = getActivityPlan({ speech, recentAttempts });

    res.json({
      success: true,
      data: buildActivityMap({ speech, plan }),
    });
  } catch (error) {
    console.error("Speech improvement activities error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Leo activities" });
  }
};

exports.getImprovementRecommendation = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select("grade accountStatus lexilandProgress");
    if (!child || child.accountStatus !== "active") {
      return res.status(401).json({ success: false, message: "Child account is inactive" });
    }

    const speech = child.lexilandProgress?.speech || {};
    const recentAttempts = await getRecentImprovementAttempts(req.user.id);
    const plan = getActivityPlan({ speech, recentAttempts });

    res.json({
      success: true,
      data: {
        nextActivity: plan.nextActivity,
        recommendedActivities: plan.recommendedActivities,
        skillFocus: plan.skillFocus,
        childMessage: plan.childMessage,
        guardianReason: plan.guardianReason,
        reasonCode: plan.reasonCode,
        progress: {
          stars: speech.stars || 0,
          completedActivityIds: speech.completedActivityIds || [],
          currentActivityId: plan.nextActivityId,
        },
      },
    });
  } catch (error) {
    console.error("Speech improvement recommendation error:", error);
    res.status(500).json({ success: false, message: "Failed to choose Leo's next activity" });
  }
};

exports.getImprovementActivityDetail = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select("accountStatus lexilandProgress");
    if (!child || child.accountStatus !== "active") {
      return res.status(401).json({ success: false, message: "Child account is inactive" });
    }

    const activity = getActivityById(req.params.activityId);
    if (!activity) {
      return res.status(404).json({ success: false, message: "Leo activity not found" });
    }

    const speech = child.lexilandProgress?.speech || {};
    const plan = getActivityPlan({
      speech,
      recentAttempts: await getRecentImprovementAttempts(req.user.id),
    });
    const activities = buildActivityMap({ speech, plan });
    const activityAccess = getLeoActivityAccess({
      activities,
      activityId: activity.activityId,
    });
    if (!activityAccess.allowed) {
      return res.status(403).json({
        code: "activity_locked",
        lockReason: activityAccess.lockReason,
      });
    }
    const activityState = activities.find(
      (item) => item.activityId === activity.activityId
    );

    res.json({
      success: true,
      data: {
        activity: activityState || activity,
        prompts: getActivityPrompts(activity.activityId),
        progress: (speech.activityProgress || []).find(
          (item) => item.activityId === activity.activityId
        ) || null,
      },
    });
  } catch (error) {
    console.error("Speech improvement activity detail error:", error);
    res.status(500).json({ success: false, message: "Failed to load Leo activity" });
  }
};

exports.getImprovementMap = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select("accountStatus lexilandProgress");
    if (!child || child.accountStatus !== "active") {
      return res.status(401).json({ success: false, message: "Child account is inactive" });
    }

    const speech = child.lexilandProgress?.speech || {};
    const recentAttempts = await getRecentImprovementAttempts(req.user.id);
    const plan = getActivityPlan({ speech, recentAttempts });

    res.json({
      success: true,
      data: {
        activities: buildActivityMap({ speech, plan }),
        recommendation: plan,
        stars: speech.stars || 0,
        completedActivityIds: speech.completedActivityIds || [],
      },
    });
  } catch (error) {
    console.error("Speech improvement map error:", error);
    res.status(500).json({ success: false, message: "Failed to load Leo's training map" });
  }
};

exports.startImprovementSession = async (req, res) => {
  try {
    let { activityId } = req.body;
    const child = await Student.findById(req.user.id).select("grade accountStatus lexilandProgress");
    if (!child || child.accountStatus !== "active") {
      return res.status(401).json({ success: false, message: "Child account is inactive" });
    }

    const speech = child.lexilandProgress?.speech || {};
    if (speech.identificationStatus !== "completed") {
      return res.status(403).json({ success: false, message: "Finish Leo's First Sound Check first." });
    }
    if (!getImprovementUnlocked(child)) {
      return res.status(403).json({
        success: false,
        message: "Leo is waiting for your full LexiLand check before opening Training Safari.",
      });
    }

    const plan = getActivityPlan({
      speech,
      recentAttempts: await getRecentImprovementAttempts(req.user.id),
    });
    activityId = activityId || plan.nextActivityId;
    const activity = getActivityById(activityId);
    if (!activity) {
      return res.status(400).json({ success: false, message: "Unknown Leo activity" });
    }
    const activities = buildActivityMap({ speech, plan });
    const activityAccess = getLeoActivityAccess({ activities, activityId });
    if (!activityAccess.allowed) {
      return res.status(403).json({
        code: "activity_locked",
        lockReason: activityAccess.lockReason,
      });
    }

    const prompts = getActivityPrompts(activityId);
    const session = await SpeechSession.create({
      studentId: req.user.id,
      grade: child.grade,
      mode: "improvement",
      activityId,
      gameType: activity.gameType,
      skillFocus: activity.skill,
      recommendationReason:
        activityId === plan.nextActivityId ? plan.guardianReason : "Child selected this Leo activity.",
      promptSet: prompts.map((prompt) => prompt.promptId),
      status: "in_progress",
      modelVersion: MODEL_VERSION,
      predictionSource: PREDICTION_SOURCE,
      startedAt: new Date(),
    });

    await Student.findByIdAndUpdate(req.user.id, {
      $set: {
        "lexilandProgress.speech.currentActivityId": activityId,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        activity,
        prompts,
        recommendation: plan,
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Speech improvement session start error:", error);
    res.status(500).json({ success: false, message: "Failed to start Leo's training activity" });
  }
};

exports.submitImprovementAttempt = async (req, res) => {
  try {
    const {
      sessionId,
      activityId,
      promptId,
      taskType,
      targetText,
      attemptNo,
      audioDurationMs,
      selectedAnswer,
    } = req.body;

    if (!sessionId || !activityId || !promptId || !attemptNo) {
      return res.status(400).json({ success: false, message: "Missing activity attempt fields" });
    }

    const activity = getActivityById(activityId);
    const prompt = getActivityPrompts(activityId).find((item) => item.promptId === promptId);
    if (!activity || !prompt) {
      return res.status(400).json({ success: false, message: "Unknown Leo activity prompt" });
    }

    const session = await SpeechSession.findOne({
      _id: sessionId,
      studentId: req.user.id,
      mode: "improvement",
      activityId,
      status: "in_progress",
    });
    if (!session) {
      return res.status(404).json({ success: false, message: "Leo training session was not found" });
    }

    const savedFile = saveUploadedAudio({
      file: req.file,
      studentId: req.user.id,
      sessionId,
      promptId,
      attemptNo,
    });
    const audioAnalysis = await analyzeSavedAudio(savedFile, audioDurationMs);
    const isSelection = selectedAnswer !== undefined;
    const allowPlaceholderAudio =
      !req.file &&
      !isSelection &&
      (process.env.NODE_ENV !== "production" || toBoolean(req.body.placeholderMode));

    const features = extractPlaceholderFeatures({
      file: savedFile,
      fileMetadata: { audioSizeBytes: savedFile?.size || 0 },
      audioAnalysis,
      audioDurationMs: audioDurationMs || (isSelection ? 900 : 1200),
      attemptNo,
      taskType: taskType || prompt.taskType,
      promptId,
      targetText: targetText || prompt.targetText,
      targetPhonemes: parseJsonArray(req.body.targetPhonemes).length
        ? parseJsonArray(req.body.targetPhonemes)
        : prompt.targetPhonemes || [],
      skill: activity.skill,
      mode: "improvement",
      allowPlaceholderAudio,
      selectedAnswer,
      expectedAnswer: getExpectedAnswer(prompt),
    });
    const itemResult = createItemResult(features);
    const promptIndex = getActivityPrompts(activityId).findIndex((item) => item.promptId === promptId);
    const pronunciationModel = await getPronunciationModelResult({ features, audioAnalysis });
    if (isSelection && features.wordCorrectPlaceholder && Number(attemptNo) > 1) {
      itemResult.starsEarned = Math.min(itemResult.starsEarned, 2);
    }
    const childFeedback = features.validAudio
      ? features.wordCorrectPlaceholder
        ? activity.gameType === "minimal_pair"
          ? "Great listening! These sounds are twins, and Leo is helping you hear them."
          : "Great safari work!"
        : activity.gameType === "minimal_pair"
          ? "These sounds are twins. Leo will help you hear them."
          : features.childFeedback || "Listen again with Leo."
      : getInvalidAudioChildFeedback(features.invalidReason);
    const leoMessage = features.wordCorrectPlaceholder
      ? "You found a sound gem."
      : features.validAudio
        ? "Try the next jungle step."
        : getInvalidAudioChildFeedback(features.invalidReason);

    const attempt = await SpeechAttempt.create({
      sessionId,
      studentId: req.user.id,
      activityId,
      promptId,
      taskType: taskType || prompt.taskType,
      targetText: targetText || prompt.targetText,
      gameType: activity.gameType,
      selectedAnswer: selectedAnswer || "",
      selectedCorrect: isSelection ? features.wordCorrectPlaceholder : undefined,
      targetPhonemes: prompt.targetPhonemes || [],
      attemptNo,
      audioOriginalName: savedFile?.originalname || "",
      audioMimeType: savedFile?.mimetype || "",
      audioSizeBytes: savedFile?.size || 0,
      audioFilePath: getRelativeUploadPath(savedFile),
      audioUrl: getAudioUrl(savedFile),
      ...getAttemptAudioAnalysisFields(audioAnalysis),
      audioDurationMs: getSavedDurationMs(audioAnalysis, audioDurationMs || (isSelection ? 900 : 1200)),
      validAudio: features.validAudio,
      invalidReason: features.invalidReason,
      features,
      itemResult,
      starsEarned: itemResult.starsEarned,
      childFeedback,
      audioQualitySummary: {
        qualityLabel: features.audioQualityLabel,
        qualityScore: features.audioQualityScore,
        invalidReason: features.invalidReason,
      },
      pronunciationModel,
    });
    const attemptProgress = getLeoAttemptProgress({
      isSelection,
      selectedCorrect: attempt.selectedCorrect,
      validAudio: features.validAudio,
    });

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        promptId,
        audioUrl: attempt.audioUrl,
        normalizedAudioUrl: attempt.normalizedAudioUrl,
        starsEarned: itemResult.starsEarned,
        childFeedback,
        leoMessage,
        validAudio: features.validAudio,
        ...attemptProgress,
        nextPromptIndex: attemptProgress.nextPromptUnlocked ? promptIndex + 1 : Math.max(promptIndex, 0),
        selectedCorrect: attempt.selectedCorrect,
        audioQuality: attempt.audioQuality,
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Speech improvement attempt error:", error);
    res.status(500).json({ success: false, message: "Failed to save Leo's training attempt" });
  }
};

exports.completeImprovementSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await SpeechSession.findOne({
      _id: sessionId,
      studentId: req.user.id,
      mode: "improvement",
    });
    if (!session) {
      return res.status(404).json({ success: false, message: "Leo training session not found" });
    }
    if (session.status === "completed") {
      return res.status(409).json({ success: false, message: "Leo training activity is already complete." });
    }

    const attempts = await SpeechAttempt.find({ sessionId }).sort({ createdAt: 1 });
    if (!attempts.length) {
      return res.status(400).json({ success: false, message: "Complete at least one jungle step first." });
    }

    const aggregate = aggregateSupportLevel(attempts, { mode: "improvement" });
    const pronunciationSummary = aggregatePronunciationSummary(attempts);
    const starsEarned = getActivityAward(attempts);
    const child = await Student.findById(req.user.id).select("lexilandProgress");
    const speech = child.lexilandProgress?.speech || {};
    const prompts = getActivityPrompts(session.activityId);
    const validAttemptCount = attempts.filter((attempt) => attempt.validAudio).length;
    const enoughValidAttempts =
      prompts.length > 0 && validAttemptCount >= Math.ceil(prompts.length * 0.7);
    const allPromptsSubmitted =
      prompts.length > 0 &&
      new Set(attempts.map((attempt) => attempt.promptId)).size >= prompts.length;
    if (!enoughValidAttempts && !allPromptsSubmitted) {
      return res.status(400).json({
        success: false,
        message: "Complete a few more jungle steps before finishing this activity.",
      });
    }
    const completedActivityIds = Array.from(new Set([...(speech.completedActivityIds || []), session.activityId]));
    const previousProgress = speech.activityProgress || [];
    const previousActivityProgress = previousProgress.find(
      (item) => item.activityId === session.activityId
    );
    const bestScore = attempts.reduce(
      (best, attempt) =>
        Math.max(best, Number(attempt.features?.pronunciationScorePlaceholder || 0)),
      0
    );
    const mergedActivityProgress = mergeActivityProgress({
      previous: previousActivityProgress,
      sessionAttemptCount: attempts.length,
      starsEarned,
      bestScore,
      now: new Date(),
    });
    const previousActivityStars = Number(
      previousActivityProgress?.starsEarned ?? previousActivityProgress?.stars ?? 0
    );
    const newlyEarnedStars = Math.max(0, mergedActivityProgress.starsEarned - previousActivityStars);
    const progressDraft = [
      ...previousProgress.filter((item) => item.activityId !== session.activityId),
      {
        activityId: session.activityId,
        ...mergedActivityProgress,
      },
    ];
    const draftSpeech = {
      ...speech,
      completedActivityIds,
      activityProgress: progressDraft,
    };
    const plan = getActivityPlan({
      speech: draftSpeech,
      recentAttempts: await getRecentImprovementAttempts(req.user.id),
    });
    const nextActivityId = plan.nextActivityId || "";

    session.supportScore = aggregate.supportScore;
    session.supportLevel = aggregate.supportLevel;
    session.starsEarned = starsEarned;
    session.activityCompleted = true;
    session.recommendationReason = plan.guardianReason;
    session.skillFocus = plan.skillFocus;
    session.pronunciationSummary = pronunciationSummary;
    // TODO: Final Speech-Reading Support Classifier will later use pronunciationSummary as one input feature.
    session.status = "completed";
    session.completedAt = new Date();
    await session.save();

    await Student.findByIdAndUpdate(req.user.id, {
      $set: {
        "lexilandProgress.speech.completedActivityIds": completedActivityIds,
        "lexilandProgress.speech.currentActivityId": nextActivityId,
        "lexilandProgress.speech.recommendedActivityIds": plan.recommendedActivityIds,
        "lexilandProgress.speech.activityProgress": progressDraft,
        "lexilandProgress.speech.stars": (speech.stars || 0) + newlyEarnedStars,
        "lexilandProgress.speech.weakSkillFocus": plan.skillFocus || getActivityById(nextActivityId)?.skill || "",
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        starsEarned,
        totalStars: starsEarned,
        rewardName: `${getActivityById(session.activityId)?.shortTitle || getActivityById(session.activityId)?.title || "Jungle Sound"} Badge`,
        nextActivityId,
        nextActivityTitle: getActivityById(nextActivityId)?.title || "",
        childMessage: plan.childMessage || "Great safari work!",
        guardianReason: plan.guardianReason,
        skillFocus: plan.skillFocus,
        activityCompleted: true,
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Speech improvement completion error:", error);
    res.status(500).json({ success: false, message: "Failed to complete Leo's training activity" });
  }
};

exports.getGuardianSpeechOverview = async (req, res) => {
  try {
    const child = await Student.findById(req.params.childId)
      .select("fullName username grade guardianId createdByAdmin lexilandProgress")
      .lean();
    if (!child) return res.status(404).json({ success: false, message: "Child not found" });
    if (!canAccessChild(req, child)) return res.status(403).json({ success: false, message: "Access denied" });
    const speech = child.lexilandProgress?.speech || {};
    const recentAttempts = await getRecentImprovementAttempts(child._id);
    const plan = getActivityPlan({ speech, recentAttempts });
    const currentActivityId = plan.nextActivityId || speech.currentActivityId || speech.recommendedActivityIds?.[0] || "";
    const latestSession = await SpeechSession.findOne({ studentId: child._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        child: { id: child._id, fullName: child.fullName, username: child.username, grade: child.grade },
        speech,
        supportLevel: speech.supportLevel || "unknown",
        supportScore: speech.supportScore,
        nextActivity: getActivityById(currentActivityId) || null,
        recommendation: {
          nextActivity: plan.nextActivity,
          recommendedActivities: plan.recommendedActivities,
          reasonCode: plan.reasonCode,
          guardianReason: plan.guardianReason,
          childMessage: plan.childMessage,
          skillFocus: plan.skillFocus,
        },
        activities: buildActivityMap({ speech, plan }),
        latestSession,
      },
    });
  } catch (error) {
    console.error("Guardian speech overview error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch speech overview" });
  }
};

exports.getGuardianImprovementProgress = async (req, res) => {
  try {
    const child = await Student.findById(req.params.childId)
      .select("fullName username grade guardianId createdByAdmin lexilandProgress")
      .lean();
    if (!child) return res.status(404).json({ success: false, message: "Child not found" });
    if (!canAccessChild(req, child)) return res.status(403).json({ success: false, message: "Access denied" });
    const speech = child.lexilandProgress?.speech || {};
    const recentAttempts = await getRecentImprovementAttempts(child._id);
    const plan = getActivityPlan({ speech, recentAttempts });
    const latestImprovementSession = await SpeechSession.findOne({
      studentId: child._id,
      mode: "improvement",
    })
      .sort({ completedAt: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        child: { id: child._id, fullName: child.fullName, username: child.username, grade: child.grade },
        improvementUnlocked: Boolean(child.lexilandProgress?.improvementUnlocked || speech.improvementUnlocked),
        stars: speech.stars || 0,
        currentActivityId: plan.nextActivityId || speech.currentActivityId || "",
        recommendedActivityIds: plan.recommendedActivityIds,
        completedActivityIds: speech.completedActivityIds || [],
        weakSkillFocus: plan.skillFocus || speech.weakSkillFocus || "",
        recommendation: {
          nextActivity: plan.nextActivity,
          recommendedActivities: plan.recommendedActivities,
          reasonCode: plan.reasonCode,
          guardianReason: plan.guardianReason,
          childMessage: plan.childMessage,
          skillFocus: plan.skillFocus,
        },
        activities: buildActivityMap({ speech, plan }),
        latestSession: latestImprovementSession,
      },
    });
  } catch (error) {
    console.error("Guardian improvement progress error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch improvement progress" });
  }
};

exports.getGuardianActivityPlan = exports.getGuardianSpeechOverview;

exports.getGuardianActivityProgress = exports.getGuardianImprovementProgress;

exports.getGuardianSessionHistory = async (req, res) => {
  try {
    const child = await Student.findById(req.params.childId)
      .select("fullName username grade guardianId createdByAdmin")
      .lean();
    if (!child) return res.status(404).json({ success: false, message: "Child not found" });
    if (!canAccessChild(req, child)) return res.status(403).json({ success: false, message: "Access denied" });

    const sessions = await SpeechSession.find({ studentId: child._id })
      .sort({ createdAt: -1 })
      .lean();
    const attempts = await SpeechAttempt.find({
      sessionId: { $in: sessions.map((session) => session._id) },
    })
      .sort({ createdAt: 1 })
      .lean();
    const attemptsBySession = attempts.reduce((map, attempt) => {
      const key = String(attempt.sessionId);
      if (!map[key]) map[key] = [];
      map[key].push(attempt);
      return map;
    }, {});

    res.json({
      success: true,
      data: {
        child: { id: child._id, fullName: child.fullName, username: child.username, grade: child.grade },
        sessions: sessions.map((session) => ({
          ...session,
          activity: getActivityById(session.activityId) || null,
          attempts: attemptsBySession[String(session._id)] || [],
        })),
      },
    });
  } catch (error) {
    console.error("Guardian session history error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch speech session history" });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const child = await Student.findById(req.params.childId).select(
      "guardianId createdByAdmin lexilandProgress"
    );
    if (!child) {
      return res.status(404).json({ success: false, message: "Child not found" });
    }

    const canView =
      req.user.type === "student"
        ? String(req.user.id) === String(child._id)
        : isSuperAdminRequest(req) ||
          String(child.guardianId || "") === String(req.user.id) ||
          String(child.createdByAdmin || "") === String(req.user.id);
    if (!canView) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const ids = child.lexilandProgress?.speech?.recommendedActivityIds || [];
    res.json({
      success: true,
      data: systemSpeechActivities.filter((activity) => ids.includes(activity.activityId)),
    });
  } catch (error) {
    console.error("Speech recommendations error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch recommendations" });
  }
};

exports.getAdminResults = async (req, res) => {
  try {
    const { grade, supportLevel, mode, status } = req.query;
    const query = {};
    if (grade) query.grade = String(grade);
    if (supportLevel) query.supportLevel = supportLevel;
    if (mode) query.mode = mode;
    if (status) query.status = status;
    const childIds = await getGuardianChildIds(req);
    if (childIds) query.studentId = { $in: childIds };

    const sessions = await SpeechSession.find(query)
      .populate("studentId", "fullName username email grade guardianId createdByAdmin")
      .sort({ createdAt: -1 })
      .lean();
    const sessionIds = sessions.map((session) => session._id);
    const attempts = await SpeechAttempt.find({ sessionId: { $in: sessionIds } }).lean();
    const labels = await SpeechManualLabel.find({ sessionId: { $in: sessionIds } }).lean();

    const attemptSummaryBySession = attempts.reduce((summary, attempt) => {
      const key = String(attempt.sessionId);
      if (!summary[key]) summary[key] = { validAttemptCount: 0, totalAttemptCount: 0 };
      summary[key].totalAttemptCount += 1;
      if (attempt.validAudio) summary[key].validAttemptCount += 1;
      return summary;
    }, {});
    const labelSummaryBySession = labels.reduce((summary, label) => {
      const key = String(label.sessionId);
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    }, {});

    res.status(200).json({
      success: true,
      data: sessions.map((session) => ({
        ...session,
        attemptSummary: attemptSummaryBySession[String(session._id)] || {
          validAttemptCount: 0,
          totalAttemptCount: 0,
        },
        manualLabelCount: labelSummaryBySession[String(session._id)] || 0,
      })),
    });
  } catch (error) {
    console.error("Speech admin results error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch speech support results" });
  }
};

exports.getAdminSessions = async (req, res) => {
  try {
    const { studentId, grade, mode, status, from, to } = req.query;
    const query = {};
    if (studentId) query.studentId = studentId;
    if (grade) query.grade = grade;
    if (mode) query.mode = mode;
    if (status) query.status = status;
    const childIds = await getGuardianChildIds(req);
    if (childIds) query.studentId = { $in: childIds };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const sessions = await SpeechSession.find(query)
      .populate("studentId", "fullName username email grade")
      .sort({ createdAt: -1 })
      .lean();
    const counts = await SpeechAttempt.aggregate([
      { $match: { sessionId: { $in: sessions.map((session) => session._id) } } },
      { $group: { _id: "$sessionId", totalAttemptCount: { $sum: 1 } } },
    ]);
    const countMap = counts.reduce((map, item) => {
      map[String(item._id)] = item.totalAttemptCount;
      return map;
    }, {});

    res.status(200).json({
      success: true,
      data: sessions.map((session) => ({
        ...session,
        totalAttemptCount: countMap[String(session._id)] || 0,
      })),
    });
  } catch (error) {
    console.error("Speech sessions error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch speech sessions" });
  }
};

exports.getAdminSessionDetail = async (req, res) => {
  try {
    const session = await SpeechSession.findById(req.params.sessionId)
      .populate("studentId", "fullName username email grade guardianId createdByAdmin")
      .lean();
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (!isSuperAdminRequest(req)) {
      const canView =
        String(session.studentId?.guardianId || "") === String(req.user.id) ||
        String(session.studentId?.createdByAdmin || "") === String(req.user.id);
      if (!canView) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }
    const attempts = await SpeechAttempt.find({ sessionId: session._id }).sort({ createdAt: 1 }).lean();
    const labels = await SpeechManualLabel.find({ sessionId: session._id }).lean();
    const labelMap = labels.reduce((map, label) => {
      map[String(label.attemptId)] = label;
      return map;
    }, {});
    const promptMap = await getPromptMap(attempts.map((attempt) => attempt.promptId));

    res.status(200).json({
      success: true,
      data: {
        session,
        attempts: attempts.map((attempt) => ({
          ...attempt,
          prompt: promptMap[attempt.promptId] || null,
          manualLabel: labelMap[String(attempt._id)] || null,
        })),
      },
    });
  } catch (error) {
    console.error("Speech session detail error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch session detail" });
  }
};

exports.startDataCollectionSession = async (req, res) => {
  try {
    const { studentId, grade, promptSet = [] } = req.body;
    if (!studentId || !grade) {
      return res.status(400).json({ success: false, message: "Student and grade are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const session = await SpeechSession.create({
      studentId,
      teacherId: req.user.id,
      grade,
      mode: "data_collection",
      promptSet,
      status: "in_progress",
      startedAt: new Date(),
    });

    res.status(201).json({ success: true, data: { sessionId: session._id } });
  } catch (error) {
    console.error("Data collection session error:", error);
    res.status(500).json({ success: false, message: "Failed to start data collection session" });
  }
};

exports.uploadAdminAttempt = async (req, res) => {
  try {
    const studentId = req.body.studentId;
    if (!studentId) {
      return res.status(400).json({ success: false, message: "Student is required" });
    }

    const result = await buildAttemptFromUpload({ req, studentId, teacherUpload: true });
    if (result.status) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    res.status(201).json({
      success: true,
      data: {
        attemptId: result.attempt._id,
        audioUrl: result.attempt.audioUrl,
        normalizedAudioUrl: result.attempt.normalizedAudioUrl,
        validAudio: result.features.validAudio,
        audioQuality: result.attempt.audioQuality,
        features: result.features,
        itemResult: result.itemResult,
        modelVersion: MODEL_VERSION,
      },
    });
  } catch (error) {
    console.error("Admin speech upload error:", error);
    res.status(500).json({ success: false, message: "Failed to upload admin speech attempt" });
  }
};

exports.labelAttempt = async (req, res) => {
  try {
    const attempt = await SpeechAttempt.findById(req.params.attemptId);
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    const label = await SpeechManualLabel.findOneAndUpdate(
      { attemptId: attempt._id },
      {
        attemptId: attempt._id,
        sessionId: attempt.sessionId,
        studentId: attempt.studentId,
        labeledByAdmin: req.user.id,
        itemCorrect: req.body.itemCorrect,
        teacherTranscript: req.body.teacherTranscript || "",
        errorType: req.body.errorType || "none",
        expectedPhoneme: req.body.expectedPhoneme || "",
        spokenPhoneme: req.body.spokenPhoneme || "",
        teacherConfidence: req.body.teacherConfidence,
        comment: req.body.comment || "",
      },
      { new: true, upsert: true, runValidators: true }
    );

    attempt.manualLabelStatus = "labeled";
    await attempt.save();

    res.status(200).json({ success: true, data: label });
  } catch (error) {
    console.error("Manual label error:", error);
    res.status(500).json({ success: false, message: "Failed to save manual label" });
  }
};

exports.getUnlabeledAttempts = async (req, res) => {
  try {
    const attempts = await SpeechAttempt.find({ manualLabelStatus: "unlabeled" })
      .populate("studentId", "fullName username grade")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: attempts });
  } catch (error) {
    console.error("Unlabeled attempts error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch unlabeled attempts" });
  }
};

exports.getAttemptAudioFeatures = async (req, res) => {
  try {
    const attempt = await SpeechAttempt.findById(req.params.attemptId)
      .select(
        "audioUrl normalizedAudioUrl serverAudioDurationMs frontendAudioDurationMs durationMismatchMs audioMetadata volumeFeatures silenceFeatures audioQuality extractionVersion extractionStatus extractionError features validAudio invalidReason"
      )
      .lean();
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    console.error("Attempt audio feature error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch audio features" });
  }
};

exports.getAttemptPronunciationModel = async (req, res) => {
  try {
    const attempt = await SpeechAttempt.findById(req.params.attemptId)
      .select("pronunciationModel")
      .lean();
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    res.status(200).json({
      success: true,
      data: attempt.pronunciationModel || { status: "not_run" },
    });
  } catch (error) {
    console.error("Attempt pronunciation model error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch pronunciation model result" });
  }
};

exports.seedDefaultPrompts = async (req, res) => {
  try {
    const count = await SpeechPrompt.countDocuments();
    if (count > 0) {
      return res.status(200).json({ success: true, message: "Prompt bank already has prompts", data: [] });
    }

    const prompts = await SpeechPrompt.insertMany(
      defaultPromptBank.map((prompt) => ({ ...prompt, createdByAdmin: req.user.id }))
    );
    res.status(201).json({ success: true, message: "Default prompts seeded", data: prompts });
  } catch (error) {
    console.error("Seed prompts error:", error);
    res.status(500).json({ success: false, message: "Failed to seed prompts" });
  }
};

exports.getAdminPrompts = async (req, res) => {
  try {
    const prompts = await SpeechPrompt.find(promptQuery({ ...req.query, includeInactive: true })).sort({ promptId: 1 });
    res.status(200).json({ success: true, data: prompts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch prompt bank" });
  }
};

exports.createPrompt = async (req, res) => {
  try {
    const payload = normalizePromptPayload(req.body, req.user.id);
    if (!payload.promptId || !payload.taskType || !payload.targetText) {
      return res.status(400).json({ success: false, message: "Prompt ID, task type, and target text are required" });
    }
    if (!TASK_TYPES.includes(payload.taskType)) {
      return res.status(400).json({ success: false, message: "Invalid task type" });
    }
    const prompt = await SpeechPrompt.create(payload);
    res.status(201).json({ success: true, data: prompt });
  } catch (error) {
    res.status(error.code === 11000 ? 400 : 500).json({
      success: false,
      message: error.code === 11000 ? "Prompt ID already exists" : "Failed to create prompt",
    });
  }
};

exports.updatePrompt = async (req, res) => {
  try {
    const payload = normalizePromptPayload(req.body, req.user.id);
    delete payload.createdByAdmin;
    const prompt = await SpeechPrompt.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!prompt) return res.status(404).json({ success: false, message: "Prompt not found" });
    res.status(200).json({ success: true, data: prompt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update prompt" });
  }
};

exports.deletePrompt = async (req, res) => {
  try {
    const prompt = await SpeechPrompt.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!prompt) return res.status(404).json({ success: false, message: "Prompt not found" });
    res.status(200).json({ success: true, data: prompt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete prompt" });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const assignments = await SpeechAssignment.find()
      .populate("studentId", "fullName username grade email")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch assignments" });
  }
};

exports.createAssignment = async (req, res) => {
  try {
    const { studentId, title, description, promptIds = [], targetSkill, dueDate, mode = "assigned" } = req.body;
    if (!studentId || !promptIds.length) {
      return res.status(400).json({ success: false, message: "Student and prompts are required" });
    }

    const assignment = await SpeechAssignment.create({
      teacherId: req.user.id,
      studentId,
      title: title || "Speech Activity",
      description,
      promptIds,
      targetSkill,
      dueDate,
      mode,
      status: "assigned",
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create assignment" });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const assignment = await SpeechAssignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update assignment" });
  }
};

exports.cancelAssignment = async (req, res) => {
  try {
    const assignment = await SpeechAssignment.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to cancel assignment" });
  }
};

exports.exportAttemptsCsv = async (req, res) => {
  const attempts = await SpeechAttempt.find()
    .populate("studentId", "username grade")
    .populate("sessionId", "grade mode")
    .sort({ createdAt: -1 })
    .lean();
  sendCsv(
    res,
    "speech-attempts.csv",
    [
      "attempt_id",
      "session_id",
      "student_id",
      "student_username",
      "mode",
      "activity_id",
      "prompt_id",
      "task_type",
      "target_text",
      "audio_url",
      "normalized_audio_url",
      "server_audio_duration_ms",
      "frontend_audio_duration_ms",
      "duration_mismatch_ms",
      "sample_rate",
      "channels",
      "codec_name",
      "file_size_bytes",
      "mean_volume_db",
      "max_volume_db",
      "rms_amplitude",
      "peak_amplitude",
      "clipping_ratio",
      "silence_segment_count",
      "total_silence_sec",
      "longest_silence_sec",
      "silence_ratio",
      "estimated_speech_sec",
      "pause_count",
      "audio_quality_score",
      "audio_quality_label",
      "valid_audio",
      "invalid_reason",
      "extraction_version",
      "extraction_status",
      "created_at",
    ],
    attempts.map((attempt) => ({
      attempt_id: attempt._id,
      session_id: attempt.sessionId?._id || attempt.sessionId,
      student_id: attempt.studentId?._id || attempt.studentId,
      student_username: attempt.studentId?.username || "",
      mode: attempt.sessionId?.mode || "",
      activity_id: attempt.activityId || "",
      prompt_id: attempt.promptId,
      task_type: attempt.taskType,
      target_text: attempt.targetText,
      audio_url: attempt.audioUrl,
      normalized_audio_url: attempt.normalizedAudioUrl,
      server_audio_duration_ms: attempt.serverAudioDurationMs,
      frontend_audio_duration_ms: attempt.frontendAudioDurationMs,
      duration_mismatch_ms: attempt.durationMismatchMs,
      sample_rate: attempt.audioMetadata?.sampleRate,
      channels: attempt.audioMetadata?.channels,
      codec_name: attempt.audioMetadata?.codecName,
      file_size_bytes: attempt.audioMetadata?.fileSizeBytes || attempt.audioSizeBytes,
      mean_volume_db: attempt.volumeFeatures?.meanVolumeDb,
      max_volume_db: attempt.volumeFeatures?.maxVolumeDb,
      rms_amplitude: attempt.volumeFeatures?.rmsAmplitude,
      peak_amplitude: attempt.volumeFeatures?.peakAmplitude,
      clipping_ratio: attempt.volumeFeatures?.clippingRatio,
      silence_segment_count: attempt.silenceFeatures?.silenceSegmentCount,
      total_silence_sec: attempt.silenceFeatures?.totalSilenceSec,
      longest_silence_sec: attempt.silenceFeatures?.longestSilenceSec,
      silence_ratio: attempt.silenceFeatures?.silenceRatio,
      estimated_speech_sec: attempt.silenceFeatures?.estimatedSpeechSec,
      pause_count: attempt.silenceFeatures?.pauseCount,
      audio_quality_score: attempt.audioQuality?.qualityScore,
      audio_quality_label: attempt.audioQuality?.qualityLabel,
      valid_audio: attempt.validAudio,
      invalid_reason: attempt.invalidReason,
      extraction_version: attempt.extractionVersion,
      extraction_status: attempt.extractionStatus,
      created_at: attempt.createdAt?.toISOString(),
    }))
  );
};

exports.exportSessionsCsv = async (req, res) => {
  const sessions = await SpeechSession.find()
    .populate("studentId", "username grade")
    .sort({ createdAt: -1 })
    .lean();
  const counts = await SpeechAttempt.aggregate([
    { $group: { _id: "$sessionId", total: { $sum: 1 }, valid: { $sum: { $cond: ["$validAudio", 1, 0] } } } },
  ]);
  const countMap = counts.reduce((map, item) => {
    map[String(item._id)] = item;
    return map;
  }, {});
  sendCsv(
    res,
    "speech-sessions.csv",
    [
      "session_id",
      "student_id",
      "student_username",
      "grade",
      "mode",
      "status",
      "support_level",
      "support_score",
      "model_version",
      "prediction_source",
      "total_attempts",
      "valid_attempts",
      "recommendations",
      "started_at",
      "completed_at",
    ],
    sessions.map((session) => ({
      session_id: session._id,
      student_id: session.studentId?._id || session.studentId,
      student_username: session.studentId?.username || "",
      grade: session.grade || session.studentId?.grade || "",
      mode: session.mode,
      status: session.status,
      support_level: session.supportLevel,
      support_score: session.supportScore,
      model_version: session.modelVersion,
      prediction_source: session.predictionSource,
      total_attempts: countMap[String(session._id)]?.total || 0,
      valid_attempts: countMap[String(session._id)]?.valid || 0,
      recommendations: session.recommendations,
      started_at: session.startedAt?.toISOString(),
      completed_at: session.completedAt?.toISOString(),
    }))
  );
};

exports.exportManualLabelsCsv = async (req, res) => {
  const labels = await SpeechManualLabel.find()
    .populate("attemptId", "promptId targetText")
    .populate("labeledByAdmin", "email fullName")
    .sort({ createdAt: -1 })
    .lean();
  sendCsv(
    res,
    "speech-manual-labels.csv",
    [
      "attempt_id",
      "session_id",
      "student_id",
      "prompt_id",
      "target_text",
      "item_correct",
      "teacher_transcript",
      "error_type",
      "expected_phoneme",
      "spoken_phoneme",
      "teacher_confidence",
      "comment",
      "labeled_by",
      "labeled_at",
    ],
    labels.map((label) => ({
      attempt_id: label.attemptId?._id || label.attemptId,
      session_id: label.sessionId,
      student_id: label.studentId,
      prompt_id: label.attemptId?.promptId || "",
      target_text: label.attemptId?.targetText || "",
      item_correct: label.itemCorrect,
      teacher_transcript: label.teacherTranscript,
      error_type: label.errorType,
      expected_phoneme: label.expectedPhoneme,
      spoken_phoneme: label.spokenPhoneme,
      teacher_confidence: label.teacherConfidence,
      comment: label.comment,
      labeled_by: label.labeledByAdmin?.email || label.labeledByAdmin?.fullName || "",
      labeled_at: label.createdAt?.toISOString(),
    }))
  );
};
