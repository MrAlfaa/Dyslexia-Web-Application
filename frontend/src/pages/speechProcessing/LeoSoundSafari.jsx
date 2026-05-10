import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getImprovementStatus,
  getSpeechIdentificationStatus,
  getSpeechSystemActivities,
} from "../../services/speechProcessing/api";
import LeoGuide from "./components/LeoGuide";
import leo from "../../assets/lexiland/leo-lion.png";

function LeoSoundSafari() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [statusRes, activitiesRes, trainingRes] = await Promise.all([
          getSpeechIdentificationStatus(),
          getSpeechSystemActivities(),
          getImprovementStatus().catch(() => ({ data: { data: null } })),
        ]);
        setStatus(statusRes.data?.data || null);
        setActivities(activitiesRes.data?.data || []);
        setTrainingStatus(trainingRes.data?.data || null);
      } catch (err) {
        setError(err.response?.data?.message || "Leo could not load the safari path.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const recommendedActivities = useMemo(() => {
    const ids = status?.recommendedActivityIds || [];
    return ids
      .map((id) => activities.find((activity) => activity.activityId === id))
      .filter(Boolean);
  }, [activities, status]);

  const identificationStatus = status?.identificationStatus || "not_started";
  const devUnlock = import.meta.env.VITE_LEXILAND_DEV_UNLOCK === "true";
  const improvementUnlocked = Boolean(status?.improvementUnlocked || trainingStatus?.improvementUnlocked || devUnlock);
  const identificationComplete = identificationStatus === "completed";

  if (loading) {
    return (
      <main className="child-game-shell flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="rounded-[2rem] bg-white p-8 text-xl font-black shadow-xl">
          Leo is opening the jungle path...
        </div>
      </main>
    );
  }

  return (
    <main className="child-game-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#fef3c7,transparent_28%),linear-gradient(135deg,#ecfdf5,#f0fdfa,#fff7ed)] p-5 text-slate-950 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-6 rounded-full bg-white px-5 py-3 text-sm font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100"
        >
          Back to LexiLand Map
        </button>

        <section className="grid items-center gap-6 rounded-[2.5rem] bg-white/80 p-6 shadow-2xl shadow-emerald-100/70 ring-1 ring-white/80 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
              Leo the Lion
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">
              Leo's Sound Safari
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-bold leading-8 text-slate-600">
              Say sounds, collect stars, and follow Leo through the jungle.
            </p>
          </div>
          <img src={leo} alt="Leo the Lion" className="mx-auto max-h-72 object-contain" />
        </section>

        {error && (
          <div className="mt-6 rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1fr]">
          <LeoGuide
            title="Hi explorer! I'm Leo."
            message={
              identificationComplete
                ? "I found your sound path. Your guardian can see your learning plan."
                : "Let's find your sound path with a short sound check."
            }
          />

          <div className="rounded-[2rem] bg-white/90 p-6 shadow-xl shadow-emerald-100/60 ring-1 ring-white">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              Identification Adventure
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Leo's First Sound Check
            </h2>

            {!identificationComplete && (
              <>
                <p className="mt-3 text-base font-bold leading-7 text-slate-600">
                  Read each word or sentence, send your sound to Leo, and collect sound gems.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/speech-processing/leo-identification")}
                  className="mt-6 rounded-3xl bg-emerald-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-100 transition hover:-translate-y-1 hover:bg-emerald-800"
                >
                  {identificationStatus === "in_progress"
                    ? "Continue Sound Check"
                    : "Start Leo's First Sound Check"}
                </button>
              </>
            )}

            {identificationComplete && !improvementUnlocked && (
              <div className="mt-5 rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-100">
                <h3 className="text-xl font-black text-amber-900">
                  Leo is waiting
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
                  Leo found your sound path. Your training safari will unlock after your full LexiLand check.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/speech-processing/leo-training")}
                  className="mt-5 rounded-3xl bg-white px-5 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-100"
                >
                  Preview Training Safari
                </button>
              </div>
            )}

            {identificationComplete && improvementUnlocked && (
              <div className="mt-5 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
                <h3 className="text-xl font-black text-emerald-900">
                  Leo's Training Safari
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-emerald-800">
                  Leo's jungle practice games are ready.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/speech-processing/leo-training")}
                  className="mt-5 rounded-3xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100"
                >
                  Start Leo's Training Safari
                </button>
              </div>
            )}
          </div>
        </section>

        {recommendedActivities.length > 0 && (
          <section className="mt-6 rounded-[2rem] bg-white/85 p-6 shadow-xl shadow-amber-100/50 ring-1 ring-white">
            <h2 className="text-2xl font-black text-slate-950">Leo's next jungle stops</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {recommendedActivities.map((activity) => (
                <span
                  key={activity.activityId}
                  className="rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 ring-1 ring-amber-100"
                >
                  {activity.title}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* TODO: Use Phaser.js later for richer 2D game mechanics if needed. */}
      </div>
    </main>
  );
}

export default LeoSoundSafari;
