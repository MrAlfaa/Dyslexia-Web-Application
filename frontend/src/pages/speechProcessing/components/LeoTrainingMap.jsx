import { lazy, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, LockKeyhole, MapPin, RotateCcw, Star } from "lucide-react";
import trainingBackground from "../../../assets/lexiland/leo-training-map-bg.webp";
import { buildSafariPresentation } from "./leoSafariPresentation.utils";

const LeoSafari3DMap = lazy(() => import("./LeoSafari3DMap"));

const getStateIcon = (zone) => {
  if (zone.state === "locked") return LockKeyhole;
  if (zone.state === "replay") return RotateCcw;
  if (zone.isPrimary) return MapPin;
  return CheckCircle2;
};

function LeoTrainingMap({
  activities = [],
  zones: providedZones,
  onSelect,
  locked = false,
  recommendation,
  checkpointDue = false,
  active = true,
  recording = false,
}) {
  const { t } = useTranslation("sp");
  const presentation = useMemo(
    () => buildSafariPresentation({ activities, recommendation, checkpointDue }),
    [activities, checkpointDue, recommendation]
  );
  const zones = providedZones || presentation.zones;
  const primaryActivityId = zones.find((zone) => zone.isPrimary)?.activityId || null;
  const defaultFocus =
    primaryActivityId ||
    zones.find((zone) => zone.state !== "locked")?.activityId ||
    zones[0]?.activityId ||
    null;
  const [focusSelection, setFocusSelection] = useState({
    activityId: defaultFocus,
    primaryActivityId,
  });
  const focusStillExists = zones.some((zone) => zone.activityId === focusSelection.activityId);
  const focusedActivityId =
    focusSelection.primaryActivityId === primaryActivityId && focusStillExists
      ? focusSelection.activityId
      : defaultFocus;

  const fallback = (
    <div
      className="h-full w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${trainingBackground})` }}
      aria-hidden="true"
    />
  );

  return (
    <section className="overflow-hidden rounded-lg bg-emerald-950 shadow-2xl shadow-emerald-950/20">
      <div className="relative h-[30rem] min-h-[30rem] sm:h-[34rem] lg:h-[min(66vh,46rem)]">
        <div className="absolute inset-0">
          <Suspense fallback={fallback}>
            <LeoSafari3DMap
              zones={zones}
              focusedActivityId={focusedActivityId}
              recording={recording}
              fallback={fallback}
              active={active}
            />
          </Suspense>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-emerald-950/90 via-emerald-950/60 to-transparent p-5 pb-24 text-white sm:p-8">
          <h2 className="text-3xl font-black sm:text-4xl">{t("training_map_heading")}</h2>
          <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-emerald-50 sm:text-base">
            {t("training_map_desc")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-amber-800">
              <Star aria-hidden="true" className="h-4 w-4 fill-current" />
              {t("stars", { count: zones.reduce((sum, zone) => sum + Number(zone.starsEarned || zone.stars || 0), 0) })}
            </span>
            <span className="inline-flex min-h-11 items-center rounded-full bg-white/95 px-3 py-2 text-emerald-800">
              {t("completed_count", { count: zones.filter((zone) => zone.state === "replay").length })}
            </span>
          </div>
          {locked && <p className="mt-3 text-sm font-black text-amber-200">{t("training_map_locked")}</p>}
        </div>
      </div>

      <div className="relative z-20 border-t border-white/10 bg-emerald-950 px-4 py-4 sm:px-6">
        {recommendation?.guardianReason && (
          <p className="mb-3 max-w-2xl text-sm font-bold text-emerald-50">{t("leo_pick", { reason: recommendation.guardianReason })}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {zones.map((zone, index) => {
            const StateIcon = getStateIcon(zone);
            const isFocused = focusedActivityId === zone.activityId;
            const canPlay = !locked && (zone.isPrimary || Boolean(zone.replayAction));
            const parsedStars = Number(zone.starsEarned ?? zone.stars ?? 0);
            const zoneStars = Number.isFinite(parsedStars) ? Math.max(0, parsedStars) : 0;
            const stateLabel = t(zone.stateLabelKey);
            const lockReason =
              zone.state === "locked"
                ? zone.lockReason || t("safari_locked_reason_fallback")
                : null;

            return (
              <article
                key={`${zone.activityId || "unknown"}-${index}`}
                className={`min-w-0 rounded-lg border p-2 shadow-lg transition ${
                  isFocused
                    ? "border-amber-300 bg-amber-50 ring-2 ring-amber-300"
                    : "border-white/15 bg-white/95"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setFocusSelection({
                    activityId: zone.activityId,
                    primaryActivityId,
                  })}
                  className="min-h-11 w-full rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                  aria-pressed={isFocused}
                  aria-label={`${zone.shortTitle || zone.title}. ${stateLabel}. ${t("stars", { count: zoneStars })}${
                    lockReason ? `. ${lockReason}` : ""
                  }`}
                >
                  <span className="flex items-center justify-between gap-2 text-xs font-black uppercase text-emerald-700">
                    {t("zone_number", { number: index + 1 })}
                    <StateIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  </span>
                  <span className="mt-1 block text-sm font-black leading-5 text-slate-950">
                    {zone.shortTitle || zone.title}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-xs font-bold leading-4 text-slate-600">
                    <span>{stateLabel}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-amber-700">
                      <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                      {t("stars", { count: zoneStars })}
                    </span>
                  </span>
                  {lockReason ? (
                    <span className="mt-1 block text-xs leading-4 text-slate-500">{lockReason}</span>
                  ) : null}
                </button>

                {canPlay ? (
                  <button
                    type="button"
                    onClick={() => onSelect(zone)}
                    className={`mt-1 min-h-11 w-full rounded-md px-3 py-2 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
                      zone.isPrimary
                        ? "bg-emerald-700 text-white hover:bg-emerald-800"
                        : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                    }`}
                  >
                    {t(zone.isPrimary ? "safari_play_leos_pick" : "safari_replay_activity")}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default LeoTrainingMap;
