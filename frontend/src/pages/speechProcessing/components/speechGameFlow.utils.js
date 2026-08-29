export const GUARDIAN_SPEECH_CHILD_KEY = "lexilandGuardianSpeechChildId";

export const canPlayTargetAudio = ({ mode, attemptPhase, activityId, taskType } = {}) =>
  mode === "improvement" &&
  attemptPhase === "training" &&
  activityId === "leo_echo_roar" &&
  taskType === "listen_repeat";

export const canAttemptProgress = (result = {}, { selectionPrompt = false } = {}) =>
  result.levelCompleted === true &&
  result.nextPromptUnlocked === true &&
  result.retryRequired !== true &&
  (selectionPrompt || result.validAudio === true);

export const getAutoSubmitDelay = ({ recording, submitting = false, feedback = null } = {}) => {
  if (!recording?.audioBlob || submitting || feedback) return null;
  return 2000;
};

export const canSubmitLeoPrompt = ({ prompt, submitting = false, feedback = null } = {}) =>
  Boolean(prompt) && !submitting && !feedback;

export const getLeoPromptPrimaryAction = ({
  feedback = null,
  submitting = false,
  selectionPrompt = false,
} = {}) => {
  if (feedback) {
    return feedback.retryRequired || feedback.nextPromptUnlocked === false ? "retry" : "next";
  }
  if (submitting) return "checking";
  return selectionPrompt ? "submit" : "record";
};

export const createSubmissionFailureFeedback = ({
  promptId = "",
  childFeedback = "",
  leoMessage = "",
} = {}) => ({
  promptId,
  childFeedback,
  leoMessage,
  levelCompleted: false,
  nextPromptUnlocked: false,
  retryRequired: true,
  submissionFailed: true,
  starsEarned: 0,
  levelState: "submission_failed",
});

export const resolveGuardianChildId = (children = [], storedId = "") => {
  if (!children.length) return "";
  return children.some((child) => String(child._id) === String(storedId))
    ? String(storedId)
    : String(children[0]._id);
};
