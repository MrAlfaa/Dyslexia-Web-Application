import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { LockKeyhole, MapPin, Play } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getImprovementActivity,
  getImprovementMap,
  getImprovementRecommendation,
  getImprovementStatus,
} from "../../services/speechProcessing/api";
import trainingBg from "../../assets/lexiland/leo-training-map-bg.webp";
import LeoActivityPlay from "./components/LeoActivityPlay";
import LeoGuide from "./components/LeoGuide";
import LeoRewardModal from "./components/LeoRewardModal";
import LeoSafariActivityTray from "./components/LeoSafariActivityTray";
import LeoSafariHud from "./components/LeoSafariHud";
import { buildSafariPresentation } from "./components/leoSafariPresentation.utils";

const LeoSafari3DMap = lazy(() => import("./components/LeoSafari3DMap"));

function LeoTrainingSafari() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const { t } = useTranslation("sp");
  const [status, setStatus] = useState(null);
  const [activities, setActivities] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [mapSummary, setMapSummary] = useState({
    stars: 0,
    completedActivityIds: [],
    checkpointDue: false,
  });
  const [activeActivity, setActiveActivity] = useState(null);
  const [openingActivityId, setOpeningActivityId] = useState("");
  const [lockNotice, setLockNotice] = useState("");
  const [reward, setReward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const devUnlock = import.meta.env.VITE_LEXILAND_DEV_UNLOCK === "true";

  const load = useCallback(async () => {
    setError("");
    try {
      const [statusRes, mapRes] = await Promise.all([
        getImprovementStatus(),
        getImprovementMap().catch(() => getImprovementRecommendation()),
      ]);
      const statusData = statusRes.data?.data || {};
      const mapData = mapRes.data?.data || {};
      const progress = mapData.progress || {};
      setStatus(statusData);
      setActivities(mapData.activities || statusData.activities || (Array.isArray(mapData) ? mapData : []));
      setRecommendation(
        mapData.recommendation ||
          (mapData.nextActivity || mapData.nextActivityId ? mapData : null) ||
          statusData.recommendation ||
          null
      );
      setMapSummary({
        stars: mapData.stars ?? progress.stars ?? statusData.stars ?? 0,
        completedActivityIds:
          mapData.completedActivityIds || progress.completedActivityIds || statusData.completedActivityIds || [],
        checkpointDue:
          mapData.checkpointDue === true ||
          progress.checkpointDue === true ||
          statusData.checkpointDue === true ||
          mapData.recommendation?.checkpointDue === true ||
          statusData.recommendation?.checkpointDue === true,
      });
    } catch (err) {
      setError(err.response?.data?.message || t("leo_could_not_load_training"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const identificationCompleted = Boolean(status?.identificationCompleted);
  const improvementUnlocked = Boolean(status?.improvementUnlocked || devUnlock);
  const locked = !devUnlock && (!identificationCompleted || !improvementUnlocked);
  const basePresentation = useMemo(
    () => buildSafariPresentation({ activities, recommendation }),
    [activities, recommendation]
  );
  const completedActivityIds = useMemo(() => {
    const ids = new Set(Array.isArray(mapSummary.completedActivityIds) ? mapSummary.completedActivityIds : []);
    basePresentation.replayActivities.forEach((activity) => activity.activityId && ids.add(activity.activityId));
    return ids;
  }, [basePresentation.replayActivities, mapSummary.completedActivityIds]);
  const uniqueCompletedCount = Math.min(activities.length || 5, completedActivityIds.size);
  const authoritativeCheckpointDue = mapSummary.checkpointDue === true;
  const presentation = useMemo(
    () => buildSafariPresentation({ activities, recommendation }),
    [activities, recommendation]
  );
  const primaryAction = locked ? null : presentation.primaryAction;

  const showLockedState = useCallback(
    (reason) => {
      setActiveActivity(null);
      setOpeningActivityId("");
      setLockNotice(reason || t("safari_locked_reason_fallback"));
      navigate("/speech-processing/leo-training", { replace: true });
    },
    [navigate, t]
  );

  const openActivity = useCallback(
    async (activity) => {
      if (!activity?.activityId || openingActivityId === activity.activityId) return;
      if (locked || (!activity.isPrimary && !activity.replayAction)) {
        showLockedState(activity.lockReason);
        return;
      }
      setOpeningActivityId(activity.activityId);
      setError("");
      setLockNotice("");
      try {
        const response = await getImprovementActivity(activity.activityId);
        setActiveActivity({ ...activity, ...(response.data?.data?.activity || {}) });
      } catch (err) {
        const data = err.response?.data || {};
        if (err.response?.status === 403 && data.code === "activity_locked") {
          showLockedState(data.lockReason || activity.lockReason);
        } else {
          setError(data.message || t("could_not_open_activity"));
          navigate("/speech-processing/leo-training", { replace: true });
        }
      } finally {
        setOpeningActivityId("");
      }
    },
    [locked, navigate, openingActivityId, showLockedState, t]
  );

  useEffect(() => {
    if (!activityId) {
      if (!reward) setActiveActivity(null);
      return;
    }
    if (loading || !activities.length || reward) return;
    if (activeActivity?.activityId === activityId || openingActivityId === activityId) return;
    const activity = presentation.zones.find((zone) => zone.activityId === activityId);
    if (!activity) {
      showLockedState(t("safari_activity_not_found"));
    } else if (locked || (!activity.isPrimary && !activity.replayAction)) {
      showLockedState(activity.lockReason);
    } else {
      openActivity(activity);
    }
  }, [activeActivity?.activityId, activities.length, activityId, loading, locked, openActivity, openingActivityId, presentation.zones, reward, showLockedState, t]);

  const requestActivity = (activity) => {
    if (activity?.activityId) navigate(`/speech-processing/leo-training/${activity.activityId}`);
  };
  const handleActivityComplete = (result) => {
    navigate("/speech-processing/leo-training", { replace: true });
    setReward(result);
    setActiveActivity(null);
    load();
  };

  if (loading) {
    return <main className="child-game-shell flex min-h-screen items-center justify-center bg-emerald-50"><div className="rounded-lg bg-white p-8 text-xl font-black shadow-xl">{t("leo_loading_training_map")}</div></main>;
  }
  if (activeActivity) {
    return (
      <main className="child-game-shell min-h-screen bg-emerald-950 p-2 sm:p-4">
        <LeoActivityPlay
          activity={activeActivity}
          onCancel={() => { navigate("/speech-processing/leo-training", { replace: true }); setActiveActivity(null); }}
          onComplete={handleActivityComplete}
          onLocked={showLockedState}
        />
      </main>
    );
  }

  return (
    <main
      className="child-game-shell min-h-screen bg-emerald-50 bg-cover bg-center p-3 text-slate-950 sm:p-5"
      style={{ backgroundImage: `linear-gradient(rgba(236,253,245,0.9), rgba(255,247,237,0.9)), url(${trainingBg})` }}
    >
      <div className="mx-auto max-w-7xl overflow-hidden rounded-lg border border-emerald-900/10 bg-white shadow-2xl shadow-emerald-950/15">
        <LeoSafariHud
          stars={Number(mapSummary.stars) || 0}
          completedCount={uniqueCompletedCount}
          checkpointDue={authoritativeCheckpointDue}
          onBack={() => navigate("/speech-processing")}
        />
        {error ? <p role="alert" className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">{error}</p> : null}
        {lockNotice ? (
          <section className="border-b border-amber-200 bg-amber-50 px-5 py-4" aria-labelledby="safari-lock-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3"><LockKeyhole aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h2 id="safari-lock-title" className="font-black text-amber-950">{t("safari_locked_title")}</h2><p className="mt-1 text-sm font-bold text-amber-800">{lockNotice}</p></div></div>
              <button type="button" onClick={() => setLockNotice("")} className="min-h-11 rounded-md bg-amber-900 px-4 py-2 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">{t("return_to_safari_map")}</button>
            </div>
          </section>
        ) : null}
        {!devUnlock && !identificationCompleted ? <div className="p-4"><LeoGuide title={t("finish_first_sound_check")} message={t("finish_first_sound_check_desc")} /></div> : null}
        {!devUnlock && identificationCompleted && !improvementUnlocked ? <div className="p-4"><LeoGuide title={t("leo_waiting")} message={t("full_check_unlock_desc")} /></div> : null}
        {devUnlock ? <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-black text-amber-800">{t("development_preview_enabled")}</p> : null}

        <section className="relative min-h-[31rem] overflow-hidden bg-emerald-900 sm:min-h-[36rem]" aria-labelledby="safari-map-title">
          <h2 id="safari-map-title" className="sr-only">{t("training_map_heading")}</h2>
          <div className="absolute inset-0">
            <Suspense fallback={<div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${trainingBg})` }} aria-hidden="true" />}>
              <LeoSafari3DMap zones={presentation.zones} focusedActivityId={primaryAction?.activityId || null} active={!reward} />
            </Suspense>
          </div>
          <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-emerald-950/90 to-transparent px-5 pb-20 pt-6 text-white sm:px-8">
            <p className="text-xs font-black uppercase text-emerald-200">{t("safari_current_mission")}</p>
            <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-emerald-50">{t(presentation.trailMessage)}</p>
          </div>
          <div className="absolute inset-x-3 bottom-3 z-20 sm:inset-x-6 sm:bottom-6">
            {primaryAction ? (
              <section className="grid items-center gap-4 rounded-lg border border-white/30 bg-white/95 p-4 shadow-2xl backdrop-blur sm:grid-cols-[1fr_auto] sm:p-5">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-emerald-700"><MapPin aria-hidden="true" className="h-4 w-4" />{t("safari_leos_pick_label")}</p>
                  <h2 className="mt-1 truncate text-2xl font-black text-slate-950 sm:text-3xl">{primaryAction.shortTitle || primaryAction.title}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-600">{primaryAction.childDescription || primaryAction.description || t("safari_primary_default_desc")}</p>
                </div>
                <button type="button" onClick={() => requestActivity(primaryAction)} disabled={Boolean(openingActivityId)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-6 py-3 text-base font-black text-white shadow-lg outline-none transition hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"><Play aria-hidden="true" className="h-5 w-5 fill-current" />{openingActivityId ? t("safari_opening_game") : t(primaryAction.labelKey)}</button>
              </section>
            ) : <p className="rounded-lg bg-white/95 px-5 py-4 text-center text-sm font-black text-emerald-950 shadow-xl">{t(presentation.trailMessage)}</p>}
          </div>
        </section>

        <LeoSafariActivityTray activities={presentation.replayActivities} openingActivityId={openingActivityId} onReplay={requestActivity} />
      </div>
      {/* TODO: Remove dev unlock after four-component aggregation is complete. */}
      {reward ? <LeoRewardModal result={reward} onClose={() => setReward(null)} /> : null}
    </main>
  );
}

export default LeoTrainingSafari;
