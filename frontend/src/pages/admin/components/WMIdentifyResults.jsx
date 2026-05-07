import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from 'xlsx';

// ─── Risk Badge ────────────────────────────────────────────────────────────────
const RiskBadge = ({ level }) => {
  const colors = {
    Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Moderate: "bg-amber-100 text-amber-700 border-amber-200",
    High: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <span className={`px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-full border ${colors[level] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {level || "N/A"}
    </span>
  );
};

// ─── Progress Ring ─────────────────────────────────────────────────────────────
const ProgressRing = ({ percentage, color = "indigo", size = 120 }) => {
  const radius = size * 0.4;
  const stroke = size * 0.08;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg height={size} width={size} className="transform -rotate-90">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset: 0 }}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          className="text-slate-100"
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          className={`text-${color}-500 transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black text-${color}-600 leading-none`}>{Math.round(percentage)}%</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Final Score</span>
      </div>
    </div>
  );
};

// ─── Digit Span Visualizer ─────────────────────────────────────────────────────
const DigitSpanVisualizer = ({ value }) => {
  const max = 4;
  const items = [];
  for (let i = 1; i <= Math.min(value, max); i++) {
    items.push(`${i}/${max} ✅`);
  }
  return (
    <div className="flex flex-col gap-1 items-end">
      {items.length > 0 ? (
        items.map((item, idx) => (
          <span key={idx} className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
            {item}
          </span>
        ))
      ) : (
        <span className="text-xs font-black text-slate-400">0/4</span>
      )}
    </div>
  );
};

// ─── Detail Modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ result, onClose }) => {
  const m = result.metrics || {};
  const student = result.studentId || {};
  const isPopulated = typeof student === 'object' && student.fullName;
  const displayName = isPopulated ? student.fullName : (typeof student === 'string' ? student : "Unknown Student");

  const metricCards = [
    { label: "Recall Accuracy", value: m.recallAccuracy, suffix: "%", icon: "🧠", color: "indigo" },
    { label: "Digit Span Score", value: m.digitSpanScore, suffix: "%", icon: "📊", color: "blue" },
    { label: "Sequence Score", value: m.sequenceScore, suffix: "%", icon: "⛓️", color: "purple" },
    { label: "Instruction Score", value: m.instructionScore, suffix: "%", icon: "📝", color: "cyan" },
    { label: "Pattern Score", value: m.patternScore, suffix: "%", icon: "🎨", color: "emerald" },
    { label: "Time Score", value: m.timeScore, suffix: "%", icon: "⚡", color: "amber" },
    { label: "Digit Span Capacity", value: m.digitSpan, icon: "🔢", color: "rose", customVisual: <DigitSpanVisualizer value={m.digitSpan} /> },
  ];

  const categoryColors = {
    Pattern: "bg-purple-50 border-purple-100 text-purple-700",
    "Word Memory": "bg-blue-50 border-blue-100 text-blue-700",
    Instruction: "bg-indigo-50 border-indigo-100 text-indigo-700",
    "Memory Recall": "bg-teal-50 border-teal-100 text-teal-700",
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center sm:p-4 p-2">
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] w-full max-w-6xl max-h-[96vh] md:max-h-[92vh] flex flex-col overflow-hidden animate-zoomIn">
        {/* Top Header Section */}
        <div className="relative p-6 md:p-10 bg-slate-900 text-white overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6 md:gap-12">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center text-2xl md:text-3xl font-black shadow-2xl shadow-indigo-600/40 border-4 border-white/10">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                  <h3 className="text-xl md:text-3xl font-black tracking-tight">{displayName}</h3>
                  <div className="px-2 md:px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-indigo-300">Grade {result.grade || "N/A"}</div>
                </div>
                <p className="text-slate-400 text-xs md:text-base font-medium flex flex-wrap items-center gap-3 md:gap-4">
                  <span className="flex items-center gap-1.5 md:gap-2">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {new Date(result.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="flex items-center gap-1.5 md:gap-2">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Score: {result.totalScore}/{result.totalQuestions}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 md:gap-8 bg-white/10 backdrop-blur-lg border border-white/10 p-4 md:p-8 rounded-3xl md:rounded-[3rem] lg:ml-auto lg:mr-16">
              <div className="scale-90 md:scale-110 origin-left">
                <ProgressRing percentage={m.finalScore || 0} color="indigo" size={110} />
              </div>
              <div className="space-y-2 md:space-y-4">
                <div>
                  <p className="text-[8px] md:text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">Risk Profile</p>
                  <RiskBadge level={m.riskLevel} />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[8px] md:text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-0.5">Final Score</p>
                  <p className="text-xl md:text-3xl font-black text-white">{Math.round(m.finalScore)}<span className="text-indigo-400 ml-1">%</span></p>
                </div>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 md:top-8 md:right-8 bg-white/20 hover:bg-white/30 p-3 rounded-2xl transition-all z-50 active:scale-90 shadow-lg border border-white/10">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
          <div className="p-6 md:p-10 space-y-8 md:space-y-12">
            {/* Detailed Stats Grid */}
            <section>
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <div className="w-1 h-6 md:w-1.5 md:h-8 bg-indigo-600 rounded-full"></div>
                <h4 className="text-sm md:text-lg font-black text-slate-900 tracking-tight uppercase tracking-[0.1em]">Metric Analysis Matrix</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {metricCards.map((card, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 bg-${card.color}-50 text-${card.color}-600 rounded-2xl flex items-center justify-center text-2xl`}>
                        {card.icon}
                      </div>
                      {card.customVisual ? (
                        card.customVisual
                      ) : (
                        <span className={`text-2xl font-black text-${card.color}-600`}>{Math.round(card.value || 0)}{card.suffix}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{card.label}</p>
                      {!card.customVisual && (
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className={`bg-${card.color}-500 h-2 rounded-full transition-all duration-1000`} style={{ width: `${Math.min(100, card.value || 0)}%` }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="bg-indigo-600 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-xl shadow-indigo-600/20 flex flex-col justify-center text-white relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
                  <p className="text-[8px] md:text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Avg Latency</p>
                  <p className="text-xl md:text-3xl font-black">{(m.avgResponseTime / 1000).toFixed(2)}<span className="text-indigo-300 ml-1 text-xs md:text-sm">sec</span></p>
                </div>
              </div>
            </section>

            {/* Response Timeline */}
            <section>
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1 md:w-1.5 h-6 md:h-8 bg-indigo-600 rounded-full"></div>
                  <h4 className="text-sm md:text-lg font-black text-slate-900 tracking-tight uppercase tracking-[0.1em]">Itemized Response Analytics</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                {result.questionResults?.map((q, i) => {
                  const colors = categoryColors[q.category] || "bg-slate-50 border-slate-100 text-slate-700";
                  const correct = q.isCorrect;
                  const userAnswer = Array.isArray(q.userAnswer) ? q.userAnswer.join(", ") : String(q.userAnswer || "—");
                  const correctAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : String(q.correctAnswer || "—");
                  
                  return (
                    <div key={i} className={`relative bg-white border-2 ${correct ? 'border-emerald-50 hover:border-emerald-200' : 'border-rose-50 hover:border-rose-200'} p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] transition-all duration-500 group overflow-hidden`}>
                      <div className={`absolute top-0 left-0 w-1.5 md:w-2.5 h-full ${correct ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      
                      <div className="flex items-center justify-between mb-6 md:mb-8">
                        <div className="flex items-center gap-3 md:gap-4">
                          <span className="w-10 h-10 md:w-14 md:h-14 bg-slate-900 text-white rounded-xl md:rounded-[1.25rem] flex items-center justify-center text-xs md:text-sm font-black shadow-xl">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className={`px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${colors}`}>
                            {q.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Time</p>
                          <p className="text-xs md:text-sm font-black text-slate-900">{(q.timeTaken / 1000).toFixed(2)}s</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-[2rem] border border-slate-100">
                          <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                            Student
                          </p>
                          <p className={`text-base md:text-lg font-black ${correct ? 'text-emerald-700' : 'text-rose-700'}`}>{userAnswer}</p>
                        </div>
                        <div className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-[2rem] border border-slate-100">
                          <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                            Target
                          </p>
                          <p className="text-base md:text-lg font-black text-slate-800">{correctAnswer}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Attempt Row ───────────────────────────────────────────────────────────────
const AttemptRow = ({ attempt, index, isLatest, onView }) => {
  const m = attempt.metrics || {};
  return (
    <div className={`flex items-center gap-4 p-5 rounded-3xl transition-all duration-300 ${isLatest ? "bg-indigo-50 border border-indigo-100" : "bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5"}`}>
      <div className="w-16 shrink-0">
        {isLatest
          ? <span className="px-3 py-1 text-[9px] font-black bg-indigo-600 text-white rounded-full uppercase tracking-widest shadow-lg shadow-indigo-600/20">Active</span>
          : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{String(index + 1).padStart(2, "0")}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-slate-900">{new Date(attempt.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>
      <div className="hidden sm:flex items-center gap-10 shrink-0 pr-6">
        <div className="text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
          <p className="text-sm font-black text-slate-900">{attempt.totalScore}/{attempt.totalQuestions}</p>
        </div>
        <div className="text-center px-6 border-l border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Accuracy</p>
          <p className="text-sm font-black text-slate-900">{m.finalScore != null ? `${m.finalScore.toFixed(0)}%` : "—"}</p>
        </div>
        <div className="px-6 border-l border-slate-100">
          <RiskBadge level={m.riskLevel} />
        </div>
      </div>
      <button onClick={() => onView(attempt)}
        className="shrink-0 px-6 py-2.5 text-[10px] font-black text-indigo-600 bg-white border-2 border-indigo-50 rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-300 active:scale-95"
      >
        ANALYZE
      </button>
    </div>
  );
};

// ─── Student Result Group ──────────────────────────────────────────────────────
const StudentResultGroup = ({ student, attempts, onView }) => {
  const [expanded, setExpanded] = useState(false);
  const latest = attempts[0];
  const older = attempts.slice(1);
  
  const isPopulated = typeof student === 'object' && student.fullName;
  const displayName = isPopulated ? student.fullName : (typeof student === 'string' ? student : "Unknown Student");

  return (
    <div className="group bg-white rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-slate-200/40 border border-slate-200 overflow-hidden transition-all duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center gap-8 p-8 lg:p-10">
        <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white font-black text-2xl shadow-xl group-hover:rotate-6 transition-transform duration-500">
          {displayName.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{displayName}</h3>
            <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-600 text-[10px] font-black border border-indigo-100 uppercase tracking-widest">Grade {latest.grade || latest.gradeCategory}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Student Name: <span className="text-slate-600 ml-1">{displayName}</span>
            </p>
            <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              {attempts.length} Total Assessments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button onClick={() => onView(latest)}
            className="px-10 py-4 text-xs font-black text-white bg-indigo-600 rounded-[1.5rem] hover:bg-slate-900 transition-all duration-300 shadow-xl shadow-indigo-600/20 active:scale-95"
          >
            Review Intelligence
          </button>
          {older.length > 0 && (
            <button onClick={() => setExpanded(!expanded)}
              className={`p-4 rounded-[1.5rem] transition-all duration-500 ${expanded ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"}`}
            >
              <svg className={`w-5 h-5 transition-transform duration-700 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
        </div>
      </div>

      <div className={`transition-all duration-700 ease-in-out ${expanded ? "max-h-[1500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="p-8 lg:p-10 space-y-4 bg-slate-50/50 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[1px] w-8 bg-slate-300"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Performance Timeline</p>
          </div>
          {older.map((attempt, i) => (
            <AttemptRow key={attempt._id} attempt={attempt} index={attempts.length - i - 2} isLatest={false} onView={onView} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const WMIdentifyResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("All");
  const [filterRisk, setFilterRisk] = useState("All");
  const [filterScore, setFilterScore] = useState("All");

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/results/working-memory/identify", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) setResults(res.data.data);
      } catch {
        toast.error("Failed to fetch Working Memory results");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  const filteredResults = results.filter(r => {
    const m = r.metrics || {};
    const student = r.studentId || {};
    const studentName = (typeof student === 'object' ? student.fullName : String(student)) || "";
    const matchesSearch = studentName.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = filterGrade === "All" || String(r.grade) === filterGrade;
    const matchesRisk = filterRisk === "All" || m.riskLevel === filterRisk;
    let matchesScore = true;
    if (filterScore !== "All") {
      const score = m.finalScore || 0;
      if (filterScore === "0-25") matchesScore = score <= 25;
      else if (filterScore === "26-50") matchesScore = score > 25 && score <= 50;
      else if (filterScore === "51-75") matchesScore = score > 50 && score <= 75;
      else if (filterScore === "76-100") matchesScore = score > 75;
    }
    return matchesSearch && matchesGrade && matchesRisk && matchesScore;
  });

  const grouped = results.reduce((acc, r) => {
    const sid = typeof r.studentId === 'object' ? r.studentId?._id : r.studentId;
    const key = sid || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const filteredGrouped = filteredResults.reduce((acc, r) => {
    const sid = typeof r.studentId === 'object' ? r.studentId?._id : r.studentId;
    const key = sid || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const downloadData = (format) => {
    const data = Object.values(grouped).map(attempts => {
      const latest = attempts[0];
      const s = latest.studentId || {};
      const m = latest.metrics || {};
      return {
        "Student Name": typeof s === 'object' ? s.fullName : "Unknown",
        "Email": typeof s === 'object' ? s.email : "Unknown",
        "Grade": latest.grade,
        "Recall Accuracy (%)": m.recallAccuracy,
        "Digit Span Score (%)": m.digitSpanScore,
        "Sequence Score (%)": m.sequenceScore,
        "Instruction Score (%)": m.instructionScore,
        "Pattern Score (%)": m.patternScore,
        "Time Score (%)": m.timeScore,
        "Final Score (%)": m.finalScore,
        "Risk Level": m.riskLevel,
        "Avg Response Time (ms)": m.avgResponseTime,
        "Assessment Date": new Date(latest.createdAt).toLocaleDateString()
      };
    });

    if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `WM_Intelligence_Dataset_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Latest Results");
      XLSX.writeFile(workbook, `WM_Intelligence_Dataset_${new Date().getTime()}.xlsx`);
    }
    toast.success(`Dataset exported as ${format.toUpperCase()}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-12 pb-24">
      {/* Premium Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black uppercase tracking-[0.2em]">
            Neural Intelligence Matrix
          </div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-tight">Working Memory <span className="text-indigo-600">Analytics</span></h2>
          <p className="text-slate-500 font-bold text-xl max-w-2xl">
            Fine-tune your research scope using advanced cognitive filters.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <div className="relative group flex-1 xl:w-96">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search student identity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-16 pr-8 py-6 bg-white border-2 border-slate-100 rounded-[2.5rem] text-sm font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all duration-500 shadow-2xl shadow-slate-200/20"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadData('csv')}
              className="px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              CSV
            </button>
            <button onClick={() => downloadData('xlsx')}
              className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              EXCEL
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filter Control Center */}
      <div className="bg-slate-900 rounded-[4rem] p-2 relative overflow-hidden shadow-2xl shadow-indigo-900/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-4 p-6">
          {/* Grade Filter */}
          <div className="flex-1 min-w-[240px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-6 group hover:border-white/30 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
              </div>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Academic Tier</p>
            </div>
            <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full bg-transparent text-white text-lg font-black outline-none cursor-pointer appearance-none">
              <option value="All" className="bg-slate-900 text-white">Entire Population</option>
              <option value="3" className="bg-slate-900 text-white">Grade 03</option>
              <option value="4" className="bg-slate-900 text-white">Grade 04</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex-1 min-w-[240px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-6 group hover:border-white/30 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-[10px] font-black text-rose-300 uppercase tracking-[0.2em]">Risk Sensitivity</p>
            </div>
            <div className="flex items-center justify-between">
              <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full bg-transparent text-white text-lg font-black outline-none cursor-pointer appearance-none">
                <option value="All" className="bg-slate-900 text-white">All Risk Levels</option>
                <option value="Low" className="bg-slate-900 text-white">Low Risk Profile</option>
                <option value="Moderate" className="bg-slate-900 text-white">Moderate Risk Profile</option>
                <option value="High" className="bg-slate-900 text-white">High Risk Profile</option>
              </select>
              <div className={`w-3 h-3 rounded-full shrink-0 ${filterRisk === 'High' ? 'bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]' : filterRisk === 'Moderate' ? 'bg-amber-500' : filterRisk === 'Low' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
            </div>
          </div>

          {/* Performance Filter */}
          <div className="flex-1 min-w-[240px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-6 group hover:border-white/30 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em]">Efficiency Bracket</p>
            </div>
            <select value={filterScore} onChange={(e) => setFilterScore(e.target.value)}
              className="w-full bg-transparent text-white text-lg font-black outline-none cursor-pointer appearance-none">
              <option value="All" className="bg-slate-900 text-white">Full Range</option>
              <option value="0-25" className="bg-slate-900 text-white">Tier 4 (0% - 25%)</option>
              <option value="26-50" className="bg-slate-900 text-white">Tier 3 (26% - 50%)</option>
              <option value="51-75" className="bg-slate-900 text-white">Tier 2 (51% - 75%)</option>
              <option value="76-100" className="bg-slate-900 text-white">Tier 1 (76% - 100%)</option>
            </select>
          </div>

          {/* Reset Action */}
          <button onClick={() => { setSearch(""); setFilterGrade("All"); setFilterRisk("All"); setFilterScore("All"); }}
            className="w-20 h-20 bg-white/10 hover:bg-rose-600 text-white rounded-[2rem] flex items-center justify-center transition-all group shrink-0 border border-white/5 active:scale-90">
            <svg className="w-8 h-8 group-hover:rotate-180 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: "Total Attempts ", val: filteredResults.length, color: "bg-white", icon: "💎", desc: "Attempts identified" },
          { label: "Total Students", val: Object.keys(filteredGrouped).length, color: "bg-white", icon: "👥", desc: "Filtered student population" },
          { label: "Population Accuracy", val: `${(filteredResults.reduce((acc, r) => acc + (r.metrics?.finalScore || 0), 0) / (filteredResults.length || 1)).toFixed(1)}%`, color: "bg-white", icon: "🎯", desc: "Current sub-group average" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[3.5rem] p-10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-8 group hover:-translate-y-2 transition-all duration-500">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500 shadow-inner">
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{stat.label}</p>
              <h4 className="text-4xl font-black text-slate-900 leading-none mb-2">{stat.val}</h4>
              <p className="text-[11px] font-bold text-indigo-500/60 uppercase tracking-widest">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(filteredGrouped).length === 0 ? (
        <div className="bg-white rounded-[5rem] border-2 border-dashed border-slate-100 p-32 text-center flex flex-col items-center">
          <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center mb-10 relative">
            <svg className="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <div className="absolute inset-0 bg-indigo-500/5 rounded-full animate-ping"></div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Zero Intelligence Nodes</h3>
          <p className="text-slate-500 mt-4 font-bold text-xl max-w-md mx-auto">The current filter configuration has narrowed the scope beyond available data points.</p>
          <button onClick={() => { setSearch(""); setFilterGrade("All"); setFilterRisk("All"); setFilterScore("All"); }}
            className="mt-12 px-10 py-5 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95">
            Reset Matrix Scope
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(filteredGrouped).map(([sid, attempts]) => (
            <StudentResultGroup
              key={sid}
              student={attempts[0].studentId || {}}
              attempts={attempts}
              onView={setSelectedResult}
            />
          ))}
        </div>
      )}

      {selectedResult && <DetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />}
    </div>
  );
};

export default WMIdentifyResults;
