import { RotateCcw, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

function LeoSafariActivityTray({ activities = [], onReplay, openingActivityId = "" }) {
  const { t } = useTranslation("sp");

  return (
    <section className="border-t border-emerald-100 bg-white/95 px-4 py-5 sm:px-6" aria-labelledby="safari-replay-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase text-emerald-700">{t("safari_replay_eyebrow")}</p>
          <h2 id="safari-replay-heading" className="mt-1 text-xl font-black text-slate-950">
            {t("safari_replay_heading")}
          </h2>
        </div>
        <p className="max-w-xl text-sm font-bold text-slate-600">{t("safari_replay_not_new_completion")}</p>
      </div>

      {activities.length ? (
        <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
          {activities.map((activity, index) => {
            const parsedStars = Number(activity.starsEarned ?? activity.stars ?? 0);
            const stars = Number.isFinite(parsedStars) ? Math.max(0, parsedStars) : 0;
            const opening = openingActivityId === activity.activityId;

            return (
              <article
                key={`${activity.activityId || "replay"}-${index}`}
                className="min-w-[15rem] snap-start rounded-lg border border-emerald-100 bg-emerald-50/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">{activity.shortTitle || activity.title}</p>
                    <p className="mt-1 text-xs font-bold text-emerald-800">{t("safari_replay_completed_label")}</p>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-black text-amber-700"
                    aria-label={t("stars", { count: stars })}
                  >
                    <Star aria-hidden="true" className="h-4 w-4 fill-current" />
                    {stars}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onReplay(activity)}
                  disabled={opening}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-black text-emerald-900 ring-1 ring-emerald-200 outline-none transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-wait disabled:opacity-60"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  {opening ? t("safari_opening_game") : t("safari_replay_activity")}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-900">
          {t("safari_replay_empty")}
        </p>
      )}
    </section>
  );
}

export default LeoSafariActivityTray;
