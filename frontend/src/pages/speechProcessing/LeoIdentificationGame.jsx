import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  completeLeoIdentification,
  startLeoIdentification,
  submitLeoIdentificationAttempt,
} from "../../services/speechProcessing/api";
import leo from "../../assets/lexiland/leo-lion.webp";
import LeoCompletionScreen from "./components/LeoCompletionScreen";
import LeoCurrentLevelPanel from "./components/LeoCurrentLevelPanel";
import LeoGameHud from "./components/LeoGameHud";
import LeoGameSessionModal from "./components/LeoGameSessionModal";
import LeoGameStartOverlay from "./components/LeoGameStartOverlay";
import LeoLevelFeedbackToast from "./components/LeoLevelFeedbackToast";
import LeoLevelMap from "./components/LeoLevelMap";
import { getLeoActivityTheme } from "./components/leoActivityThemes";
import useLeoSoundEffects from "./components/useLeoSoundEffects";
import { canAttemptProgress, canPlayTargetAudio } from "./components/speechGameFlow.utils";

const fallbackPrompts = [
  {
    promptId: "LEO_ID_001",
    taskType: "read_aloud_word",
    targetText: "cat",
    targetPhonemes: ["K", "AE", "T"],
    instructionSi: "වචනය බලලා කියන්න",
    instructionEn: "Read the word aloud",
  },
  {
    promptId: "LEO_ID_005",
    taskType: "pseudoword_read",
    targetText: "mip",
    targetPhonemes: ["M", "IH", "P"],
    instructionSi: "මෙම robot word එක කියවන්න",
    instructionEn: "Read this robot word",
  },
  {
    promptId: "LEO_ID_009",
    taskType: "sentence_read",
    targetText: "The cat sat.",
    targetPhonemes: [],
    instructionSi: "වාක්‍යය කියවන්න",
    instructionEn: "Read the sentence aloud",
  },
];

const addUnique = (items, value) => (items.includes(value) ? items : [...items, value]);
const removeValue = (items, value) => items.filter((item) => item !== value);

