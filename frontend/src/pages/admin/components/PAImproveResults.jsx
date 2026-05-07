import React from "react";

const PAImproveResults = () => {
  return (
    <div className="space-y-10 pb-20 animate-fadeIn">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">
          Linguistic Intervention
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">PA <span className="text-emerald-600">Improvement</span></h2>
        <p className="text-slate-500 font-medium max-w-2xl">
          Visualize progress in phonological awareness intervention sessions and longitudinal performance gains.
        </p>
      </div>

      <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center relative z-10 shadow-inner">
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div className="absolute inset-0 bg-emerald-400/20 rounded-[2rem] blur-2xl animate-pulse"></div>
        </div>
        
        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Module Deployment in Progress</h3>
        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
          The Phonological Awareness Improvement metrics and comparative reporting dashboard are being optimized for accuracy.
        </p>
        
        <div className="mt-10 flex gap-3">
          <div className="px-4 py-2 bg-slate-900 rounded-xl text-white text-[10px] font-black uppercase tracking-widest">In Development</div>
          <div className="px-4 py-2 bg-emerald-50 rounded-xl text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">ETA: July 2026</div>
        </div>
      </div>
    </div>
  );
};

export default PAImproveResults;
