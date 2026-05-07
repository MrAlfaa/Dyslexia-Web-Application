import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function ComponentReportSelect() {
  const { componentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const componentNames = {
    pa: t("phonological_awareness"),
    wm: t("working_memory"),
    rp: t("reading_processing"),
    sp: t("speech_processing"),
  };

  const componentName = componentNames[componentId] || "Component";

  const handleSelect = (type) => {
    if (type === "identification" && componentId === "pa") {
      navigate(`/reports/pa/identification`);
    } else if (type === "identification" && componentId === "wm") {
      navigate(`/reports/wm/identification`);
    } else {
      // Placeholder for other reports
      alert(`${type} reports for ${componentName} are coming soon!`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-400 via-sky-300 to-emerald-100 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Dashboard Button */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
        <button 
          onClick={() => navigate("/dashboard")}
          className="absolute top-8 right-8 z-50 bg-white hover:bg-indigo-50 text-indigo-600 font-black px-8 py-3 rounded-full shadow-lg border-2 border-white/80 transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none uppercase tracking-widest text-sm"
        >
          {t("dashboard")} 🏠
        </button>
      </div>


      {/* Decorative Clouds/Bubbles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-white/30 rounded-full blur-[80px] animate-pulse delay-500"></div>

      <div className="absolute top-20 left-10 text-6xl opacity-20">☁️</div>
      <div className="absolute top-40 right-20 text-7xl opacity-20">☁️</div>
      <div className="absolute bottom-20 left-1/4 text-5xl opacity-20 rotate-12">🚁</div>

      <div className="max-w-5xl w-full relative z-10">
        <div className="flex items-center gap-6 mb-16 bg-white/30 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/40 shadow-2xl">
          <button
            onClick={() => navigate("/reports")}
            className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center text-indigo-500 hover:scale-110 transition-all border-b-4 border-slate-200 active:translate-y-1 active:border-b-0 active:shadow-none group"
          >
            <svg className="w-8 h-8 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight drop-shadow-sm">{componentName}</h1>
            <p className="text-indigo-900/60 font-black uppercase tracking-widest text-xs mt-1">{t("pick_adventure")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Identification Card */}
          <button
            onClick={() => handleSelect("identification")}
            className="group relative bg-white/90 backdrop-blur-sm p-12 rounded-[4rem] border-b-[16px] border-sky-500 hover:border-sky-600 transition-all duration-300 transform hover:-translate-y-4 active:translate-y-2 active:border-b-4 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-300 via-white to-sky-300 opacity-50"></div>
            <div className="w-40 h-40 bg-sky-100 rounded-full flex items-center justify-center text-8xl mb-10 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-transform mx-auto">
              🔍
            </div>
            <h4 className="text-4xl font-black text-sky-600 mb-4 uppercase tracking-wide">
              {t("identification")}
            </h4>
            <p className="text-slate-500 font-bold text-center text-xl leading-relaxed">
              {t("check_progress")}
            </p>
            <div className="mt-8 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-sky-500 text-white px-8 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-lg">{t("open_book")}</span>
            </div>
          </button>

          {/* Improvement Card */}
          <button
            onClick={() => handleSelect("improvement")}
            className="group relative bg-white/90 backdrop-blur-sm p-12 rounded-[4rem] border-b-[16px] border-pink-400 hover:border-pink-500 transition-all duration-300 transform hover:-translate-y-4 active:translate-y-2 active:border-b-4 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-300 via-white to-pink-300 opacity-50"></div>
            <div className="w-40 h-40 bg-pink-50 rounded-full flex items-center justify-center text-8xl mb-10 shadow-inner group-hover:scale-110 group-hover:-rotate-6 transition-transform mx-auto">
              📈
            </div>
            <h4 className="text-4xl font-black text-pink-500 mb-4 uppercase tracking-wide">
              {t("improvement")}
            </h4>
            <p className="text-slate-500 font-bold text-center text-xl leading-relaxed">
              {t("improvement_desc")}
            </p>
            <div className="absolute -top-4 -right-4 bg-orange-500 text-white text-sm font-black px-6 py-3 rounded-full uppercase tracking-tighter shadow-xl rotate-12 group-hover:rotate-0 transition-transform">
              {t("coming_soon")} 🚀
            </div>
            <div className="mt-8 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-pink-500 text-white px-8 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-lg">{t("play_time")}</span>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-20 text-white/60 font-black uppercase tracking-[0.5em] text-xs">
        {t("dream_big")}
      </div>
    </div>
  );
}

export default ComponentReportSelect;
