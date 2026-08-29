import { useTranslation } from "react-i18next";
import LeoSentencePrompt from "./LeoSentencePrompt";
import SpeechRecorder from "./SpeechRecorder";

const isSelectionPrompt = (prompt) =>
  prompt?.taskType === "first_sound" || prompt?.taskType === "minimal_pair";

const isLongReadingPrompt = (prompt) =>
  prompt?.taskType === "sentence_read" || prompt?.taskType === "paragraph_segment_read";

const isParagraphPrompt = (prompt) =>
  prompt?.taskType === "paragraph_segment_read" ||
  prompt?.contentType === "paragraph_segment" ||
  Boolean(prompt?.paragraphId);

const getWordReadingMessage = (wordReading, t) => {
  if (!wordReading) return "";
  if (wordReading.attemptStatus === "invalid_audio") return t("word_feedback_invalid");
  if (wordReading.wordCorrect) return t("word_feedback_correct");
  if (wordReading.attemptStatus === "valid") return t("word_feedback_retry");
  return "";
};

const getSoundHelperTone = (state) => {
  if (state === "strong") return "border-emerald-100 bg-emerald-50 text-emerald-900";
  if (state === "retry") return "border-orange-100 bg-orange-50 text-orange-900";
  return "border-violet-100 bg-violet-50 text-violet-900";
};

