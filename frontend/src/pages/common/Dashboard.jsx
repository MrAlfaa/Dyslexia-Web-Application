import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentProfile } from "../../services/student/api";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import leo from "../../assets/lexiland/leo-lion.png";

const identificationCards = [
  { id: "wm", title: "Working Memory Check", animal: "Bunny", icon: "B", color: "from-sky-500 to-cyan-500" },
  { id: "pa", title: "Phonological Awareness Check", animal: "Parrot", icon: "P", color: "from-pink-500 to-rose-500" },
  { id: "rp", title: "Reading Processing Check", animal: "Owl", icon: "O", color: "from-violet-500 to-indigo-500" },
  { id: "sp", title: "Leo's Speech Check", animal: "Leo the Lion", icon: "L", color: "from-amber-500 to-orange-500" },
];

const leoActivityTitles = {
  leo_first_sound_hunt: "First Sound Hunt",
  leo_echo_roar: "Echo Roar",
  leo_robot_words: "Robot Word Safari",
  leo_sound_twins: "Sound Twins",
  leo_story_roar: "Story Roar Trail",
};

function Dashboard() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getStudentProfile();
        setProfile(res.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    fetchProfile();
  }, []);

  const progress = profile?.lexilandProgress || {};
  const speech = progress.speech || {};
  const speechTrainingUnlocked =
    Boolean(progress.improvementUnlocked || speech.improvementUnlocked) ||
    import.meta.env.VITE_LEXILAND_DEV_UNLOCK === "true";
  const improvementUnlocked = Boolean(progress.improvementUnlocked);

  const speechCompleted = speech.identificationStatus === "completed";
  const speechInProgress = speech.identificationStatus === "in_progress";

  const handleIdentification = (id) => {
    if (id === "wm") navigate(`/working-memory/${profile?.grade || "3"}`);
    else if (id === "pa") navigate(`/identificationActivities-pa/${profile?.grade || "3"}`);
    else if (id === "sp") navigate("/speech-processing");
    else navigate("/reading-processing");
  };

  const speechButtonText = useMemo(() => {
    if (speechInProgress) return "Continue Leo's Speech Check";
    if (!speechCompleted) return "Start Leo's Speech Check";
    return speechTrainingUnlocked ? "Play Next Leo Game" : "View Leo's Progress";
  }, [speechCompleted, speechInProgress, speechTrainingUnlocked]);

  return (
    <main className="child-game-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#f8f4c7,transparent_30%),linear-gradient(135deg,#ecfdf5,#f0fdfa_48%,#fff7ed)] p-5 text-slate-950 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">LexiLand Jungle Adventure</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Hello, {profile?.fullName || "adventurer"}!
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Learn with sounds, stories, and stars | logged in as {role}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => navigate("/profile")}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100"
            >
              Profile
            </button>
          </div>
        </header>

        <section className="mt-8 grid items-center gap-6 rounded-[2.5rem] bg-white/75 p-6 shadow-2xl shadow-emerald-100/70 ring-1 ring-white/80 backdrop-blur lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="text-3xl font-black text-slate-950">Choose your jungle path</h2>
            <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-slate-600">
              Start with your Identification Adventure. Training games unlock after your first adventure check is complete.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                Identification: {progress.overallIdentificationStatus || "not_started"}
              </span>
              <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 ring-1 ring-amber-100">
                Stars ready to collect
              </span>
            </div>
          </div>
          <img src={leo} alt="Leo the Lion" className="mx-auto max-h-72 object-contain" />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">Active</p>
              <h2 className="text-3xl font-black text-slate-950">Identification Adventure</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {identificationCards.map((card) => {
              const isSpeech = card.id === "sp";
              return (
                <article key={card.id} className="rounded-[2rem] bg-white p-5 shadow-xl shadow-slate-200/45 ring-1 ring-white">
                  <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${card.color} text-2xl font-black text-white`}>
                    {card.icon}
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{card.animal}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">{card.title}</h3>
                  {isSpeech && speechCompleted && (
                    <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      Completed
                    </span>
                  )}
                  {isSpeech && speechInProgress && (
                    <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                      In Progress
                    </span>
                  )}
                  {isSpeech && !speechCompleted && !speechInProgress && (
                    <span className="mt-3 inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                      Not Started
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleIdentification(card.id)}
                    className="mt-5 w-full rounded-3xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                  >
                    {isSpeech ? speechButtonText : "Start Check"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">Locked Path</p>
            <h2 className="text-3xl font-black text-slate-950">Improvement Adventure</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {["Bunny Memory Trail", "Parrot Sound Garden", "Owl Reading Trail", "Leo's Training Safari"].map((title) => {
              const isLeoTraining = title.includes("Leo");
              const isUnlocked = isLeoTraining ? speechTrainingUnlocked : improvementUnlocked;
              return (
              <article key={title} className={`rounded-[2rem] p-5 shadow-xl ring-1 ${isUnlocked ? "bg-white shadow-emerald-100 ring-emerald-100" : "bg-slate-100/80 shadow-slate-200 ring-slate-200 opacity-75"}`}>
                <h3 className="text-xl font-black text-slate-950">
                  {isLeoTraining && isUnlocked ? "Leo's Training Safari" : title}
                </h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {isUnlocked
                    ? isLeoTraining
                      ? `${leoActivityTitles[speech.currentActivityId] || "Next Leo game"} is ready. ${speech.stars || 0} stars collected.`
                      : "Training game unlocked."
                    : isLeoTraining
                      ? "Complete your LexiLand checks to unlock Leo's Training Safari."
                      : "Complete your first adventure check to unlock training games."}
                </p>
                <button
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => isLeoTraining && navigate("/speech-processing/leo-training")}
                  className="mt-5 w-full rounded-3xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {isUnlocked ? (isLeoTraining ? "Play Next Leo Game" : "Start Training") : isLeoTraining ? "Leo's Training Safari Locked" : "Locked"}
                </button>
              </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 mb-10 rounded-[2rem] bg-emerald-900 p-6 text-white shadow-2xl shadow-emerald-200/60">
          <h2 className="text-2xl font-black">Progress</h2>
          <p className="mt-2 text-sm font-bold text-emerald-100">
            Your guardian can see your learning support progress and recommendations.
          </p>
          <button onClick={() => navigate("/reports")} className="mt-5 rounded-3xl bg-white px-6 py-3 text-sm font-black text-emerald-900">
            View My Progress
          </button>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
