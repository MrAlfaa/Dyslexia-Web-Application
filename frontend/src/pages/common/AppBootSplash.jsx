import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import logo from "../../assets/lexiland/lexiland-logo.webp";

export const FIRST_SPLASH_DURATION_MS = 2400;
export const REPEAT_SPLASH_DURATION_MS = 900;
export const SPLASH_DURATION_MS = FIRST_SPLASH_DURATION_MS;
const SPLASH_SESSION_KEY = "dyslexiaAidSplashShown";

function AppBootSplash({ onDone }) {
  const { t } = useTranslation("common");
  const finishedRef = useRef(false);
  const [reducedMotion] = useState(() =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  const [repeatVisit] = useState(() => sessionStorage.getItem(SPLASH_SESSION_KEY) === "true");
  const [leaving, setLeaving] = useState(false);

  const finishSplash = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, reducedMotion ? 0 : 220);
  }, [onDone, reducedMotion]);

  useEffect(() => {
    const duration = reducedMotion
      ? 300
      : repeatVisit
        ? REPEAT_SPLASH_DURATION_MS
        : FIRST_SPLASH_DURATION_MS;
    const doneTimer = window.setTimeout(finishSplash, duration);

    return () => window.clearTimeout(doneTimer);
  }, [finishSplash, reducedMotion, repeatVisit]);

  return (
    <main
      className={`fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-hidden bg-[#f4faf7] px-6 transition-opacity duration-200 motion-reduce:transition-none ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={finishSplash}
        className="absolute right-5 top-5 min-h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"
      >
        {t("splash_skip")}
      </button>

      <section className="flex w-full max-w-md flex-col items-center text-center animate-scale-in motion-reduce:animate-none" aria-live="polite">
        <div className="rounded-lg border border-emerald-100 bg-white p-3 shadow-lg">
          <img
            src={logo}
            alt="LexiLand"
            className="h-24 w-24 rounded-md object-cover sm:h-28 sm:w-28"
          />
        </div>

        <h1 className="mt-7 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
          LexiLand
        </h1>
        <p className="mt-3 text-base font-bold text-slate-500">
          {t("splash_preparing")}
        </p>

        <div className="mt-8 flex h-10 items-end gap-2" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((item) => (
            <span
              key={item}
              className="block w-3 rounded-full bg-emerald-600 animate-sound-wave motion-reduce:animate-none"
              style={{ animationDelay: `${item * 120}ms` }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default AppBootSplash;
