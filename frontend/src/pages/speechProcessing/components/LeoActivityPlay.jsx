import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeImprovementSession,
  startImprovementSession,
  submitImprovementAttempt,
} from "../../../services/speechProcessing/api";
import leo from "../../../assets/lexiland/leo-lion.png";
import LeoCurrentLevelPanel from "./LeoCurrentLevelPanel";
import LeoGameHud from "./LeoGameHud";
import LeoGameSessionModal from "./LeoGameSessionModal";
import LeoGameStartOverlay from "./LeoGameStartOverlay";
import LeoLevelFeedbackToast from "./LeoLevelFeedbackToast";
import LeoLevelMap from "./LeoLevelMap";
import { getLeoActivityTheme } from "./leoActivityThemes";
import useLeoSoundEffects from "./useLeoSoundEffects";

const isSelectionPrompt = (prompt) =>
  prompt?.taskType === "first_sound" || prompt?.taskType === "minimal_pair";

const addUnique = (items, value) => (items.includes(value) ? items : [...items, value]);
const removeValue = (items, value) => items.filter((item) => item !== value);

function LeoActivityPlay({ activity, onComplete, onCancel }) {
  const [sessionId, setSessionId] = useState("");
  const [prompts, setPrompts] = useState([]);
  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [completedPromptIds, setCompletedPromptIds] = useState([]);
  const [invalidPromptIds, setInvalidPromptIds] = useState([]);
  const [levelStars, setLevelStars] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recorderSupported, setRecorderSupported] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const advanceTimerRef = useRef(null);
  const sounds = useLeoSoundEffects();

  const prompt = prompts[index];
  const promptNo = index + 1;
  const theme = useMemo(
    () => getLeoActivityTheme(activity?.activityId),
    [activity?.activityId]
  );
  const totalStars = useMemo(
    () => Object.values(levelStars).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [levelStars]
  );

  useEffect(() => {
    const start = async () => {
      setLoading(true);
      setError("");
      setIndex(0);
      setCompletedPromptIds([]);
      setInvalidPromptIds([]);
      setLevelStars({});
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
        setSessionId(response.data?.data?.sessionId || "");
        setPrompts(response.data?.data?.prompts || []);
      } catch (err) {
        setError(err.response?.data?.message || "Leo could not open this jungle activity.");
      } finally {
        setLoading(false);
      }
    };
    start();
  }, [activity.activityId]);

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
        rewardName: response.data?.data?.rewardName || theme.rewardName,
        childMessage: response.data?.data?.childMessage || "Jungle Reward Unlocked!",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Leo could not finish this activity.");
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
      finishActivity();
    }, delayMs);
  };

  const submitPrompt = async () => {
    if (!prompt || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      let payload;
      if (isSelectionPrompt(prompt)) {
        payload = {
          sessionId,
          activityId: activity.activityId,
          promptId: prompt.promptId,
          taskType: prompt.taskType,
          targetText: prompt.targetText,
          targetPhonemes: JSON.stringify(prompt.targetPhonemes || []),
          attemptNo: promptNo,
          audioDurationMs: 900,
          selectedAnswer,
        };
      } else if (recording?.audioBlob) {
        payload = new FormData();
        payload.append("audio", recording.audioBlob, `${prompt.promptId}_training_${promptNo}.webm`);
        payload.append("sessionId", sessionId);
        payload.append("activityId", activity.activityId);
        payload.append("promptId", prompt.promptId);
        payload.append("taskType", prompt.taskType);
        payload.append("targetText", prompt.targetText);
        payload.append("targetPhonemes", JSON.stringify(prompt.targetPhonemes || []));
        payload.append("attemptNo", String(promptNo));
        payload.append("audioDurationMs", String(recording.audioDurationMs || 1200));
      } else if (!recorderSupported && import.meta.env.DEV) {
        payload = {
          sessionId,
          activityId: activity.activityId,
          promptId: prompt.promptId,
          taskType: prompt.taskType,
          targetText: prompt.targetText,
          targetPhonemes: JSON.stringify(prompt.targetPhonemes || []),
          attemptNo: promptNo,
          audioDurationMs: 1200,
          placeholderMode: true,
        };
      } else {
        setError("Record your sound before sending it to Leo.");
        setSubmitting(false);
        return;
      }

      const response = await submitImprovementAttempt(payload);
      const result = response.data?.data || {};
      const levelCompleted =
        result.levelCompleted ?? (result.nextPromptUnlocked !== false && (result.validAudio || isSelectionPrompt(prompt)));
      const retryRequired =
        result.retryRequired ?? (!levelCompleted || result.nextPromptUnlocked === false);
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
    } catch (err) {
      setError(err.response?.data?.message || "Leo could not save this jungle step.");
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
        Leo is opening the activity...
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
          Back to Map
        </button>
      </section>
    );
  }

  if (!gameStarted) {
    return (
      <LeoGameStartOverlay
        title={theme.title || activity.title}
        subtitle={theme.animalMessage}
        startLabel="Start Adventure"
        onStart={openGame}
        onBack={onCancel}
        prompts={prompts}
        completedPromptIds={completedPromptIds}
        totalStars={totalStars}
        theme={theme}
      />
    );
  }

  return (
    <LeoGameSessionModal title={theme.title || activity.title} onClose={onCancel}>
      <div className="space-y-4">
        <LeoLevelFeedbackToast feedback={feedback} theme={theme} />
        <LeoGameHud
          title={theme.title || activity.title}
          onBack={onCancel}
          currentLevel={promptNo}
          totalLevels={prompts.length || 1}
          totalStars={totalStars}
          theme={theme}
        />

        <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
          <div className="order-1 xl:order-none">
            <LeoCurrentLevelPanel
              activity={activity}
              prompt={prompt}
              level={promptNo}
              totalLevels={prompts.length}
              theme={theme}
              selectedAnswer={selectedAnswer}
              onSelectAnswer={setSelectedAnswer}
              recording={recording}
              onRecordingReady={setRecording}
              onRecorderSupportChange={setRecorderSupported}
              onRecordingStateChange={handleRecordingStateChange}
              recorderSupported={recorderSupported}
              isRecording={isRecording}
              feedback={feedback}
              error={error}
              submitting={submitting}
              onSubmit={submitPrompt}
              onRetry={retryLevel}
              onNext={nextStep}
            />
          </div>

          <aside className="order-2 space-y-4 xl:order-none">
            <div className="rounded-[2rem] border border-white/50 bg-white/86 p-4 shadow-xl shadow-emerald-950/10 backdrop-blur">
              <div className="grid grid-cols-[88px_1fr] items-center gap-3">
                <img src={leo} alt="Leo the Lion" className="h-24 object-contain" />
                <div>
                  <p className="text-lg font-black text-emerald-950">Leo says</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-emerald-800">
                    {feedback?.leoMessage || theme.animalMessage}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-[1.25rem] bg-amber-50 px-3 py-3 ring-1 ring-amber-100">
                  <p className="text-2xl font-black text-amber-600">{totalStars}</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Stars
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                  <p className="text-2xl font-black text-emerald-700">
                    {completedPromptIds.length}
                  </p>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Levels
                  </p>
                </div>
              </div>
            </div>
            <LeoLevelMap
              prompts={prompts}
              currentIndex={index}
              completedPromptIds={completedPromptIds}
              levelStars={levelStars}
              invalidPromptIds={invalidPromptIds}
              theme={theme}
              compact
            />
          </aside>
        </div>
      </div>
    </LeoGameSessionModal>
  );
}

export default LeoActivityPlay;
