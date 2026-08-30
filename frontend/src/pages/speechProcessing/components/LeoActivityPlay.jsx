import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  completeImprovementSession,
  startImprovementSession,
  submitImprovementAttempt,
} from "../../../services/speechProcessing/api";
import leo from "../../../assets/lexiland/leo-lion.webp";
import LeoCurrentLevelPanel from "./LeoCurrentLevelPanel";
import LeoGameHud from "./LeoGameHud";
import LeoGameSessionModal from "./LeoGameSessionModal";
import LeoGameStartOverlay from "./LeoGameStartOverlay";
import LeoLevelFeedbackToast from "./LeoLevelFeedbackToast";
import LeoLevelMap from "./LeoLevelMap";
import { getLeoActivityTheme } from "./leoActivityThemes";
import useLeoSoundEffects from "./useLeoSoundEffects";
import {
  canAttemptProgress,
  canPlayTargetAudio,
  canSubmitLeoPrompt,
  claimSessionStart,
  createSubmissionFailureFeedback,
  getSubmissionFailurePresentation,
} from "./speechGameFlow.utils";

const isSelectionPrompt = (prompt) =>
  prompt?.taskType === "first_sound" || prompt?.taskType === "minimal_pair";

const isLongReadingPrompt = (prompt) =>
  prompt?.taskType === "sentence_read" || prompt?.taskType === "paragraph_segment_read";

const KNOWN_SENTENCE_FEEDBACK_STATES = new Set([
  "complete",
  "saved",
  "processing",
  "retry",
]);

// eslint-disable-next-line react-refresh/only-export-components
export const getSentenceFeedbackMessage = (sentenceFeedback, t) => {
  switch (sentenceFeedback?.state) {
    case "complete":
      return t("sentence_feedback_complete");
    case "saved":
      return t("sentence_feedback_saved");
    case "processing":
      return t("sentence_feedback_processing");
    case "retry":
      return t("sentence_feedback_retry");
    default:
      return t("sentence_feedback_checking");
  }
};

// eslint-disable-next-line react-refresh/only-export-components
export const canLongReadingPromptProgress = (result = {}) => {
  const state = result.sentenceFeedback?.state;
  return (
    result.nextPromptUnlocked === true &&
    KNOWN_SENTENCE_FEEDBACK_STATES.has(state) &&
    state !== "retry"
  );
};

// Exported for the dependency-free long-reading feedback assertion.
// eslint-disable-next-line react-refresh/only-export-components
export const buildLongReadingToastFeedback = (feedback, t) => {
  const state = feedback?.sentenceFeedback?.state;
  if (!KNOWN_SENTENCE_FEEDBACK_STATES.has(state)) return null;
  if (state !== "retry" && !canLongReadingPromptProgress(feedback)) return null;
  return {
    childFeedback: getSentenceFeedbackMessage({ state }, t),
    leoMessage: t("sentence_feedback_encouragement"),
    starsEarned: Number(feedback?.starsEarned || 0),
    retryRequired: state === "retry",
  };
};

const addUnique = (items, value) => (items.includes(value) ? items : [...items, value]);
const removeValue = (items, value) => items.filter((item) => item !== value);

