import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMySpeechAssignments } from "../../services/speechProcessing/api";
import SpeechDemoGame from "./SpeechDemoGame";
import speechImage from "../../assets/speech-demo-illustration.png";

const games = [
  ["Echo Parrot", "Listen and repeat", "bg-sky-50 text-sky-700"],
  ["Treasure Word Read", "Read the word aloud", "bg-yellow-50 text-yellow-700"],
  ["Robot Nonword Challenge", "Read funny robot words", "bg-violet-50 text-violet-700"],
  ["Minimal Pair Castle", "Practice similar sounds", "bg-rose-50 text-rose-700"],
  ["Story Star Reading", "Read a short sentence", "bg-emerald-50 text-emerald-700"],
];

function SpeechHome() {
  const navigate = useNavigate();
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [demoStarted, setDemoStarted] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const response = await getMySpeechAssignments();
        setAssignments(response.data?.data || []);
      } catch {
        setAssignments([]);
      } finally {
        setLoadingAssignments(false);
      }
    };

    loadAssignments();
  }, []);

  if (activeAssignment || demoStarted) {
    return (
      <SpeechDemoGame
        assignment={activeAssignment}
        onExit={() => {
          setActiveAssignment(null);
          setDemoStarted(false);
        }}
      />
    );
  }

  return (
    <main className="child-game-shell min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 p-5 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Back to Dashboard
        </button>

        <section className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
              Sound Adventure
            </h1>
            <p className="mt-4 text-2xl font-black text-teal-600">
              Listen, read, speak and collect stars
            </p>
            <p className="mt-6 max-w-2xl text-lg font-bold leading-8 text-slate-600">
              You will say English sounds and words. Your guardian can see your progress.
            </p>
            <button
              onClick={() => setDemoStarted(true)}
              className="mt-8 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-500 px-8 py-4 text-lg font-black text-white shadow-xl shadow-sky-100 transition hover:-translate-y-1"
            >
              Start Demo
            </button>
          </div>

          <div className="rounded-[2.5rem] bg-white p-5 shadow-2xl shadow-sky-100 ring-1 ring-slate-100">
            <img
              src={speechImage}
              alt="Sound Adventure game world"
              className="aspect-[4/3] w-full rounded-[2rem] object-cover"
            />
          </div>
        </section>

        {!loadingAssignments && assignments.length > 0 && (
          <section className="mt-10 rounded-[2rem] bg-white p-6 shadow-xl shadow-teal-100 ring-1 ring-teal-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-600">
                  Today's Guardian Activity
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">
                  {assignments[0].title || "Teacher Activity"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-bold text-slate-500">
                  {assignments[0].description ||
                    "Your guardian selected a short sound and reading activity."}
                </p>
              </div>
              <button
                onClick={() => setActiveAssignment(assignments[0])}
                className="rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black text-white transition hover:bg-teal-700"
              >
                Start Guardian Activity
              </button>
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {games.map(([name, description, color]) => (
            <article
              key={name}
              className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-100 ring-1 ring-slate-100 transition hover:-translate-y-1"
            >
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}
              >
                <span className="h-3 w-3 rounded-full bg-current" />
              </div>
              <h2 className="text-xl font-black text-slate-900">{name}</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export default SpeechHome;
