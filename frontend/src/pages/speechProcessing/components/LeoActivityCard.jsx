function LeoActivityCard({ activity, index, onSelect, disabled }) {
  const state = activity.state || "locked";
  const isReady = state === "current" || state === "recommended" || state === "available";
  const isCompleted = state === "completed";
  const icons = {
    first_sound: "♪",
    listen_repeat: "Mic",
    pseudoword_read: "Bot",
    minimal_pair: "2x",
    sentence_read: "Story",
  };

  return (
    <article
      className={`relative overflow-hidden rounded-[2rem] p-5 ring-1 transition ${
        isCompleted
          ? "bg-emerald-50 ring-emerald-100"
          : state === "current"
            ? "bg-amber-50 ring-amber-100 shadow-xl shadow-amber-100/70"
            : isReady
              ? "bg-white ring-emerald-100 shadow-lg shadow-emerald-100/40"
            : "bg-white/70 ring-white opacity-80"
      }`}
    >
      {state === "current" && <div className="absolute -right-8 -top-8 h-28 w-28 animate-pulse rounded-full bg-amber-200/70 blur-xl" />}
      <div className="relative">
        <div className={`flex h-16 w-16 items-center justify-center rounded-3xl text-sm font-black ${isCompleted ? "bg-emerald-700 text-white" : state === "current" ? "bg-amber-300 text-amber-950" : isReady ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
          {isCompleted ? "★" : icons[activity.gameType] || index + 1}
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-950">{activity.title}</h3>
        <p className="mt-2 min-h-[48px] text-sm font-bold leading-6 text-slate-600">
          {activity.childDescription || activity.description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-100">
            {state}
          </span>
          <span className="text-sm font-black text-amber-700">{activity.starsEarned || activity.stars || 0} stars</span>
        </div>
        <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
          {activity.estimatedMinutes || 5} min · {activity.requiresRecording ? "recording" : "choice game"}
        </p>
        <button
          type="button"
          onClick={() => onSelect(activity)}
          disabled={disabled || (!isReady && !isCompleted)}
          className="mt-5 w-full rounded-3xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {isCompleted ? "Play Again" : isReady ? "Start Activity" : "Locked"}
        </button>
      </div>
    </article>
  );
}

export default LeoActivityCard;
