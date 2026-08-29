export const GUARDIAN_SPEECH_CHILD_KEY = "lexilandGuardianSpeechChildId";

export const canPlayTargetAudio = ({ mode, attemptPhase, activityId } = {}) =>
  mode === "improvement" &&
  attemptPhase === "training" &&
  activityId === "leo_echo_roar";

export const canAttemptProgress = (result = {}, { selectionPrompt = false } = {}) =>
  result.levelCompleted === true &&
  result.nextPromptUnlocked === true &&
  result.retryRequired !== true &&
  (selectionPrompt || result.validAudio === true);

export const getAutoSubmitDelay = ({ recording, submitting = false, feedback = null } = {}) => {
  if (!recording?.audioBlob || submitting || feedback) return null;
  return 2000;
};

export const resolveGuardianChildId = (children = [], storedId = "") => {
  if (!children.length) return "";
  return children.some((child) => String(child._id) === String(storedId))
    ? String(storedId)
    : String(children[0]._id);
};
