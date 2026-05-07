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
const ProgressRing = ({ percentage, color = "emerald", size = 120 }) => {
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

// ─── Detail Modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ result, onClose }) => {
  const m = result.metrics || {};
  const student = result.studentId || {};
  const isPopulated = typeof student === 'object' && student.fullName;
  const displayName = isPopulated ? student.fullName : (typeof student === 'string' ? student : "Unknown Student");

  const categoryScores = m.categoryScores ? Object.entries(m.categoryScores) : [];

  const categoryBg = {
    "Initial Sound": "bg-purple-50 border-purple-100 text-purple-700",
    "Final Sound": "bg-blue-50 border-blue-100 text-blue-700",
    "Letter Counting": "bg-teal-50 border-teal-100 text-teal-700",
    "Orthographic Completion": "bg-amber-50 border-amber-100 text-amber-700",
    "Rhyme Awareness": "bg-pink-50 border-pink-100 text-pink-700",
    Sequencing: "bg-indigo-50 border-indigo-100 text-indigo-700",
    "Visual Discrimination": "bg-green-50 border-green-100 text-green-700",
    "Mirror Awareness": "bg-rose-50 border-rose-100 text-rose-700",
    "Word Awareness": "bg-orange-50 border-orange-100 text-orange-700",
    "Syllable Awareness": "bg-cyan-50 border-cyan-100 text-cyan-700",
    "Onset-Rime": "bg-violet-50 border-violet-100 text-violet-700",
    Blending: "bg-lime-50 border-lime-100 text-lime-700",
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center sm:p-4 p-2">
      <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] w-full max-w-6xl max-h-[96vh] md:max-h-[92vh] flex flex-col overflow-hidden animate-zoomIn">
        {/* Top Header Section */}
        <div className="relative p-6 md:p-12 bg-emerald-600 text-white overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-[700px] h-[700px] bg-white/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-10">
            <div className="flex items-center gap-4 md:gap-8">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-white/20 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center text-2xl md:text-4xl font-black shadow-inner border border-white/20">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2">
                  <h3 className="text-xl md:text-4xl font-black tracking-tighter leading-none">{displayName}</h3>
                  <div className="px-2 md:px-4 py-1 md:py-1.5 bg-slate-900 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Grade {result.grade || "N/A"}</div>
                </div>
                <p className="text-emerald-100 font-bold flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-lg">
                  <span className="flex items-center gap-1.5 md:gap-2">
                    <svg className="w-4 h-4 md:w-5 md:h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Analytics
                  </span>
                  <span className="flex items-center gap-1.5 md:gap-2">
                    <svg className="w-4 h-4 md:w-5 md:h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Score: {result.totalScore}/{result.totalQuestions}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 md:gap-10 bg-white/10 backdrop-blur-xl border border-white/20 p-4 md:p-8 rounded-3xl md:rounded-[3rem] lg:ml-auto lg:mr-16">
              <div className="scale-90 md:scale-110 origin-left">
                <ProgressRing percentage={m.finalScore || 0} color="white" size={110} />
              </div>
              <div className="space-y-2 md:space-y-5">
                <div>
                  <p className="text-[8px] md:text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Risk Profile</p>
                  <RiskBadge level={m.riskLevel} />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[8px] md:text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Final Score</p>
                  <p className="text-xl md:text-3xl font-black text-white">{Math.round(m.finalScore)}%</p>
                </div>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 md:top-10 md:right-10 bg-white/20 hover:bg-white/30 p-3 rounded-2xl transition-all z-50 active:scale-90 shadow-lg border border-white/10">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
          <div className="p-6 md:p-12 space-y-12 md:space-y-16">
            {/* Category Breakdown Grid */}
            <section>
              <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                <div className="w-1.5 md:w-2 h-8 md:h-10 bg-emerald-500 rounded-full"></div>
                <h4 className="text-sm md:text-2xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Phonological Matrix</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {categoryScores.map(([cat, score], i) => (
                  <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 group">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 ${categoryBg[cat] || 'bg-slate-50'} rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform`}>
                        ✨
                      </div>
                      <span className="text-2xl font-black text-emerald-600">{Math.round(score)}%</span>
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{cat}</p>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Individual Item Analysis */}
            <section>
              <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                <div className="w-1.5 md:w-2 h-8 md:h-10 bg-emerald-500 rounded-full"></div>
                <h4 className="text-sm md:text-2xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Response Analytics</h4>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {result.questionResults?.map((q, i) => {
                  const bg = categoryBg[q.category] || "bg-slate-100 border-slate-200 text-slate-700";
                  const correct = q.isCorrect;
                  const userAnswer = Array.isArray(q.userAnswer) ? q.userAnswer.join(", ") : String(q.userAnswer ?? "—");
                  const correctAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : String(q.correctAnswer ?? "—");
                  
                  return (
                    <div key={i} className={`relative bg-white border-2 ${correct ? 'border-emerald-50 hover:border-emerald-200' : 'border-rose-50 hover:border-rose-200'} p-6 md:p-8 rounded-2xl md:rounded-[3rem] transition-all duration-300 group`}>
                      <div className={`absolute top-6 md:top-10 left-0 w-1.5 md:w-2 h-10 md:h-12 rounded-r-full ${correct ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      
                      <div className="flex items-center justify-between mb-6 md:mb-8">
                        <div className="flex items-center gap-3 md:gap-4">
                          <span className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-xs md:text-sm font-black text-white shadow-xl">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className={`px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${bg}`}>
                            {q.category}
                          </span>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl">
                          {(q.timeTaken / 1000).toFixed(2)}s
                        </div>
                      </div>

                      <div className="space-y-3 md:space-y-4">
                        <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100">
                          <div className="flex items-center justify-between mb-1.5 md:mb-2">
                            <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Response</p>
                          </div>
                          <p className={`text-base md:text-lg font-black ${correct ? 'text-emerald-700' : 'text-rose-700'}`}>{userAnswer}</p>
                        </div>
                        <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100">
                          <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1.5 md:mb-2">Target</p>
                          <p className="text-base md:text-lg font-black text-slate-900">{correctAnswer}</p>
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
    <div className={`flex items-center gap-4 p-5 rounded-3xl transition-all duration-300 ${isLatest ? "bg-emerald-50 border border-emerald-100" : "bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5"}`}>
      <div className="w-20 shrink-0">
        {isLatest
          ? <span className="px-4 py-1.5 text-[9px] font-black bg-emerald-600 text-white rounded-full uppercase tracking-widest shadow-lg shadow-emerald-600/20">Current</span>
          : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">#{String(index + 1).padStart(2, "0")}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{new Date(attempt.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>
      <div className="hidden lg:flex items-center gap-12 shrink-0 pr-8">
        <div className="text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
          <p className="text-sm font-black text-slate-900">{attempt.totalScore}/{attempt.totalQuestions}</p>
        </div>
        <div className="text-center px-8 border-l border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Precision</p>
          <p className="text-sm font-black text-slate-900">{m.finalScore != null ? `${m.finalScore.toFixed(0)}%` : "—"}</p>
        </div>
        <div className="px-8 border-l border-slate-100">
          <RiskBadge level={m.riskLevel} />
        </div>
      </div>
      <button onClick={() => onView(attempt)}
        className="shrink-0 px-6 py-3 text-[10px] font-black text-emerald-700 bg-white border-2 border-emerald-50 rounded-2xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-500 shadow-sm"
      >
        ANALYSIS
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
    <div className="group bg-white rounded-[3.5rem] shadow-sm hover:shadow-[0_40px_80px_-15px_rgba(16,185,129,0.15)] border border-slate-200 overflow-hidden transition-all duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center gap-10 p-10 lg:p-12">
        <div className="w-24 h-24 bg-emerald-600 rounded-[3rem] flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-emerald-600/20 group-hover:rotate-12 transition-transform duration-700">
          {displayName.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-5 mb-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{displayName}</h3>
            <span className="px-4 py-1.5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] border border-slate-900">Grade {latest.grade || latest.gradeCategory}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <p className="text-xs font-bold text-slate-400 flex items-center gap-2.5">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Student Name: <span className="text-slate-600 ml-1">{displayName}</span>
            </p>
            <p className="text-xs font-bold text-slate-400 flex items-center gap-2.5">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {attempts.length} Assessment Entries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <button onClick={() => onView(latest)}
            className="px-12 py-5 text-sm font-black text-white bg-emerald-600 rounded-[2rem] hover:bg-slate-900 transition-all duration-500 shadow-2xl shadow-emerald-600/30 active:scale-95"
          >
            Review Analytics
          </button>
          {older.length > 0 && (
            <button onClick={() => setExpanded(!expanded)}
              className={`p-5 rounded-[2rem] transition-all duration-700 ${expanded ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/40" : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"}`}
            >
              <svg className={`w-6 h-6 transition-transform duration-700 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
        </div>
      </div>

      <div className={`transition-all duration-700 ease-in-out ${expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="p-10 lg:p-12 space-y-5 bg-slate-50/50 border-t border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-1 w-10 bg-emerald-500 rounded-full"></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Historical Performance Log</p>
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
const PAIdentifyResults = () => {
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
        const res = await axios.get("http://localhost:5000/api/admin/results/phonological-awareness/identify", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) setResults(res.data.data);
      } catch {
        toast.error("Failed to fetch Phonological Awareness results");
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
      const catScores = m.categoryScores || {};

      // Flatten category scores for ML training
      const flattenedCatScores = {};
      Object.entries(catScores).forEach(([cat, score]) => {
        flattenedCatScores[`Score: ${cat} (%)`] = score;
      });

      return {
        "Student Name": typeof s === 'object' ? s.fullName : "Unknown",
        "Email": typeof s === 'object' ? s.email : "Unknown",
        "Grade": latest.grade,
        ...flattenedCatScores,
        "Final Score (%)": m.finalScore,
        "Risk Level": m.riskLevel,
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
      link.setAttribute("download", `PA_Phonology_Dataset_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Latest Results");
      XLSX.writeFile(workbook, `PA_Phonology_Dataset_${new Date().getTime()}.xlsx`);
    }
    toast.success(`Phonology Dataset exported as ${format.toUpperCase()}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-16 h-16 border-8 border-emerald-50 border-t-emerald-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-16 pb-24">
      {/* Premium Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-4 px-5 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-black uppercase tracking-[0.25em]">
            Neural Phonology Engine
          </div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-[0.9]">
            Phonological <span className="text-emerald-600">Analytics</span>
          </h2>
          <p className="text-slate-500 font-bold text-xl max-w-3xl leading-relaxed">
            Monitor and segment student linguistic processing across complex risk tiers.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <div className="relative group flex-1 xl:w-96">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search student identity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-16 pr-10 py-6 bg-white border-2 border-slate-100 rounded-[2.5rem] text-lg font-black focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all duration-500 shadow-2xl shadow-slate-200/30"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadData('csv')}
              className="px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 hover:border-emerald-600 transition-all flex items-center gap-2">
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

      {/* Enhanced Filter Command Center (Emerald Themed) */}
      <div className="bg-emerald-950 rounded-[4rem] p-2 relative overflow-hidden shadow-2xl shadow-emerald-900/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/5 rounded-full blur-[80px] -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-4 p-6">
          {/* Grade Filter */}
          <div className="flex-1 min-w-[240px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-6 group hover:border-white/30 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
              </div>
              <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em]">Academic Level</p>
            </div>
            <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full bg-transparent text-white text-lg font-black outline-none cursor-pointer appearance-none">
              <option value="All" className="bg-emerald-950 text-white">Full Population</option>
              <option value="3" className="bg-emerald-950 text-white">Grade 3 Segment</option>
              <option value="4" className="bg-emerald-950 text-white">Grade 4 Segment</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex-1 min-w-[240px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-6 group hover:border-white/30 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-[10px] font-black text-rose-300 uppercase tracking-[0.2em]">Clinical Risk</p>
            </div>
            <div className="flex items-center justify-between">
              <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full bg-transparent text-white text-lg font-black outline-none cursor-pointer appearance-none">
                <option value="All" className="bg-emerald-950 text-white">All Indicators</option>
                <option value="Low" className="bg-emerald-950 text-white">Optimal Risk</option>
                <option value="Moderate" className="bg-emerald-950 text-white">Moderate Concern</option>
                <option value="High" className="bg-emerald-950 text-white">High Priority</option>
              </select>
              <div className={`w-3 h-3 rounded-full shrink-0 ${filterRisk === 'High' ? 'bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]' : filterRisk === 'Moderate' ? 'bg-amber-500' : filterRisk === 'Low' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
            </div>
          </div>

          {/* Performance Filter */}
          <div className="flex-1 min-w-[240px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-6 group hover:border-white/30 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-emerald-400/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em]">Precision Band</p>
            </div>
            <select value={filterScore} onChange={(e) => setFilterScore(e.target.value)}
              className="w-full bg-transparent text-white text-lg font-black outline-none cursor-pointer appearance-none">
              <option value="All" className="bg-emerald-950 text-white">Full Range</option>
              <option value="0-25" className="bg-emerald-950 text-white">Tier 4 (Critical)</option>
              <option value="26-50" className="bg-emerald-950 text-white">Tier 3 (Emerging)</option>
              <option value="51-75" className="bg-emerald-950 text-white">Tier 2 (Competent)</option>
              <option value="76-100" className="bg-emerald-950 text-white">Tier 1 (Advanced)</option>
            </select>
          </div>

          {/* Reset Action */}
          <button onClick={() => { setSearch(""); setFilterGrade("All"); setFilterRisk("All"); setFilterScore("All"); }}
            className="w-20 h-20 bg-white/10 hover:bg-rose-600 text-white rounded-[2rem] flex items-center justify-center transition-all group shrink-0 border border-white/5 active:scale-90 shadow-xl">
            <svg className="w-8 h-8 group-hover:rotate-180 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: "Data Samples", val: filteredResults.length, color: "bg-white", icon: "📊", desc: "Filtered entries" },
          { label: "Unique Nodes", val: Object.keys(filteredGrouped).length, color: "bg-white", icon: "👥", desc: "Student profiles" },
          { label: "Phonetic Health", val: "Optimal", color: "bg-white", icon: "💎", desc: "System performance" },
          { label: "Avg Precision", val: `${(filteredResults.reduce((acc, r) => acc + (r.metrics?.finalScore || 0), 0) / (filteredResults.length || 1)).toFixed(0)}%`, color: "bg-white", icon: "🎯", desc: "Current accuracy" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[3.5rem] p-10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] border border-slate-100 group hover:-translate-y-2 transition-all duration-500">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mb-8 group-hover:scale-110 transition-transform shadow-inner">
              {stat.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">{stat.label}</p>
            <h4 className="text-4xl font-black text-slate-900 leading-none mb-2">{stat.val}</h4>
            <p className="text-[11px] font-bold text-emerald-500/60 uppercase tracking-widest">{stat.desc}</p>
          </div>
        ))}
      </div>

      {Object.keys(filteredGrouped).length === 0 ? (
        <div className="bg-white rounded-[5rem] border-2 border-dashed border-slate-100 p-32 text-center flex flex-col items-center">
          <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center mb-10 relative">
            <svg className="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <div className="absolute inset-0 bg-emerald-500/5 rounded-full animate-ping"></div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Vacuum</h3>
          <p className="text-slate-500 mt-4 font-bold text-xl max-w-md mx-auto">The current phonetic filters have excluded all available data records.</p>
          <button onClick={() => { setSearch(""); setFilterGrade("All"); setFilterRisk("All"); setFilterScore("All"); }}
            className="mt-12 px-10 py-5 bg-emerald-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95">
            Reset Analytics Scope
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-12">
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

export default PAIdentifyResults;
