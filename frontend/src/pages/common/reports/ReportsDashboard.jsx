import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function ReportsDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const components = [
    {
      id: "pa",
      title: t("phonological_awareness"),
      image: "/images/1.png",
      description: t("pa_desc"),
      color: "from-blue-400 to-indigo-500",
      icon: "PA",
    },
    {
      id: "wm",
      title: t("working_memory"),
      image: "/images/4.png",
      description: t("wm_desc"),
      color: "from-purple-400 to-pink-500",
      icon: "WM",
    },
    {
      id: "rp",
      title: t("reading_processing"),
      image: "/images/2.png",
      description: t("rp_desc"),
      color: "from-amber-300 to-orange-500",
      icon: "RP",
    },
    {
      id: "sp",
      title: t("speech_processing"),
      image: "/images/3.png",
      description: t("sp_desc"),
      color: "from-emerald-400 to-teal-600",
      icon: "SP",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-white p-8">
      <div className="absolute right-8 top-8 z-50">
        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-full border-2 border-white/80 bg-white px-8 py-3 text-sm font-black uppercase tracking-widest text-sky-600 shadow-lg transition-all hover:-translate-y-1 hover:bg-sky-50 active:translate-y-0 active:shadow-none"
        >
          {t("dashboard")}
        </button>
      </div>

      <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-white/40 blur-2xl"></div>
      <div className="absolute right-20 top-40 h-48 w-48 rounded-full bg-yellow-100/50 blur-3xl"></div>
      <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-pink-100/40 blur-3xl"></div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="w-full text-center">
          <h1 className="inline-block text-5xl font-black tracking-tight text-slate-800 drop-shadow-sm">
            {t("my_game_reports")}
          </h1>
          <p className="mt-2 text-sm font-black uppercase tracking-widest text-sky-700/60">
            {t("see_stars_earned")}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {components.map((comp) => (
            <div
              key={comp.id}
              onClick={() => navigate(comp.id === "sp" ? "/speech-processing" : `/reports/${comp.id}`)}
              className="group cursor-pointer overflow-hidden rounded-[3rem] border-2 border-white/50 bg-white shadow-[0_20px_0_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-4 hover:shadow-[0_30px_0_rgba(0,0,0,0.08)] active:translate-y-2 active:shadow-none"
            >
              <div className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${comp.color} p-8`}>
                <div className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-2 text-xs font-black text-white">
                  {comp.icon}
                </div>
                <img
                  src={comp.image}
                  alt={comp.title}
                  className="h-full w-full object-contain drop-shadow-xl transition duration-500 group-hover:scale-110"
                />
              </div>

              <div className="bg-white p-8 text-center">
                <h2 className="mb-3 text-2xl font-black leading-tight text-slate-800 transition-colors group-hover:text-sky-600">
                  {comp.title}
                </h2>
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-100 transition-all group-hover:w-20 group-hover:bg-sky-400"></div>
                <p className="text-sm font-bold leading-relaxed text-slate-400">{comp.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <div className="inline-block rounded-full border-2 border-white/80 bg-white/50 px-10 py-4 shadow-lg backdrop-blur-md">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-sky-800">{t("doing_amazing")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsDashboard;
