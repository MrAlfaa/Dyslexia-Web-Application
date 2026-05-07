import React from "react";

const WMImproveResults = () => {
  return (
    <div className="space-y-10 pb-20 animate-fadeIn">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">
          Cognitive Remediation
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Working Memory <span className="text-indigo-600">Improvement</span></h2>
        <p className="text-slate-500 font-medium max-w-2xl">
          Track student progress through the adaptive training modules and intervention exercises.
        </p>
      </div>

      <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center relative z-10 shadow-inner">
            <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="absolute inset-0 bg-indigo-400/20 rounded-[2rem] blur-2xl animate-pulse"></div>
        </div>
        
        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Module Under Development</h3>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          The longitudinal improvement tracking and comparative analysis engine is currently being finalized.
        </p>
        
        <div className="mt-10 flex gap-3">
          <div className="px-4 py-2 bg-slate-900 rounded-xl text-white text-[10px] font-black uppercase tracking-widest">v2.0 Beta</div>
          <div className="px-4 py-2 bg-indigo-50 rounded-xl text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">Release Q3 2026</div>
        </div>
      </div>
    </div>
  );
};

export default WMImproveResults;
