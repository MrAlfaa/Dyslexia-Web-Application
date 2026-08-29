const getSafeItemResult = (attempt = {}) => {
  const starsEarned = attempt.itemResult?.starsEarned ?? attempt.starsEarned;
  const childFeedback = attempt.itemResult?.childFeedback || attempt.childFeedback;
  if (starsEarned === undefined && !childFeedback) return undefined;
  return { starsEarned: starsEarned ?? null, childFeedback: childFeedback || "" };
};

const shapeGuardianAttempt = (attempt = {}) => ({
  _id: attempt._id,
  promptId: attempt.promptId,
  taskType: attempt.taskType,
  targetText: attempt.targetText,
  attemptNo: attempt.attemptNo,
  validAudio: attempt.validAudio,
  audioUrl: attempt.audioStorage?.originalSecureUrl || attempt.audioUrl || "",
  serverAudioDurationMs: attempt.serverAudioDurationMs ?? null,
  audioQuality: attempt.audioQuality || attempt.audioQualitySummary
    ? { qualityLabel: (attempt.audioQuality || attempt.audioQualitySummary).qualityLabel || "" }
    : undefined,
  starsEarned: attempt.starsEarned ?? attempt.itemResult?.starsEarned ?? null,
  childFeedback: attempt.childFeedback || attempt.itemResult?.childFeedback || "",
  itemResult: getSafeItemResult(attempt),
  wordReading: attempt.wordReading
    ? {
        targetWord: attempt.wordReading.targetWord || "",
        asrText: attempt.wordReading.asrText || "",
        wordCorrect: attempt.wordReading.wordCorrect ?? null,
        similarityScore: attempt.wordReading.similarityScore ?? null,
        attemptStatus: attempt.wordReading.attemptStatus || "",
        initialSoundError: attempt.wordReading.initialSoundError ?? null,
        finalSoundError: attempt.wordReading.finalSoundError ?? null,
      }
    : undefined,
  phonemeComparison: attempt.phonemeComparison
    ? {
        status: attempt.phonemeComparison.status || "skipped",
        initialSoundError: attempt.phonemeComparison.initialSoundError ?? null,
        finalSoundError: attempt.phonemeComparison.finalSoundError ?? null,
        vowelMismatch: attempt.phonemeComparison.vowelMismatch ?? null,
        consonantClusterError: attempt.phonemeComparison.consonantClusterError ?? null,
      }
    : undefined,
  sentenceReading: attempt.sentenceReading
    ? {
        targetText: attempt.sentenceReading.targetText || "",
        asrText: attempt.sentenceReading.asrText || "",
        wordCoverage: attempt.sentenceReading.wordCoverage ?? null,
        sentenceSimilarity: attempt.sentenceReading.sentenceSimilarity ?? null,
        wordsPerMinute: attempt.sentenceReading.wordsPerMinute ?? null,
        omittedWordCount: attempt.sentenceReading.omittedWordCount ?? null,
        status: attempt.sentenceReading.status || "skipped",
      }
    : undefined,
  createdAt: attempt.createdAt,
  updatedAt: attempt.updatedAt,
});

const shapeSuperAdminAttempt = (attempt = {}) => ({
  ...attempt,
  reprocessMetadata: {
    eligible: Boolean(attempt.validAudio && attempt.normalizedAudioPath),
    processingStatus: attempt.processingStatus || "pending",
    processingSteps: attempt.processingSteps || {},
  },
});

const hasPendingSentenceAnalysis = (attempts = []) =>
  attempts.some(
    (attempt) =>
      ["sentence_read", "paragraph_segment_read"].includes(attempt.taskType) &&
      (attempt.sentenceReading?.status === "processing" ||
        ["pending", "processing"].includes(attempt.processingSteps?.asr))
  );

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

const shapeSessionHistoryForRole = ({
  session = {},
  canViewTechnical = false,
  activity,
  wordReadingSummary,
  phonemeSummary,
  datasetReadiness,
  attempts = [],
  assessmentSnapshots = [],
}) => {
  if (canViewTechnical) {
    return {
      ...session,
      activity: activity || session.activity || null,
      wordReadingSummary,
      phonemeSummary,
      datasetReadiness,
      assessmentSnapshots,
      attempts: attempts.map(shapeSuperAdminAttempt),
      sentenceAnalysisProcessing: hasPendingSentenceAnalysis(attempts),
    };
  }

  return {
    _id: session._id,
    activityId: session.activityId,
    mode: session.mode,
    status: session.status,
    starsEarned: session.starsEarned,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    createdAt: session.createdAt,
    activity: shapeGuardianActivity(activity || session.activity),
    attempts: attempts.map(shapeGuardianAttempt),
  };
};

module.exports = {
  shapeSessionHistoryForRole,
};
