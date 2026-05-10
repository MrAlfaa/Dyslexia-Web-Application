function LeoGameSessionModal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-emerald-950/72 p-3 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Leo game activity"}
    >
      <div className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-7xl sm:min-h-[calc(100vh-2.5rem)]">
        <div className="relative min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[2rem] border border-white/30 bg-[radial-gradient(circle_at_top_left,#fef08a,transparent_26%),linear-gradient(135deg,#052e16,#15803d_42%,#84cc16)] p-3 shadow-2xl shadow-emerald-950/40 sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[2.8rem] sm:p-5">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_22px_22px,rgba(255,255,255,0.28)_0_2px,transparent_3px)] [background-size:58px_58px]" />
          <div className="relative z-10">
            {children}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 z-20 hidden rounded-full bg-white/90 px-4 py-2 text-xs font-black text-emerald-900 shadow-sm ring-1 ring-emerald-100 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-white/60 md:block"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeoGameSessionModal;
