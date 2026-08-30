const systemSpeechActivities = require("../data/systemSpeechActivities");
const { getRecommendationSignals } = require("./leoRecommendationSignals.service");

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
  (speech.activityProgress || []).map((item) => {
    const plainItem = typeof item?.toObject === "function" ? item.toObject() : item || {};
    return {
      ...plainItem,
      activityId: item?.activityId ?? plainItem.activityId,
      status: item?.status ?? plainItem.status,
      starsEarned: item?.starsEarned ?? item?.stars ?? plainItem.starsEarned ?? plainItem.stars ?? 0,
      stars: item?.stars ?? item?.starsEarned ?? plainItem.stars ?? plainItem.starsEarned ?? 0,
      attemptsCompleted: item?.attemptsCompleted ?? plainItem.attemptsCompleted ?? 0,
    };
  });

const getReasonOverride = (signals) => {
  if (signals.invalidPoorRate > 0.5) return { reasonCode: "audio_quality", activityId: "leo_echo_roar" };
  if (signals.pseudowordSimilarity !== undefined && signals.pseudowordSimilarity < 0.58) {
    return { reasonCode: "pseudoword_weak", activityId: "leo_robot_words" };
  }
  if (signals.selectionAccuracy !== undefined && signals.selectionAccuracy < 0.6) {
    return { reasonCode: "selection_weak", activityId: "leo_first_sound_hunt" };
  }
  if (signals.sentenceCoverage !== undefined && signals.sentenceCoverage < 0.6) {
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
  const signals = getRecommendationSignals(recentAttempts);
  const override = getReasonOverride(signals);
  let reasonCode = "sequence_next";
  let reviewActivityId = "";
  let nextActivityId = chooseFromSequence({
    sequence,
    completedSet,
    currentActivityId: speech.currentActivityId,
  });

  if (override && !completedSet.has(override.activityId)) {
    reasonCode = override.reasonCode;
    nextActivityId = override.activityId;
  } else if (override && completedSet.has(override.activityId) && signals.retryRate > 0.25) {
    reviewActivityId = override.activityId;
  }

  const recommendedActivityIds = Array.from(
    new Set([
      nextActivityId,
      reviewActivityId,
      ...sequence,
      ...(speech.recommendedActivityIds || []),
    ])
  ).filter(Boolean);

  return {
    nextActivityId,
    nextActivity: getActivityById(nextActivityId),
    reviewActivityId,
    reviewActivity: getActivityById(reviewActivityId),
    reviewReasonCode: reviewActivityId ? "repeat_activity" : "",
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
  const currentActivity = getActivityById(currentActivityId);
  const lockReason = currentActivity
    ? `Complete ${currentActivity.shortTitle || currentActivity.title} first.`
    : "Complete the activity shown as Leo's Pick first.";

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
      ...(state === "locked" ? { lockReason } : {}),
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
