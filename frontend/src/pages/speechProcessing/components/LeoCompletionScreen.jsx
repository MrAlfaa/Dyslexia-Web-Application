import { useNavigate } from "react-router-dom";
import leo from "../../../assets/lexiland/leo-lion.png";

function LeoCompletionScreen({ completion }) {
  const navigate = useNavigate();
  const stars = completion?.starsEarnedTotal || completion?.starsEarned || 0;

  return (
    <main className="child-game-shell min-h-screen bg-[radial-gradient(circle_at_top_left,#fef3c7,transparent_28%),linear-gradient(135deg,#ecfdf5,#f0fdfa,#fff7ed)] p-5 text-slate-950 sm:p-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col items-center justify-center text-center">
        <div className="rounded-[3rem] bg-white/90 p-8 shadow-2xl shadow-emerald-100/70 ring-1 ring-white">
          <img src={leo} alt="Leo the Lion" className="mx-auto h-52 object-contain" />
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
            Leo found your sound path!
          </h1>
          <p className="mt-4 text-xl font-bold text-slate-600">
            Your guardian can see your learning plan.
          </p>
          <p className="mt-6 rounded-full bg-amber-100 px-6 py-3 text-2xl font-black text-amber-800">
            You collected {stars} stars ⭐
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-8 rounded-3xl bg-emerald-700 px-8 py-4 text-sm font-black text-white shadow-xl shadow-emerald-100 transition hover:-translate-y-1 hover:bg-emerald-800"
          >
            Back to LexiLand Map
          </button>
        </div>
      </section>
    </main>
  );
}

export default LeoCompletionScreen;
