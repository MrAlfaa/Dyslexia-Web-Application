import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getImprovementMap,
  getImprovementRecommendation,
  getImprovementStatus,
} from "../../services/speechProcessing/api";
import leo from "../../assets/lexiland/leo-lion.png";
import trainingBg from "../../assets/lexiland/leo-training-map-bg.png";
import LeoGuide from "./components/LeoGuide";
import LeoTrainingMap from "./components/LeoTrainingMap";
import LeoActivityPlay from "./components/LeoActivityPlay";
import LeoRewardModal from "./components/LeoRewardModal";

function LeoTrainingSafari() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const [status, setStatus] = useState(null);
  const [activities, setActivities] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [activeActivity, setActiveActivity] = useState(null);
  const [reward, setReward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const devUnlock = import.meta.env.VITE_LEXILAND_DEV_UNLOCK === "true";

  const load = async () => {
    setError("");
    try {
      const [statusRes, activitiesRes] = await Promise.all([
        getImprovementStatus(),
        getImprovementMap().catch(() => getImprovementRecommendation()),
      ]);
      setStatus(statusRes.data?.data || null);
      const mapData = activitiesRes.data?.data || {};
      setActivities(mapData.activities || (Array.isArray(mapData) ? mapData : []));
      setRecommendation(mapData.recommendation || statusRes.data?.data?.recommendation || null);
    } catch (err) {
      setError(err.response?.data?.message || "Leo could not load Training Safari.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const identificationCompleted = Boolean(status?.identificationCompleted);
  const improvementUnlocked = Boolean(status?.improvementUnlocked || devUnlock);
  const locked = !identificationCompleted || !improvementUnlocked;

  useEffect(() => {
    if (!activityId || !activities.length) return;
    const matched = activities.find((activity) => activity.activityId === activityId);
    if (matched && !locked) setActiveActivity(matched);
  }, [activityId, activities, locked]);

  const recommendedActivity = useMemo(() => {
    const current = activities.find(
      (activity) => activity.activityId === (recommendation?.nextActivityId || recommendation?.nextActivity?.activityId || status?.currentActivityId)
    );
    if (current) return current;
    return activities.find((activity) => activity.state === "current" || activity.state === "available" || activity.state === "recommended") || activities[0];
  }, [activities, recommendation, status?.currentActivityId]);

  const handleActivityComplete = (result) => {
    setReward(result);
    setActiveActivity(null);
    load();
  };

  if (loading) {
    return (
      <main className="child-game-shell flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="rounded-[2rem] bg-white p-8 text-xl font-black shadow-xl">
          Leo is drawing the training map...
        </div>
      </main>
    );
  }

  return (
    <main
      className="child-game-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#fef3c7,transparent_30%),linear-gradient(135deg,#dcfce7,#ecfdf5_46%,#fff7ed)] bg-cover bg-center p-5 text-slate-950 sm:p-8"
      style={{ backgroundImage: `linear-gradient(135deg, rgba(220,252,231,0.88), rgba(236,253,245,0.9), rgba(255,247,237,0.9)), url(${trainingBg})` }}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/speech-processing")}
            className="rounded-full bg-white px-5 py-3 text-sm font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100"
          >
            Back to Sound Safari
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-black text-white shadow-sm"
          >
            LexiLand Map
          </button>
        </header>

        <section className="grid items-center gap-6 rounded-[2.5rem] bg-white/78 p-6 shadow-2xl shadow-emerald-100/70 ring-1 ring-white/80 lg:grid-cols-[1fr_280px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">
              Leo the Lion
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">
              Leo's Training Safari
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-bold leading-8 text-slate-600">
              {recommendation?.childMessage || "Practice sounds, words, and stories with Leo."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 ring-1 ring-amber-100">
                {status?.stars || 0} stars
              </span>
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
                {(status?.completedActivityIds || []).length} completed
              </span>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-100">
                Focus: {status?.weakSkillFocus || recommendation?.skillFocus || "sound practice"}
              </span>
            </div>
          </div>
          <img src={leo} alt="Leo the Lion" className="mx-auto max-h-64 object-contain" />
        </section>

        {error && (
          <p className="rounded-3xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
            {error}
          </p>
        )}

        {!identificationCompleted && (
          <LeoGuide
            title="Finish Leo's First Sound Check first."
            message="Leo will open Training Safari after your first sound path is complete."
          />
        )}

        {identificationCompleted && !improvementUnlocked && (
          <LeoGuide
            title="Leo is waiting."
            message="Leo is waiting for your full LexiLand check before opening Training Safari."
          />
        )}

        {devUnlock && !status?.improvementUnlocked && (
          <p className="rounded-3xl bg-amber-50 px-5 py-4 text-sm font-black text-amber-800 ring-1 ring-amber-100">
            Development preview is enabled for this browser build.
          </p>
        )}

        {!activeActivity ? (
          <>
            <LeoTrainingMap
              activities={activities}
              recommendation={recommendation}
              locked={locked}
              onSelect={(activity) => {
                if (!locked) {
                  navigate(`/speech-processing/leo-training/${activity.activityId}`, { replace: false });
                  setActiveActivity(activity);
                }
              }}
            />
            {!locked && recommendedActivity && (
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/speech-processing/leo-training/${recommendedActivity.activityId}`, { replace: false });
                    setActiveActivity(recommendedActivity);
                  }}
                  className="rounded-[2rem] bg-emerald-700 px-6 py-5 text-lg font-black text-white shadow-xl shadow-emerald-100 transition hover:bg-emerald-800"
                >
                  Start Recommended Adventure
                </button>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="rounded-[2rem] bg-white px-6 py-5 text-lg font-black text-emerald-800 ring-1 ring-emerald-100"
                >
                  View All Leo Games
                </button>
              </div>
            )}
          </>
        ) : (
          <LeoActivityPlay
            activity={activeActivity}
            onCancel={() => setActiveActivity(null)}
            onComplete={handleActivityComplete}
          />
        )}

        {/* TODO: Remove dev unlock after four-component aggregation is complete. */}
      </div>
      {reward && <LeoRewardModal result={reward} onClose={() => setReward(null)} />}
    </main>
  );
}

export default LeoTrainingSafari;
