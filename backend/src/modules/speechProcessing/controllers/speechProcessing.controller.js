const path = require("path");

const SpeechPrompt = require("../models/speechPrompt.model");
const SpeechAssignment = require("../models/speechAssignment.model");
const SpeechSession = require("../models/speechSession.model");
const SpeechAttempt = require("../models/speechAttempt.model");
const SpeechManualLabel = require("../models/speechManualLabel.model");
const SpeechAssessmentSnapshot = require("../models/speechAssessmentSnapshot.model");
const {
  shapeSessionHistoryForRole,
} = require("../services/guardianSessionHistoryResponse.service");
const Student = require("../../common/models/student.model");
const defaultPromptBank = require("../data/defaultPromptBank");
const legacyPromptBank = require("../data/promptBank");
const systemSpeechActivities = require("../data/systemSpeechActivities");
const leoIdentificationPrompts = require("../data/leoIdentificationPrompts");
const leoImprovementPrompts = require("../data/leoImprovementPrompts");
const {
  getCheckpointPrompts,
  getCheckpointPromptById,
} = require("../data/leoCheckpointPrompts");
const {
  getStoryPromptsForGrade,
  getSentencePromptById,
} = require("../data/leoSentenceReadingPrompts");
const {
  extractPlaceholderFeatures,
  getInvalidAudioChildFeedback,
  canUsePlaceholderAudio,
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
const {
  getAdvancingWordFeedback,
  getLeoAttemptProgress,
  isSuccessfulLeoAttempt,
  shouldAwaitImprovementReadingEvidence,
} = require("../services/leoAttemptProgress.service");
const {
  buildLeoImprovementAttemptPolicy,
} = require("../services/leoImprovementAttemptPolicy.service");
const {
  getActivityAward,
  mergeActivityProgress,
} = require("../services/leoActivityProgress.service");
const {
  predictPronunciationSupport,
} = require("../services/pronunciationModel.service");
const { transcribeAudio } = require("../services/whisperAsr.service");
const {
  getChildWordFeedback,
  normalizeSpeechText,
} = require("../services/wordReadingAnalyzer.service");
const {
  analyzeReadingTask,
  getChildSentenceFeedback,
  isSentenceReadingTask,
} = require("../services/sentenceReadingAnalyzer.service");
const {
  analyzePhonemeComparison,
  getChildSoundFeedback,
  getInitialPhonemeComparison,
} = require("../services/phonemeComparison.service");
const {
  syncSpeechAttemptMedia,
  getConfiguredProvider,
} = require("../services/mediaStorage.service");
const {
  ATTEMPT_FEATURE_COLUMNS,
  SESSION_FEATURE_COLUMNS,
  DATA_COLLECTION_TEMPLATE_COLUMNS,
  DATA_COLLECTION_TEMPLATE_ROWS,
  buildAttemptFeatureRows,
  buildSessionFeatureRows,
} = require("../services/speechDatasetExport.service");
const {
  getFinalSpeechClassifierStatus,
} = require("../services/finalSpeechClassifier.service");
const {
  finalizeSessionSnapshot,
  refreshPendingSnapshots,
} = require("../services/speechAssessmentSnapshot.service");
const {
  getCheckpointSchedule,
} = require("../services/speechProgressComparison.service");
const {
  getPronunciationModelEvaluation: getPronunciationModelAudit,
} = require("../services/pronunciationModelAudit.service");

const MODEL_VERSION = "placeholder_v1";
const PREDICTION_SOURCE = "placeholder_rule_based";
const TASK_TYPES = [
  "listen_repeat",
  "read_aloud_word",
  "pseudoword_read",
  "minimal_pair_read",
  "sentence_read",
  "paragraph_segment_read",
];
const isParagraphPracticeTask = (taskType) => taskType === "paragraph_segment_read";

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

const getSystemActivityById = (activityId) =>
  systemSpeechActivities.find((activity) => activity.activityId === activityId);

const getActivityPrompts = (activityId) => leoImprovementPrompts[activityId] || [];

const buildImprovementSelectionSeed = ({
  studentId,
  activityId,
  completedActivityCount,
  checkpointSequence,
}) => [studentId, activityId, completedActivityCount, checkpointSequence].map(String).join(":");

const buildImprovementPromptSet = ({
  studentId,
  activityId,
  grade,
  completedActivityCount,
  checkpointSequence,
  seed,
}) => {
  if (activityId !== "leo_story_roar") return getActivityPrompts(activityId);
  return getStoryPromptsForGrade({
    grade,
    seed: seed ?? buildImprovementSelectionSeed({
      studentId,
      activityId,
      completedActivityCount,
      checkpointSequence,
    }),
    includeParagraph: Number(grade) === 5,
  });
};

const normalizeCheckpointPrompt = (prompt) => {
  if (!prompt || prompt.taskType !== "sentence_read") return prompt;
  return {
    ...prompt,
    skill: "fluency",
    assessmentRole: "checkpoint",
  };
};

const resolveCheckpointPrompt = (promptId) =>
  normalizeCheckpointPrompt(getCheckpointPromptById(promptId));

const getNormalizedCheckpointPrompts = (options) =>
  getCheckpointPrompts(options).map(normalizeCheckpointPrompt);

const resolveActivityPrompt = (activityId, promptId) => {
  if (activityId === "leo_story_roar") return getSentencePromptById(promptId);
  return getActivityPrompts(activityId).find((item) => item.promptId === promptId);
};

const resolveSessionActivityPrompts = (session, activityId) => {
  const selectedIds = Array.isArray(session?.promptSet) ? session.promptSet : [];
  if (!selectedIds.length) return getActivityPrompts(activityId);
  return selectedIds
    .map((promptId) => resolveActivityPrompt(activityId, promptId))
    .filter(Boolean);
};

const getTrainingPromptCoverage = ({ session, attempts = [] }) => {
  const persistedPromptIds = Array.from(
    new Set((session?.promptSet || []).map(String).filter(Boolean))
  );
  const expectedPromptIds = persistedPromptIds.length
    ? persistedPromptIds
    : getActivityPrompts(session?.activityId).map((prompt) => String(prompt.promptId));
  const expectedPromptSet = new Set(expectedPromptIds);
  const completedPromptCount = new Set(
    attempts
      .filter(
        (attempt) =>
          attempt.attemptPhase !== "checkpoint" &&
          isSuccessfulLeoAttempt(attempt) &&
          expectedPromptSet.has(String(attempt.promptId))
      )
      .map((attempt) => String(attempt.promptId))
  ).size;
  const requiredPromptCount = Math.ceil(expectedPromptIds.length * 0.7);
  return {
    expectedPromptCount: expectedPromptIds.length,
    completedPromptCount,
    requiredPromptCount,
    complete: requiredPromptCount > 0 && completedPromptCount >= requiredPromptCount,
  };
};

const getGuardianSentenceReading = (sentenceReading) => {
  if (!sentenceReading) return undefined;
  return {
    targetText: sentenceReading.targetText || "",
    asrText: sentenceReading.asrText || "",
    wordCoverage: sentenceReading.wordCoverage ?? null,
    sentenceSimilarity: sentenceReading.sentenceSimilarity ?? null,
    wordsPerMinute: sentenceReading.wordsPerMinute ?? null,
    omittedWordCount: sentenceReading.omittedWordCount ?? null,
    status: sentenceReading.status || "skipped",
  };
};

const getGuardianAudioQuality = (attempt) => {
  const quality = attempt.audioQuality || attempt.audioQualitySummary;
  if (!quality) return undefined;
  return {
    qualityLabel: quality.qualityLabel || "",
    qualityScore: quality.qualityScore ?? null,
    invalidReason: quality.invalidReason || attempt.invalidReason || "",
  };
};

const getGuardianWordReading = (wordReading) => {
  if (!wordReading) return undefined;
  return {
    targetWord: wordReading.targetWord || "",
    asrText: wordReading.asrText || "",
    normalizedAsrText: wordReading.normalizedAsrText || "",
    wordCorrect: wordReading.wordCorrect ?? null,
    possibleError: wordReading.possibleError || "",
    initialSoundError: wordReading.initialSoundError ?? null,
    finalSoundError: wordReading.finalSoundError ?? null,
    editDistance: wordReading.editDistance ?? null,
    similarityScore: wordReading.similarityScore ?? null,
    attemptStatus: wordReading.attemptStatus || "",
  };
};

const getGuardianPhonemeSummary = (phonemeComparison) => {
  if (!phonemeComparison) return undefined;
  return {
    status: phonemeComparison.status || "skipped",
    targetPhonemes: phonemeComparison.targetPhonemes || [],
    asrPhonemes: phonemeComparison.asrPhonemes || [],
    phonemeEditDistance: phonemeComparison.phonemeEditDistance ?? null,
    phonemeErrorRate: phonemeComparison.phonemeErrorRate ?? null,
    initialSoundError: phonemeComparison.initialSoundError ?? null,
    finalSoundError: phonemeComparison.finalSoundError ?? null,
    vowelMismatch: phonemeComparison.vowelMismatch ?? null,
    consonantClusterError: phonemeComparison.consonantClusterError ?? null,
    errorPattern: phonemeComparison.errorPattern || "",
    confidence: phonemeComparison.confidence || "",
    warnings: phonemeComparison.warnings || [],
  };
};

const getGuardianPronunciationSummary = (pronunciationModel) => {
  if (!pronunciationModel) return undefined;
  return {
    status: pronunciationModel.status || "not_run",
    prediction: pronunciationModel.prediction || "",
    predictedPronunciationScore: pronunciationModel.predictedPronunciationScore ?? null,
  };
};

const shapeGuardianPronunciationSummary = (summary) => {
  if (!summary) return undefined;
  return {
    status: summary.status || "no_predictions",
    dominantPrediction: summary.dominantPrediction || "unknown",
    meanPronunciationScore: summary.meanPronunciationScore ?? null,
    validPredictionCount: summary.validPredictionCount ?? 0,
  };
};

const shapeGuardianActivity = (activity) => {
  if (!activity) return null;
  return {
    activityId: activity.activityId,
    title: activity.title,
    description: activity.description,
    skill: activity.skill,
    state: activity.state,
    starsEarned: activity.starsEarned,
    stars: activity.stars,
    bestScore: activity.bestScore,
  };
};

const shapeActivityForRole = (activity, { superAdmin = false } = {}) =>
  superAdmin ? activity || null : shapeGuardianActivity(activity);

const shapeRecommendationForRole = (recommendation = {}, { superAdmin = false } = {}) => {
  if (superAdmin) return recommendation;
  return {
    nextActivity: shapeGuardianActivity(recommendation.nextActivity),
    recommendedActivities: (recommendation.recommendedActivities || []).map(shapeGuardianActivity),
    reasonCode: recommendation.reasonCode || "",
    guardianReason: recommendation.guardianReason || "",
    childMessage: recommendation.childMessage || "",
    skillFocus: recommendation.skillFocus || "",
  };
};

const shapeGuardianActivityProgressEntry = (entry) => ({
  activityId: entry.activityId,
  status: entry.status,
  starsEarned: entry.starsEarned,
  attemptsCompleted: entry.attemptsCompleted,
  bestScore: entry.bestScore,
  stars: entry.stars,
  completedAt: entry.completedAt,
  lastPlayedAt: entry.lastPlayedAt,
});

const shapeGuardianActivityProgress = (activityProgress) =>
  Array.isArray(activityProgress)
    ? activityProgress
        .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
        .map(shapeGuardianActivityProgressEntry)
    : [];

const shapeSpeechProgressForRole = (speech = {}, { superAdmin = false } = {}) => {
  if (superAdmin) return speech;
  return {
    identificationStatus: speech.identificationStatus,
    supportLevel: speech.supportLevel,
    supportScore: speech.supportScore,
    identificationCompletedAt: speech.identificationCompletedAt,
    improvementUnlocked: speech.improvementUnlocked,
    recommendedActivityIds: speech.recommendedActivityIds || [],
    completedActivityIds: speech.completedActivityIds || [],
    currentActivityId: speech.currentActivityId,
    stars: speech.stars,
    weakSkillFocus: speech.weakSkillFocus,
    checkpointCount: speech.checkpointCount,
    activitiesSinceCheckpoint: speech.activitiesSinceCheckpoint,
    baselineRetestRequired: speech.baselineRetestRequired,
    activityProgress: shapeGuardianActivityProgress(speech.activityProgress),
  };
};

const shapeSnapshotForRole = (snapshot, { superAdmin = false } = {}) => {
  if (!snapshot) return null;
  if (superAdmin) return snapshot;
  const metrics = snapshot.metrics || {};
  return {
    _id: snapshot._id,
    kind: snapshot.kind,
    sequenceNo: snapshot.sequenceNo,
    status: snapshot.status,
    supportLevel: snapshot.supportLevel,
    trendStatus: snapshot.trendStatus,
    meaningfulDecision: snapshot.meaningfulDecision,
    createdAt: snapshot.createdAt,
    metrics: {
      wordAccuracy: metrics.wordAccuracy,
      meanSimilarityScore: metrics.meanSimilarityScore,
      meanPhonemeErrorRate: metrics.meanPhonemeErrorRate,
      retryRate: metrics.retryRate,
      meanSentenceCoverage: metrics.meanSentenceCoverage,
      meanSentenceWordErrorRate: metrics.meanSentenceWordErrorRate,
    },
  };
};

const hasPendingSentenceAnalysis = (attempts = []) =>
  attempts.some((attempt) => {
    if (!["sentence_read", "paragraph_segment_read"].includes(attempt.taskType)) return false;
    return (
      attempt.sentenceReading?.status === "processing" ||
      ["pending", "processing"].includes(attempt.processingSteps?.asr)
    );
  });

const getGuardianItemResult = (attempt) => {
  const itemResult = attempt.itemResult || {};
  const starsEarned = itemResult.starsEarned ?? attempt.starsEarned;
  const childFeedback = itemResult.childFeedback || attempt.childFeedback;
  if (starsEarned === undefined && !childFeedback) return undefined;
  return {
    starsEarned: starsEarned ?? null,
    childFeedback: childFeedback || "",
  };
};

const shapeAttemptForRole = (attempt, { superAdmin = false } = {}) => {
  if (superAdmin) {
    return {
      ...attempt,
      reprocessMetadata: {
        eligible: Boolean(attempt.validAudio && attempt.normalizedAudioPath),
        processingStatus: attempt.processingStatus || "pending",
        processingSteps: attempt.processingSteps || {},
      },
    };
  }

  const audioQuality = getGuardianAudioQuality(attempt);
  return {
    _id: attempt._id,
    sessionId: attempt.sessionId,
    studentId: attempt.studentId,
    activityId: attempt.activityId,
    attemptPhase: attempt.attemptPhase,
    promptId: attempt.promptId,
    taskType: attempt.taskType,
    targetText: attempt.targetText,
    gameType: attempt.gameType,
    attemptNo: attempt.attemptNo,
    validAudio: attempt.validAudio,
    invalidReason: attempt.invalidReason || "",
    audioUrl: attempt.audioStorage?.originalSecureUrl || attempt.audioUrl || "",
    normalizedAudioUrl:
      attempt.audioStorage?.normalizedSecureUrl || attempt.normalizedAudioUrl || "",
    processingStatus: attempt.processingStatus || "pending",
    serverAudioDurationMs: attempt.serverAudioDurationMs ?? null,
    audioQuality,
    audioQualitySummary: audioQuality,
    starsEarned: attempt.starsEarned ?? attempt.itemResult?.starsEarned ?? null,
    childFeedback: attempt.childFeedback || attempt.itemResult?.childFeedback || "",
    itemResult: getGuardianItemResult(attempt),
    pronunciationModel: getGuardianPronunciationSummary(attempt.pronunciationModel),
    wordReading: getGuardianWordReading(attempt.wordReading),
    phonemeComparison: getGuardianPhonemeSummary(attempt.phonemeComparison),
    sentenceReading: getGuardianSentenceReading(attempt.sentenceReading),
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };
};

const shapeSessionForRole = (
  session,
  {
    superAdmin = false,
    activity,
    wordReadingSummary,
    phonemeSummary,
    datasetReadiness,
    attempts = [],
    assessmentSnapshots = [],
  } = {}
) => {
  const shapedAttempts = attempts.map((attempt) => shapeAttemptForRole(attempt, { superAdmin }));
  const sentenceAnalysisProcessing = hasPendingSentenceAnalysis(attempts);
  if (superAdmin) {
    return {
      ...session,
      activity: activity || session.activity || null,
      wordReadingSummary,
      phonemeSummary,
      datasetReadiness,
      assessmentSnapshots,
      attempts: shapedAttempts,
      sentenceAnalysisProcessing,
    };
  }
  return {
    _id: session._id,
    activityId: session.activityId,
    mode: session.mode,
    status: session.status,
    snapshotStatus: session.snapshotStatus,
    supportLevel: session.supportLevel,
    supportScore: session.supportScore,
    starsEarned: session.starsEarned,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    createdAt: session.createdAt,
    activity: shapeGuardianActivity(activity || session.activity),
    pronunciationSummary: shapeGuardianPronunciationSummary(session.pronunciationSummary),
    wordReadingSummary,
    phonemeSummary,
    datasetReadiness,
    attempts: shapedAttempts,
    sentenceAnalysisProcessing,
  };
};

const shapeGuardianStudentReference = (student) => {
  if (!student) return null;
  if (typeof student !== "object") return { _id: student };
  return {
    _id: student._id,
    fullName: student.fullName,
    username: student.username,
    email: student.email,
    grade: student.grade,
  };
};

const shapeSessionListItemForRole = (
  session,
  {
    superAdmin = false,
    attemptSummary,
    manualLabelCount,
    totalAttemptCount,
  } = {}
) => {
  const summaryFields = {};
  if (attemptSummary !== undefined) {
    summaryFields.attemptSummary = {
      validAttemptCount: Number(attemptSummary?.validAttemptCount || 0),
      totalAttemptCount: Number(attemptSummary?.totalAttemptCount || 0),
    };
  }
  if (manualLabelCount !== undefined) {
    summaryFields.manualLabelCount = Number(manualLabelCount || 0);
  }
  if (totalAttemptCount !== undefined) {
    summaryFields.totalAttemptCount = Number(totalAttemptCount || 0);
  }

  if (superAdmin) return { ...session, ...summaryFields };
  return {
    _id: session._id,
    studentId: shapeGuardianStudentReference(session.studentId),
    activityId: session.activityId,
    grade: session.grade,
    mode: session.mode,
    status: session.status,
    snapshotStatus: session.snapshotStatus,
    supportLevel: session.supportLevel,
    supportScore: session.supportScore,
    starsEarned: session.starsEarned,
    pronunciationSummary: shapeGuardianPronunciationSummary(session.pronunciationSummary),
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    createdAt: session.createdAt,
    ...summaryFields,
  };
};

const shapeIdentificationSessionForRole = (
  session,
  { superAdmin = false, attemptSummary } = {}
) => {
  if (!session) return null;
  return {
    id: session._id,
    status: session.status,
    mode: session.mode,
    snapshotStatus: session.snapshotStatus,
    supportScore: session.supportScore,
    supportLevel: session.supportLevel,
    ...(superAdmin
      ? {
          modelVersion: session.modelVersion,
          predictionSource: session.predictionSource,
          pronunciationSummary: session.pronunciationSummary,
        }
      : {
          pronunciationSummary: shapeGuardianPronunciationSummary(session.pronunciationSummary),
        }),
    completedAt: session.completedAt,
    attemptSummary,
  };
};

const toSupportScore = (supportNeedScore) => {
  if (supportNeedScore === null || supportNeedScore === undefined || supportNeedScore === "") {
    return undefined;
  }
  const parsed = Number(supportNeedScore);
  return Number.isFinite(parsed) ? Number((1 - parsed).toFixed(4)) : undefined;
};

exports.buildImprovementSelectionSeed = buildImprovementSelectionSeed;
exports.buildImprovementPromptSet = buildImprovementPromptSet;
exports.resolveCheckpointPrompt = resolveCheckpointPrompt;
exports.shapeAttemptForRole = shapeAttemptForRole;
exports.shapeSessionForRole = shapeSessionForRole;
exports.shapeSnapshotForRole = shapeSnapshotForRole;
exports.shapeSpeechProgressForRole = shapeSpeechProgressForRole;
exports.shapeSessionListItemForRole = shapeSessionListItemForRole;
exports.shapeIdentificationSessionForRole = shapeIdentificationSessionForRole;
exports.toSupportScore = toSupportScore;
exports.hasPendingSentenceAnalysis = hasPendingSentenceAnalysis;
exports.getTrainingPromptCoverage = getTrainingPromptCoverage;

const getImprovementUnlocked = (child) =>
  Boolean(
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
      "lexilandProgress.speech.improvementUnlocked": true,
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

const useBackgroundProcessing = () =>
  process.env.SPEECH_BACKGROUND_PROCESSING !== "false";

const useBackgroundAsr = () =>
  useBackgroundProcessing() &&
  String(process.env.SPEECH_ASR_SYNC_MODE || "background").toLowerCase() === "background";

const getInitialAudioStorage = (savedFile) => {
  const cloudinarySelected = getConfiguredProvider() === "cloudinary";
  if (!savedFile) {
    return { provider: cloudinarySelected ? "cloudinary" : "local", uploadStatus: "skipped", uploadError: "no_audio_file" };
  }
  if (!useBackgroundProcessing()) {
    return {
      provider: cloudinarySelected ? "cloudinary" : "local",
      uploadStatus: "skipped",
      uploadError: "background_processing_disabled",
    };
  }
  return {
    provider: cloudinarySelected ? "cloudinary" : "local",
    uploadStatus: cloudinarySelected ? "pending" : "skipped",
    uploadError: cloudinarySelected ? "" : "media_storage_provider_local",
  };
};

const getInitialProcessingFields = ({ savedFile, features, runAsr, runPronunciation }) => ({
  processingStatus: savedFile && useBackgroundProcessing() ? "pending" : "completed",
  processingSteps: {
    audioQuality: features ? "completed" : "pending",
    cloudinary: savedFile && useBackgroundProcessing() ? "pending" : "skipped",
    asr: runAsr ? (useBackgroundAsr() ? "pending" : "completed") : "skipped",
    pronunciationModel: runPronunciation
      ? (useBackgroundProcessing() ? "pending" : "completed")
      : "skipped",
  },
});

const getStepStatusFromModel = (model = {}) => {
  if (model.status === "success") return "completed";
  if (model.status === "skipped") return "skipped";
  return "failed";
};

const getStepStatusFromWordReading = (wordReading = {}) => {
  if (["valid", "asr_empty"].includes(wordReading.attemptStatus)) return "completed";
  if (["skipped", "invalid_audio"].includes(wordReading.attemptStatus)) return "skipped";
  return "failed";
};

const getStepStatusFromSentenceReading = (sentenceReading = {}) => {
  if (["valid", "asr_empty"].includes(sentenceReading.status)) return "completed";
  if (["skipped", "invalid_audio"].includes(sentenceReading.status)) return "skipped";
  return "failed";
};

const getStepStatusFromReadingTask = ({ wordReading, sentenceReading } = {}) =>
  sentenceReading
    ? getStepStatusFromSentenceReading(sentenceReading)
    : getStepStatusFromWordReading(wordReading);

const getStepStatusFromMedia = (audioStorage = {}) => {
  if (audioStorage.uploadStatus === "completed") return "completed";
  if (audioStorage.uploadStatus === "skipped") return "skipped";
  return "failed";
};

const getSkippedPronunciationModel = (error) => ({
  status: "skipped",
  modelName: "pronunciation_support_classifier",
  modelVersion: "pronunciation_support_v1",
  error,
  predictedAt: new Date(),
});

const shouldRunPronunciationModel = ({ taskType, features, isSelection = false }) =>
  Boolean(features?.validAudio && !isSelection && !isParagraphPracticeTask(taskType));

const getInitialPronunciationModel = (features, taskType) =>
  isParagraphPracticeTask(taskType)
    ? getSkippedPronunciationModel("paragraph_practice_excluded")
    : {
        status: features?.validAudio ? "not_run" : "skipped",
        modelName: "pronunciation_support_classifier",
        modelVersion: "pronunciation_support_v1",
        error: features?.validAudio ? "background_processing_pending" : "audio_invalid",
        predictedAt: new Date(),
      };

const getInitialWordReading = ({ targetWord, features }) => {
  const normalizedTargetWord = normalizeSpeechText(targetWord);
  if (!normalizedTargetWord) {
    return {
      targetWord: targetWord || "",
      normalizedTargetWord: "",
      asrText: "",
      normalizedAsrText: "",
      wordCorrect: false,
      possibleError: "target_word_missing",
      initialSoundError: false,
      finalSoundError: false,
      editDistance: 0,
      similarityScore: 0,
      attemptStatus: "skipped",
      error: "target_word_missing",
      createdAt: new Date(),
    };
  }

  if (!features?.validAudio) {
    return {
      targetWord: normalizedTargetWord,
      normalizedTargetWord,
      asrText: "",
      normalizedAsrText: "",
      wordCorrect: false,
      possibleError: "invalid_audio",
      initialSoundError: false,
      finalSoundError: false,
      editDistance: normalizedTargetWord.length,
      similarityScore: 0,
      attemptStatus: "invalid_audio",
      error: features?.invalidReason || "audio_invalid",
      createdAt: new Date(),
    };
  }

  return {
    targetWord: normalizedTargetWord,
    normalizedTargetWord,
    asrText: "",
    normalizedAsrText: "",
    wordCorrect: false,
    possibleError: "processing",
    initialSoundError: false,
    finalSoundError: false,
    editDistance: 0,
    similarityScore: 0,
    attemptStatus: "processing",
    error: "background_processing_pending",
    createdAt: new Date(),
  };
};

const getInitialReadingTask = ({ taskType, targetText, targetWord, features }) => {
  if (!isSentenceReadingTask(taskType)) {
    return { wordReading: getInitialWordReading({ targetWord, features }) };
  }

  const hasTarget = Boolean(String(targetText || "").trim());
  return analyzeReadingTask({
    taskType,
    targetText,
    status: !hasTarget ? "skipped" : features?.validAudio ? "processing" : "invalid_audio",
    warning: !hasTarget
      ? "target_text_missing"
      : features?.validAudio
        ? "background_processing_pending"
        : features?.invalidReason || "audio_invalid",
  });
};

const analyzeSavedAudio = async (
  savedFile,
  frontendAudioDurationMs,
  { taskType, targetText } = {}
) => {
  if (!savedFile?.path) return null;
  return analyzeAudio({
    filePath: savedFile.path,
    frontendAudioDurationMs:
      frontendAudioDurationMs !== undefined && frontendAudioDurationMs !== ""
        ? Number(frontendAudioDurationMs)
        : undefined,
    taskType,
    targetText,
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

const getObservedAudioDurationMs = (audioAnalysis, clientAudioDurationMs) => {
  const candidates = [
    audioAnalysis?.serverAudioDurationMs,
    audioAnalysis?.frontendAudioDurationMs,
    clientAudioDurationMs,
  ];
  const observed = candidates
    .map(Number)
    .find((duration) => Number.isFinite(duration) && duration > 0);
  return observed === undefined ? null : observed;
};

const getPronunciationModelResult = async ({ taskType, features, audioAnalysis }) =>
  isParagraphPracticeTask(taskType)
    ? getSkippedPronunciationModel("paragraph_practice_excluded")
    : predictPronunciationSupport({
        validAudio: Boolean(features?.validAudio),
        normalizedAudioPath: audioAnalysis?.normalizedAudioPath,
      });

const getSafeTargetWord = (...values) => {
  const value = values.find((item) => String(item || "").trim());
  return normalizeSpeechText(value || "");
};

const getReadingTaskResult = async ({
  taskType,
  targetText,
  targetWord,
  features,
  audioAnalysis,
  audioDurationMs,
}) => {
  const sentenceTask = isSentenceReadingTask(taskType);
  const normalizedTargetWord = normalizeSpeechText(targetWord);
  const hasTarget = sentenceTask
    ? Boolean(String(targetText || "").trim())
    : Boolean(normalizedTargetWord);
  if (!hasTarget || !features?.validAudio) {
    return getInitialReadingTask({ taskType, targetText, targetWord, features });
  }

  const asr = await transcribeAudio({
    audioPath: audioAnalysis?.normalizedAudioPath,
    validAudio: Boolean(features?.validAudio),
  });

  if (asr.status !== "success") {
    const result = analyzeReadingTask({
      taskType,
      targetText,
      targetWord: normalizedTargetWord,
      asrText: "",
      asrProvider: asr.asrProvider,
      asrModel: asr.asrModel,
      status: sentenceTask
        ? asr.status === "skipped" ? "skipped" : "processing"
        : asr.status === "skipped" ? "skipped" : "asr_failed",
      warning: asr.error || "asr_failed",
    });
    const reading = result.sentenceReading || result.wordReading;
    reading.createdAt = new Date();
    return result;
  }

  const result = analyzeReadingTask({
    taskType,
    targetText,
    targetWord: normalizedTargetWord,
    asrText: asr.asrText,
    audioDurationMs,
    asrProvider: asr.asrProvider,
    asrModel: asr.asrModel,
  });
  const reading = result.sentenceReading || result.wordReading;
  reading.createdAt = new Date();
  return result;
};

const formatWordReadingResponse = (wordReading = {}) => ({
  targetWord: wordReading.targetWord || "",
  asrText: wordReading.asrText || "",
  normalizedTargetWord: wordReading.normalizedTargetWord || "",
  normalizedAsrText: wordReading.normalizedAsrText || "",
  wordCorrect: Boolean(wordReading.wordCorrect),
  possibleError: wordReading.possibleError || "",
  initialSoundError: Boolean(wordReading.initialSoundError),
  finalSoundError: Boolean(wordReading.finalSoundError),
  editDistance: Number(wordReading.editDistance || 0),
  similarityScore: Number(wordReading.similarityScore || 0),
  attemptStatus: wordReading.attemptStatus || "skipped",
});

const getPhonemeComparisonResult = ({ targetWord, targetText, taskType, wordReading }) =>
  wordReading
    ? analyzePhonemeComparison({
        targetWord,
        targetText,
        taskType,
        wordReading,
        asrText: wordReading.asrText,
      })
    : undefined;

const formatPhonemeComparisonResponse = (phonemeComparison = {}) => ({
  status: phonemeComparison.status || "skipped",
  targetPhonemes: phonemeComparison.targetPhonemes || [],
  asrPhonemes: phonemeComparison.asrPhonemes || [],
  errorPattern: phonemeComparison.errorPattern || "",
});

const formatSoundFeedbackResponse = (phonemeComparison = {}) =>
  getChildSoundFeedback(phonemeComparison);

const summarizeWordReading = (attempts = []) => {
  const analyzed = attempts.filter((attempt) => attempt.wordReading?.attemptStatus === "valid");
  const correctCount = analyzed.filter((attempt) => attempt.wordReading?.wordCorrect).length;
  const errorCounts = {};
  analyzed.forEach((attempt) => {
    const possibleError = attempt.wordReading?.possibleError;
    if (possibleError && possibleError !== "none") {
      errorCounts[possibleError] = (errorCounts[possibleError] || 0) + 1;
    }
  });

  const commonError =
    Object.entries(errorCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ||
    "";

  return {
    analyzedAttemptCount: analyzed.length,
    correctWordCount: correctCount,
    wordReadingAccuracy: analyzed.length
      ? Number((correctCount / analyzed.length).toFixed(3))
      : null,
    commonPossibleError: commonError,
    latestPossibleError:
      analyzed
        .slice()
        .reverse()
        .find((attempt) => attempt.wordReading?.possibleError && attempt.wordReading.possibleError !== "none")
        ?.wordReading?.possibleError || "",
  };
};

const summarizePhonemeComparison = (attempts = []) => {
  const analyzed = attempts.filter((attempt) =>
    ["completed", "asr_empty"].includes(attempt.phonemeComparison?.status)
  );

  if (!analyzed.length) {
    return {
      status: "no_analysis",
      analyzedAttemptCount: 0,
      meanPhonemeErrorRate: null,
      initialSoundErrorRate: null,
      finalSoundErrorRate: null,
      vowelMismatchRate: null,
      consonantClusterErrorRate: null,
      commonErrorPattern: "",
      attemptsNeedingReview: 0,
      updatedAt: new Date(),
    };
  }

  const errorCounts = {};
  const sum = (field) =>
    analyzed.reduce((total, attempt) => total + (attempt.phonemeComparison?.[field] ? 1 : 0), 0);
  const rate = (count) => Number((count / analyzed.length).toFixed(3));
  const meanErrorRate = Number(
    (
      analyzed.reduce(
        (total, attempt) => total + Number(attempt.phonemeComparison?.phonemeErrorRate || 0),
        0
      ) / analyzed.length
    ).toFixed(3)
  );

  analyzed.forEach((attempt) => {
    const pattern = attempt.phonemeComparison?.errorPattern;
    if (pattern && pattern !== "none") {
      errorCounts[pattern] = (errorCounts[pattern] || 0) + 1;
    }
  });

  const commonErrorPattern =
    Object.entries(errorCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ||
    "";

  return {
    status: "completed",
    analyzedAttemptCount: analyzed.length,
    meanPhonemeErrorRate: meanErrorRate,
    initialSoundErrorRate: rate(sum("initialSoundError")),
    finalSoundErrorRate: rate(sum("finalSoundError")),
    vowelMismatchRate: rate(sum("vowelMismatch")),
    consonantClusterErrorRate: rate(sum("consonantClusterError")),
    commonErrorPattern,
    attemptsNeedingReview: analyzed.filter(
      (attempt) => Number(attempt.phonemeComparison?.phonemeErrorRate || 0) > 0
    ).length,
    updatedAt: new Date(),
  };
};

const refreshCompletedSessionAnalysis = async (sessionId) => {
  if (!sessionId) return;
  const session = await SpeechSession.findById(sessionId);
  if (!session || session.status !== "completed") return;
  const attempts = await SpeechAttempt.find({ sessionId }).sort({ createdAt: 1 });
  session.pronunciationSummary = aggregatePronunciationSummary(attempts);
  session.phonemeSummary = summarizePhonemeComparison(attempts);
  // TODO: Final Speech-Reading Support Classifier will later use pronunciationSummary as one input feature.
  await session.save();
  const snapshots = await refreshPendingSnapshots(session.studentId);
  const baseline = snapshots.find((snapshot) => snapshot.kind === "baseline");
  const checkpoint = snapshots
    .filter((snapshot) => snapshot.kind === "checkpoint")
    .sort((a, b) => Number(b.sequenceNo || 0) - Number(a.sequenceNo || 0))[0];
  const selectedSnapshot = checkpoint || baseline;
  if (selectedSnapshot) {
    session.snapshotId = selectedSnapshot._id;
    session.snapshotStatus = selectedSnapshot.status;
    if (selectedSnapshot.status === "ready") {
      session.supportLevel = selectedSnapshot.supportLevel;
      session.supportScore = toSupportScore(selectedSnapshot.supportNeedScore);
      session.modelVersion = selectedSnapshot.modelVersion || session.modelVersion;
      session.predictionSource = "assessment_snapshot_v1";
    }
    await session.save();
  }
  if (baseline) {
    await Student.findByIdAndUpdate(session.studentId, {
      $set: {
        "lexilandProgress.speech.baselineSnapshotId": baseline._id,
        "lexilandProgress.speech.baselineRetestRequired": baseline.status === "insufficient_data",
        "lexilandProgress.speech.improvementUnlocked": baseline.status === "ready",
        "lexilandProgress.speech.supportLevel": baseline.status === "ready" ? baseline.supportLevel : "unknown",
        "lexilandProgress.speech.supportScore":
          baseline.status === "ready" ? toSupportScore(baseline.supportNeedScore) : undefined,
      },
    });
  }
  if (checkpoint) {
    await Student.findByIdAndUpdate(session.studentId, {
      $set: {
        "lexilandProgress.speech.latestCheckpointSnapshotId": checkpoint._id,
        "lexilandProgress.speech.supportLevel": checkpoint.status === "ready" ? checkpoint.supportLevel : "unknown",
        "lexilandProgress.speech.supportScore":
          checkpoint.status === "ready" ? toSupportScore(checkpoint.supportNeedScore) : undefined,
      },
    });
  }
};

const scheduleAttemptBackgroundProcessing = ({
  attemptId,
  sessionId,
  savedFile,
  audioAnalysis,
  features,
  taskType,
  targetText,
  targetWord,
  audioDurationMs,
  runAsr,
  runPronunciation,
}) => {
  if (!attemptId || !useBackgroundProcessing()) return;

  setImmediate(async () => {
    const updates = {
      processingStatus: "processing",
    };

    try {
      const startUpdates = {
        processingStatus: "processing",
        "processingSteps.cloudinary": savedFile ? "processing" : "skipped",
        "audioStorage.uploadStatus": savedFile ? "processing" : "skipped",
      };
      if (runAsr) startUpdates["processingSteps.asr"] = "processing";
      if (runPronunciation) startUpdates["processingSteps.pronunciationModel"] = "processing";

      await SpeechAttempt.findByIdAndUpdate(attemptId, { $set: startUpdates });

      const audioStorage = await syncSpeechAttemptMedia({
        attemptId,
        originalAudioPath: getRelativeUploadPath(savedFile),
        normalizedAudioPath: audioAnalysis?.normalizedAudioPath,
      });
      updates.audioStorage = audioStorage;
      updates["processingSteps.cloudinary"] = getStepStatusFromMedia(audioStorage);

      if (runAsr) {
        const readingTask = await getReadingTaskResult({
          taskType,
          targetText,
          targetWord,
          features,
          audioAnalysis,
          audioDurationMs,
        });
        const phonemeComparison = getPhonemeComparisonResult({
          targetWord,
          targetText,
          taskType,
          wordReading: readingTask.wordReading,
        });
        Object.assign(updates, readingTask);
        if (phonemeComparison) updates.phonemeComparison = phonemeComparison;
        updates["processingSteps.asr"] = getStepStatusFromReadingTask(readingTask);
      }

      if (runPronunciation) {
        const pronunciationModel = await getPronunciationModelResult({
          taskType,
          features,
          audioAnalysis,
        });
        updates.pronunciationModel = pronunciationModel;
        updates["processingSteps.pronunciationModel"] = getStepStatusFromModel(pronunciationModel);
      }

      const failed = Object.entries(updates)
        .filter(([key]) => key.startsWith("processingSteps."))
        .some(([, value]) => value === "failed");
      updates.processingStatus = failed ? "failed" : "completed";

      const unset = isSentenceReadingTask(taskType)
        ? { wordReading: 1, phonemeComparison: 1 }
        : { sentenceReading: 1 };
      await SpeechAttempt.findByIdAndUpdate(attemptId, { $set: updates, $unset: unset });
      await refreshCompletedSessionAnalysis(sessionId);
    } catch (error) {
      console.error("Speech attempt background processing error:", error);
      const failureUpdates = {
        processingStatus: "failed",
        "processingSteps.cloudinary": updates["processingSteps.cloudinary"] || "failed",
        "audioStorage.uploadStatus": updates.audioStorage?.uploadStatus || "failed",
        "audioStorage.uploadError": error.message || "background_processing_failed",
      };
      if (runAsr) failureUpdates["processingSteps.asr"] = updates["processingSteps.asr"] || "failed";
      if (runPronunciation) {
        failureUpdates["processingSteps.pronunciationModel"] =
          updates["processingSteps.pronunciationModel"] || "failed";
      }
      await SpeechAttempt.findByIdAndUpdate(attemptId, { $set: failureUpdates });
    }
  });
};

const aggregatePronunciationSummary = (attempts = []) => {
  const successful = attempts.filter(
    (attempt) =>
      !isParagraphPracticeTask(attempt.taskType) &&
      attempt.pronunciationModel?.status === "success"
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

const aggregateOfficialSupportOutputs = (attempts = []) => {
  const officialAttempts = attempts.filter(
    (attempt) => !isParagraphPracticeTask(attempt.taskType)
  );
  return {
    aggregate: aggregateSupportLevel(officialAttempts),
    pronunciationSummary: aggregatePronunciationSummary(attempts),
  };
};

exports.aggregateOfficialSupportOutputs = aggregateOfficialSupportOutputs;

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
  const audioAnalysis = await analyzeSavedAudio(savedFile, audioDurationMs, {
    taskType,
    targetText,
  });
  const observedAudioDurationMs = getObservedAudioDurationMs(audioAnalysis, audioDurationMs);

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
  const resolvedTaskType = taskType;
  const targetWord = getSafeTargetWord(req.body.targetWord, targetText);
  const runPronunciation = shouldRunPronunciationModel({
    taskType: resolvedTaskType,
    features,
  });
  const runAsr = Boolean(
    features.validAudio &&
      (isSentenceReadingTask(resolvedTaskType) ? String(targetText || "").trim() : targetWord)
  );
  const pronunciationModel = useBackgroundProcessing()
    ? getInitialPronunciationModel(features, resolvedTaskType)
    : await getPronunciationModelResult({
        taskType: resolvedTaskType,
        features,
        audioAnalysis,
      });
  const readingTask = useBackgroundAsr()
    ? getInitialReadingTask({
        taskType: resolvedTaskType,
        targetText,
        targetWord,
        features,
      })
    : await getReadingTaskResult({
        taskType: resolvedTaskType,
        targetText,
        targetWord,
        features,
        audioAnalysis,
        audioDurationMs: observedAudioDurationMs,
      });
  const { wordReading, sentenceReading } = readingTask;
  const phonemeComparison = useBackgroundAsr()
    ? wordReading
      ? getInitialPhonemeComparison({ targetWord, features, wordReading })
      : undefined
    : getPhonemeComparisonResult({
        targetWord,
        targetText,
        taskType,
        wordReading,
      });

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
    audioStorage: getInitialAudioStorage(savedFile),
    ...getInitialProcessingFields({ savedFile, features, runAsr, runPronunciation }),
    ...getAttemptAudioAnalysisFields(audioAnalysis),
    audioDurationMs: getSavedDurationMs(audioAnalysis, audioDurationMs),
    validAudio: features.validAudio,
    invalidReason: features.invalidReason,
    playedAudioFirst: toBoolean(req.body.playedAudioFirst),
    features,
    itemResult,
    pronunciationModel,
    wordReading,
    sentenceReading,
    phonemeComparison,
  });

  scheduleAttemptBackgroundProcessing({
    attemptId: attempt._id,
    sessionId,
    savedFile,
    audioAnalysis,
    features,
    taskType: resolvedTaskType,
    targetText,
    targetWord,
    audioDurationMs: observedAudioDurationMs,
    runAsr: useBackgroundAsr() && runAsr,
    runPronunciation: useBackgroundProcessing() && runPronunciation,
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
    wordReading,
    sentenceReading,
    phonemeComparison,
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
        audioStorage: result.attempt.audioStorage,
        processingStatus: result.attempt.processingStatus,
        processingSteps: result.attempt.processingSteps,
        features: result.features,
        itemResult: result.itemResult,
        sentenceFeedback: result.sentenceReading
          ? getChildSentenceFeedback(result.sentenceReading)
          : undefined,
        wordReading: result.wordReading
          ? formatWordReadingResponse(result.wordReading)
          : undefined,
        phonemeComparison: result.phonemeComparison
          ? formatPhonemeComparisonResponse(result.phonemeComparison)
          : undefined,
        soundFeedback: result.phonemeComparison
          ? formatSoundFeedbackResponse(result.phonemeComparison)
          : undefined,
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
      targetWord,
      audioDurationMs,
      attemptNo,
      studentId,
      activityId,
    } = req.body;

    const resolvedTaskType = taskType || "read_aloud_word";
    const resolvedTargetText = targetText || targetWord || "";
    const resolvedTargetWord = getSafeTargetWord(targetWord, resolvedTargetText);
    if (
      isSentenceReadingTask(resolvedTaskType)
        ? !String(resolvedTargetText).trim()
        : !resolvedTargetWord
    ) {
      return res.status(400).json({
        success: false,
        message: isSentenceReadingTask(resolvedTaskType)
          ? "Target text is required"
          : "Target word is required",
      });
    }

    if (!req.file && process.env.MOCK_ASR_TEXT === undefined) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    let resolvedStudentId = req.user.id;
    if (req.user.type !== "student") {
      if (!studentId) {
        return res.status(400).json({ success: false, message: "Student is required" });
      }
      const child = await Student.findById(studentId).select("guardianId createdByAdmin");
      if (!canAccessChild(req, child)) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      resolvedStudentId = studentId;
    }

    let session = null;
    if (sessionId) {
      session = await SpeechSession.findOne({ _id: sessionId, studentId: resolvedStudentId });
      if (!session) {
        return res.status(404).json({ success: false, message: "Speech session not found" });
      }
    } else {
      session = await SpeechSession.create({
        studentId: resolvedStudentId,
        grade: req.body.grade || "2",
        mode: "demo",
        activityId: activityId || "",
        promptSet: [promptId || resolvedTargetText || resolvedTargetWord],
        status: "in_progress",
        modelVersion: MODEL_VERSION,
        predictionSource: PREDICTION_SOURCE,
        startedAt: new Date(),
      });
    }

    const currentPromptId = promptId ||
      (isSentenceReadingTask(resolvedTaskType)
        ? `SENTENCE_${Date.now()}`
        : `WORD_${resolvedTargetWord.toUpperCase()}`);
    const currentAttemptNo = Number(attemptNo || 1);
    const savedFile = saveUploadedAudio({
      file: req.file,
      studentId: resolvedStudentId,
      sessionId: session._id,
      promptId: currentPromptId,
      attemptNo: currentAttemptNo,
    });
    const audioAnalysis = await analyzeSavedAudio(savedFile, audioDurationMs, {
      taskType: resolvedTaskType,
      targetText: resolvedTargetText || resolvedTargetWord,
    });
    const observedAudioDurationMs = getObservedAudioDurationMs(audioAnalysis, audioDurationMs);
    const features = extractPlaceholderFeatures({
      file: savedFile,
      fileMetadata: { audioSizeBytes: savedFile?.size || 0 },
      audioAnalysis,
      audioDurationMs: audioDurationMs || 1200,
      attemptNo: currentAttemptNo,
      taskType: resolvedTaskType,
      promptId: currentPromptId,
      targetText: resolvedTargetText || resolvedTargetWord,
      mode: "demo",
      allowPlaceholderAudio: Boolean(process.env.MOCK_ASR_TEXT !== undefined && !req.file),
    });
    const itemResult = createItemResult(features);
    const runPronunciation = shouldRunPronunciationModel({
      taskType: resolvedTaskType,
      features,
    });
    const runAsr = Boolean(
      features.validAudio &&
        (isSentenceReadingTask(resolvedTaskType) ? resolvedTargetText : resolvedTargetWord)
    );
    const pronunciationModel = useBackgroundProcessing()
      ? getInitialPronunciationModel(features, resolvedTaskType)
      : await getPronunciationModelResult({
          taskType: resolvedTaskType,
          features,
          audioAnalysis,
        });
    const readingTask = await getReadingTaskResult({
      taskType: resolvedTaskType,
      targetText: resolvedTargetText,
      targetWord: resolvedTargetWord,
      features,
      audioAnalysis,
      audioDurationMs: observedAudioDurationMs,
    });
    const { wordReading, sentenceReading } = readingTask;
    const phonemeComparison = getPhonemeComparisonResult({
      targetWord: resolvedTargetWord,
      targetText: resolvedTargetText || resolvedTargetWord,
      taskType: resolvedTaskType,
      wordReading,
    });
    const processingFields = getInitialProcessingFields({ savedFile, features, runAsr, runPronunciation });
    processingFields.processingSteps.asr = getStepStatusFromReadingTask(readingTask);
    const promptIndex = Array.isArray(session.promptSet)
      ? session.promptSet.findIndex((item) => item === currentPromptId)
      : -1;

    const attempt = await SpeechAttempt.create({
      sessionId: session._id,
      studentId: resolvedStudentId,
      assignmentId: session.assignmentId,
      activityId: activityId || session.activityId || "",
      promptId: currentPromptId,
      taskType: resolvedTaskType,
      targetText: resolvedTargetText || resolvedTargetWord,
      attemptNo: currentAttemptNo,
      audioOriginalName: savedFile?.originalname || "",
      audioMimeType: savedFile?.mimetype || "",
      audioSizeBytes: savedFile?.size || 0,
      audioFilePath: getRelativeUploadPath(savedFile),
      audioUrl: getAudioUrl(savedFile),
      audioStorage: getInitialAudioStorage(savedFile),
      ...processingFields,
      ...getAttemptAudioAnalysisFields(audioAnalysis),
      audioDurationMs: getSavedDurationMs(audioAnalysis, audioDurationMs || 1200),
      validAudio: features.validAudio,
      invalidReason: features.invalidReason,
      features,
      itemResult,
      pronunciationModel,
      wordReading,
      sentenceReading,
      phonemeComparison,
    });

    scheduleAttemptBackgroundProcessing({
      attemptId: attempt._id,
      sessionId: session._id,
      savedFile,
      audioAnalysis,
      features,
      taskType: resolvedTaskType,
      targetText: resolvedTargetText,
      targetWord: resolvedTargetWord,
      audioDurationMs: observedAudioDurationMs,
      runAsr: false,
      runPronunciation: useBackgroundProcessing() && runPronunciation,
    });

    if (
      wordReading?.attemptStatus === "invalid_audio" ||
      sentenceReading?.status === "invalid_audio"
    ) {
      return res.status(400).json({
        success: false,
        data: {
          attemptId: attempt._id,
          ...(wordReading ? formatWordReadingResponse(wordReading) : {}),
          sentenceFeedback: sentenceReading
            ? getChildSentenceFeedback(sentenceReading)
            : undefined,
          phonemeComparison: phonemeComparison
            ? formatPhonemeComparisonResponse(phonemeComparison)
            : undefined,
          soundFeedback: phonemeComparison
            ? formatSoundFeedbackResponse(phonemeComparison)
            : undefined,
          message: "Audio is too short or no speech was detected. Please record again.",
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        ...(wordReading ? formatWordReadingResponse(wordReading) : {}),
        sentenceFeedback: sentenceReading
          ? getChildSentenceFeedback(sentenceReading)
          : undefined,
        phonemeComparison: phonemeComparison
          ? formatPhonemeComparisonResponse(phonemeComparison)
          : undefined,
        soundFeedback: phonemeComparison
          ? formatSoundFeedbackResponse(phonemeComparison)
          : undefined,
        features,
        itemResult,
        levelCompleted: features.validAudio,
        retryRequired: !features.validAudio,
        nextPromptIndex: features.validAudio ? Math.max(promptIndex, 0) + 1 : Math.max(promptIndex, 0),
        levelState: features.validAudio ? "completed" : "invalid_retry",
        modelVersion: MODEL_VERSION,
      },
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
    const { aggregate, pronunciationSummary } = aggregateOfficialSupportOutputs(attempts);
    const phonemeSummary = summarizePhonemeComparison(attempts);

    session.supportLevel = aggregate.supportLevel;
    session.supportScore = aggregate.supportScore;
    session.pronunciationSummary = pronunciationSummary;
    session.phonemeSummary = phonemeSummary;
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
    const { aggregate, pronunciationSummary } = aggregateOfficialSupportOutputs(attempts);
    const phonemeSummary = summarizePhonemeComparison(attempts);

    session.supportLevel = aggregate.supportLevel;
    session.supportScore = aggregate.supportScore;
    session.recommendations = aggregate.recommendations;
    session.pronunciationSummary = pronunciationSummary;
    session.phonemeSummary = phonemeSummary;
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

exports.getChildProgressTrend = async (req, res) => {
  try {
    const child = await Student.findById(req.user.id).select("lexilandProgress").lean();
    if (!child) return res.status(404).json({ success: false, message: "Child not found" });

    await refreshPendingSnapshots(req.user.id);
    const snapshots = await SpeechAssessmentSnapshot.find({ studentId: req.user.id, isCurrent: true })
      .select("kind sequenceNo status trendStatus meaningfulDecision qualityGate createdAt")
      .sort({ kind: 1, sequenceNo: 1, createdAt: 1 })
      .lean();
    const speech = child.lexilandProgress?.speech || {};
    const schedule = getCheckpointSchedule({
      completedActivityCount: (speech.completedActivityIds || []).length,
      checkpointCount: Number(speech.checkpointCount || 0),
      totalActivityCount: getImprovementActivities().length,
    });

    res.json({
      success: true,
      data: {
        baseline: snapshots.find((snapshot) => snapshot.kind === "baseline") || null,
        checkpoints: snapshots.filter((snapshot) => snapshot.kind === "checkpoint"),
        completedActivityCount: (speech.completedActivityIds || []).length,
        checkpointCount: Number(speech.checkpointCount || 0),
        checkpointDue: schedule.due,
        nextCheckpointSequence: schedule.sequence,
        childMessage: schedule.due
          ? "Leo's Trail Check is ready."
          : "Keep exploring Leo's training trail.",
      },
    });
  } catch (error) {
    console.error("Child speech trend error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Leo's trail progress" });
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
      assessmentRole: "baseline",
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
    const resolvedTaskType = taskType || prompt.taskType;
    const resolvedTargetText = targetText || prompt.targetText;
    const audioAnalysis = await analyzeSavedAudio(savedFile, audioDurationMs, {
      taskType: resolvedTaskType,
      targetText: resolvedTargetText,
    });
    const observedAudioDurationMs = getObservedAudioDurationMs(audioAnalysis, audioDurationMs);
    const allowPlaceholderAudio = canUsePlaceholderAudio({
      nodeEnv: process.env.NODE_ENV,
      placeholderRequested: toBoolean(req.body.placeholderMode),
      hasFile: Boolean(req.file),
      isSelection: false,
    });

    const features = extractPlaceholderFeatures({
      file: savedFile,
      fileMetadata: {
        audioSizeBytes: savedFile?.size || 0,
      },
      audioAnalysis,
      audioDurationMs,
      attemptNo,
      taskType: resolvedTaskType,
      promptId,
      targetText: resolvedTargetText,
      targetPhonemes: parseJsonArray(req.body.targetPhonemes).length
        ? parseJsonArray(req.body.targetPhonemes)
        : prompt.targetPhonemes,
      skill: prompt.skill,
      mode: "identification",
      allowPlaceholderAudio,
    });
    const itemResult = createItemResult(features);
    const targetWord = getSafeTargetWord(req.body.targetWord, resolvedTargetText);
    const runPronunciation = shouldRunPronunciationModel({
      taskType: resolvedTaskType,
      features,
    });
    const runAsr = Boolean(
      features.validAudio &&
        (isSentenceReadingTask(resolvedTaskType) ? String(resolvedTargetText || "").trim() : targetWord)
    );
    const pronunciationModel = useBackgroundProcessing()
      ? getInitialPronunciationModel(features, resolvedTaskType)
      : await getPronunciationModelResult({
          taskType: resolvedTaskType,
          features,
          audioAnalysis,
        });
    const readingTask = useBackgroundAsr()
      ? getInitialReadingTask({
          taskType: resolvedTaskType,
          targetText: resolvedTargetText,
          targetWord,
          features,
        })
      : await getReadingTaskResult({
          taskType: resolvedTaskType,
          targetText: resolvedTargetText,
          targetWord,
          features,
          audioAnalysis,
          audioDurationMs: observedAudioDurationMs,
        });
    const { wordReading, sentenceReading } = readingTask;
    const phonemeComparison = useBackgroundAsr()
      ? wordReading
        ? getInitialPhonemeComparison({ targetWord, features, wordReading })
        : undefined
      : getPhonemeComparisonResult({
          targetWord,
          targetText: resolvedTargetText,
          taskType: resolvedTaskType,
          wordReading,
        });

    const attempt = await SpeechAttempt.create({
      sessionId,
      studentId: req.user.id,
      attemptPhase: "baseline",
      promptId,
      taskType: resolvedTaskType,
      targetText: resolvedTargetText,
      targetPhonemes: prompt.targetPhonemes,
      attemptNo,
      audioOriginalName: savedFile?.originalname || "",
      audioMimeType: savedFile?.mimetype || "",
      audioSizeBytes: savedFile?.size || 0,
      audioFilePath: getRelativeUploadPath(savedFile),
      audioUrl: getAudioUrl(savedFile),
      audioStorage: getInitialAudioStorage(savedFile),
      ...getInitialProcessingFields({ savedFile, features, runAsr, runPronunciation }),
      ...getAttemptAudioAnalysisFields(audioAnalysis),
      audioDurationMs: getSavedDurationMs(audioAnalysis, audioDurationMs),
      validAudio: features.validAudio,
      invalidReason: features.invalidReason,
      features,
      itemResult,
      pronunciationModel,
      wordReading,
      sentenceReading,
      phonemeComparison,
    });
    scheduleAttemptBackgroundProcessing({
      attemptId: attempt._id,
      sessionId,
      savedFile,
      audioAnalysis,
      features,
      taskType: resolvedTaskType,
      targetText: resolvedTargetText,
      targetWord,
      audioDurationMs: observedAudioDurationMs,
      runAsr: useBackgroundAsr() && runAsr,
      runPronunciation: useBackgroundProcessing() && runPronunciation,
    });
    const wordFeedback = wordReading ? getChildWordFeedback(wordReading) : "";
    const sentenceFeedback = sentenceReading
      ? getChildSentenceFeedback(sentenceReading)
      : undefined;

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        promptId,
        audioUrl: attempt.audioUrl,
        normalizedAudioUrl: attempt.normalizedAudioUrl,
        starsEarned: itemResult.starsEarned,
        childFeedback: sentenceFeedback?.message || wordFeedback || getChildAudioFeedback(features, "Great roar! Leo heard you."),
        leoMessage: sentenceFeedback?.message || (features.validAudio
          ? wordReading?.attemptStatus === "valid"
            ? wordReading.wordCorrect
              ? "Leo heard the word clearly."
              : "Leo heard your sound. Try to match the word as closely as you can."
            : "Leo heard your sound."
          : getInvalidAudioChildFeedback(features.invalidReason)),
        validAudio: features.validAudio,
        levelCompleted: features.validAudio,
        retryRequired: !features.validAudio,
        nextPromptUnlocked: features.validAudio,
        nextPromptIndex: features.validAudio ? promptIndex + 1 : Math.max(promptIndex, 0),
        levelState: features.validAudio ? "completed" : "invalid_retry",
        audioQuality: attempt.audioQuality,
        sentenceFeedback,
        wordReading: wordReading ? formatWordReadingResponse(wordReading) : undefined,
        phonemeComparison: phonemeComparison
          ? formatPhonemeComparisonResponse(phonemeComparison)
          : undefined,
        soundFeedback: phonemeComparison
          ? formatSoundFeedbackResponse(phonemeComparison)
          : undefined,
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

    const requiredPromptCount = Math.ceil((session.promptSet?.length || 0) * 0.7);
    const validPromptCount = new Set(
      attempts.filter((attempt) => attempt.validAudio).map((attempt) => attempt.promptId)
    ).size;
    if (!requiredPromptCount || validPromptCount < requiredPromptCount) {
      return res.status(400).json({
        success: false,
        message: "Please finish a few more sound steps before completing Leo's check.",
        data: {
          validPromptCount,
          requiredPromptCount,
          baselineStatus: "insufficient_data",
        },
      });
    }

    const pronunciationSummary = aggregatePronunciationSummary(attempts);
    const phonemeSummary = summarizePhonemeComparison(attempts);
    session.pronunciationSummary = pronunciationSummary;
    session.phonemeSummary = phonemeSummary;
    session.completedAt = new Date();
    session.status = "completed";
    session.snapshotStatus = "processing";
    await session.save();

    const snapshot = await finalizeSessionSnapshot({ session });
    const baselineUsable = snapshot.status === "ready";
    const recommendedActivityIds =
      snapshot.status === "ready"
        ? getLeoRecommendationIds(snapshot.supportLevel)
        : ["leo_first_sound_hunt", "leo_echo_roar"];
    session.supportLevel = snapshot.status === "ready" ? snapshot.supportLevel : "unknown";
    session.supportScore = toSupportScore(snapshot.supportNeedScore);
    session.modelVersion = snapshot.modelVersion || session.modelVersion;
    session.predictionSource = "assessment_snapshot_v1";
    session.recommendations = recommendedActivityIds;
    session.snapshotStatus = snapshot.status;
    session.snapshotId = snapshot._id;
    await session.save();

    await Student.findByIdAndUpdate(req.user.id, {
      $set: {
        "lexilandProgress.overallIdentificationStatus": "in_progress",
        "lexilandProgress.speech.identificationStatus": "completed",
        "lexilandProgress.speech.identificationCompletedAt": new Date(),
        "lexilandProgress.speech.improvementUnlocked": baselineUsable,
        "lexilandProgress.speech.baselineSnapshotId": snapshot._id,
        "lexilandProgress.speech.baselineRetestRequired": snapshot.status === "insufficient_data",
        "lexilandProgress.speech.supportLevel": session.supportLevel,
        "lexilandProgress.speech.supportScore": session.supportScore,
        "lexilandProgress.speech.recommendedActivityIds": recommendedActivityIds,
        "lexilandProgress.speech.currentActivityId": recommendedActivityIds[0] || "",
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        starsEarned: Math.max(1, Math.min(3, Math.round(attempts.length / 3))),
        starsEarnedTotal: attempts.reduce(
          (total, attempt) => total + (attempt.itemResult?.starsEarned || 0),
          0
        ),
        childMessage: "Leo found your sound path!",
        guardianMessage: "Your guardian can see your learning plan.",
        nextStep: "Return to LexiLand map",
        modelVersion: MODEL_VERSION,
        snapshotId: snapshot._id,
        snapshotStatus: snapshot.status,
        improvementUnlocked: baselineUsable,
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
    const attemptSummary = {
      totalAttemptCount: attempts.length,
      validAttemptCount,
      audioQualitySummary: summarizeAudioQuality(attempts),
      wordReadingSummary: summarizeWordReading(attempts),
      phonemeSummary: summarizePhonemeComparison(attempts),
    };

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
        recentSession: shapeIdentificationSessionForRole(session, {
          superAdmin: isSuperAdminRequest(req),
          attemptSummary,
        }),
        attemptsSummary: {
          ...attemptSummary,
          invalidAttemptCount: attempts.length - validAttemptCount,
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
    const devUnlock = process.env.LEXILAND_DEV_UNLOCK === "true";
    if (speech.identificationStatus !== "completed" && !devUnlock) {
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

    const latestActivitySession = await SpeechSession.findOne({
      studentId: req.user.id,
      mode: "improvement",
      activityId,
    }).sort({ createdAt: -1 });
    if (latestActivitySession?.status === "in_progress") {
      const resumedPrompts = resolveSessionActivityPrompts(latestActivitySession, activityId);
      const resumedCheckpointPrompts = (latestActivitySession.checkpointPromptSet || [])
        .map(resolveCheckpointPrompt)
        .filter(Boolean);
      return res.status(200).json({
        success: true,
        data: {
          sessionId: latestActivitySession._id,
          activity,
          prompts: resumedPrompts,
          checkpointDue: latestActivitySession.assessmentRole === "checkpoint",
          checkpointSequence: Number(latestActivitySession.checkpointSequence || 0),
          checkpointForm: Number(latestActivitySession.checkpointForm || 0),
          checkpointReason: "resumed_session",
          checkpointPrompts: resumedCheckpointPrompts,
          recommendation: plan,
          modelVersion: latestActivitySession.modelVersion || MODEL_VERSION,
          resumed: true,
        },
      });
    }

    const completedActivityIds = speech.completedActivityIds || [];
    const completedActivityCount = completedActivityIds.length;
    const projectedCompletedCount = completedActivityIds.includes(activityId)
      ? completedActivityIds.length
      : completedActivityIds.length + 1;
    const checkpointSchedule = getCheckpointSchedule({
      completedActivityCount: projectedCompletedCount,
      checkpointCount: Number(speech.checkpointCount || 0),
      totalActivityCount: getImprovementActivities().length,
    });
    const previousCheckpointSessionCount = checkpointSchedule.due
      ? await SpeechSession.countDocuments({
          studentId: req.user.id,
          mode: "improvement",
          assessmentRole: "checkpoint",
        })
      : 0;
    const checkpointForm = checkpointSchedule.due
      ? (previousCheckpointSessionCount % 4) + 1
      : 0;
    const checkpointSequence = checkpointSchedule.due ? checkpointSchedule.sequence : 0;
    const prompts = buildImprovementPromptSet({
      studentId: req.user.id,
      activityId,
      grade: child.grade,
      completedActivityCount,
      checkpointSequence,
    });
    const checkpointPrompts = checkpointSchedule.due
      ? getNormalizedCheckpointPrompts({
          grade: child.grade,
          sequenceNo: checkpointSchedule.sequence,
          formNo: checkpointForm,
        })
      : [];
    const session = await SpeechSession.create({
      studentId: req.user.id,
      grade: child.grade,
      mode: "improvement",
      assessmentRole: checkpointSchedule.due ? "checkpoint" : "training",
      checkpointSequence,
      checkpointForm,
      checkpointPromptSet: checkpointPrompts.map((prompt) => prompt.promptId),
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
        checkpointDue: checkpointSchedule.due,
        checkpointSequence,
        checkpointForm,
        checkpointReason: checkpointSchedule.reason,
        checkpointPrompts,
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
      attemptNo,
      audioDurationMs,
      selectedAnswer,
      attemptPhase,
    } = req.body;

    if (!sessionId || !activityId || !promptId || !attemptNo) {
      return res.status(400).json({ success: false, message: "Missing activity attempt fields" });
    }

    const activity = getActivityById(activityId);
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

    const resolvedAttemptPhase = attemptPhase === "checkpoint" ? "checkpoint" : "training";
    const prompt = resolvedAttemptPhase === "checkpoint"
      ? resolveCheckpointPrompt(promptId)
      : resolveActivityPrompt(activityId, promptId);
    const selectedPromptSet = resolvedAttemptPhase === "checkpoint"
      ? session.checkpointPromptSet
      : session.promptSet;
    const selectedPromptAllowed =
      !Array.isArray(selectedPromptSet) ||
      selectedPromptSet.length === 0 ||
      selectedPromptSet.includes(promptId);
    if (!activity || !prompt || !selectedPromptAllowed) {
      return res.status(400).json({ success: false, message: "Unknown Leo activity prompt" });
    }

    const attemptPolicy = buildLeoImprovementAttemptPolicy({
      prompt,
      attemptPhase: resolvedAttemptPhase,
      selectedAnswer,
    });
    const {
      isSelection,
      taskType: resolvedTaskType,
      targetText: resolvedTargetText,
      targetPhonemes: resolvedTargetPhonemes,
      expectedAnswer,
    } = attemptPolicy;

    const savedFile = saveUploadedAudio({
      file: req.file,
      studentId: req.user.id,
      sessionId,
      promptId,
      attemptNo,
    });
    const audioAnalysis = await analyzeSavedAudio(savedFile, audioDurationMs, {
      taskType: resolvedTaskType,
      targetText: resolvedTargetText,
    });
    const observedAudioDurationMs = getObservedAudioDurationMs(audioAnalysis, audioDurationMs);
    const allowPlaceholderAudio = canUsePlaceholderAudio({
      nodeEnv: process.env.NODE_ENV,
      placeholderRequested: toBoolean(req.body.placeholderMode),
      hasFile: Boolean(req.file),
      isSelection,
    });

    const features = extractPlaceholderFeatures({
      file: savedFile,
      fileMetadata: { audioSizeBytes: savedFile?.size || 0 },
      audioAnalysis,
      audioDurationMs: audioDurationMs || (isSelection ? 900 : 1200),
      attemptNo,
      taskType: resolvedTaskType,
      promptId,
      targetText: resolvedTargetText,
      targetPhonemes: resolvedTargetPhonemes,
      skill: resolvedAttemptPhase === "checkpoint" ? prompt.skill : activity.skill,
      mode: "improvement",
      allowPlaceholderAudio,
      isSelection,
      selectedAnswer: attemptPolicy.selectedAnswer,
      expectedAnswer,
    });
    const itemResult = createItemResult(features);
    const activePromptSet = resolvedAttemptPhase === "checkpoint"
      ? getNormalizedCheckpointPrompts({
          grade: session.grade,
          sequenceNo: session.checkpointSequence,
          formNo: session.checkpointForm,
        })
      : resolveSessionActivityPrompts(session, activityId);
    const promptIndex = activePromptSet.findIndex((item) => item.promptId === promptId);
    const targetWord = getSafeTargetWord(resolvedTargetText);
    const runPronunciation = shouldRunPronunciationModel({
      taskType: resolvedTaskType,
      features,
      isSelection,
    });
    const runAsr = Boolean(
      !isSelection &&
        features.validAudio &&
        (isSentenceReadingTask(resolvedTaskType) ? String(resolvedTargetText || "").trim() : targetWord)
    );
    const awaitReadingEvidence = shouldAwaitImprovementReadingEvidence({
      isSelection,
      validAudio: features.validAudio,
      runAsr,
    });
    const pronunciationModel = runPronunciation
      ? useBackgroundProcessing()
        ? getInitialPronunciationModel(features, resolvedTaskType)
        : await getPronunciationModelResult({
            taskType: resolvedTaskType,
            features,
            audioAnalysis,
          })
      : getSkippedPronunciationModel(
          isParagraphPracticeTask(resolvedTaskType)
            ? "paragraph_practice_excluded"
            : isSelection
              ? "selection_attempt_without_recording"
              : features.invalidReason || "audio_invalid"
        );
    const readingTask = isSelection
      ? {}
      : useBackgroundAsr() && !awaitReadingEvidence
        ? getInitialReadingTask({
            taskType: resolvedTaskType,
            targetText: resolvedTargetText,
            targetWord,
            features,
          })
        : await getReadingTaskResult({
            taskType: resolvedTaskType,
            targetText: resolvedTargetText,
            targetWord,
            features,
            audioAnalysis,
            audioDurationMs: observedAudioDurationMs,
          });
    const { wordReading, sentenceReading } = readingTask;
    const phonemeComparison = isSelection
      ? undefined
      : useBackgroundAsr() && !awaitReadingEvidence
        ? wordReading
          ? getInitialPhonemeComparison({ targetWord, features, wordReading })
          : undefined
        : getPhonemeComparisonResult({
            targetWord,
            targetText: resolvedTargetText,
            taskType: resolvedTaskType,
            wordReading,
          });
    if (isSelection && features.wordCorrectPlaceholder && Number(attemptNo) > 1) {
      itemResult.starsEarned = Math.min(itemResult.starsEarned, 2);
    }
    const attemptProgress = getLeoAttemptProgress({
      isSelection,
      selectedCorrect: attemptPolicy.selectedCorrect,
      validAudio: features.validAudio,
      wordReading,
      sentenceReading,
    });
    const advancingWordFeedback = getAdvancingWordFeedback({
      isSelection,
      attemptProgress,
      wordReading,
    });
    const needsRecognizableSpeechRetry = Boolean(
      !isSelection && features.validAudio && attemptProgress.retryRequired
    );
    const wordFeedback = wordReading ? getChildWordFeedback(wordReading) : "";
    const baseSentenceFeedback = sentenceReading
      ? getChildSentenceFeedback(sentenceReading)
      : undefined;
    const speechRetryMessage = "Leo could not hear the words clearly. Please try again.";
    const sentenceFeedback = needsRecognizableSpeechRetry && sentenceReading
      ? { state: "retry", message: speechRetryMessage }
      : baseSentenceFeedback;
    const childFeedback = needsRecognizableSpeechRetry
      ? speechRetryMessage
      : advancingWordFeedback?.childFeedback
        ? advancingWordFeedback.childFeedback
      : features.validAudio
      ? sentenceFeedback?.message || wordFeedback ||
        (features.wordCorrectPlaceholder
        ? activity.gameType === "minimal_pair"
          ? "Great listening! These sounds are twins, and Leo is helping you hear them."
          : "Great safari work!"
        : activity.gameType === "minimal_pair"
          ? "These sounds are twins. Leo will help you hear them."
          : features.childFeedback || "Listen again with Leo.")
      : getInvalidAudioChildFeedback(features.invalidReason);
    const leoMessage = needsRecognizableSpeechRetry
      ? speechRetryMessage
      : advancingWordFeedback?.leoMessage
        ? advancingWordFeedback.leoMessage
      : sentenceFeedback?.message || (features.wordCorrectPlaceholder
      ? "You found a sound gem."
      : features.validAudio
        ? wordReading?.attemptStatus === "valid"
          ? wordReading?.wordCorrect
            ? "Leo heard the word clearly."
            : "Try the next jungle step."
          : "Leo heard your sound."
        : getInvalidAudioChildFeedback(features.invalidReason));
    const processingFields = getInitialProcessingFields({
      savedFile,
      features,
      runAsr,
      runPronunciation,
    });
    if (awaitReadingEvidence) {
      processingFields.processingSteps.asr = getStepStatusFromReadingTask(readingTask);
    }

    const attempt = await SpeechAttempt.create({
      sessionId,
      studentId: req.user.id,
      activityId,
      attemptPhase: resolvedAttemptPhase,
      promptId,
      taskType: resolvedTaskType,
      targetText: resolvedTargetText,
      gameType: activity.gameType,
      selectedAnswer: attemptPolicy.selectedAnswer,
      selectedCorrect: attemptPolicy.selectedCorrect,
      targetPhonemes: resolvedTargetPhonemes,
      attemptNo,
      audioOriginalName: savedFile?.originalname || "",
      audioMimeType: savedFile?.mimetype || "",
      audioSizeBytes: savedFile?.size || 0,
      audioFilePath: getRelativeUploadPath(savedFile),
      audioUrl: getAudioUrl(savedFile),
      audioStorage: getInitialAudioStorage(savedFile),
      ...processingFields,
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
      wordReading,
      sentenceReading,
      phonemeComparison,
    });

    scheduleAttemptBackgroundProcessing({
      attemptId: attempt._id,
      sessionId,
      savedFile,
      audioAnalysis,
      features,
      taskType: resolvedTaskType,
      targetText: resolvedTargetText,
      targetWord,
      audioDurationMs: observedAudioDurationMs,
      runAsr: useBackgroundAsr() && runAsr && !awaitReadingEvidence,
      runPronunciation: useBackgroundProcessing() && runPronunciation,
    });

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        promptId,
        attemptPhase: resolvedAttemptPhase,
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
        sentenceFeedback,
        wordReading: wordReading ? formatWordReadingResponse(wordReading) : undefined,
        phonemeComparison: phonemeComparison
          ? formatPhonemeComparisonResponse(phonemeComparison)
          : undefined,
        soundFeedback: phonemeComparison
          ? formatSoundFeedbackResponse(phonemeComparison)
          : undefined,
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

    const pronunciationSummary = aggregatePronunciationSummary(attempts);
    const phonemeSummary = summarizePhonemeComparison(attempts);
    const starsEarned = getActivityAward(attempts);
    const child = await Student.findById(req.user.id).select("lexilandProgress");
    const speech = child.lexilandProgress?.speech || {};
    const trainingAttempts = attempts.filter((attempt) => attempt.attemptPhase !== "checkpoint");
    const checkpointAttempts = attempts.filter((attempt) => attempt.attemptPhase === "checkpoint");
    const trainingCoverage = getTrainingPromptCoverage({ session, attempts: trainingAttempts });
    if (!trainingCoverage.complete) {
      return res.status(400).json({
        success: false,
        message: "Complete a few more jungle steps before finishing this activity.",
        data: {
          completedPromptCount: trainingCoverage.completedPromptCount,
          requiredPromptCount: trainingCoverage.requiredPromptCount,
          expectedPromptCount: trainingCoverage.expectedPromptCount,
        },
      });
    }
    if (session.assessmentRole === "checkpoint") {
      const expectedCheckpointPrompts = session.checkpointPromptSet || [];
      const completedCheckpointPrompts = new Set(
        checkpointAttempts
          .filter(isSuccessfulLeoAttempt)
          .map((attempt) => attempt.promptId)
      );
      const requiredCheckpointCount = Math.ceil(expectedCheckpointPrompts.length * 0.7);
      if (
        !expectedCheckpointPrompts.length ||
        completedCheckpointPrompts.size < requiredCheckpointCount
      ) {
        return res.status(400).json({
          success: false,
          message: "Finish Leo's Trail Check before collecting this reward.",
          data: {
            checkpointRequired: true,
            checkpointSequence: session.checkpointSequence,
            completedCheckpointSteps: completedCheckpointPrompts.size,
            requiredCheckpointSteps: requiredCheckpointCount,
          },
        });
      }
    }
    const wasAlreadyCompleted = (speech.completedActivityIds || []).includes(session.activityId);
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
    const bestActivityStars = mergedActivityProgress.starsEarned;
    const newlyEarnedStars = Math.max(0, bestActivityStars - previousActivityStars);
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

    session.starsEarned = starsEarned;
    session.activityCompleted = true;
    session.recommendationReason = plan.guardianReason;
    session.skillFocus = plan.skillFocus;
    session.pronunciationSummary = pronunciationSummary;
    session.phonemeSummary = phonemeSummary;
    // TODO: Final Speech-Reading Support Classifier will later use pronunciationSummary as one input feature.
    session.status = "completed";
    session.snapshotStatus = "processing";
    session.completedAt = new Date();
    await session.save();

    const activitySnapshot = await finalizeSessionSnapshot({
      session,
      kindOverride: "activity_estimate",
    });
    const checkpointSnapshot = session.assessmentRole === "checkpoint"
      ? await finalizeSessionSnapshot({ session, kindOverride: "checkpoint" })
      : null;
    const formalSnapshot = checkpointSnapshot || activitySnapshot;
    session.snapshotId = formalSnapshot?._id;
    session.snapshotStatus = formalSnapshot?.status || "failed";
    if (checkpointSnapshot?.status === "ready") {
      session.supportLevel = checkpointSnapshot.supportLevel;
      session.supportScore = toSupportScore(checkpointSnapshot.supportNeedScore);
      session.modelVersion = checkpointSnapshot.modelVersion || session.modelVersion;
      session.predictionSource = "assessment_snapshot_v1";
    }
    await session.save();

    const completedCheckpoint = Boolean(
      checkpointSnapshot && !wasAlreadyCompleted
    );
    const checkpointCount = completedCheckpoint
      ? Math.max(Number(speech.checkpointCount || 0), Number(session.checkpointSequence || 0))
      : Number(speech.checkpointCount || 0);
    const activitiesSinceCheckpoint = completedCheckpoint
      ? 0
      : wasAlreadyCompleted
        ? Number(speech.activitiesSinceCheckpoint || 0)
        : Number(speech.activitiesSinceCheckpoint || 0) + 1;
    const nextCheckpointSchedule = getCheckpointSchedule({
      completedActivityCount: completedActivityIds.length,
      checkpointCount,
      totalActivityCount: getImprovementActivities().length,
    });

    await Student.findByIdAndUpdate(req.user.id, {
      $set: {
        "lexilandProgress.speech.completedActivityIds": completedActivityIds,
        "lexilandProgress.speech.currentActivityId": nextActivityId,
        "lexilandProgress.speech.recommendedActivityIds": plan.recommendedActivityIds,
        "lexilandProgress.speech.activityProgress": progressDraft,
        "lexilandProgress.speech.stars": (speech.stars || 0) + newlyEarnedStars,
        "lexilandProgress.speech.weakSkillFocus": plan.skillFocus || getActivityById(nextActivityId)?.skill || "",
        "lexilandProgress.speech.checkpointCount": checkpointCount,
        "lexilandProgress.speech.activitiesSinceCheckpoint": activitiesSinceCheckpoint,
        "lexilandProgress.speech.latestCheckpointSnapshotId": checkpointSnapshot?._id || speech.latestCheckpointSnapshotId,
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        starsEarned,
        totalStars: (speech.stars || 0) + newlyEarnedStars,
        newlyEarnedStars,
        rewardName: `${getActivityById(session.activityId)?.shortTitle || getActivityById(session.activityId)?.title || "Jungle Sound"} Badge`,
        nextActivityId,
        nextActivityTitle: getActivityById(nextActivityId)?.title || "",
        childMessage: plan.childMessage || "Great safari work!",
        guardianReason: plan.guardianReason,
        skillFocus: plan.skillFocus,
        activityCompleted: true,
        snapshotId: formalSnapshot?._id,
        snapshotStatus: formalSnapshot?.status || "failed",
        activitySnapshotId: activitySnapshot?._id,
        checkpointSnapshotId: checkpointSnapshot?._id,
        checkpointCompleted: Boolean(checkpointSnapshot),
        checkpointSequence: checkpointSnapshot ? session.checkpointSequence : 0,
        checkpointDue: nextCheckpointSchedule.due,
        nextCheckpointSequence: nextCheckpointSchedule.sequence,
        trendStatus: checkpointSnapshot?.trendStatus || "processing",
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
    const latestAttempts = latestSession
      ? await SpeechAttempt.find({ sessionId: latestSession._id }).sort({ createdAt: 1 }).lean()
      : [];
    const superAdminView = isSuperAdminRequest(req);
    const safeSpeech = shapeSpeechProgressForRole(speech, { superAdmin: superAdminView });
    const recommendation = {
      nextActivity: plan.nextActivity,
      recommendedActivities: plan.recommendedActivities,
      reasonCode: plan.reasonCode,
      guardianReason: plan.guardianReason,
      childMessage: plan.childMessage,
      skillFocus: plan.skillFocus,
    };

    res.json({
      success: true,
      data: {
        child: { id: child._id, fullName: child.fullName, username: child.username, grade: child.grade },
        speech: safeSpeech,
        supportLevel: safeSpeech.supportLevel || "unknown",
        supportScore: safeSpeech.supportScore,
        nextActivity: shapeActivityForRole(getActivityById(currentActivityId), { superAdmin: superAdminView }),
        recommendation: shapeRecommendationForRole(recommendation, { superAdmin: superAdminView }),
        activities: buildActivityMap({ speech, plan }).map((activity) =>
          shapeActivityForRole(activity, { superAdmin: superAdminView })
        ),
        latestSession: latestSession
          ? shapeSessionForRole(latestSession, {
              superAdmin: superAdminView,
              activity: getSystemActivityById(latestSession.activityId),
              wordReadingSummary: summarizeWordReading(latestAttempts),
              phonemeSummary: summarizePhonemeComparison(latestAttempts),
              attempts: latestAttempts,
            })
          : null,
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
    const latestAttempts = latestImprovementSession
      ? await SpeechAttempt.find({ sessionId: latestImprovementSession._id }).sort({ createdAt: 1 }).lean()
      : [];
    const superAdminView = isSuperAdminRequest(req);
    const safeSpeech = shapeSpeechProgressForRole(speech, { superAdmin: superAdminView });
    const recommendation = {
      nextActivity: plan.nextActivity,
      recommendedActivities: plan.recommendedActivities,
      reasonCode: plan.reasonCode,
      guardianReason: plan.guardianReason,
      childMessage: plan.childMessage,
      skillFocus: plan.skillFocus,
    };

    res.json({
      success: true,
      data: {
        child: { id: child._id, fullName: child.fullName, username: child.username, grade: child.grade },
        improvementUnlocked: Boolean(child.lexilandProgress?.improvementUnlocked || safeSpeech.improvementUnlocked),
        stars: safeSpeech.stars || 0,
        currentActivityId: plan.nextActivityId || safeSpeech.currentActivityId || "",
        recommendedActivityIds: plan.recommendedActivityIds,
        completedActivityIds: safeSpeech.completedActivityIds || [],
        weakSkillFocus: plan.skillFocus || safeSpeech.weakSkillFocus || "",
        recommendation: shapeRecommendationForRole(recommendation, { superAdmin: superAdminView }),
        activities: buildActivityMap({ speech, plan }).map((activity) =>
          shapeActivityForRole(activity, { superAdmin: superAdminView })
        ),
        latestSession: latestImprovementSession
          ? shapeSessionForRole(latestImprovementSession, {
              superAdmin: superAdminView,
              activity: getSystemActivityById(latestImprovementSession.activityId),
              wordReadingSummary: summarizeWordReading(latestAttempts),
              phonemeSummary: summarizePhonemeComparison(latestAttempts),
              attempts: latestAttempts,
            })
          : null,
      },
    });
  } catch (error) {
    console.error("Guardian improvement progress error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch improvement progress" });
  }
};

exports.getGuardianActivityPlan = exports.getGuardianSpeechOverview;

exports.getGuardianActivityProgress = exports.getGuardianImprovementProgress;

const filterGuardianHistorySessions = (sessions = [], attemptsBySession = {}) =>
  sessions.filter((session) => {
    if (session.status !== "in_progress") return true;
    return (attemptsBySession[String(session._id)] || []).length > 0;
  });

exports.filterGuardianHistorySessions = filterGuardianHistorySessions;

exports.getGuardianSessionHistory = async (req, res) => {
  try {
    const child = await Student.findById(req.params.childId)
      .select("fullName username grade guardianId createdByAdmin")
      .lean();
    if (!child) return res.status(404).json({ success: false, message: "Child not found" });
    if (!canAccessChild(req, child)) return res.status(403).json({ success: false, message: "Access denied" });
    const superAdminView = isSuperAdminRequest(req);

    const sessions = await SpeechSession.find({ studentId: child._id })
      .sort({ createdAt: -1 })
      .lean();
    const attempts = await SpeechAttempt.find({
      sessionId: { $in: sessions.map((session) => session._id) },
    })
      .sort({ createdAt: 1 })
      .lean();
    const labels = await SpeechManualLabel.find({
      sessionId: { $in: sessions.map((session) => session._id) },
    }).lean();
    const snapshots = superAdminView
      ? await SpeechAssessmentSnapshot.find({
          sessionId: { $in: sessions.map((session) => session._id) },
          isCurrent: true,
        }).lean()
      : [];
    const attemptsBySession = attempts.reduce((map, attempt) => {
      const key = String(attempt.sessionId);
      if (!map[key]) map[key] = [];
      map[key].push(attempt);
      return map;
    }, {});
    const labelsBySession = labels.reduce((map, label) => {
      const key = String(label.sessionId);
      if (!map[key]) map[key] = [];
      map[key].push(label);
      return map;
    }, {});
    const snapshotsBySession = snapshots.reduce((map, snapshot) => {
      const key = String(snapshot.sessionId);
      if (!map[key]) map[key] = [];
      map[key].push(shapeSnapshotForRole(snapshot, { superAdmin: superAdminView }));
      return map;
    }, {});
    const visibleSessions = filterGuardianHistorySessions(sessions, attemptsBySession);

    res.json({
      success: true,
      data: {
        child: { id: child._id, fullName: child.fullName, username: child.username, grade: child.grade },
        sessions: visibleSessions.map((session) => {
          const sessionAttempts = attemptsBySession[String(session._id)] || [];
          const sessionLabels = labelsBySession[String(session._id)] || [];
          const supportLabelCount = sessionLabels.filter((label) => label.speechSupportLabel).length;
          return shapeSessionHistoryForRole({
            session,
            canViewTechnical: superAdminView,
            activity: getSystemActivityById(session.activityId),
            wordReadingSummary: summarizeWordReading(sessionAttempts),
            phonemeSummary: summarizePhonemeComparison(sessionAttempts),
            datasetReadiness: {
              labelledAttemptCount: sessionLabels.length,
              supportLabelCount,
              datasetReady: Boolean(supportLabelCount && sessionAttempts.some((attempt) => attempt.validAudio)),
            },
            assessmentSnapshots: snapshotsBySession[String(session._id)] || [],
            attempts: sessionAttempts,
          });
        }),
        viewer: { canViewTechnical: superAdminView },
      },
    });
  } catch (error) {
    console.error("Guardian session history error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch speech session history" });
  }
};

const getGuardianSnapshotData = async (req, childId) => {
  const child = await Student.findById(childId)
    .select("fullName username grade guardianId createdByAdmin lexilandProgress")
    .lean();
  if (!child) return { errorStatus: 404, errorMessage: "Child not found" };
  if (!canAccessChild(req, child)) return { errorStatus: 403, errorMessage: "Access denied" };

  await refreshPendingSnapshots(child._id);
  const snapshots = await SpeechAssessmentSnapshot.find({ studentId: child._id, isCurrent: true })
    .sort({ createdAt: 1, sequenceNo: 1 })
    .lean();
  const superAdminView = isSuperAdminRequest(req);
  const safeSnapshots = snapshots.map((snapshot) =>
    shapeSnapshotForRole(snapshot, { superAdmin: superAdminView })
  );
  const speech = child.lexilandProgress?.speech || {};
  return {
    child: { id: child._id, fullName: child.fullName, username: child.username, grade: child.grade },
    speech: shapeSpeechProgressForRole(speech, { superAdmin: superAdminView }),
    snapshots: safeSnapshots,
    baseline: safeSnapshots.find((snapshot) => snapshot.kind === "baseline") || null,
    activityEstimates: safeSnapshots.filter((snapshot) => snapshot.kind === "activity_estimate"),
    checkpoints: safeSnapshots.filter((snapshot) => snapshot.kind === "checkpoint"),
  };
};

exports.getGuardianProgressComparison = async (req, res) => {
  try {
    const data = await getGuardianSnapshotData(req, req.params.childId);
    if (data.errorStatus) {
      return res.status(data.errorStatus).json({ success: false, message: data.errorMessage });
    }
    const latestCheckpoint = data.checkpoints[data.checkpoints.length - 1] || null;
    const previousCheckpoint = data.checkpoints[data.checkpoints.length - 2] || null;
    res.json({
      success: true,
      data: {
        child: data.child,
        baseline: data.baseline,
        latestCheckpoint,
        previousCheckpoint,
        checkpoints: data.checkpoints,
        activityEstimates: data.activityEstimates,
        currentTrend: latestCheckpoint?.trendStatus || data.baseline?.status || "not_started",
        meaningfulDecision: Boolean(latestCheckpoint?.meaningfulDecision),
      },
    });
  } catch (error) {
    console.error("Guardian progress comparison error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch progress comparison" });
  }
};

exports.getGuardianCheckpoints = async (req, res) => {
  try {
    const data = await getGuardianSnapshotData(req, req.params.childId);
    if (data.errorStatus) {
      return res.status(data.errorStatus).json({ success: false, message: data.errorMessage });
    }
    res.json({
      success: true,
      data: {
        child: data.child,
        baseline: data.baseline,
        checkpoints: data.checkpoints,
        completedActivityCount: (data.speech.completedActivityIds || []).length,
        checkpointCount: Number(data.speech.checkpointCount || 0),
      },
    });
  } catch (error) {
    console.error("Guardian checkpoints error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch checkpoint history" });
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
    const { studentId, grade, supportLevel, mode, status } = req.query;
    const query = {};
    if (grade) query.grade = String(grade);
    if (supportLevel) query.supportLevel = supportLevel;
    if (mode) query.mode = mode;
    if (status) query.status = status;
    const childIds = await getGuardianChildIds(req);
    if (childIds) {
      if (studentId && !childIds.some((childId) => String(childId) === String(studentId))) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      query.studentId = studentId || { $in: childIds };
    } else if (studentId) {
      query.studentId = studentId;
    }

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

    const superAdminView = isSuperAdminRequest(req);
    res.status(200).json({
      success: true,
      data: sessions.map((session) =>
        shapeSessionListItemForRole(session, {
          superAdmin: superAdminView,
          attemptSummary: attemptSummaryBySession[String(session._id)] || {
            validAttemptCount: 0,
            totalAttemptCount: 0,
          },
          manualLabelCount: labelSummaryBySession[String(session._id)] || 0,
        })
      ),
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

    const superAdminView = isSuperAdminRequest(req);
    res.status(200).json({
      success: true,
      data: sessions.map((session) =>
        shapeSessionListItemForRole(session, {
          superAdmin: superAdminView,
          totalAttemptCount: countMap[String(session._id)] || 0,
        })
      ),
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
    const superAdminView = isSuperAdminRequest(req);
    const promptMap = superAdminView
      ? await getPromptMap(attempts.map((attempt) => attempt.promptId))
      : {};
    const supportLabelCount = labels.filter((label) => label.speechSupportLabel).length;
    const safeSession = shapeSessionForRole(session, {
      superAdmin: superAdminView,
      activity: getSystemActivityById(session.activityId),
      wordReadingSummary: summarizeWordReading(attempts),
      phonemeSummary: summarizePhonemeComparison(attempts),
      datasetReadiness: {
        labelledAttemptCount: labels.length,
        supportLabelCount,
        datasetReady: Boolean(supportLabelCount && attempts.some((attempt) => attempt.validAudio)),
      },
      attempts,
    });

    res.status(200).json({
      success: true,
      data: {
        session: safeSession,
        attempts: attempts.map((attempt) => {
          const shapedAttempt = shapeAttemptForRole(attempt, { superAdmin: superAdminView });
          if (!superAdminView) return shapedAttempt;
          return {
            ...shapedAttempt,
            prompt: promptMap[attempt.promptId] || null,
            manualLabel: labelMap[String(attempt._id)] || null,
          };
        }),
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
        audioStorage: result.attempt.audioStorage,
        processingStatus: result.attempt.processingStatus,
        processingSteps: result.attempt.processingSteps,
        features: result.features,
        itemResult: result.itemResult,
        sentenceReading: result.sentenceReading,
        wordReading: result.wordReading
          ? formatWordReadingResponse(result.wordReading)
          : undefined,
        phonemeComparison: result.phonemeComparison
          ? formatPhonemeComparisonResponse(result.phonemeComparison)
          : undefined,
        soundFeedback: result.phonemeComparison
          ? formatSoundFeedbackResponse(result.phonemeComparison)
          : undefined,
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
        speechSupportLabel: req.body.speechSupportLabel || undefined,
        labelConfidence: req.body.labelConfidence ?? req.body.teacherConfidence,
        labelNotes: req.body.labelNotes || req.body.comment || "",
        labelledAt: new Date(),
        comment: req.body.comment || "",
      },
      { returnDocument: "after", upsert: true, runValidators: true }
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
        "audioUrl normalizedAudioUrl audioStorage processingStatus processingSteps serverAudioDurationMs frontendAudioDurationMs durationMismatchMs audioMetadata volumeFeatures silenceFeatures audioQuality extractionVersion extractionStatus extractionError features validAudio invalidReason"
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

exports.retryAttemptMediaSync = async (req, res) => {
  try {
    const attempt = await SpeechAttempt.findById(req.params.attemptId).select(
      "audioFilePath normalizedAudioPath audioStorage processingStatus processingSteps"
    );
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    await SpeechAttempt.findByIdAndUpdate(attempt._id, {
      $set: {
        processingStatus: "processing",
        "processingSteps.cloudinary": "processing",
        "audioStorage.provider": getConfiguredProvider() === "cloudinary" ? "cloudinary" : "local",
        "audioStorage.uploadStatus": "processing",
        "audioStorage.uploadError": "",
      },
    });

    const audioStorage = await syncSpeechAttemptMedia({
      attemptId: attempt._id,
      originalAudioPath: attempt.audioFilePath,
      normalizedAudioPath: attempt.normalizedAudioPath,
    });
    const cloudinaryStep = getStepStatusFromMedia(audioStorage);
    const updated = await SpeechAttempt.findByIdAndUpdate(
      attempt._id,
      {
        $set: {
          audioStorage,
          "processingSteps.cloudinary": cloudinaryStep,
          processingStatus: cloudinaryStep === "failed" ? "failed" : "completed",
        },
      },
      { returnDocument: "after" }
    ).select("audioStorage processingStatus processingSteps audioUrl normalizedAudioUrl");

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Retry attempt media sync error:", error);
    res.status(500).json({ success: false, message: "Failed to retry media sync" });
  }
};

exports.reprocessAttemptAnalysis = async (req, res) => {
  try {
    const attempt = await SpeechAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });
    if (!attempt.validAudio || !attempt.normalizedAudioPath) {
      return res.status(400).json({
        success: false,
        message: "A valid retained normalized recording is required for reprocessing.",
      });
    }

    attempt.processingStatus = "processing";
    attempt.processingSteps.asr = "processing";
    attempt.processingSteps.pronunciationModel = isParagraphPracticeTask(attempt.taskType)
      ? "skipped"
      : "processing";
    await attempt.save();

    const audioAnalysis = {
      normalizedAudioPath: attempt.normalizedAudioPath,
      serverAudioDurationMs: attempt.serverAudioDurationMs,
      frontendAudioDurationMs: attempt.frontendAudioDurationMs,
    };
    const observedAudioDurationMs = getObservedAudioDurationMs(audioAnalysis);
    const targetWord = getSafeTargetWord(attempt.wordReading?.targetWord, attempt.targetText);
    const [readingTask, pronunciationModel] = await Promise.all([
      getReadingTaskResult({
        taskType: attempt.taskType,
        targetText: attempt.targetText,
        targetWord,
        features: attempt.features,
        audioAnalysis,
        audioDurationMs: observedAudioDurationMs,
      }),
      getPronunciationModelResult({
        taskType: attempt.taskType,
        features: attempt.features,
        audioAnalysis,
      }),
    ]);
    const phonemeComparison = getPhonemeComparisonResult({
      targetWord,
      targetText: attempt.targetText,
      taskType: attempt.taskType,
      wordReading: readingTask.wordReading,
    });
    attempt.wordReading = readingTask.wordReading;
    attempt.sentenceReading = readingTask.sentenceReading;
    attempt.phonemeComparison = phonemeComparison;
    if (isSentenceReadingTask(attempt.taskType)) {
      attempt.set("wordReading", undefined);
      attempt.set("phonemeComparison", undefined);
    } else {
      attempt.set("sentenceReading", undefined);
    }
    attempt.pronunciationModel = pronunciationModel;
    attempt.processingSteps.asr = getStepStatusFromReadingTask(readingTask);
    attempt.processingSteps.pronunciationModel = getStepStatusFromModel(pronunciationModel);
    attempt.processingStatus =
      [attempt.processingSteps.asr, attempt.processingSteps.pronunciationModel].includes("failed")
        ? "failed"
        : "completed";
    await attempt.save();
    await refreshCompletedSessionAnalysis(attempt.sessionId);

    res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        processingStatus: attempt.processingStatus,
        processingSteps: attempt.processingSteps,
        pronunciationModel: attempt.pronunciationModel,
        wordReading: attempt.wordReading,
        sentenceReading: attempt.sentenceReading,
        phonemeComparison: attempt.phonemeComparison,
      },
    });
  } catch (error) {
    console.error("Attempt analysis reprocess error:", error);
    res.status(500).json({ success: false, message: "Failed to reprocess attempt analysis" });
  }
};

exports.recomputeAssessmentSnapshots = async (req, res) => {
  try {
    const session = await SpeechSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const snapshots = [];
    if (session.mode === "identification" || session.assessmentRole === "baseline") {
      snapshots.push(await finalizeSessionSnapshot({ session, force: true, kindOverride: "baseline" }));
    } else {
      snapshots.push(
        await finalizeSessionSnapshot({ session, force: true, kindOverride: "activity_estimate" })
      );
      if (session.assessmentRole === "checkpoint") {
        snapshots.push(
          await finalizeSessionSnapshot({ session, force: true, kindOverride: "checkpoint" })
        );
      }
    }

    const selected = snapshots[snapshots.length - 1];
    session.snapshotId = selected?._id;
    session.snapshotStatus = selected?.status || "failed";
    await session.save();
    res.json({ success: true, data: { sessionId: session._id, snapshots } });
  } catch (error) {
    console.error("Assessment recompute error:", error);
    res.status(500).json({ success: false, message: "Failed to recompute assessment snapshots" });
  }
};

exports.backfillAssessmentSnapshots = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.body?.limit || 100), 1), 500);
    const sessions = await SpeechSession.find({
      status: "completed",
      mode: { $in: ["identification", "improvement"] },
    })
      .sort({ completedAt: 1, createdAt: 1 })
      .limit(limit);
    const result = { scanned: sessions.length, created: 0, insufficientData: 0, failed: 0 };

    for (const session of sessions) {
      try {
        const kinds = session.mode === "identification"
          ? ["baseline"]
          : ["activity_estimate", ...(session.assessmentRole === "checkpoint" ? ["checkpoint"] : [])];
        for (const kind of kinds) {
          const before = await SpeechAssessmentSnapshot.exists({
            sessionId: session._id,
            kind,
            sequenceNo: kind === "checkpoint" ? Number(session.checkpointSequence || 0) : 0,
            isCurrent: true,
          });
          const snapshot = await finalizeSessionSnapshot({ session, kindOverride: kind });
          if (!before) result.created += 1;
          if (snapshot.status === "insufficient_data") result.insufficientData += 1;
          if (kind === "baseline") {
            await Student.findByIdAndUpdate(session.studentId, {
              $set: {
                "lexilandProgress.speech.baselineSnapshotId": snapshot._id,
                "lexilandProgress.speech.baselineRetestRequired": snapshot.status === "insufficient_data",
                "lexilandProgress.speech.improvementUnlocked": snapshot.status === "ready",
              },
            });
          }
        }
      } catch (error) {
        result.failed += 1;
        console.error(`Assessment backfill failed for session ${session._id}:`, error.message);
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Assessment backfill error:", error);
    res.status(500).json({ success: false, message: "Failed to backfill assessment snapshots" });
  }
};

exports.getPronunciationModelEvaluation = async (req, res) => {
  try {
    res.json({ success: true, data: getPronunciationModelAudit() });
  } catch (error) {
    console.error("Pronunciation model evaluation error:", error);
    res.status(500).json({ success: false, message: "Failed to read model evaluation" });
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
      returnDocument: "after",
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
    const prompt = await SpeechPrompt.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: "after" }
    );
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
      returnDocument: "after",
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
      { returnDocument: "after" }
    );
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to cancel assignment" });
  }
};

const loadSpeechDatasetExportData = async () => {
  const [sessions, attempts, labels] = await Promise.all([
    SpeechSession.find()
      .populate("studentId", "username grade")
      .sort({ createdAt: -1 })
      .lean(),
    SpeechAttempt.find()
      .populate("studentId", "username grade")
      .populate("sessionId", "grade mode")
      .sort({ createdAt: -1 })
      .lean(),
    SpeechManualLabel.find()
      .populate("labeledByAdmin", "email fullName")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
  ]);

  const labelMap = labels.reduce((map, label) => {
    map[String(label.attemptId)] = label;
    return map;
  }, {});
  const attemptsBySession = attempts.reduce((map, attempt) => {
    const key = String(attempt.sessionId?._id || attempt.sessionId);
    if (!map[key]) map[key] = [];
    map[key].push(attempt);
    return map;
  }, {});
  const labelsBySession = labels.reduce((map, label) => {
    const key = String(label.sessionId);
    if (!map[key]) map[key] = [];
    map[key].push(label);
    return map;
  }, {});

  return { sessions, attempts, labelMap, attemptsBySession, labelsBySession };
};

exports.exportDatasetAttemptFeaturesCsv = async (req, res) => {
  try {
    const { attempts, labelMap } = await loadSpeechDatasetExportData();
    sendCsv(
      res,
      "attempt_features.csv",
      ATTEMPT_FEATURE_COLUMNS,
      buildAttemptFeatureRows({ attempts, labelMap })
    );
  } catch (error) {
    console.error("Attempt feature dataset export error:", error);
    res.status(500).json({ success: false, message: "Failed to export attempt feature dataset" });
  }
};

exports.exportDatasetSessionFeaturesCsv = async (req, res) => {
  try {
    const { sessions, attemptsBySession, labelsBySession } = await loadSpeechDatasetExportData();
    sendCsv(
      res,
      "session_features.csv",
      SESSION_FEATURE_COLUMNS,
      buildSessionFeatureRows({ sessions, attemptsBySession, labelsBySession })
    );
  } catch (error) {
    console.error("Session feature dataset export error:", error);
    res.status(500).json({ success: false, message: "Failed to export session feature dataset" });
  }
};

exports.exportDatasetTemplateCsv = async (req, res) => {
  sendCsv(
    res,
    "LexiLand_Speech_Data_Collection_Template.csv",
    DATA_COLLECTION_TEMPLATE_COLUMNS,
    DATA_COLLECTION_TEMPLATE_ROWS
  );
};

exports.getFinalSpeechClassifierStatus = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: getFinalSpeechClassifierStatus(),
    });
  } catch (error) {
    console.error("Final speech classifier status error:", error);
    res.status(500).json({ success: false, message: "Failed to check final speech classifier status" });
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
      "audio_storage_provider",
      "audio_storage_status",
      "cloudinary_original_url",
      "cloudinary_normalized_url",
      "processing_status",
      "processing_audio_quality",
      "processing_cloudinary",
      "processing_asr",
      "processing_pronunciation_model",
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
      "word_reading_target_word",
      "word_reading_asr_text",
      "word_reading_correct",
      "word_reading_possible_error",
      "word_reading_initial_sound_error",
      "word_reading_final_sound_error",
      "word_reading_edit_distance",
      "word_reading_similarity_score",
      "word_reading_attempt_status",
      "word_reading_asr_provider",
      "word_reading_asr_model",
      "phoneme_status",
      "target_phonemes",
      "asr_phonemes",
      "phoneme_edit_distance",
      "phoneme_error_rate",
      "phoneme_initial_sound_error",
      "phoneme_final_sound_error",
      "phoneme_vowel_mismatch",
      "phoneme_consonant_cluster_error",
      "phoneme_error_pattern",
      "phoneme_confidence",
      "phoneme_warnings",
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
      audio_storage_provider: attempt.audioStorage?.provider,
      audio_storage_status: attempt.audioStorage?.uploadStatus,
      cloudinary_original_url: attempt.audioStorage?.originalSecureUrl,
      cloudinary_normalized_url: attempt.audioStorage?.normalizedSecureUrl,
      processing_status: attempt.processingStatus,
      processing_audio_quality: attempt.processingSteps?.audioQuality,
      processing_cloudinary: attempt.processingSteps?.cloudinary,
      processing_asr: attempt.processingSteps?.asr,
      processing_pronunciation_model: attempt.processingSteps?.pronunciationModel,
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
      word_reading_target_word: attempt.wordReading?.targetWord,
      word_reading_asr_text: attempt.wordReading?.asrText,
      word_reading_correct: attempt.wordReading?.wordCorrect,
      word_reading_possible_error: attempt.wordReading?.possibleError,
      word_reading_initial_sound_error: attempt.wordReading?.initialSoundError,
      word_reading_final_sound_error: attempt.wordReading?.finalSoundError,
      word_reading_edit_distance: attempt.wordReading?.editDistance,
      word_reading_similarity_score: attempt.wordReading?.similarityScore,
      word_reading_attempt_status: attempt.wordReading?.attemptStatus,
      word_reading_asr_provider: attempt.wordReading?.asrProvider,
      word_reading_asr_model: attempt.wordReading?.asrModel,
      phoneme_status: attempt.phonemeComparison?.status,
      target_phonemes: (attempt.phonemeComparison?.targetPhonemes || []).join(" "),
      asr_phonemes: (attempt.phonemeComparison?.asrPhonemes || []).join(" "),
      phoneme_edit_distance: attempt.phonemeComparison?.phonemeEditDistance,
      phoneme_error_rate: attempt.phonemeComparison?.phonemeErrorRate,
      phoneme_initial_sound_error: attempt.phonemeComparison?.initialSoundError,
      phoneme_final_sound_error: attempt.phonemeComparison?.finalSoundError,
      phoneme_vowel_mismatch: attempt.phonemeComparison?.vowelMismatch,
      phoneme_consonant_cluster_error: attempt.phonemeComparison?.consonantClusterError,
      phoneme_error_pattern: attempt.phonemeComparison?.errorPattern,
      phoneme_confidence: attempt.phonemeComparison?.confidence,
      phoneme_warnings: (attempt.phonemeComparison?.warnings || []).join("|"),
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
  const attempts = await SpeechAttempt.find({
    sessionId: { $in: sessions.map((session) => session._id) },
  }).lean();
  const attemptsBySession = attempts.reduce((map, attempt) => {
    const key = String(attempt.sessionId);
    if (!map[key]) map[key] = [];
    map[key].push(attempt);
    return map;
  }, {});
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
      "mean_phoneme_error_rate",
      "common_phoneme_error_pattern",
      "phoneme_attempts_needing_review",
      "recommendations",
      "started_at",
      "completed_at",
    ],
    sessions.map((session) => {
      const phonemeSummary = summarizePhonemeComparison(attemptsBySession[String(session._id)] || []);
      return {
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
        mean_phoneme_error_rate: phonemeSummary.meanPhonemeErrorRate,
        common_phoneme_error_pattern: phonemeSummary.commonErrorPattern,
        phoneme_attempts_needing_review: phonemeSummary.attemptsNeedingReview,
        recommendations: session.recommendations,
        started_at: session.startedAt?.toISOString(),
        completed_at: session.completedAt?.toISOString(),
      };
    })
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
      "speech_support_label",
      "label_confidence",
      "label_notes",
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
      speech_support_label: label.speechSupportLabel,
      label_confidence: label.labelConfidence,
      label_notes: label.labelNotes,
      comment: label.comment,
      labeled_by: label.labeledByAdmin?.email || label.labeledByAdmin?.fullName || "",
      labeled_at: (label.labelledAt || label.createdAt)?.toISOString(),
    }))
  );
};
