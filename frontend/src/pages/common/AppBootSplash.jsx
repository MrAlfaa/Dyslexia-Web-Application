import { useEffect, useState } from "react";
import logo from "../../assets/lexiland/lexiland-logo.png";

export const SPLASH_DURATION_MS = 3500;
// Change this constant only for demo videos; do not use long splash delays in production.

function AppBootSplash({ onDone }) {
  const [canSkip, setCanSkip] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const finishSplash = () => {
    setLeaving(true);
    window.setTimeout(onDone, 360);
  };

  useEffect(() => {
    const skipTimer = window.setTimeout(() => setCanSkip(true), 1200);
    const doneTimer = window.setTimeout(finishSplash, SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <main
      className={`premium-page fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-hidden px-6 transition-all duration-300 ${
        leaving ? "opacity-0 scale-[1.02]" : "opacity-100 scale-100"
      }`}
    >
      <div className="absolute left-[12%] top-[18%] h-5 w-5 rounded-full bg-lime-300/80 animate-float" />
      <div className="absolute right-[17%] top-[24%] h-3 w-3 rounded-full bg-amber-300/80 animate-float [animation-delay:450ms]" />
      <div className="absolute bottom-[20%] left-[23%] h-4 w-4 rounded-full bg-teal-300/80 animate-float [animation-delay:900ms]" />
      <div className="soft-glow absolute h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />

      {canSkip && (
        <button
          type="button"
          onClick={finishSplash}
          className="absolute right-5 top-5 rounded-full border border-slate-200/70 bg-white/70 px-5 py-2 text-sm font-extrabold text-slate-600 shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100"
        >
          Skip
        </button>
      )}

      <section className="relative z-10 flex w-full max-w-md flex-col items-center text-center animate-scale-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-[2rem] bg-sky-300/40 blur-2xl animate-pulse" />
          <img
            src={logo}
            alt="LexiLand"
            className="relative h-24 w-24 rounded-[1.8rem] bg-white object-cover p-2 shadow-lg ring-1 ring-white/80 sm:h-28 sm:w-28"
          />
        </div>

        <h1 className="mt-7 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
          LexiLand
        </h1>
        <p className="mt-3 text-base font-bold text-slate-500">
          Preparing your learning adventure...
        </p>

        <div className="mt-8 flex h-12 items-end gap-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <span
              key={item}
              className="block w-3 rounded-full bg-gradient-to-t from-teal-500 to-sky-400 animate-sound-wave"
              style={{ animationDelay: `${item * 120}ms` }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default AppBootSplash;