function LeoIdentificationGame() {
  const navigate = useNavigate();
  const { t } = useTranslation("sp");
  const [sessionId, setSessionId] = useState("");
  const [prompts, setPrompts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recording, setRecording] = useState(null);
  const [recorderSupported, setRecorderSupported] = useState(true);
  const [attemptCounts, setAttemptCounts] = useState({});
  const [completedPromptIds, setCompletedPromptIds] = useState([]);
  const [invalidPromptIds, setInvalidPromptIds] = useState([]);
  const [levelStars, setLevelStars] = useState({});
  const [latestResult, setLatestResult] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [startFailed, setStartFailed] = useState(false);
  const advanceTimerRef = useRef(null);
  const sounds = useLeoSoundEffects();

  const theme = useMemo(() => getLeoActivityTheme("leo_first_check"), []);
  const activePrompts = prompts.length ? prompts : fallbackPrompts;
  const currentPrompt = activePrompts[currentIndex] || fallbackPrompts[0];
  const isLastPrompt = currentIndex === activePrompts.length - 1;
  const stars = useMemo(
    () => Object.values(levelStars).reduce((total, value) => total + (Number(value) || 0), 0),
    [levelStars]
  );
  const attemptNo = (attemptCounts[currentPrompt?.promptId] || 0) + 1;
  const allowPromptPlayback = canPlayTargetAudio({
    mode: "identification",
    activityId: "leo_first_check",
    taskType: currentPrompt?.taskType,
  });

  const startSession = useCallback(async () => {
    setLoading(true);
    setStartFailed(false);
    setError("");
    try {
      const response = await startLeoIdentification();
      const nextSessionId = response.data?.data?.sessionId || "";
      if (!nextSessionId) throw new Error("missing_identification_session");
      setSessionId(nextSessionId);
      setPrompts(
        response.data?.data?.prompts?.length
          ? response.data.data.prompts
          : fallbackPrompts
      );
    } catch (err) {
      setSessionId("");
      setStartFailed(true);
      if (err.response?.status === 409) {
        setError(t("already_complete", "Leo's First Sound Check is already complete. Your guardian can view your sound path."));
      } else {
        setError(err.response?.data?.message || t("could_not_start_check", "Leo could not start the sound check."));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    startSession();
  }, [startSession]);

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
    if (!sessionId) {
      setError(t("could_not_start_check", "Leo could not start the sound check."));
      return;
    }
    setGameStarted(true);
    setTimeout(() => sounds.playStart(), 0);
  };

  const finishIdentification = async (nextStars = stars) => {
    setSubmitting(true);
    setError("");
    try {
      const response = await completeLeoIdentification(sessionId);
      sounds.playReward();
      setCompletion({
        ...(response.data?.data || {}),
        starsEarnedTotal: response.data?.data?.starsEarnedTotal ?? nextStars,
      });
    } catch (err) {
      setError(err.response?.data?.message || t("could_not_finish_check", "Leo could not finish the sound check."));
    } finally {
      setSubmitting(false);
    }
  };

  const advanceAfterSuccess = (delayMs = 0, nextStars = stars) => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = window.setTimeout(() => {
      setLatestResult(null);
      setRecording(null);
      if (isLastPrompt) {
        finishIdentification(nextStars);
        return;
      }
      setCurrentIndex((index) => index + 1);
    }, delayMs);
  };

  const submitAttempt = async (recordingOverride) => {
    if (!sessionId || !currentPrompt) return;
    const recordingToSubmit = recordingOverride?.audioBlob ? recordingOverride : recording;
    if (!recordingToSubmit && recorderSupported) {
      setError(t("record_before_send", "Record the sound first."));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      if (recordingToSubmit?.audioBlob) {
        formData.append(
          "audio",
          recordingToSubmit.audioBlob,
          `${currentPrompt.promptId}_attempt_${attemptNo}.webm`
        );
      } else if (import.meta.env.DEV) {
        formData.append("placeholderMode", "true");
      } else {
        throw new Error("recording_required");
      }
      formData.append("sessionId", sessionId);
      formData.append("promptId", currentPrompt.promptId);
      formData.append("taskType", currentPrompt.taskType);
      formData.append("targetText", currentPrompt.targetText);
      formData.append("targetWord", currentPrompt.targetText);
      formData.append("targetPhonemes", JSON.stringify(currentPrompt.targetPhonemes || []));
      formData.append("attemptNo", attemptNo);
      formData.append("audioDurationMs", recordingToSubmit?.audioDurationMs || 1200);

      const response = await submitLeoIdentificationAttempt(formData);
      const result = response.data?.data || {};
      const levelCompleted = canAttemptProgress(result);
      const retryRequired = !levelCompleted;
      const nextResult = {
        ...result,
        promptId: result.promptId || currentPrompt.promptId,
        levelCompleted,
        retryRequired,
        levelState: retryRequired ? "invalid_retry" : "completed",
      };

      setLatestResult(nextResult);
      setAttemptCounts((prev) => ({
        ...prev,
        [currentPrompt.promptId]: attemptNo,
      }));

      if (retryRequired) {
        setInvalidPromptIds((prev) => addUnique(prev, currentPrompt.promptId));
      } else {
        const nextStars = stars + Number(result.starsEarned || 0);
        sounds.playSuccess();
        setInvalidPromptIds((prev) => removeValue(prev, currentPrompt.promptId));
        setCompletedPromptIds((prev) => addUnique(prev, currentPrompt.promptId));
        setLevelStars((prev) => ({
          ...prev,
          [currentPrompt.promptId]: Number(result.starsEarned || 0),
        }));
        advanceAfterSuccess(1400, nextStars);
      }
    } catch (err) {
      setError(err.response?.data?.message || t("could_not_save_sound", "Leo could not save this sound. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const retryCurrentLevel = () => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setRecording(null);
    setLatestResult(null);
  };

  const moveNext = async () => {
    if (!latestResult || latestResult.retryRequired) return;
    advanceAfterSuccess(0);
  };

  if (completion) return <LeoCompletionScreen completion={completion} />;

  if (loading) {
    return (
      <main className="child-game-shell flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="rounded-[2rem] bg-white p-8 text-xl font-black shadow-xl">
          {t("leo_loading_training_map")}
        </div>
      </main>
    );
  }

  if (!gameStarted) {
    return (
      <main className="child-game-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#fef08a,transparent_24%),linear-gradient(135deg,#052e16,#0f766e_42%,#fef3c7)] p-4 text-slate-950 sm:p-6">
        <div className="mx-auto max-w-6xl">
          {error && (
            <div className="mb-4 rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
              {error}
              {startFailed && (
                <button
                  type="button"
                  onClick={startSession}
                  className="ml-3 rounded-full bg-rose-700 px-4 py-2 text-xs font-black text-white"
                >
                  {t("try_again_label")}
                </button>
              )}
            </div>
          )}
          <LeoGameStartOverlay
            title={t("first_sound_check")}
            subtitle={t("start_ready_sound_check", "Start when you are ready. Leo will listen to each sound in a focused game window.")}
            startLabel={t("start_sound_check", "Start Sound Check")}
            onStart={openGame}
            startDisabled={!sessionId}
            onBack={() => navigate("/speech-processing")}
            prompts={activePrompts}
            completedPromptIds={completedPromptIds}
            totalStars={stars}
            theme={theme}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="child-game-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#fef08a,transparent_24%),linear-gradient(135deg,#052e16,#0f766e_42%,#fef3c7)] p-4 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {error && (
          <div className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        <LeoGameSessionModal title={t("first_sound_check")} onClose={() => navigate("/speech-processing")}>
          <div className="space-y-4">
            <LeoLevelFeedbackToast feedback={latestResult} theme={theme} />
            <LeoGameHud
              title={t("first_sound_check")}
              onBack={() => navigate("/speech-processing")}
              currentLevel={currentIndex + 1}
              totalLevels={activePrompts.length}
              totalStars={stars}
              theme={theme}
            />

            <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
              <div className="order-1 xl:order-none">
                <LeoCurrentLevelPanel
                  activity={{ activityId: "leo_first_check", title: t("first_sound_check") }}
                  prompt={currentPrompt}
                  level={currentIndex + 1}
                  totalLevels={activePrompts.length}
                  theme={theme}
                  selectedAnswer=""
                  onSelectAnswer={() => {}}
                  recording={recording}
                  onRecordingReady={setRecording}
                  onRecorderSupportChange={setRecorderSupported}
                  onRecordingStateChange={handleRecordingStateChange}
                  recorderSupported={recorderSupported}
                  isRecording={isRecording}
                  allowPromptPlayback={allowPromptPlayback}
                  feedback={latestResult}
                  error={error}
                  submitting={submitting}
                  onSubmit={submitAttempt}
                  onRetry={retryCurrentLevel}
                  onNext={moveNext}
                />
              </div>

              <aside className="order-2 space-y-4 xl:order-none">
                <div className="rounded-[2rem] border border-white/50 bg-white/86 p-4 shadow-xl shadow-emerald-950/10 backdrop-blur">
                  <div className="grid grid-cols-[88px_1fr] items-center gap-3">
                    <img src={leo} alt={t("leo_the_lion")} className="h-24 object-contain" />
                    <div>
                      <p className="text-lg font-black text-emerald-950">{t("leo_says", "Leo says")}</p>
                      <p className="mt-1 text-sm font-bold leading-6 text-emerald-800">
                        {latestResult?.leoMessage || t("say_prompt_collect_gems", "Say the prompt and collect sound gems.")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-[1.25rem] bg-amber-50 px-3 py-3 text-center ring-1 ring-amber-100">
                    <p className="text-2xl font-black text-amber-600">{stars}</p>
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {t("sound_gems", "Sound gems")}
                    </p>
                  </div>
                </div>
                <div
                  className={`min-h-[16rem] ${isRecording ? "pointer-events-none [&_*]:[animation-play-state:paused!important]" : ""}`}
                  data-map-active={String(!isRecording)}
                  aria-hidden={isRecording}
                  inert={isRecording ? "" : undefined}
                >
                  <LeoLevelMap
                    prompts={activePrompts}
                    currentIndex={currentIndex}
                    completedPromptIds={completedPromptIds}
                    levelStars={levelStars}
                    invalidPromptIds={invalidPromptIds}
                    theme={theme}
                    compact
                    className="min-h-[16rem]"
                  />
                </div>
              </aside>
            </div>
          </div>
        </LeoGameSessionModal>
      </div>
    </main>
  );
}

export default LeoIdentificationGame;
