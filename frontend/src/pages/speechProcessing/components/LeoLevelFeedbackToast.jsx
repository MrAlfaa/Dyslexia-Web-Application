function LeoLevelFeedbackToast({ feedback, theme }) {
  if (!feedback || feedback.retryRequired) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-24 z-[60] mx-auto max-w-md rounded-[2rem] bg-white/95 p-5 text-center shadow-2xl shadow-emerald-950/25 ring-1 ring-emerald-100 backdrop-blur">
      <p className="text-2xl font-black text-emerald-800">
        {feedback.childFeedback || "Great safari work!"}
      </p>
      <p className="mt-2 text-sm font-bold text-slate-600">
        {feedback.leoMessage || "You unlocked the next jungle step!"}
      </p>
      <p className="mt-3 rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 ring-1 ring-amber-100">
        +{feedback.starsEarned || 0} {theme?.collectible || "sound gems"}
      </p>
    </div>
  );
}

export default LeoLevelFeedbackToast;
