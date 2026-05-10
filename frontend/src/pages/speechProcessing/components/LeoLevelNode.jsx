const stateStyles = {
  completed: "scale-100 bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-amber-950/25",
  current: "scale-105 bg-gradient-to-br from-emerald-300 to-teal-600 text-white shadow-emerald-950/30 animate-pulse",
  invalid_retry: "scale-105 bg-gradient-to-br from-orange-300 to-rose-500 text-white shadow-orange-950/30",
  locked: "bg-slate-200 text-slate-500 shadow-slate-950/10 opacity-70",
};

const adventureColors = [
  "from-orange-300 to-orange-500",
  "from-lime-300 to-green-500",
  "from-sky-300 to-blue-500",
  "from-violet-300 to-purple-500",
  "from-rose-300 to-pink-500",
];

function LeoLevelNode({ index, prompt, state, stars = 0, onClick, theme, compact = false, variant = "default" }) {
  const locked = state === "locked";
  const label = prompt?.targetText || `Level ${index + 1}`;
  const starText = state === "completed" ? "*".repeat(Math.max(1, Math.min(3, stars || 1))) : locked ? "Locked" : "Star";

  if (variant === "adventure") {
    const color = adventureColors[index % adventureColors.length];
    const nodeColor = state === "locked"
      ? "from-slate-300 to-slate-500 text-slate-100"
      : state === "current"
        ? "from-emerald-300 to-teal-600 text-white"
        : state === "invalid_retry"
          ? "from-orange-300 to-rose-500 text-white"
          : state === "completed"
            ? "from-amber-300 to-orange-500 text-white"
            : `${color} text-white`;

    return (
      <button
        type="button"
        disabled={locked}
        onClick={() => onClick?.(index)}
        className={`group relative flex min-h-[104px] w-full max-w-[108px] flex-col items-center justify-start rounded-[1.7rem] p-1 transition focus:outline-none focus:ring-4 focus:ring-amber-100 ${
          locked ? "cursor-not-allowed opacity-75" : "hover:-translate-y-1"
        }`}
        aria-label={`Level ${index + 1}: ${label}`}
      >
        <span className="absolute top-[50px] h-8 w-24 rounded-[999px] bg-stone-800/40 blur-sm" />
        {state === "invalid_retry" && (
          <span className="absolute -top-2 z-30 rounded-full border-2 border-amber-50 bg-orange-500 px-2 py-1 text-[10px] font-black text-white shadow-lg">
            Retry
          </span>
        )}
        {state === "current" && (
          <span
            className="absolute top-1 h-[76px] w-[76px] animate-ping rounded-full opacity-45"
            style={{ backgroundColor: theme?.primaryColor || "#15803d" }}
          />
        )}
        <span className="relative z-10 rounded-full bg-stone-600 p-1 shadow-2xl shadow-emerald-950/35">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full border-[5px] border-white bg-gradient-to-br text-2xl font-black shadow-inner shadow-white/20 ${nodeColor}`}
          >
            {index + 1}
          </span>
        </span>
        <span className="relative z-10 -mt-2 rounded-full border-2 border-emerald-50 bg-white px-3 py-1 text-[11px] font-black text-emerald-950 shadow-md">
          {label}
        </span>
        <span
          className={`relative z-10 mt-1 rounded-full px-2 py-0.5 text-[11px] font-black ${
            state === "completed"
              ? "bg-amber-100 text-amber-700"
              : locked
                ? "bg-slate-100 text-slate-500"
                : "bg-emerald-950/80 text-amber-100"
          }`}
        >
          {state === "completed" ? starText : locked ? "Locked" : "Ready"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onClick?.(index)}
      className={`group relative flex flex-col items-center justify-start rounded-[1.6rem] p-2 transition focus:outline-none focus:ring-4 focus:ring-amber-200 ${
        compact ? "min-h-[86px]" : "min-h-[112px]"
      } ${locked ? "cursor-not-allowed" : "hover:-translate-y-1"}`}
      aria-label={`Level ${index + 1}: ${label}`}
    >
      {state === "invalid_retry" && (
        <span className="absolute -top-2 z-20 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black text-orange-800 ring-1 ring-orange-200">
          Retry
        </span>
      )}
      <span
        className={`relative z-10 flex items-center justify-center rounded-full border-white font-black shadow-xl transition ${
          compact ? "h-12 w-12 border-4 text-lg" : "h-16 w-16 border-[5px] text-2xl"
        } ${stateStyles[state] || stateStyles.locked}`}
        style={state === "current" ? { boxShadow: `0 0 0 8px ${theme?.primaryColor || "#15803d"}22` } : undefined}
      >
        {index + 1}
      </span>
      <span className={`mt-2 max-w-[104px] truncate rounded-full bg-white/86 px-3 py-1 font-black text-slate-800 shadow-sm ${
        compact ? "text-[10px]" : "text-xs"
      }`}>
        {label}
      </span>
      <span className={`${compact ? "mt-0.5 text-[10px]" : "mt-1 text-xs"} font-black text-white drop-shadow`}>
        {starText}
      </span>
    </button>
  );
}

export default LeoLevelNode;