function LeoActivityPlay({ activity, onComplete, onCancel, onLocked }) {
  const { t } = useTranslation("sp");
  const [sessionId, setSessionId] = useState("");
  const [prompts, setPrompts] = useState([]);
  const [trainingPrompts, setTrainingPrompts] = useState([]);
  const [checkpointPrompts, setCheckpointPrompts] = useState([]);
  const [attemptPhase, setAttemptPhase] = useState("training");
  const [checkpointDue, setCheckpointDue] = useState(false);
  const [checkpointSequence, setCheckpointSequence] = useState(0);
  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [completedPromptIds, setCompletedPromptIds] = useState([]);
  const [invalidPromptIds, setInvalidPromptIds] = useState([]);
  const [levelStars, setLevelStars] = useState({});
  const [attemptCounts, setAttemptCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recorderSupported, setRecorderSupported] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const advanceTimerRef = useRef(null);
  const sessionStartRef = useRef("");
  const sounds = useLeoSoundEffects();

  const prompt = prompts[index];
  const selectionPrompt = isSelectionPrompt(prompt);
  const longReadingPrompt = isLongReadingPrompt(prompt);
  const allowPromptPlayback = canPlayTargetAudio({
    mode: "improvement",
    attemptPhase,
    activityId: activity?.activityId,
    taskType: prompt?.taskType,
  });
  const promptNo = index + 1;
  const currentAttemptNo = (attemptCounts[prompt?.promptId] || 0) + 1;
  const theme = useMemo(
    () => getLeoActivityTheme(activity?.activityId),
    [activity?.activityId]
  );
  const localizedTheme = useMemo(() => ({
    ...theme,
    title: t(theme.titleKey || "training_safari_title", { defaultValue: t("training_safari_title") }),
    animalMessage: t(theme.animalMessageKey || "follow_sound_path", { defaultValue: t("follow_sound_path") }),
    collectible: t(theme.collectibleKey || "sound_gems", { defaultValue: t("sound_gems") }),
    rewardName: t(theme.rewardNameKey || "jungle_sound_badge", { defaultValue: t("jungle_sound_badge") }),
  }), [t, theme]);
  const totalStars = useMemo(
    () => Object.values(levelStars).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [levelStars]
  );
  const toastFeedback = longReadingPrompt
    ? buildLongReadingToastFeedback(feedback, t)
    : feedback;

  useEffect(() => {
    if (!claimSessionStart(sessionStartRef, activity.activityId)) return;
    const start = async () => {
      setLoading(true);
      setError("");
      setIndex(0);
      setAttemptPhase("training");
      setCheckpointDue(false);
      setCheckpointSequence(0);
      setCompletedPromptIds([]);
      setInvalidPromptIds([]);
      setLevelStars({});
      setAttemptCounts({});
      setFeedback(null);
      setSelectedAnswer("");
      setRecording(null);
      setGameStarted(false);
      setIsRecording(false);
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      try {
        const response = await startImprovementSession(activity.activityId);
        const data = response.data?.data || {};
        const nextTrainingPrompts = data.prompts || [];
        const nextCheckpointPrompts = data.checkpointPrompts || [];
        setSessionId(data.sessionId || "");
        setTrainingPrompts(nextTrainingPrompts);
        setPrompts(nextTrainingPrompts);
        setCheckpointPrompts(nextCheckpointPrompts);
        setCheckpointDue(Boolean(data.checkpointDue && nextCheckpointPrompts.length));
        setCheckpointSequence(Number(data.checkpointSequence || 0));
      } catch (err) {
        sessionStartRef.current = "";
        const data = err.response?.data || {};
        if (err.response?.status === 403 && data.code === "activity_locked") {
          onLocked?.(data.lockReason || data.message);
          return;
        }
        setError(data.message || t("could_not_open_activity"));
      } finally {
        setLoading(false);
      }
    };
    start();
  }, [activity.activityId, onLocked, t]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
      sounds.stopAll();
    };
  }, [sounds]);

  const handleRecordingStateChange = (recordingNow) => {
    setIsRecording(recordingNow);
    sounds.setMuted(recordingNow);
    if (recordingNow && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const openGame = () => {
    setGameStarted(true);
    setTimeout(() => sounds.playStart(), 0);
  };

  const finishActivity = async () => {
    try {
      setSubmitting(true);
      const response = await completeImprovementSession(sessionId);
      sounds.playReward();
      onComplete({
        ...(response.data?.data || {}),
        totalStars,
        starsEarned: response.data?.data?.starsEarned ?? totalStars,
        rewardName: response.data?.data?.rewardName || localizedTheme.rewardName,
        childMessage: response.data?.data?.childMessage || t("jungle_reward_unlocked"),
      });
    } catch (err) {
      setError(err.response?.data?.message || t("could_not_finish_activity"));
    } finally {
      setSubmitting(false);
    }
  };

  const advanceAfterSuccess = (delayMs = 0) => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setSelectedAnswer("");
      setRecording(null);
      if (index < prompts.length - 1) {
        setIndex((value) => value + 1);
        return;
      }
      if (attemptPhase === "training" && checkpointDue && checkpointPrompts.length) {
        setAttemptPhase("checkpoint");
        setPrompts(checkpointPrompts);
        setIndex(0);
        setCompletedPromptIds([]);
        setInvalidPromptIds([]);
        setLevelStars({});
        return;
      }
      finishActivity();
    }, delayMs);
  };

  const submitPrompt = async (recordingOverride) => {
    if (!canSubmitLeoPrompt({ prompt, submitting, feedback })) return;
    const recordingToSubmit = recordingOverride?.audioBlob ? recordingOverride : recording;
    setSubmitting(true);
    setError("");

    try {
      let payload;
      if (selectionPrompt) {
        payload = {
          sessionId,
          activityId: activity.activityId,
          promptId: prompt.promptId,
          taskType: prompt.taskType,
          targetText: prompt.targetText,
          targetWord: prompt.targetText,
          targetPhonemes: JSON.stringify(prompt.targetPhonemes || []),
          attemptNo: currentAttemptNo,
          audioDurationMs: 900,
          selectedAnswer,
          attemptPhase,
        };
      } else if (recordingToSubmit?.audioBlob) {
        payload = new FormData();
        payload.append("audio", recordingToSubmit.audioBlob, `${prompt.promptId}_${attemptPhase}_${currentAttemptNo}.webm`);
        payload.append("sessionId", sessionId);
        payload.append("activityId", activity.activityId);
        payload.append("promptId", prompt.promptId);
        payload.append("taskType", prompt.taskType);
        payload.append("targetText", prompt.targetText);
        payload.append("targetWord", prompt.targetText);
        payload.append("targetPhonemes", JSON.stringify(prompt.targetPhonemes || []));
        payload.append("attemptNo", String(currentAttemptNo));
        payload.append("attemptPhase", attemptPhase);
        payload.append("audioDurationMs", String(recordingToSubmit.audioDurationMs || 1200));
      } else if (!recorderSupported && import.meta.env.DEV) {
        payload = {
          sessionId,
          activityId: activity.activityId,
          promptId: prompt.promptId,
          taskType: prompt.taskType,
          targetText: prompt.targetText,
          targetWord: prompt.targetText,
          targetPhonemes: JSON.stringify(prompt.targetPhonemes || []),
          attemptNo: currentAttemptNo,
          audioDurationMs: 1200,
          placeholderMode: true,
          attemptPhase,
        };
      } else {
        setError(t("record_before_send"));
        setSubmitting(false);
        return;
      }

      const response = await submitImprovementAttempt(payload);
      const result = response.data?.data || {};
      setAttemptCounts((previous) => ({
        ...previous,
        [prompt.promptId]: currentAttemptNo,
      }));
      const inferredLevelCompleted = canAttemptProgress(result, {
        selectionPrompt,
      });
      const levelCompleted = longReadingPrompt
        ? Boolean(inferredLevelCompleted && canLongReadingPromptProgress(result))
        : inferredLevelCompleted;
      const inferredRetryRequired = !levelCompleted;
      const retryRequired = longReadingPrompt
        ? Boolean(inferredRetryRequired || !levelCompleted)
        : inferredRetryRequired;
      const nextFeedback = {
        ...result,
        promptId: result.promptId || prompt.promptId,
        levelCompleted,
        retryRequired,
        levelState: retryRequired ? "invalid_retry" : "completed",
      };

      setFeedback(nextFeedback);
      if (retryRequired) {
        setInvalidPromptIds((prev) => addUnique(prev, prompt.promptId));
      } else {
        sounds.playSuccess();
        setInvalidPromptIds((prev) => removeValue(prev, prompt.promptId));
        setCompletedPromptIds((prev) => addUnique(prev, prompt.promptId));
        setLevelStars((prev) => ({
          ...prev,
          [prompt.promptId]: Number(result.starsEarned || 0),
        }));
        advanceAfterSuccess(1400);
      }
    } catch {
      const failurePresentation = getSubmissionFailurePresentation({
        taskType: prompt.taskType,
      });
      setRecording(null);
      setFeedback(createSubmissionFailureFeedback({
        promptId: prompt.promptId,
        childFeedback: t(failurePresentation.childFeedbackKey),
        leoMessage: t(failurePresentation.leoMessageKey),
        retryAction: failurePresentation.retryAction,
      }));
      setError("");
    } finally {
      setSubmitting(false);
    }
  };

  const retryLevel = () => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setFeedback(null);
    setRecording(null);
    setSelectedAnswer("");
  };

  const nextStep = async () => {
    if (!feedback || feedback.retryRequired) return;
    advanceAfterSuccess(0);
  };

  if (loading) {
    return (
      <section className="rounded-[2.5rem] bg-white/85 p-8 text-center text-xl font-black text-slate-800 shadow-xl">
        {t("opening_activity")}
      </section>
    );
  }

  if (error && !prompt) {
    return (
      <section className="rounded-[2.5rem] bg-white/85 p-8 shadow-xl">
        <p className="rounded-3xl bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-5 rounded-3xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          {t("back_to_map")}
        </button>
      </section>
    );
  }

  if (!gameStarted) {
    return (
      <LeoGameStartOverlay
        title={t(theme.titleKey, { defaultValue: t("training_safari_title") })}
        subtitle={t(theme.animalMessageKey, { defaultValue: t("follow_sound_path") })}
        guideMessage={t(theme.animalMessageKey, { defaultValue: t("follow_sound_path") })}
        collectibleLabel={t(theme.collectibleKey, { defaultValue: t("sound_gems") })}
        rewardLabel={t(theme.rewardNameKey, { defaultValue: t("jungle_sound_badge") })}
        startLabel={t("start_adventure")}
        onStart={openGame}
        onBack={onCancel}
        prompts={trainingPrompts.length ? trainingPrompts : prompts}
        completedPromptIds={completedPromptIds}
        totalStars={totalStars}
        theme={localizedTheme}
      />
    );
  }

  return (
    <LeoGameSessionModal title={localizedTheme.title} onClose={onCancel}>
      <div className="space-y-4">
        <LeoLevelFeedbackToast feedback={toastFeedback} theme={localizedTheme} />
        <LeoGameHud
          title={attemptPhase === "checkpoint" ? t("trail_check_title") : localizedTheme.title}
          onBack={onCancel}
          currentLevel={promptNo}
          totalLevels={prompts.length || 1}
          totalStars={totalStars}
          theme={localizedTheme}
        />

        <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
          <div className="order-1 xl:order-none">
            <LeoCurrentLevelPanel
              activity={activity}
              prompt={prompt}
              level={promptNo}
              totalLevels={prompts.length}
              theme={localizedTheme}
              selectedAnswer={selectedAnswer}
              onSelectAnswer={setSelectedAnswer}
              recording={recording}
              onRecordingReady={setRecording}
              onRecorderSupportChange={setRecorderSupported}
              onRecordingStateChange={handleRecordingStateChange}
              recorderSupported={recorderSupported}
              isRecording={isRecording}
              allowPromptPlayback={allowPromptPlayback}
              feedback={feedback}
              error={error}
              submitting={submitting}
              onSubmit={submitPrompt}
              onRetry={retryLevel}
              onNext={nextStep}
            />
            {attemptPhase === "checkpoint" && (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-900 ring-1 ring-amber-200">
                {t("trail_check_instruction", { number: checkpointSequence })}
              </p>
            )}
          </div>

          <aside className="order-2 space-y-4 xl:order-none">
            <div className="rounded-[2rem] border border-white/50 bg-white/86 p-4 shadow-xl shadow-emerald-950/10 backdrop-blur">
              <div className="grid grid-cols-[88px_1fr] items-center gap-3">
                <img src={leo} alt={t("leo_the_lion")} className="h-24 object-contain" />
                <div>
                  <p className="text-lg font-black text-emerald-950">{t("leo_says")}</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-emerald-800">
                    {feedback?.submissionFailed
                      ? feedback.leoMessage
                      : longReadingPrompt && feedback
                        ? getSentenceFeedbackMessage(feedback.sentenceFeedback, t)
                        : feedback?.leoMessage || localizedTheme.animalMessage}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-[1.25rem] bg-amber-50 px-3 py-3 ring-1 ring-amber-100">
                  <p className="text-2xl font-black text-amber-600">{totalStars}</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {t("stars_label")}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                  <p className="text-2xl font-black text-emerald-700">
                    {completedPromptIds.length}
                  </p>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {t("levels_label")}
                  </p>
                </div>
              </div>
            </div>
            <div
              className={`min-h-[16rem] ${isRecording ? "recording-animations-paused pointer-events-none" : ""}`}
              data-map-active={String(!isRecording)}
              aria-hidden={isRecording}
              inert={isRecording || undefined}
            >
              <LeoLevelMap
                prompts={prompts}
                currentIndex={index}
                completedPromptIds={completedPromptIds}
                levelStars={levelStars}
                invalidPromptIds={invalidPromptIds}
                theme={localizedTheme}
                guideMessage={localizedTheme.animalMessage}
                collectibleLabel={localizedTheme.collectible}
                rewardLabel={localizedTheme.rewardName}
                compact
                className="min-h-[16rem]"
              />
            </div>
          </aside>
        </div>
      </div>
    </LeoGameSessionModal>
  );
}

export default LeoActivityPlay;
