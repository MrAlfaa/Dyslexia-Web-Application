function LeoProgressPath({ currentIndex, total, stars }) {
  const safeTotal = Math.max(total || 1, 1);

  return (
    <div className="rounded-[2rem] bg-white/90 p-4 shadow-lg shadow-emerald-100/50 ring-1 ring-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-700">
          Jungle step {Math.min(currentIndex + 1, safeTotal)} of {safeTotal}
        </p>
        <p className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">
          Stars {stars}
        </p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {Array.from({ length: safeTotal }).map((_, index) => (
          <div
            key={index}
            className={`h-3 flex-1 rounded-full transition-all duration-500 ${
              index <= currentIndex
                ? "bg-gradient-to-r from-emerald-500 to-amber-400"
                : "bg-emerald-100"
            }`}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-lg" aria-hidden="true">
        <span>🌿</span>
        <span>⭐</span>
        <span>🎤</span>
        <span>💎</span>
      </div>
    </div>
  );
}

export default LeoProgressPath;
