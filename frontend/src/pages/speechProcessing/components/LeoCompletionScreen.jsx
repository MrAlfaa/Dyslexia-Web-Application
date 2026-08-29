import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import leo from "../../../assets/lexiland/leo-lion.webp";

function LeoCompletionScreen({ completion }) {
  const navigate = useNavigate();
  const { t } = useTranslation("sp");
  const stars = completion?.starsEarnedTotal || completion?.starsEarned || 0;

  return (
    <main className="child-game-shell min-h-screen bg-[radial-gradient(circle_at_top_left,#fef3c7,transparent_28%),linear-gradient(135deg,#ecfdf5,#f0fdfa,#fff7ed)] p-5 text-slate-950 sm:p-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col items-center justify-center text-center">
        <div className="rounded-[3rem] bg-white/90 p-8 shadow-2xl shadow-emerald-100/70 ring-1 ring-white">
          <img src={leo} alt={t("leo_the_lion")} className="mx-auto h-52 object-contain" />
          <h1 className="mt-4 text-4xl font-black sm:text-6xl">
            {t("identification_complete_title")}
          </h1>
          <p className="mt-4 text-xl font-bold text-slate-600">
            {t("identification_complete_desc")}
          </p>
          <p className="mt-6 rounded-full bg-amber-100 px-6 py-3 text-2xl font-black text-amber-800">
            {t("stars_collected", { count: stars })}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-8 rounded-3xl bg-emerald-700 px-8 py-4 text-sm font-black text-white shadow-xl shadow-emerald-100 transition hover:-translate-y-1 hover:bg-emerald-800"
          >
            {t("back_to_lexiland_map")}
          </button>
        </div>
      </section>
    </main>
  );
}

export default LeoCompletionScreen;
