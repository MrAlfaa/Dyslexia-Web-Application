import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getStudentProfile } from "../../services/student/api";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";

function Dashboard() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [profile, setProfile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getStudentProfile();
      setProfile(res.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const cards = [
    {
      id: "wm",
      title: t("working_memory"),
      path: "/working-memory",
      image: "/images/4.png",
    },
    {
      id: "pa",
      title: t("phonological_awareness"),
      path: "/phonological-awareness",
      image: "/images/1.png",
    },
    {
      id: "rp",
      title: t("reading_processing"),
      path: "/reading-processing",
      image: "/images/2.png",
    },
    {
      id: "sp",
      title: t("speech_processing"),
      path: "/speech-processing",
      image: "/images/3.png",
    },
  ];

  const handleCategoryClick = (card) => {
    setSelectedCategory(card);
    setShowModal(true);
  };

  const handleActivitySelect = (type) => {
    if (type === "identification" && selectedCategory?.id === "pa") {
      navigate(`/identificationActivities-pa/${profile.grade}`);
    } else if (type === "identification" && selectedCategory?.id === "wm") {
      navigate(`/working-memory/${profile.grade}`);
    } else {
      console.log(`${type} clicked for ${selectedCategory?.title} - not implemented yet`);
    }
  };

  const handleStartDemo = (type) => {
    const path = type === "wm" 
      ? `/working-memory/${profile.grade}?demo=true` 
      : `/identificationActivities-pa/3?demo=true&ids=g3-si-4,g3-si-13`;
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Activity Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn transition-all">
          <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl relative border-8 border-indigo-50">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all font-bold"
            >
              ✕
            </button>
            <div className="text-center mb-10">
              <span className="bg-indigo-100 text-indigo-700 px-6 py-1.5 rounded-full font-black text-sm tracking-widest uppercase mb-4 inline-block">
                {t("grade")} {profile?.grade}
              </span>
              <h3 className="text-4xl font-black text-gray-800 leading-tight">
                {selectedCategory?.title}
              </h3>
              <p className="text-gray-500 mt-2 font-medium">{t("choose_activity")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Identification Tile */}
              <button
                onClick={() => handleActivitySelect("identification")}
                className="group relative bg-sky-50 hover:bg-sky-500 p-8 rounded-[2.5rem] border-b-8 border-sky-100 hover:border-sky-600 transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center shadow-lg"
              >
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner group-hover:scale-110 transition-transform">
                  🔍
                </div>
                <h4 className="text-2xl font-black text-sky-800 group-hover:text-white mb-2 uppercase tracking-wide">
                  {t("identification")}
                </h4>
                <p className="text-sky-600/70 group-hover:text-sky-100 text-sm font-bold text-center">
                  {t("identification_desc")}
                </p>
              </button>

              {/* Improvement Tile */}
              <button
                onClick={() => handleActivitySelect("improvement")}
                className="group relative bg-pink-50 hover:bg-pink-500 p-8 rounded-[2.5rem] border-b-8 border-pink-100 hover:border-pink-600 transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center shadow-lg"
              >
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner group-hover:scale-110 transition-transform">
                  📈
                </div>
                <h4 className="text-2xl font-black text-pink-800 group-hover:text-white mb-2 uppercase tracking-wide">
                  {t("improvement")}
                </h4>
                <p className="text-pink-600/70 group-hover:text-pink-100 text-sm font-bold text-center">
                  {t("improvement_desc")}
                </p>
                <div className="absolute -top-4 -right-4 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-md">
                  {t("coming_soon")}
                </div>
              </button>
            </div>

            <div className="mt-12 text-center text-gray-300 font-bold uppercase tracking-[0.4em] text-[10px]">
              Step by step to success
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">
            {t("hello")}, {profile?.fullName || '...'}!
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">{t("dashboard")} | {t("logged_in_as")}: {role}</p>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-[0_4px_0_rgba(0,0,0,0.05)] hover:shadow-lg transition-all border border-gray-100 overflow-hidden group hover:-translate-y-1 active:translate-y-0"
            title={t("profile")}
          >
            {profile?.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white group-hover:bg-indigo-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => handleCategoryClick(card)}
            className="group cursor-pointer bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all duration-300 overflow-hidden border-b-8 border-gray-100 hover:border-indigo-400 transform hover:-translate-y-2 active:translate-y-0 active:border-b-0"
          >
            <div className="h-48 overflow-hidden bg-indigo-50/30 flex items-center justify-center p-6">
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-contain group-hover:scale-110 transition duration-500"
              />
            </div>

            <div className="p-6 text-center">
              <h2 className="text-xl font-black text-gray-800 group-hover:text-indigo-600 transition-colors leading-tight">
                {card.title}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* View Reports Section with Background Image */}
      <div
        className="mt-16 relative rounded-[3rem] overflow-hidden shadow-2xl group cursor-pointer transition-all duration-500 hover:scale-[1.01]"
        onClick={() => navigate("/reports")}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
          style={{ backgroundImage: "url('/images/reports_bg.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 to-transparent"></div>

        <div className="relative z-10 p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-5xl font-black text-white mb-3 drop-shadow-lg uppercase tracking-tight">{t("view_reports")}</h2>
            <p className="text-white/90 font-bold text-xl drop-shadow-md max-w-md">{t("check_progress")}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); navigate("/reports"); }}
            className="px-12 py-6 bg-white hover:bg-indigo-50 text-indigo-600 font-black text-2xl rounded-2xl transition-all shadow-xl active:translate-y-1 uppercase tracking-wider flex items-center gap-4 group/btn"
          >
            <span className="group-hover/btn:scale-125 transition-transform">📊</span>
            {t("see_my_progress")}
          </button>
        </div>
      </div>

      {/* Demo Section */}
      <div className="mt-12 mb-20 flex flex-col items-center">
        <h3 className="text-2xl font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Try a Demo</h3>
        <div className="flex gap-6 flex-wrap justify-center">
          <button
            onClick={() => handleStartDemo("wm")}
            className="group relative px-12 py-6 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-[2rem] border-b-8 border-indigo-100 hover:border-indigo-800 transition-all transform hover:-translate-y-2 active:translate-y-0 active:border-b-0 shadow-xl flex items-center gap-4"
          >
            <span className="text-4xl group-hover:scale-125 transition-transform">🧠</span>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Working Memory</p>
              <p className="text-2xl font-black uppercase">WM Demo</p>
            </div>
          </button>

          <button
            onClick={() => handleStartDemo("pa")}
            className="group relative px-12 py-6 bg-pink-50 hover:bg-pink-600 text-pink-600 hover:text-white rounded-[2rem] border-b-8 border-pink-100 hover:border-pink-800 transition-all transform hover:-translate-y-2 active:translate-y-0 active:border-b-0 shadow-xl flex items-center gap-4"
          >
            <span className="text-4xl group-hover:scale-125 transition-transform">🗣️</span>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Phonological Awareness</p>
              <p className="text-2xl font-black uppercase">PA Demo</p>
            </div>
          </button>
        </div>
      </div>


      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
