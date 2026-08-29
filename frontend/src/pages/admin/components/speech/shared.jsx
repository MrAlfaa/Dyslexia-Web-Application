/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createLatestRequestTracker } from "./SpeechProgressTimeline.utils";

export const GRADES = ["2", "3", "4", "5"];
export const TASK_TYPES = [
  "listen_repeat",
  "read_aloud_word",
  "pseudoword_read",
  "minimal_pair_read",
  "sentence_read",
];
export const DIFFICULTIES = ["easy", "medium", "hard"];
export const ERROR_TYPES = [
  "none",
  "initial_substitution",
  "final_omission",
  "vowel_error",
  "consonant_cluster_error",
  "repetition",
  "self_correction",
  "no_response",
  "invalid_audio",
  "other",
];

export const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100";

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
      {label}
    </span>
    {children}
  </label>
);

export const ModalShell = ({ title, subtitle, children, onClose, maxWidth = "max-w-2xl" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
    <div className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-[2.5rem] bg-white shadow-2xl`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-7">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-950">{title}</h3>
          {subtitle && <p className="mt-1 text-sm font-bold text-slate-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-200"
        >
          Close
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-teal-700">
        Speech Processing
      </p>
      <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-base font-bold leading-7 text-slate-500">
        {subtitle}
      </p>
    </div>
    {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
  </div>
);

export const useGuardianPageData = ({ enabled, selectedChildId, load }) => {
  const trackerRef = useRef(createLatestRequestTracker());
  const [result, setResult] = useState({ childId: "", data: null });
  const [requestState, setRequestState] = useState("loading");
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    if (!enabled || !selectedChildId) return;

    const childId = selectedChildId;
    const requestId = trackerRef.current.next();
    setRequestState("loading");
    setError(null);

    try {
      const data = await load(childId);
      if (!trackerRef.current.isCurrent(requestId)) return;
      setResult({ childId, data });
      setRequestState("ready");
    } catch (requestError) {
      if (!trackerRef.current.isCurrent(requestId)) return;
      setResult({ childId, data: null });
      setError(requestError);
      setRequestState("request_failed");
    }
  }, [enabled, load, selectedChildId]);

  useEffect(() => {
    if (!enabled || !selectedChildId) {
      trackerRef.current.invalidate();
      return undefined;
    }

    const tracker = trackerRef.current;
    void Promise.resolve().then(run);
    return () => tracker.invalidate();
  }, [enabled, run, selectedChildId]);

  const matchesSelectedChild = result.childId === selectedChildId;

  return {
    data: matchesSelectedChild ? result.data : null,
    state: matchesSelectedChild ? requestState : "loading",
    error: matchesSelectedChild ? error : null,
    retry: run,
  };
};

export const downloadBlob = (response, filename) => {
  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
