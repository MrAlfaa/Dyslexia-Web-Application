const systemSpeechActivities = require("../data/systemSpeechActivities");

const supportSequences = {
  high_support: [
    "leo_first_sound_hunt",
    "leo_echo_roar",
    "leo_robot_words",
    "leo_sound_twins",
    "leo_story_roar",
  ],
  medium_support: [
    "leo_sound_twins",
    "leo_robot_words",
    "leo_echo_roar",
    "leo_story_roar",
  ],
  low_support: ["leo_story_roar", "leo_sound_twins", "leo_robot_words"],
  unknown: [
    "leo_first_sound_hunt",
    "leo_echo_roar",
    "leo_robot_words",
    "leo_sound_twins",
    "leo_story_roar",
  ],
};

const guardianReasons = {
  audio_quality:
    "Recommended because recent recordings need clearer microphone practice.",
  pseudoword_weak:
    "Recommended because pseudoword decoding practice is a useful next step.",
  selection_weak:
    "Recommended because first-sound and sound discrimination games need more practice.",
  fluency_weak:
    "Recommended because short sentence fluency practice is the best next step.",
  sequence_next:
    "Recommended as the next step in Leo's support path.",
  repeat_activity:
    "Recommended again because the latest activity needs more practice.",
};

const skillFocusByReason = {
  audio_quality: "clear_speaking_near_microphone",
  pseudoword_weak: "pseudoword_decoding",
  selection_weak: "sound_discrimination",
  fluency_weak: "oral_reading_fluency",
  sequence_next: "speech_reading_practice",
  repeat_activity: "targeted_retry_practice",
};

const childMessages = {
  audio_quality: "Let's practice clear speaking with Leo.",
  pseudoword_weak: "Leo picked robot words for your next adventure!",
  selection_weak: "Leo picked a sound adventure for you!",
  fluency_weak: "Leo picked a story path for you!",
  sequence_next: "Leo chose your next adventure!",
  repeat_activity: "Leo says this jungle path is worth another try!",
};

const getImprovementActivities = () =>
  systemSpeechActivities
    .filter((activity) => activity.mode === "improvement")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const getActivityById = (activityId) =>
  getImprovementActivities().find((activity) => activity.activityId === activityId) || null;

const normalizeProgress = (speech = {}) =>
  (speech.activityProgress || []).map((item) => ({
    ...item,
    starsEarned: item.starsEarned ?? item.stars ?? 0,
  }));

const getPerformanceSignals = (attempts = []) => {
  const total = attempts.length;
  const valid = attempts.filter((attempt) => attempt.validAudio);
  const invalidOrPoor = attempts.filter(
    (attempt) =>
      !attempt.validAudio ||
      ["invalid", "poor"].includes(attempt.audioQuality?.qualityLabel)
  );
  const pseudoword = attempts.filter((attempt) => attempt.taskType === "pseudoword_read");
  const selection = attempts.filter((attempt) =>
    ["first_sound", "minimal_pair"].includes(attempt.taskType)
  );
  const sentence = attempts.filter((attempt) => attempt.taskType === "sentence_read");
  const meanScore = (items) =>
    items.length
      ? items.reduce(
          (sum, attempt) =>
            sum +
            Number(
              attempt.features?.pronunciationScorePlaceholder ||
                attempt.itemResult?.pronunciationScore ||
                0
            ),
          0
        ) / items.length
      : undefined;

  return {
    totalAttemptCount: total,
    validAttemptCount: valid.length,
    invalidPoorRate: total ? invalidOrPoor.length / total : 0,
    pseudowordScore: meanScore(pseudoword),
    selectionScore: meanScore(selection),
    sentenceScore: meanScore(sentence),
    retryRate: total
      ? attempts.filter((attempt) => Number(attempt.attemptNo || 1) > 1).length / total
      : 0,
  };
};

const getReasonOverride = (signals) => {
  if (signals.invalidPoorRate > 0.5) return { reasonCode: "audio_quality", activityId: "leo_echo_roar" };
  if (signals.pseudowordScore !== undefined && signals.pseudowordScore < 0.58) {
    return { reasonCode: "pseudoword_weak", activityId: "leo_robot_words" };
  }
  if (signals.selectionScore !== undefined && signals.selectionScore < 0.6) {
    return { reasonCode: "selection_weak", activityId: "leo_first_sound_hunt" };
  }
  if (signals.sentenceScore !== undefined && signals.sentenceScore < 0.6) {
    return { reasonCode: "fluency_weak", activityId: "leo_story_roar" };
  }
  return null;
};

const chooseFromSequence = ({ sequence, completedSet, currentActivityId }) => {
  if (currentActivityId && !completedSet.has(currentActivityId)) return currentActivityId;
  return sequence.find((activityId) => !completedSet.has(activityId)) || sequence[sequence.length - 1];
};

const getActivityPlan = ({ speech = {}, recentAttempts = [] } = {}) => {
  const supportLevel = speech.supportLevel || "unknown";
  const completedSet = new Set(speech.completedActivityIds || []);
  const progress = normalizeProgress(speech);
  const sequence = supportSequences[supportLevel] || supportSequences.unknown;
  const signals = getPerformanceSignals(recentAttempts);
  const override = getReasonOverride(signals);
  let reasonCode = "sequence_next";
  let nextActivityId = chooseFromSequence({
    sequence,
    completedSet,
    currentActivityId: speech.currentActivityId,
  });

  if (override && !completedSet.has(override.activityId)) {
    reasonCode = override.reasonCode;
    nextActivityId = override.activityId;
  } else if (override && completedSet.has(override.activityId) && signals.retryRate > 0.25) {
    reasonCode = "repeat_activity";
    nextActivityId = override.activityId;
  }

  const recommendedActivityIds = Array.from(
    new Set([nextActivityId, ...sequence, ...(speech.recommendedActivityIds || [])])
  ).filter(Boolean);

  return {
    nextActivityId,
    nextActivity: getActivityById(nextActivityId),
    recommendedActivityIds,
    recommendedActivities: recommendedActivityIds.map(getActivityById).filter(Boolean),
    reasonCode,
    guardianReason: guardianReasons[reasonCode],
    childMessage: childMessages[reasonCode],
    skillFocus: skillFocusByReason[reasonCode],
    performanceSignals: signals,
    progress,
  };
};

const buildActivityMap = ({ speech = {}, plan } = {}) => {
  const completedSet = new Set(speech.completedActivityIds || []);
  const progressMap = normalizeProgress(speech).reduce((map, item) => {
    map[item.activityId] = item;
    return map;
  }, {});
  const recommendedSet = new Set(plan?.recommendedActivityIds || speech.recommendedActivityIds || []);
  const currentActivityId = plan?.nextActivityId || speech.currentActivityId;

  return getImprovementActivities().map((activity) => {
    const saved = progressMap[activity.activityId] || {};
    const state = completedSet.has(activity.activityId)
      ? "completed"
      : activity.activityId === currentActivityId
        ? "current"
        : recommendedSet.has(activity.activityId) || activity.unlockedByDefault
          ? "available"
          : "locked";

    return {
      ...activity,
      state,
      status: state,
      stars: saved.starsEarned || saved.stars || 0,
      starsEarned: saved.starsEarned || saved.stars || 0,
      attemptsCompleted: saved.attemptsCompleted || 0,
      bestScore: saved.bestScore,
      completedAt: saved.completedAt,
      lastPlayedAt: saved.lastPlayedAt,
    };
  });
};

module.exports = {
  getActivityPlan,
  buildActivityMap,
  getImprovementActivities,
  getActivityById,
};
