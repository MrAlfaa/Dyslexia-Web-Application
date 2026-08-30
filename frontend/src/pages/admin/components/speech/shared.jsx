/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {label}
    </span>
    {children}
  </label>
);

export const ModalShell = ({ title, subtitle, children, onClose, maxWidth = "max-w-2xl" }) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-md sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-2 max-h-[calc(100dvh-1rem)] w-full ${maxWidth} overflow-y-auto rounded-lg bg-white shadow-2xl sm:my-4 sm:max-h-[calc(100dvh-2rem)]`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white p-4 sm:p-5">
          <div>
            <h3 className="text-xl font-bold text-slate-950">{title}</h3>
            {subtitle && <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-teal-700">
        Speech Processing
      </p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">
        {title}
      </h2>
      <p className="mt-1.5 max-w-3xl text-sm font-normal leading-5 text-slate-500">
        {subtitle}
      </p>
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
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
