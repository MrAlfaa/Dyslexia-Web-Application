const COMPONENTS = [
  {
    id: "wm",
    visual: "memory",
    identificationRoute: (grade) => `/working-memory/${grade}`,
    improvementRoute: (grade) => `/working-memory/${grade}`,
  },
  {
    id: "pa",
    visual: "sound",
    identificationRoute: (grade) => `/identificationActivities-pa/${grade}`,
    improvementRoute: () => "/phonological-awareness",
  },
  {
    id: "rp",
    visual: "reading",
    identificationRoute: () => "/reading-processing",
    improvementRoute: () => "/reading-processing",
  },
];

const SPEECH_IDENTIFICATION_ROUTE = "/speech-processing";
const SPEECH_TRAINING_ROUTE = "/speech-processing/leo-training";

const normalizeGrade = (grade) => {
  const value = String(grade || "3");
  return ["2", "3", "4", "5"].includes(value) ? value : "3";
};

const normalizeSpeechStatus = (status) => {
  if (["completed", "in_progress", "not_started"].includes(status)) return status;
  return "not_started";
};

const getSpeechIdentificationState = (status) => {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "current";
  return "available";
};

export const normalizeChildProfile = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  if (payload.student && typeof payload.student === "object" && !Array.isArray(payload.student)) {
    return payload.student;
  }
  return payload;
};

const buildStandardIdentification = ({ id, visual, identificationRoute }, grade) => ({
  id,
  section: "identification",
  visual,
  state: "available",
  route: identificationRoute(grade),
  titleKey: `journey.destinations.${id}.identificationTitle`,
  descriptionKey: `journey.destinations.${id}.identificationDescription`,
  actionKey: "journey.actions.startCheck",
  statusKey: "journey.states.available",
});

const buildStandardImprovement = (
  { id, visual, improvementRoute },
  grade,
  improvementUnlocked,
) => ({
  id,
  section: "improvement",
  visual,
  state: improvementUnlocked ? "available" : "locked",
  route: improvementRoute(grade),
  titleKey: `journey.destinations.${id}.improvementTitle`,
  descriptionKey: `journey.destinations.${id}.improvementDescription`,
  actionKey: improvementUnlocked ? "journey.actions.startPractice" : null,
  statusKey: improvementUnlocked ? "journey.states.available" : "journey.states.locked",
  lockReasonKey: improvementUnlocked ? null : "journey.lockReasons.completeRequiredCheck",
});

export const buildChildJourney = ({ profile = {}, devUnlock = false } = {}) => {
  profile = normalizeChildProfile(profile);
  const grade = normalizeGrade(profile?.grade);
  const progress = profile?.lexilandProgress || {};
  const speech = progress?.speech || {};
  const speechStatus = normalizeSpeechStatus(speech.identificationStatus);
  const speechUnlocked = Boolean(speech.improvementUnlocked) || Boolean(devUnlock);
  const completedActivityIds = Array.isArray(speech.completedActivityIds)
    ? speech.completedActivityIds.filter(Boolean)
    : [];
  const speechJourneyCompleted = completedActivityIds.length >= 5;

  const identification = COMPONENTS.map((component) =>
    buildStandardIdentification(component, grade),
  );

  const speechIdentification = {
    id: "sp",
    section: "identification",
    visual: "speech",
    state: getSpeechIdentificationState(speechStatus),
    route: SPEECH_IDENTIFICATION_ROUTE,
    titleKey: "journey.destinations.sp.identificationTitle",
    descriptionKey: "journey.destinations.sp.identificationDescription",
    actionKey:
      speechStatus === "completed"
        ? "journey.actions.viewSpeechPath"
        : speechStatus === "in_progress"
          ? "journey.actions.continueCheck"
          : "journey.actions.startCheck",
    statusKey: `journey.states.${getSpeechIdentificationState(speechStatus)}`,
  };
  identification.push(speechIdentification);

  const improvement = COMPONENTS.map((component) =>
    buildStandardImprovement(component, grade, Boolean(progress.improvementUnlocked)),
  );

  const speechLockReasonKey =
    speechStatus === "completed"
      ? "journey.lockReasons.speechBaselineReview"
      : "journey.lockReasons.completeSpeechCheck";
  const speechImprovementState = speechUnlocked
    ? speechJourneyCompleted
      ? "completed"
      : "current"
    : "locked";
  const speechImprovement = {
    id: "sp",
    section: "improvement",
    visual: "speech",
    state: speechImprovementState,
    route: SPEECH_TRAINING_ROUTE,
    titleKey: "journey.destinations.sp.improvementTitle",
    descriptionKey: "journey.destinations.sp.improvementDescription",
    actionKey:
      speechImprovementState === "locked"
        ? null
        : speechImprovementState === "completed"
          ? "journey.actions.replayPractice"
          : "journey.actions.continueAdventure",
    statusKey: `journey.states.${speechImprovementState}`,
    lockReasonKey: speechImprovementState === "locked" ? speechLockReasonKey : null,
    devPreview: Boolean(devUnlock),
    currentActivityId: speech.currentActivityId || null,
    completedCount: completedActivityIds.length,
    stars: Number.isFinite(Number(speech.stars)) ? Number(speech.stars) : 0,
  };
  improvement.push(speechImprovement);

  const currentMission =
    (speechIdentification.state === "current" && speechIdentification) ||
    (speechImprovement.state === "current" && speechImprovement) ||
    (speechIdentification.state === "available" && speechIdentification) ||
    speechImprovement;

  return {
    identification,
    improvement,
    currentMission: { ...currentMission },
  };
};

export default buildChildJourney;
