import { ArrowLeft, Check, FlagTriangleRight, Languages, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

const CHECKPOINTS = [
  { sequence: 1, threshold: 2 },
  { sequence: 2, threshold: 4 },
  { sequence: 3, threshold: 5 },
];

function LeoSafariHud({ stars = 0, completedCount = 0, onBack }) {
  const { t, i18n } = useTranslation("sp");
  const safeCompletedCount = Math.min(5, Math.max(0, Number(completedCount) || 0));
  const nextCheckpoint =
    CHECKPOINTS.find((checkpoint) => safeCompletedCount < checkpoint.threshold) ||
    CHECKPOINTS[CHECKPOINTS.length - 1];
  const currentLanguage = i18n.resolvedLanguage || i18n.language || "en";

  return (
    <header className="rounded-lg border border-white/15 bg-emerald-950/95 px-3 py-3 text-white shadow-xl backdrop-blur sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-black outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          <span>{t("back_to_sound_safari")}</span>
        </button>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-black uppercase text-emerald-200">
            {t("safari_hud_eyebrow")}
          </p>
          <h1 className="text-xl font-black sm:text-2xl">{t("training_safari_title")}</h1>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-50 px-3 py-2 font-black text-amber-800"
            aria-label={t("stars", { count: stars })}
          >
            <Star aria-hidden="true" className="h-5 w-5 fill-current" />
            {stars}
          </span>
          <div
            className="flex min-h-11 items-center rounded-md bg-white/10 p-1"
            aria-label={t("safari_language_label")}
          >
            <Languages aria-hidden="true" className="mx-2 h-4 w-4 text-emerald-200" />
            {[
              ["en", "EN"],
              ["si", "සි"],
            ].map(([language, label]) => {
              const active = currentLanguage.startsWith(language);
              return (
                <button
                  key={language}
                  type="button"
                  onClick={() => i18n.changeLanguage(language)}
                  className={`min-h-9 min-w-10 rounded px-2 text-xs font-black outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    active ? "bg-white text-emerald-950" : "text-white hover:bg-white/10"
                  }`}
                  aria-pressed={active}
                  aria-label={t(language === "en" ? "safari_language_english" : "safari_language_sinhala")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 lg:grid-cols-[auto_1fr] lg:items-center">
        <p className="text-sm font-bold text-emerald-50">
          {t("safari_unique_completed", { count: safeCompletedCount, total: 5 })}
        </p>
        <ol className="grid grid-cols-3 gap-2" aria-label={t("safari_checkpoint_progress_label")}>
          {CHECKPOINTS.map((checkpoint) => {
            const achieved = safeCompletedCount >= checkpoint.threshold;
            const current = !achieved && checkpoint.sequence === nextCheckpoint.sequence;
            return (
              <li
                key={checkpoint.sequence}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-xs font-black ${
                  achieved
                    ? "bg-emerald-600 text-white"
                    : current
                      ? "bg-amber-50 text-amber-900"
                      : "bg-white/10 text-emerald-100"
                }`}
              >
                {achieved ? (
                  <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                ) : (
                  <FlagTriangleRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {t(checkpoint.sequence === 3 ? "safari_final_trail_check" : "safari_trail_check_number", {
                    number: checkpoint.sequence,
                  })}
                  <span className="ml-1 opacity-80">({checkpoint.threshold}/5)</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </header>
  );
}

export default LeoSafariHud;
