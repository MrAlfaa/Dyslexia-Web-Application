import { useEffect } from "react";

function LeoRewardModal({ result, onClose, autoCloseMs = 3000 }) {
  useEffect(() => {
    if (!onClose || !autoCloseMs) return undefined;
    const timer = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [autoCloseMs, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-amber-100 text-4xl">
          Leo
        </div>
        <h2 className="mt-5 text-3xl font-black text-slate-950">
          {result?.childMessage || "Great safari work!"}
        </h2>
        <p className="mt-3 text-lg font-black text-amber-700">
          You collected {result?.starsEarned || 0} stars.
        </p>
        <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
          Leo saved your jungle progress for your guardian.
        </p>
        {result?.nextActivityTitle && (
          <p className="mt-4 rounded-3xl bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
            Next path: {result.nextActivityTitle}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-3xl bg-emerald-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-100 transition hover:bg-emerald-800"
        >
          Back to Safari Map
        </button>
      </div>
    </div>
  );
}

export default LeoRewardModal;
