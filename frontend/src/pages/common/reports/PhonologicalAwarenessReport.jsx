import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPhonologicalIdentifyResults } from "../../../services/student/api";
import { useTranslation } from "react-i18next";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { calculatePhonologicalMetrics } from "../../../utils/phonologicalAwareness/scoring.util";

function PhonologicalAwarenessReport() {
  const navigate = useNavigate();
  const { t } = useTranslation(['pa', 'common']);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const studentId = localStorage.getItem("studentId");

  useEffect(() => {
    fetchResults();
  }, []);

  const consolidateMetrics = (metrics) => {
    if (!metrics || !metrics.categoryScores) return metrics;

    // If already in 3-category format, just return
    if (metrics.categoryScores["Literacy Skills"] !== undefined) return metrics;

    const scores = metrics.categoryScores;
    const times = metrics.categoryTimes || {};

    // Merge logic: Average the percentages of the 3 literacy-related categories
    const litCats = ["Orthographic Skills", "Segmentation & Counting", "Sequencing & Spelling"];
    let litScoreSum = 0;
    let litTimeSum = 0;
    let litCount = 0;

    litCats.forEach(cat => {
      if (scores[cat] !== undefined) {
        litScoreSum += scores[cat];
        litTimeSum += times[cat] || 0;
        litCount++;
      }
    });

    const consolidatedScores = {
      "Phonological Awareness": scores["Phonological Awareness"] || 0,
      "Visual Processing": scores["Visual Processing"] || 0,
      "Literacy Skills": litCount > 0 ? litScoreSum / litCount : 0
    };

    return {
      ...metrics,
      categoryScores: consolidatedScores
    };
  };

  const fetchResults = async () => {
    try {
      const res = await getPhonologicalIdentifyResults(studentId);
      const data = res.data.data || [];
      
      const processedResults = data.map(r => {
        let finalMetrics = null;
        try {
          // PRIORITY: Re-calculate using the NEW logic to ensure questions 
          // are mapped exactly to the 3 categories as per your finalized tables.
          if (r.questionResults && r.questionResults.length > 0) {
            const inferredLang = r.questionResults[0].questionId?.includes('-si-') ? 'si' : 'en';
            // Use the saved grade, or default to "3" if it wasn't saved in very old records
            const gradeVal = r.grade || "3"; 
            finalMetrics = calculatePhonologicalMetrics(r.questionResults, gradeVal, inferredLang);
          } else {
            // FALLBACK: If raw question data is missing, consolidate the saved category names
            finalMetrics = consolidateMetrics(r.metrics);
          }
        } catch (e) {
          console.error("Error processing record:", r._id, e);
          finalMetrics = consolidateMetrics(r.metrics);
        }

        return {
          ...r,
          displayMetrics: finalMetrics
        };
      });

      // Sort results by date for the chart (oldest to newest)
      const sortedResults = processedResults.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setResults(sortedResults);
    } catch (err) {
      console.error("Error fetching results:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString, isShort = false) => {
    const options = isShort
      ? { month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Prepare data for the chart
  const chartData = results.map(r => ({
    date: formatDate(r.createdAt, true),
    score: Math.round(r.displayMetrics?.finalScore || (r.totalScore / r.totalQuestions) * 100),
    total: r.totalQuestions,
    percentage: Math.round((r.totalScore / r.totalQuestions) * 100)
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-sky-100">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-white border-t-yellow-400 rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl">🚀</div>
        </div>
        <p className="text-sky-600 font-black text-2xl mt-8 animate-bounce">{t("pa:gathering_stars")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200 p-8 relative overflow-x-hidden">
      {/* Top Buttons Bar */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-white hover:bg-sky-50 text-sky-600 font-black px-8 py-3 rounded-full shadow-lg border-2 border-white/80 transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none uppercase tracking-widest text-sm"
        >
          {t("common:dashboard")} 🏠
        </button>
      </div>

      {/* Background Decorations */}
      <div className="absolute top-10 left-[10%] text-9xl opacity-10 animate-pulse">🌈</div>
      <div className="absolute top-[20%] right-[10%] text-8xl opacity-10 rotate-12 animate-pulse">☀️</div>
      <div className="absolute bottom-20 left-[5%] text-7xl opacity-10 -rotate-12">🎈</div>
      <div className="absolute bottom-40 right-[15%] text-9xl opacity-10 animate-bounce">🦋</div>

      <br /><br /><br />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-12 bg-white/40 backdrop-blur-xl p-8 rounded-[3rem] border-4 border-white/60 shadow-2xl">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center text-sky-500 hover:scale-110 transition-all border-b-[8px] border-slate-200 active:translate-y-1 active:border-b-0 group"
          >
            <svg className="w-10 h-10 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center md:text-left flex-1">
            <h1 className="text-5xl font-black text-slate-800 tracking-tight drop-shadow-md">{t("pa:my_magic_stars")}</h1>
            <p className="text-sky-800 font-black uppercase tracking-widest text-sm mt-1">{t("pa:pa_adventures")}</p>
          </div>
          <div className="hidden lg:block text-8xl animate-bounce">🏅</div>
        </div>

        {results.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-[4rem] p-20 text-center shadow-2xl border-b-[20px] border-slate-200">
            <div className="text-9xl mb-10 transform hover:scale-110 transition-transform cursor-pointer">🏝️</div>
            <h2 className="text-4xl font-black text-slate-800 mb-6 uppercase tracking-tight">{t("pa:island_quiet")}</h2>
            <p className="text-slate-500 font-bold text-xl mb-12 max-w-md mx-auto leading-relaxed">{t("pa:no_stars_desc")}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-14 py-6 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black text-2xl rounded-[2rem] transition-all shadow-[0_10px_0_rgb(202,138,4)] active:translate-y-2 active:shadow-none uppercase tracking-widest"
            >
              {t("pa:start_quest")} 🚀
            </button>
          </div>
        ) : (
          <>
            {/* Progress Chart Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-[3rem] p-8 md:p-12 shadow-2xl border-b-[12px] border-indigo-100 mb-12 transform hover:scale-[1.01] transition-transform">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 mb-1">{t("pa:progress_chart")}</h2>
                  <p className="text-indigo-500 font-bold uppercase tracking-widest text-xs">{t("pa:watch_skills_grow")}</p>
                </div>
                <div className="bg-indigo-50 px-6 py-3 rounded-2xl border-2 border-indigo-100 text-center">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{t("pa:total_stars")}</p>
                  <p className="text-3xl font-black text-indigo-600">
                    {results.reduce((acc, curr) => acc + curr.totalScore, 0)}
                  </p>
                </div>
              </div>

              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 'bold', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 'bold', fontSize: 12 }} dx={-10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '1rem' }}
                      itemStyle={{ fontWeight: 'black', color: '#4f46e5' }}
                      labelStyle={{ fontWeight: 'black', marginBottom: '0.25rem', color: '#1e293b' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" dot={{ fill: '#6366f1', strokeWidth: 2, r: 6, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Results List - 1 Card Per Row */}
            <div className="grid grid-cols-1 gap-10 max-w-5xl mx-auto">
              {[...results].reverse().map((result, idx) => (
                <div
                  key={result._id}
                  className={`bg-white/90 backdrop-blur-md rounded-[4rem] p-1 shadow-2xl transition-all transform border-4 border-white cursor-pointer ${expandedId === result._id ? 'scale-[1.02]' : 'hover:-translate-y-2'
                    }`}
                  onClick={() => setExpandedId(expandedId === result._id ? null : result._id)}
                >
                  <div className={`h-4 border-b-4 border-white/50 rounded-t-[3.5rem] ${(result.totalScore / result.totalQuestions) >= 0.8 ? 'bg-emerald-400' :
                      (result.totalScore / result.totalQuestions) >= 0.5 ? 'bg-yellow-400' :
                        'bg-pink-400'
                    }`}></div>

                  <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-8">
                      <div className="text-center md:text-left">
                        <span className="bg-slate-100 text-slate-500 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest block mb-4 w-fit mx-auto md:mx-0">
                          {t("pa:quest")} #{results.length - idx}
                        </span>
                        <h3 className="text-4xl font-black text-slate-800">{formatDate(result.createdAt)}</h3>
                      </div>
                      <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl border-4 transform transition-transform group-hover:rotate-12 ${(result.totalScore / result.totalQuestions) >= 0.8 ? 'bg-emerald-50 border-emerald-100' :
                          (result.totalScore / result.totalQuestions) >= 0.5 ? 'bg-yellow-50 border-yellow-100' :
                            'bg-pink-50 border-pink-100'
                        }`}>
                        {(result.totalScore / result.totalQuestions) >= 0.8 ? '🏆' : (result.totalScore / result.totalQuestions) >= 0.5 ? '⭐' : '💪'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Stat Cards with Bilingual Labels */}
                      {[
                        { label: t("pa:your_score"), subLabel: "Your Score", value: `${result.totalScore} / ${result.totalQuestions}`, icon: '📊', color: 'sky' },
                        { label: t("pa:accuracy"), subLabel: "Accuracy", value: `${Math.round((result.totalScore / result.totalQuestions) * 100)}%`, icon: '🎯', color: 'emerald' },
                        { label: 'මුළු කාලය', subLabel: "Total Time", value: `${Math.round(result.totalTimeTaken / 1000)}s`, icon: '⏱️', color: 'amber' },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white/50 backdrop-blur-md p-6 rounded-[3rem] border border-white flex flex-col items-center text-center hover:bg-white transition-all shadow-sm">
                          <div className={`w-14 h-14 bg-${stat.color}-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-${stat.color}-200 mb-4`}>
                            {stat.icon}
                          </div>
                          <p className={`text-[10px] font-black text-${stat.color}-400 uppercase tracking-widest mb-0.5`}>{stat.label}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.subLabel}</p>
                          <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Expandable Content */}
                    {expandedId === result._id && (
                      <div className="mt-12 pt-12 border-t-4 border-dashed border-sky-100 animate-fadeIn">
                        {!result.displayMetrics ? (
                          <div className="bg-white/40 backdrop-blur-sm p-10 rounded-[3rem] text-center border-2 border-dashed border-sky-200">
                            <p className="text-sky-400 font-bold italic tracking-wide">Detailed analysis is not available for this session.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            <div>
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                                <span className="w-12 h-1 bg-sky-400 rounded-full"></span>
                                වර්ගීකරණ විශ්ලේෂණය (Category Analysis)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.keys(result.displayMetrics.categoryScores || {}).map((cat) => (
                                  <div key={cat} className="bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white hover:bg-white transition-all">
                                    <div className="flex justify-between items-end mb-4">
                                      <p className="font-black text-slate-700 text-sm tracking-tight">{cat}</p>
                                      <p className="text-lg font-black text-sky-500">{Math.round(result.displayMetrics.categoryScores[cat])}%</p>
                                    </div>
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-50">
                                      <div className="bg-gradient-to-r from-sky-400 to-sky-500 h-full rounded-full transition-all duration-1000" style={{ width: `${result.displayMetrics.categoryScores[cat]}%` }}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-sm flex flex-col items-center text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">අවදානම් තක්සේරුව (Risk Assessment)</p>
                                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl my-6 shadow-inner ${result.displayMetrics.riskLevel === 'Low' ? 'bg-emerald-50 text-emerald-500' : result.displayMetrics.riskLevel === 'Moderate' ? 'bg-amber-50 text-amber-500' : 'bg-pink-50 text-pink-500'}`}>
                                  {result.displayMetrics.riskLevel === 'Low' ? '✅' : result.displayMetrics.riskLevel === 'Moderate' ? '⚠️' : '🚨'}
                                </div>
                                <p className={`text-4xl font-black ${result.displayMetrics.riskLevel === 'Low' ? 'text-emerald-500' : result.displayMetrics.riskLevel === 'Moderate' ? 'text-amber-500' : 'text-pink-500'}`}>
                                  {result.displayMetrics.riskLevel === 'Low' ? 'අඩු' : result.displayMetrics.riskLevel === 'Moderate' ? 'මධ්‍යම' : 'වැඩි'}
                                </p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{result.displayMetrics.riskLevel} Risk</p>
                              </div>

                              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 text-center">අවධානය යොමු කළ යුතු කරුණු (Focus Areas)</p>
                                {result.displayMetrics.weakAreas?.length > 0 ? (
                                  <div className="space-y-3 mt-6">
                                    {result.displayMetrics.weakAreas.map((area, i) => (
                                      <div key={i} className="flex items-center gap-4 bg-pink-50/50 p-4 rounded-2xl border border-pink-100/50 text-pink-600">
                                        <span className="flex-shrink-0 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-[10px]">!</span>
                                        <p className="text-sm font-black tracking-tight">{area}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center py-6">
                                    <div className="text-5xl mb-4 animate-pulse">✨</div>
                                    <p className="text-emerald-500 font-black tracking-tight text-center">Perfect Performance!</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-sky-50/30 backdrop-blur-md p-5 text-center border-t border-sky-100 flex justify-between items-center px-12 group-hover:bg-white/50 transition-all">
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.5em]">{t("pa:mastering_sounds")}</p>
                    <button className="text-[11px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform">
                      {expandedId === result._id ? 'Click to collapse 👆' : 'Click for details 👇'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-24 text-center pb-12">
          <div className="inline-block bg-white/30 backdrop-blur-md px-12 py-5 rounded-[2rem] border-2 border-white/50 shadow-xl">
            <p className="text-white font-black uppercase tracking-[0.5em] text-sm drop-shadow-md">{t("pa:sound_explorer")}</p>
          </div>
        </div>
      </div>

      <style>{`
        body { overflow-x: hidden; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default PhonologicalAwarenessReport;
