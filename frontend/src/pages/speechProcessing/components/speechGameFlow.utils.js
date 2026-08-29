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

export const getLeoGuideTranslationKeys = ({
  selectionPrompt = false,
  longReadingPrompt = false,
} = {}) => {
  if (selectionPrompt) {
    return {
      headingKey: "selection_guide_heading",
      descriptionKey: "selection_guide_desc",
    };
  }
  if (longReadingPrompt) {
    return {
      headingKey: "leo_ready_for_reading",
      descriptionKey: "sentence_send_desc",
    };
  }
  return {
    headingKey: "leo_is_listening",
    descriptionKey: "send_level_desc",
  };
};

export const getAutoSubmitDelay = ({ recording, submitting = false, feedback = null } = {}) => {
  if (!recording?.audioBlob || submitting || feedback) return null;
  return 2000;
};

export const canSubmitLeoPrompt = ({ prompt, submitting = false, feedback = null } = {}) =>
  Boolean(prompt) && !submitting && !feedback;

export const canUsePromptPlayback = ({
  allowPromptPlayback = false,
  isRecording = false,
  submitting = false,
  feedback = null,
} = {}) => Boolean(allowPromptPlayback) && !isRecording && !submitting && !feedback;

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
  retryAction = "recording",
} = {}) => ({
  promptId,
  childFeedback,
  leoMessage,
  levelCompleted: false,
  nextPromptUnlocked: false,
  retryRequired: true,
  retryAction: retryAction === "selection" ? "selection" : "recording",
  submissionFailed: true,
  starsEarned: 0,
  levelState: "submission_failed",
});

export const getSubmissionFailurePresentation = ({ taskType = "" } = {}) => {
  const selectionTask = taskType === "first_sound" || taskType === "minimal_pair";
  return selectionTask
    ? {
        childFeedbackKey: "selection_check_failed",
        leoMessageKey: "selection_check_failed_hint",
        retryAction: "selection",
      }
    : {
        childFeedbackKey: "recording_check_failed",
        leoMessageKey: "recording_check_failed_hint",
        retryAction: "recording",
      };
};

export const getSubmissionRetryLabelKey = ({ feedback = null, longReadingPrompt = false } = {}) => {
  if (feedback?.submissionFailed) {
    return feedback.retryAction === "selection" ? "selection_try_again" : "recorder_again";
  }
  return longReadingPrompt ? "sentence_retry_button" : "try_this_level_again";
};

export const resolveGuardianChildId = (children = [], storedId = "") => {
  if (!children.length) return "";
  return children.some((child) => String(child._id) === String(storedId))
    ? String(storedId)
    : String(children[0]._id);
};
