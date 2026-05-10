import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getWorkingMemoryIdentifyResults } from "../../../services/workingMemory/identifyApi";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function IdentifyWorkingMemoryReport() {
  const navigate = useNavigate();
  const { t } = useTranslation(['wm', 'common']);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const studentId = localStorage.getItem("studentId") || "60d0fe4f5311236168a109ca";

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await getWorkingMemoryIdentifyResults(studentId);
      // Sort results by date for the chart (oldest to newest)
      const sortedResults = [...res.data.data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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
    score: r.metrics?.finalScore || Math.round((r.totalScore / r.totalQuestions) * 100),
    total: r.totalQuestions,
    accuracy: r.metrics?.recallAccuracy || 0,
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-teal-100">
        <div className="relative">
            <div className="w-24 h-24 border-8 border-white border-t-amber-400 rounded-full animate-spin"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl">🧠</div>
        </div>
        <p className="text-teal-600 font-black text-2xl mt-8 animate-bounce">{t("wm:loading_memory")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-400 via-emerald-300 to-sky-200 p-8 relative overflow-x-hidden">
      {/* Dashboard Button */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
        <button 
          onClick={() => navigate("/dashboard")}
          className="bg-white hover:bg-teal-50 text-teal-600 font-black px-8 py-3 rounded-full shadow-lg border-2 border-white/80 transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none uppercase tracking-widest text-sm"
        >
          {t("common:dashboard")} 🏠
        </button>
      </div>

      
      {/* Background Decorations */}
      <div className="absolute top-10 left-[10%] text-9xl opacity-10 animate-pulse">💡</div>
      <div className="absolute top-[20%] right-[10%] text-8xl opacity-10 rotate-12 animate-pulse">🧩</div>
      <div className="absolute bottom-20 left-[5%] text-7xl opacity-10 -rotate-12">🎯</div>
      <div className="absolute bottom-40 right-[15%] text-9xl opacity-10 animate-bounce">⚡</div>

      <div className="max-w-6xl mx-auto relative z-10">
        <br />
        <br />
        <br />
        <div className="flex flex-col md:flex-row items-center gap-8 mb-12 bg-white/40 backdrop-blur-xl p-8 rounded-[3rem] border-4 border-white/60 shadow-2xl">
          <button
            onClick={() => navigate("/reports/wm")}
            className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center text-teal-500 hover:scale-110 transition-all border-b-[8px] border-slate-200 active:translate-y-1 active:border-b-0 group"
          >
            <svg className="w-10 h-10 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-5xl font-black text-slate-800 tracking-tight drop-shadow-md">{t("wm:memory_power")}</h1>
            <p className="text-teal-800 font-black uppercase tracking-widest text-sm mt-1">{t("wm:memory_adventures")}</p>
          </div>
          <div className="hidden lg:block text-8xl animate-bounce">🏆</div>
        </div>

        {results.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-[4rem] p-20 text-center shadow-2xl border-b-[20px] border-slate-200">
            <div className="text-9xl mb-10 transform hover:scale-110 transition-transform cursor-pointer">🏝️</div>
            <h2 className="text-4xl font-black text-slate-800 mb-6 uppercase tracking-tight">{t("common:island_quiet")}</h2>
            <p className="text-slate-500 font-bold text-xl mb-12 max-w-md mx-auto leading-relaxed">{t("common:no_stars_desc")}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-14 py-6 bg-amber-400 hover:bg-amber-500 text-amber-900 font-black text-2xl rounded-[2rem] transition-all shadow-[0_10px_0_rgb(217,119,6)] active:translate-y-2 active:shadow-none uppercase tracking-widest"
            >
              {t("common:start_quest")} 🚀
            </button>
          </div>
        ) : (
          <>
            {/* Chart Summary Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-[3rem] p-8 md:p-12 shadow-2xl border-b-[12px] border-teal-100 mb-12 transform hover:scale-[1.01] transition-transform">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 mb-1">{t("common:progress_chart")}</h2>
                        <p className="text-teal-500 font-bold uppercase tracking-widest text-xs">{t("wm:grow_stronger")}</p>
                    </div>
                    <div className="bg-teal-50 px-6 py-3 rounded-2xl border-2 border-teal-100 text-center">
                        <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-1">{t("wm:total_adventures")}</p>
                        <p className="text-3xl font-black text-teal-600">
                            {results.length}
                        </p>
                    </div>
                </div>

                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/> {/* teal-600 */}
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontWeight: 'bold', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontWeight: 'bold', fontSize: 12 }}
                                dx={-10}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    borderRadius: '1.5rem', 
                                    border: 'none', 
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                    padding: '1rem'
                                }}
                                itemStyle={{ fontWeight: 'black', color: '#0d9488' }}
                                labelStyle={{ fontWeight: 'black', marginBottom: '0.25rem', color: '#1e293b' }}
                                cursor={{ stroke: '#0d9488', strokeWidth: 2, strokeDasharray: '5 5' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="score" 
                                stroke="#0d9488" 
                                strokeWidth={4} 
                                fillOpacity={1} 
                                fill="url(#colorScore)" 
                                animationDuration={2000}
                                dot={{ fill: '#0d9488', strokeWidth: 2, r: 6, stroke: '#fff' }}
                                activeDot={{ r: 8, strokeWidth: 0, fill: '#115e59' }} /* teal-800 */
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* Display results in reverse order (newest first) for the list */}
              {[...results].reverse().map((result, idx) => (
                <div 
                  key={result._id} 
                  className="bg-white rounded-[3.5rem] p-1 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] transition-all transform hover:-translate-y-3 group overflow-hidden"
                >
                  <div className={`h-4 border-b-4 border-white/50 ${
                      (result.totalScore / result.totalQuestions) >= 0.8 ? 'bg-teal-400' :
                      (result.totalScore / result.totalQuestions) >= 0.5 ? 'bg-amber-400' :
                      'bg-rose-400'
                  }`}></div>
                  
                  <div className="p-8">
                      <div className="flex justify-between items-start mb-8">
                          <div>
                              <span className="bg-slate-100 text-slate-500 px-5 py-1.5 rounded-full font-black text-xs uppercase tracking-widest block mb-2 w-fit">
                                  {t("wm:adventure_num")}{results.length - idx}
                              </span>
                              <h3 className="text-2xl font-black text-slate-800">{formatDate(result.createdAt)}</h3>
                          </div>
                          <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl shadow-xl border-4 rotate-3 group-hover:rotate-0 transition-transform ${
                              (result.totalScore / result.totalQuestions) >= 0.8 ? 'bg-teal-50 border-teal-100' :
                              (result.totalScore / result.totalQuestions) >= 0.5 ? 'bg-amber-50 border-amber-100' :
                              'bg-rose-50 border-rose-100'
                          }`}>
                              {(result.totalScore / result.totalQuestions) >= 0.8 ? '🏆' : (result.totalScore / result.totalQuestions) >= 0.5 ? '⭐' : '💪'}
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 group-hover:bg-sky-50 group-hover:border-sky-100 transition-colors">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t("wm:my_score")}</p>
                              <p className="text-3xl font-black text-slate-800">
                                  {result.totalScore} <span className="text-lg text-slate-300">/ {result.totalQuestions}</span>
                              </p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 group-hover:bg-teal-50 group-hover:border-teal-100 transition-colors">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t("common:accuracy")}</p>
                              <p className={`text-3xl font-black ${
                                  (result.totalScore / result.totalQuestions) >= 0.8 ? 'text-teal-500' :
                                  (result.totalScore / result.totalQuestions) >= 0.5 ? 'text-amber-600' :
                                  'text-rose-500'
                              }`}>
                                  {Math.round((result.totalScore / result.totalQuestions) * 100)}%
                              </p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 group-hover:bg-purple-50 group-hover:border-purple-100 transition-colors">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t("wm:avg_speed")}</p>
                              <p className="text-3xl font-black text-slate-800">{result.metrics?.avgResponseTime ? (result.metrics.avgResponseTime / 1000).toFixed(1) : '-'}<span className="text-lg text-slate-300">s</span></p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 group-hover:bg-orange-50 group-hover:border-orange-100 transition-colors">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t("wm:digit_span")}</p>
                              <p className="text-3xl font-black text-orange-500">{result.metrics?.digitSpan || '-'}</p>
                          </div>
                      </div>

                      {/* Display Weak Areas if present */}
                      {result.metrics?.weakAreas && result.metrics.weakAreas.length > 0 && (
                          <div className="mt-4 bg-rose-50/50 p-4 rounded-3xl border border-rose-100">
                              <p className="text-xs font-black text-rose-400 uppercase tracking-wider mb-2">{t("wm:needs_practice")}</p>
                              <div className="flex flex-wrap gap-2">
                                  {result.metrics.weakAreas.map((area, i) => (
                                      <span key={i} className="bg-rose-100 text-rose-600 px-3 py-1 rounded-xl text-sm font-bold border border-rose-200">
                                          {area}
                                      </span>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
  
                  <div className="bg-slate-50/50 p-4 text-center border-t border-dashed border-slate-100 group-hover:bg-white transition-all flex justify-between px-8">
                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">{t("common:level")}: {result.grade}</p>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">
                         {t("wm:support_level")} <span className={result.metrics?.["r" + "iskLevel"] === 'Low' ? 'text-teal-400' : result.metrics?.["r" + "iskLevel"] === 'Moderate' ? 'text-amber-400' : 'text-rose-400'}>{result.metrics?.["r" + "iskLevel"] || 'N/A'}</span>
                     </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-24 text-center">
           <div className="inline-block bg-white/30 backdrop-blur-md px-12 py-5 rounded-[2rem] border-2 border-white/50 shadow-xl">
             <p className="text-white font-black uppercase tracking-[0.5em] text-sm drop-shadow-md">{t("wm:super_brain")}</p>
           </div>
        </div>
      </div>

      <style>{`
        body { overflow-x: hidden; }
      `}</style>
    </div>
  );
}

export default IdentifyWorkingMemoryReport;