const getSentenceFeedbackMessage = (sentenceFeedback, t) => {
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

function LeoCurrentLevelPanel({
  activity,
  prompt,
  level,
  totalLevels,
  theme,
  selectedAnswer,
  onSelectAnswer,
  recording,
  onRecordingReady,
  onRecorderSupportChange,
  onRecordingStateChange,
  recorderSupported,
  isRecording = false,
  allowPromptPlayback = false,
  feedback,
  error,
  submitting,
  onSubmit,
  onRetry,
  onNext,
}) {
  const { t } = useTranslation(["sp", "common"]);
  const selectionPrompt = isSelectionPrompt(prompt);
  const longReadingPrompt = isLongReadingPrompt(prompt);
  const paragraphPrompt = isParagraphPrompt(prompt);
  const options = prompt?.options || [prompt?.targetSound, prompt?.pairText, prompt?.targetText].filter(Boolean);
  const wordMessage = getWordReadingMessage(feedback?.wordReading, t);
  const sentenceMessage = getSentenceFeedbackMessage(feedback?.sentenceFeedback, t);
  const recordingLimitMs = longReadingPrompt ? (paragraphPrompt ? 45000 : 30000) : null;

  const speakPrompt = () => {
    if (!allowPromptPlayback || isRecording) return;
    if (!prompt?.targetText || typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(prompt.targetText);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className="min-w-0 overflow-x-hidden rounded-[2.4rem] border border-amber-200/80 bg-[linear-gradient(135deg,#fff7ed,#fef3c7_52%,#ecfdf5)] p-5 shadow-2xl shadow-amber-950/10 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm"
            style={{ backgroundColor: theme?.primaryColor || "#15803d" }}
          >
            {theme?.taskLabel || activity?.gameType || t("sound")}
          </span>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
            {t("level_progress", { current: level, total: totalLevels })}
          </h2>
        </div>
        {allowPromptPlayback && (
          <button
            type="button"
            onClick={speakPrompt}
            disabled={isRecording}
            className="rounded-full bg-white px-4 py-3 text-sm font-black text-emerald-900 shadow-sm ring-1 ring-emerald-100 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("play_sound")}
          </button>
        )}
      </div>

      {longReadingPrompt ? (
        <div className="mt-5 min-w-0 px-1 py-2 text-center sm:px-4">
          <p className="text-sm font-black leading-6 text-emerald-800">
            {paragraphPrompt ? t("paragraph_read_instruction") : t("sentence_read_instruction")}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            {t("sentence_read_instruction_en")}
          </p>
          <div className="mt-4 min-w-0">
            <LeoSentencePrompt prompt={prompt} />
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[2rem] bg-white/82 p-5 text-center shadow-inner ring-1 ring-white">
          <p className="text-sm font-black text-emerald-800">
            {prompt?.instructionSi || t("leo_says_try_sound")}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {prompt?.instructionEn || theme?.animalMessage || t("follow_sound_path")}
          </p>
          <h3 className="mt-4 break-words text-5xl font-black text-slate-950 sm:text-6xl">
            {prompt?.targetText || t("sound")}
          </h3>
          {prompt?.pairText && (
            <p className="mt-2 text-2xl font-black text-slate-600">
              {t("or_label")} {prompt.pairText}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {selectionPrompt ? (
            <div className="rounded-[2rem] bg-white/86 p-4 shadow-lg shadow-amber-950/5 ring-1 ring-white">
              <p className="text-sm font-black text-slate-700">{t("choose_sound_gem")}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSelectAnswer(option)}
                    className={`rounded-[1.5rem] px-5 py-5 text-2xl font-black shadow-sm ring-2 transition hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-amber-200 ${
                      selectedAnswer === option
                        ? "bg-emerald-700 text-white ring-emerald-700"
                        : "bg-emerald-50 text-emerald-950 ring-emerald-100"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <SpeechRecorder
              resetKey={`${activity?.activityId || "leo-check"}-${prompt?.promptId}-${feedback ? "sent" : "ready"}`}
              onRecordingReady={onRecordingReady}
              onSupportChange={onRecorderSupportChange}
              onRecordingStateChange={onRecordingStateChange}
              maxDurationMs={recordingLimitMs}
              showDurationLimit={longReadingPrompt}
              onAutoSubmit={onSubmit}
              submitting={submitting}
            />
          )}
        </div>

        <aside className="rounded-[2rem] bg-white/90 p-5 shadow-xl shadow-emerald-950/10 ring-1 ring-white">
          <p className="text-lg font-black text-slate-950">
            {longReadingPrompt ? t("leo_ready_for_reading") : t("leo_is_listening")}
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {longReadingPrompt ? t("sentence_send_desc") : t("send_level_desc")}
          </p>

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {longReadingPrompt ? t("sentence_feedback_retry") : error}
            </p>
          )}

          {!recorderSupported && !selectionPrompt && (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {t("recording_not_supported")}
            </p>
          )}

          {!feedback && selectionPrompt ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={
                submitting ||
                (selectionPrompt && !selectedAnswer) ||
                (!selectionPrompt && !recording && recorderSupported)
              }
              className="mt-5 w-full rounded-[1.5rem] bg-emerald-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-950/10 transition hover:-translate-y-1 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {submitting && longReadingPrompt
                ? t("sentence_feedback_processing")
                : submitting
                  ? t("sending_to_leo")
                  : t("send_to_leo")}
            </button>
          ) : !feedback ? (
            <div className="mt-5 rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-center ring-1 ring-emerald-100" aria-live="polite">
              <p className="text-sm font-black text-emerald-900">
                {submitting ? t("sending_to_leo") : t("recorder_auto_submit_hint")}
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-emerald-700">
                {t("recorder_auto_submit_desc")}
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.75rem] bg-amber-50 p-4 ring-1 ring-amber-100">
              <p className="text-lg font-black text-amber-950">
                {longReadingPrompt
                  ? sentenceMessage
                  : feedback.childFeedback || t("great_safari_work")}
              </p>
              <p className="mt-2 text-sm font-bold text-amber-800">
                {longReadingPrompt
                  ? t("sentence_feedback_encouragement")
                  : feedback.leoMessage || t("found_sound_gem")}
              </p>
              {!longReadingPrompt && feedback.wordReading?.attemptStatus !== "processing" && feedback.wordReading && (
                <div className="mt-4 rounded-[1.25rem] bg-white p-3 text-left ring-1 ring-amber-100">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-800">
                    {t("word_reading")}
                  </p>
                  <div className="mt-2 grid gap-2 text-sm font-bold text-slate-700">
                    <span>{t("target_word")}: {feedback.wordReading.targetWord || prompt?.targetText || "-"}</span>
                    <span>{t("leo_heard")}: {feedback.wordReading.normalizedAsrText || "..."}</span>
                    <span>
                      {t("correct")}: {feedback.wordReading.wordCorrect ? t("yes") : t("try_again_label")}
                    </span>
                  </div>
                  {wordMessage && (
                    <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-900">
                      {wordMessage}
                    </p>
                  )}
                </div>
              )}
              {!longReadingPrompt && feedback.soundFeedback && (
                <div className={`mt-4 rounded-[1.25rem] border p-3 text-left ${getSoundHelperTone(feedback.soundFeedback.state)}`}>
                  <p className="text-xs font-black uppercase tracking-[0.12em]">
                    {t("leo_sound_helper")}
                  </p>
                  <p className="mt-2 text-sm font-black">
                    {feedback.soundFeedback.message || t("sound_helper_waiting")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(feedback.soundFeedback.focusAreas || []).map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-white/80 px-3 py-1 text-xs font-black shadow-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 rounded-full bg-white px-3 py-2 text-sm font-black text-emerald-800">
                +{feedback.starsEarned || 0} {theme?.collectible || "sound gems"}
              </p>
              {(feedback.retryRequired || feedback.nextPromptUnlocked === false) ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 w-full rounded-[1.5rem] bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-orange-950/10 transition hover:-translate-y-1"
                >
                  {longReadingPrompt ? t("sentence_retry_button") : t("try_this_level_again")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onNext}
                  className="mt-4 w-full rounded-[1.5rem] bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-1"
                >
                  {level < totalLevels ? t("unlock_next_step") : t("open_final_reward")}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export default LeoCurrentLevelPanel;
