import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function ReportsDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const components = [
    {
      id: "pa",
      title: t("phonological_awareness"),
      image: "/images/1.png",
      description: t("pa_desc"),
      color: "from-blue-400 to-indigo-500",
      icon: "🎵",
    },
    {
      id: "wm",
      title: t("working_memory"),
      image: "/images/4.png",
      description: t("wm_desc"),
      color: "from-purple-400 to-pink-500",
      icon: "🧠",
    },
    {
      id: "rp",
      title: t("reading_processing"),
      image: "/images/2.png",
      description: t("rp_desc"),
      color: "from-amber-300 to-orange-500",
      icon: "📚",
    },
    {
      id: "sp",
      title: t("speech_processing"),
      image: "/images/3.png",
      description: t("sp_desc"),
      color: "from-emerald-400 to-teal-600",
      icon: "🗣️",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-200 to-white p-8 relative overflow-hidden">
      {/* Dashboard Button */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
        <button 
          onClick={() => navigate("/dashboard")}
          className="bg-white hover:bg-sky-50 text-sky-600 font-black px-8 py-3 rounded-full shadow-lg border-2 border-white/80 transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none uppercase tracking-widest text-sm"
        >
          {t("dashboard")} 🏠
        </button>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/40 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute top-40 right-20 w-48 h-48 bg-yellow-100/50 rounded-full blur-3xl animate-pulse delay-700"></div>
      <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-pink-100/40 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      {/* Floating Emojis */}
      <div className="absolute top-20 right-[15%] text-4xl animate-bounce opacity-40">🎈</div>
      <div className="absolute bottom-40 left-[10%] text-4xl animate-bounce delay-300 opacity-40">🌟</div>
      <div className="absolute top-[40%] right-[5%] text-4xl animate-bounce delay-700 opacity-30">☁️</div>

      <div className="max-w-7xl mx-auto relative z-10">
          <div className="w-full text-center">
            <h1 className="text-5xl font-black text-slate-800 tracking-tight drop-shadow-sm inline-block">{t("my_game_reports")}</h1>
            <p className="text-sky-700/60 font-black uppercase tracking-widest text-sm mt-1">{t("see_stars_earned")}</p>
          </div>
        <br />
        <br />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {components.map((comp) => (
            <div
              key={comp.id}
              onClick={() => navigate(`/reports/${comp.id}`)}
              className="group cursor-pointer bg-white rounded-[3rem] shadow-[0_20px_0_rgba(0,0,0,0.05)] hover:shadow-[0_30px_0_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden border-2 border-white/50 transform hover:-translate-y-4 active:translate-y-2 active:shadow-none"
            >
              <div className={`h-44 bg-gradient-to-br ${comp.color} flex items-center justify-center p-8 relative`}>
                <div className="absolute top-4 right-4 text-3xl opacity-30 group-hover:scale-125 transition-transform">{comp.icon}</div>
                <img
                  src={comp.image}
                  alt={comp.title}
                  className="w-full h-full object-contain drop-shadow-xl group-hover:scale-110 transition duration-500"
                />
              </div>

              <div className="p-8 text-center bg-white">
                <h2 className="text-2xl font-black text-slate-800 group-hover:text-sky-600 transition-colors leading-tight mb-3">
                  {comp.title}
                </h2>
                <div className="w-12 h-1.5 bg-slate-100 mx-auto rounded-full mb-4 group-hover:w-20 group-hover:bg-sky-400 transition-all"></div>
                <p className="text-slate-400 text-sm font-bold leading-relaxed">{comp.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
           <div className="inline-block bg-white/50 backdrop-blur-md px-10 py-4 rounded-full border-2 border-white/80 shadow-lg">
             <p className="text-sky-800 font-black uppercase tracking-[0.3em] text-sm">{t("doing_amazing")}</p>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes whistle {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        .animate-whistle {
          animation: whistle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default ReportsDashboard;
