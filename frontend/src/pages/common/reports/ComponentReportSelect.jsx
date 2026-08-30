import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function ComponentReportSelect() {
  const { componentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const componentNames = {
    pa: t("phonological_awareness"),
    wm: t("working_memory"),
    rp: t("reading_processing"),
    sp: t("speech_processing"),
  };

  const componentName = componentNames[componentId] || "Component";

  useEffect(() => {
    if (componentId === "sp") {
      navigate("/speech-processing", { replace: true });
    }
  }, [componentId, navigate]);

  const handleSelect = (type) => {
    if (type === "identification" && componentId === "pa") {
      navigate("/reports/pa/identification");
    } else if (type === "identification" && componentId === "wm") {
      navigate("/reports/wm/identification");
    } else {
      alert(`${type} reports for ${componentName} are coming soon.`);
    }
  };

  if (componentId === "sp") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50 p-8 text-center">
        <div className="rounded-[2rem] bg-white p-8 text-lg font-black text-emerald-900 shadow-xl">
          Opening Leo's Sound Safari...
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-400 via-sky-300 to-emerald-100 p-8">
      <button
        onClick={() => navigate("/dashboard")}
        className="absolute right-8 top-8 z-50 rounded-full border-2 border-white/80 bg-white px-8 py-3 text-sm font-black uppercase tracking-widest text-indigo-600 shadow-lg transition-all hover:-translate-y-1 hover:bg-indigo-50 active:translate-y-0 active:shadow-none"
      >
        {t("dashboard")}
      </button>

      <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-white/20 blur-[100px]"></div>
      <div className="absolute bottom-[10%] right-[-5%] h-[30%] w-[30%] rounded-full bg-white/30 blur-[80px]"></div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="mb-16 flex items-center gap-6 rounded-[2.5rem] border border-white/40 bg-white/30 p-6 shadow-2xl backdrop-blur-md">
          <button
            onClick={() => navigate("/reports")}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-b-4 border-slate-200 bg-white text-indigo-500 shadow-lg transition-all hover:scale-110 active:translate-y-1 active:border-b-0 active:shadow-none"
            aria-label="Back to reports"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-800 drop-shadow-sm">{componentName}</h1>
            <p className="mt-1 text-xs font-black uppercase tracking-widest text-indigo-900/60">{t("pick_adventure")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <button
            onClick={() => handleSelect("identification")}
            className="group relative overflow-hidden rounded-[4rem] border-b-[16px] border-sky-500 bg-white/90 p-12 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-4 hover:border-sky-600 active:translate-y-2 active:border-b-4"
          >
            <div className="mx-auto mb-10 flex h-40 w-40 items-center justify-center rounded-full bg-sky-100 text-5xl font-black text-sky-600 shadow-inner transition-transform group-hover:rotate-6 group-hover:scale-110">
              ID
            </div>
            <h4 className="mb-4 text-4xl font-black uppercase tracking-wide text-sky-600">
              {t("identification")}
            </h4>
            <p className="text-center text-xl font-bold leading-relaxed text-slate-500">
              {t("check_progress")}
            </p>
            <span className="mt-8 inline-flex rounded-full bg-sky-500 px-8 py-2 text-sm font-black uppercase tracking-widest text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {t("open_book")}
            </span>
          </button>

          <button
            onClick={() => handleSelect("improvement")}
            className="group relative overflow-hidden rounded-[4rem] border-b-[16px] border-pink-400 bg-white/90 p-12 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-4 hover:border-pink-500 active:translate-y-2 active:border-b-4"
          >
            <div className="mx-auto mb-10 flex h-40 w-40 items-center justify-center rounded-full bg-pink-50 text-5xl font-black text-pink-500 shadow-inner transition-transform group-hover:-rotate-6 group-hover:scale-110">
              UP
            </div>
            <h4 className="mb-4 text-4xl font-black uppercase tracking-wide text-pink-500">
              {t("improvement")}
            </h4>
            <p className="text-center text-xl font-bold leading-relaxed text-slate-500">
              {t("improvement_desc")}
            </p>
            <div className="absolute -right-4 -top-4 rounded-full bg-orange-500 px-6 py-3 text-sm font-black uppercase tracking-tighter text-white shadow-xl transition-transform group-hover:rotate-0">
              {t("coming_soon")}
            </div>
            <span className="mt-8 inline-flex rounded-full bg-pink-500 px-8 py-2 text-sm font-black uppercase tracking-widest text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {t("play_time")}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-20 text-xs font-black uppercase tracking-[0.5em] text-white/60">
        {t("dream_big")}
      </div>
    </div>
  );
}

export default ComponentReportSelect;
