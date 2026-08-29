import SpeechRecorder from "./SpeechRecorder";

const isSelectionPrompt = (prompt) =>
  prompt?.taskType === "first_sound" || prompt?.taskType === "minimal_pair";

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
  const selectionPrompt = isSelectionPrompt(prompt);
  const options = prompt?.options || [prompt?.targetSound, prompt?.pairText, prompt?.targetText].filter(Boolean);

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
    <section className="rounded-[2.4rem] border border-amber-200/80 bg-[linear-gradient(135deg,#fff7ed,#fef3c7_52%,#ecfdf5)] p-5 shadow-2xl shadow-amber-950/10 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm"
            style={{ backgroundColor: theme?.primaryColor || "#15803d" }}
          >
            {theme?.taskLabel || activity?.gameType || "Sound"}
          </span>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
            Level {level} of {totalLevels}
          </h2>
        </div>
        {allowPromptPlayback && (
          <button
            type="button"
            onClick={speakPrompt}
            disabled={isRecording}
            className="rounded-full bg-white px-4 py-3 text-sm font-black text-emerald-900 shadow-sm ring-1 ring-emerald-100 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Play Sound
          </button>
        )}
      </div>

      <div className="mt-5 rounded-[2rem] bg-white/82 p-5 text-center shadow-inner ring-1 ring-white">
        <p className="text-sm font-black text-emerald-800">
          {prompt?.instructionSi || "Leo says: try this sound."}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          {prompt?.instructionEn || theme?.animalMessage || "Follow Leo's sound path."}
        </p>
        <h3 className="mt-4 break-words text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
          {prompt?.targetText || "Sound"}
        </h3>
        {prompt?.pairText && (
          <p className="mt-2 text-2xl font-black text-slate-600">or {prompt.pairText}</p>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          {selectionPrompt ? (
            <div className="rounded-[2rem] bg-white/86 p-4 shadow-lg shadow-amber-950/5 ring-1 ring-white">
              <p className="text-sm font-black text-slate-700">Choose Leo's sound gem</p>
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
            />
          )}
        </div>

        <aside className="rounded-[2rem] bg-white/90 p-5 shadow-xl shadow-emerald-950/10 ring-1 ring-white">
          <p className="text-lg font-black text-slate-950">Leo is listening</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            Send this level to Leo. If Leo cannot hear you, you can try again on the same jungle step.
          </p>

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </p>
          )}

          {!recorderSupported && !selectionPrompt && (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              Recording is not supported here. Practice send is available only in development.
            </p>
          )}

          {!feedback ? (
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
              {submitting ? "Sending to Leo..." : "Send to Leo"}
            </button>
          ) : (
            <div className="mt-5 rounded-[1.75rem] bg-amber-50 p-4 ring-1 ring-amber-100">
              <p className="text-lg font-black text-amber-950">
                {feedback.childFeedback || "Great safari work!"}
              </p>
              <p className="mt-2 text-sm font-bold text-amber-800">
                {feedback.leoMessage || "You found a sound gem."}
              </p>
              <p className="mt-3 rounded-full bg-white px-3 py-2 text-sm font-black text-emerald-800">
                +{feedback.starsEarned || 0} {theme?.collectible || "sound gems"}
              </p>
              {(feedback.retryRequired || feedback.nextPromptUnlocked === false) ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 w-full rounded-[1.5rem] bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-orange-950/10 transition hover:-translate-y-1"
                >
                  Try This Level Again
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onNext}
                  className="mt-4 w-full rounded-[1.5rem] bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-1"
                >
                  {level < totalLevels ? "Unlock Next Jungle Step" : "Open Final Reward"}
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
