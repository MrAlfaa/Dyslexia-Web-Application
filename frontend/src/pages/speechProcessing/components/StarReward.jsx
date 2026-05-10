function StarReward({ result }) {
  if (!result) return null;

  const stars = Math.max(Number(result.starsEarned) || 0, 0);

  return (
    <div className="animate-scale-in rounded-[2rem] bg-amber-50 p-5 text-amber-950 shadow-lg shadow-amber-100/60 ring-1 ring-amber-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-2xl font-black">{result.childFeedback || "Great roar!"}</p>
          <p className="mt-1 text-sm font-bold text-amber-800">
            {result.leoMessage || "Let's try the next sound."}
          </p>
        </div>
        <div className="text-3xl" aria-label={`${stars} stars`}>
          {"⭐".repeat(Math.max(stars, 1))}
        </div>
      </div>
    </div>
  );
}

export default StarReward;
