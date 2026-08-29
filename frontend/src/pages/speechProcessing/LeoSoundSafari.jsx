import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getImprovementStatus,
  getSpeechIdentificationStatus,
  getSpeechSystemActivities,
} from "../../services/speechProcessing/api";
import LeoGuide from "./components/LeoGuide";
import leo from "../../assets/lexiland/leo-lion.webp";

function LeoSoundSafari() {
  const navigate = useNavigate();
  const { t } = useTranslation("sp");
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
        setError(err.response?.data?.message || t("leo_could_not_load_path"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

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
          {t("leo_opening_path")}
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
          {t("back_to_lexiland_map")}
        </button>

        <section className="grid items-center gap-6 rounded-[2.5rem] bg-white/80 p-6 shadow-2xl shadow-emerald-100/70 ring-1 ring-white/80 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
              {t("leo_the_lion")}
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">
              {t("leo_sound_safari_title")}
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-bold leading-8 text-slate-600">
              {t("leo_sound_safari_desc")}
            </p>
          </div>
          <img src={leo} alt={t("leo_the_lion")} className="mx-auto max-h-72 object-contain" />
        </section>

        {error && (
          <div className="mt-6 rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1fr]">
          <LeoGuide
            title={t("hi_explorer")}
            message={
              identificationComplete
                ? t("found_sound_path")
                : t("lets_find_sound_path")
            }
          />

          <div className="rounded-[2rem] bg-white/90 p-6 shadow-xl shadow-emerald-100/60 ring-1 ring-white">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              {t("identification_adventure")}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              {t("first_sound_check")}
            </h2>

            {!identificationComplete && (
              <>
                <p className="mt-3 text-base font-bold leading-7 text-slate-600">
                  {t("sound_check_desc")}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/speech-processing/leo-identification")}
                  className="mt-6 rounded-3xl bg-emerald-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-100 transition hover:-translate-y-1 hover:bg-emerald-800"
                >
                  {identificationStatus === "in_progress"
                    ? t("continue_sound_check")
                    : t("start_first_sound_check")}
                </button>
              </>
            )}

            {identificationComplete && !improvementUnlocked && (
              <div className="mt-5 rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-100">
                <h3 className="text-xl font-black text-amber-900">
                  {t("leo_waiting")}
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
                  {t("training_unlock_explanation")}
                </p>
                {devUnlock && (
                  <p className="mt-3 rounded-2xl bg-white px-4 py-2 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                    {t("development_preview_enabled")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => navigate("/speech-processing/leo-training")}
                  className="mt-5 rounded-3xl bg-white px-5 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-100"
                >
                  {t("preview_training_safari")}
                </button>
              </div>
            )}

            {identificationComplete && improvementUnlocked && (
              <div className="mt-5 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
                <h3 className="text-xl font-black text-emerald-900">
                  {t("training_safari_title")}
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-emerald-800">
                  {t("training_safari_ready")}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/speech-processing/leo-training")}
                  className="mt-5 rounded-3xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100"
                >
                  {t("start_training_safari")}
                </button>
              </div>
            )}
          </div>
        </section>

        {recommendedActivities.length > 0 && (
          <section className="mt-6 rounded-[2rem] bg-white/85 p-6 shadow-xl shadow-amber-100/50 ring-1 ring-white">
            <h2 className="text-2xl font-black text-slate-950">{t("next_jungle_stops")}</h2>
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
