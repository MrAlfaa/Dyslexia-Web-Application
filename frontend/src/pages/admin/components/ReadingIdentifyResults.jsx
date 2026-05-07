import React from "react";

const ReadingIdentifyResults = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
      <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 text-4xl">📚</div>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Reading Processing Analysis</h2>
      <p className="text-lg font-bold">Linguistic identification records will appear here.</p>
      <div className="mt-8 px-6 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest">Module Initializing</div>
    </div>
  );
};

export default ReadingIdentifyResults;
