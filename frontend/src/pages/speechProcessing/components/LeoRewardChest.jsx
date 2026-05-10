function LeoRewardChest({ unlocked, theme, totalStars = 0, compact = false, variant = "default" }) {
  if (variant === "adventure") {
    return (
      <div
        className={`relative w-full max-w-[180px] rounded-[1.7rem] border-4 text-center shadow-2xl transition ${
          unlocked
            ? "border-amber-100 bg-gradient-to-br from-amber-200 via-yellow-300 to-orange-400 text-amber-950 shadow-amber-950/25"
            : "border-amber-100 bg-gradient-to-b from-amber-50 to-orange-100 text-amber-950 shadow-emerald-950/25"
        }`}
      >
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-2 border-amber-100 bg-rose-600 px-3 py-1 text-[11px] font-black text-white shadow-lg">
          Final Reward
        </div>
        <div className="p-4 pt-6">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[1.2rem] border-4 border-amber-100 bg-gradient-to-br from-yellow-300 to-orange-500 text-2xl font-black shadow-inner shadow-white/30 ${unlocked ? "animate-bounce" : ""}`}>
            {unlocked ? "OK" : "GO"}
          </div>
          <h3 className="mt-3 text-base font-black leading-5">
            {theme?.rewardName || "Jungle Sound Badge"}
          </h3>
          <p className="mt-1 text-xs font-black text-amber-800">
            {unlocked ? `${totalStars} stars collected` : "Finish every level"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-[1.75rem] border-4 text-center shadow-xl transition ${
        compact ? "min-h-[108px] p-3" : "min-h-[132px] p-4"
      } ${
        unlocked
          ? "border-amber-200 bg-gradient-to-br from-amber-200 via-yellow-300 to-orange-400 text-amber-950 shadow-amber-950/20"
          : "border-white/50 bg-white/55 text-slate-500 shadow-slate-950/10"
      }`}
    >
      <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-3 py-1 text-xs font-black text-white shadow-lg">
        Final Reward
      </span>
      <div className={`${compact ? "mt-3 text-3xl" : "mt-4 text-5xl"} ${unlocked ? "animate-bounce" : ""}`}>
        {unlocked ? "Trophy" : "Gift"}
      </div>
      <h3 className={`${compact ? "mt-1 text-sm" : "mt-2 text-lg"} font-black`}>
        {theme?.rewardName || "Jungle Sound Badge"}
      </h3>
      <p className="mt-1 text-xs font-black">
        {unlocked ? `${totalStars} stars collected` : "Finish every level"}
      </p>
    </div>
  );
}

export default LeoRewardChest;
