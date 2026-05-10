function LeoGameHud({
  title,
  onBack,
  backLabel = "Back to Safari",
  currentLevel = 1,
  totalLevels = 1,
  totalStars = 0,
  theme,
}) {
  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border-4 border-amber-100/70 bg-emerald-950/72 px-4 py-3 text-white shadow-xl shadow-emerald-950/25 backdrop-blur md:px-5">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border-4 border-amber-100 bg-gradient-to-br from-amber-200 to-orange-400 px-4 py-3 text-sm font-black text-amber-950 shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-amber-100"
      >
        &lt; {backLabel}
      </button>

      <div className="min-w-0 flex-1 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">
          Leo's Sound Safari
        </p>
        <h1 className="truncate text-xl font-black text-white drop-shadow sm:text-2xl">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="rounded-full border-2 border-white/70 bg-emerald-700 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-950/15">
          {theme?.collectibleIcon || "Gem"} {totalStars}
        </span>
        <span className="rounded-full border-2 border-amber-100 bg-amber-50 px-4 py-2 text-sm font-black text-emerald-900">
          Level {Math.min(currentLevel, totalLevels)} of {totalLevels}
        </span>
        <button
          type="button"
          aria-label="Sound effects pause while recording"
          title="Sound effects pause while recording"
          className="hidden h-11 w-11 items-center justify-center rounded-full border-2 border-white/70 bg-purple-500 text-xs font-black text-white shadow-sm sm:flex"
        >
          SFX
        </button>
      </div>
    </header>
  );
}

export default LeoGameHud;
