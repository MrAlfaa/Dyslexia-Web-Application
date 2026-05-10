import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  exportSpeechAttemptsCsv,
  exportSpeechManualLabelsCsv,
  exportSpeechSessionsCsv,
  getFilteredAdminSpeechResults,
  getSpeechSessionDetail,
} from "../../../services/admin/api";
import { downloadBlob, Field, GRADES, inputClass, ModalShell } from "./speech/shared";

const API_ORIGIN = "http://localhost:5000";

const supportLabelMap = {
  low_support: "Low support need",
  medium_support: "Medium support need",
  high_support: "High support need",
  unknown: "Unknown",
};

const initialFilters = {
  grade: "",
  supportLevel: "",
  mode: "",
  status: "",
};

const SessionDetailModal = ({ sessionId, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const response = await getSpeechSessionDetail(sessionId);
        setDetail(response.data?.data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load session detail");
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [sessionId]);

  return (
    <ModalShell
      title="Speech Session Detail"
      subtitle="Attempts, audio playback, placeholder features, and manual labels."
      onClose={onClose}
      maxWidth="max-w-6xl"
    >
      <div className="p-7">
        {loading ? (
          <p className="font-bold text-slate-500">Loading session detail...</p>
        ) : (
          <div className="space-y-5">
            {(detail?.attempts || []).map((attempt) => (
              <article key={attempt._id} className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-100">
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
                      {attempt.promptId} | {attempt.taskType}
                    </p>
                    <h4 className="mt-2 text-3xl font-black text-slate-950">{attempt.targetText}</h4>
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      Valid audio: {attempt.validAudio ? "Yes" : "No"} | Score: {Math.round((attempt.itemResult?.pronunciationScore || 0) * 100)}%
                    </p>
                    {attempt.audioUrl && (
                      <audio className="mt-4 w-full" src={`${API_ORIGIN}${attempt.audioUrl}`} controls />
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                      <p className="text-xs font-black uppercase text-slate-400">Manual Label</p>
                      <p className="mt-2 text-sm font-black text-slate-800">{attempt.manualLabelStatus}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                      <p className="text-xs font-black uppercase text-slate-400">Error Type</p>
                      <p className="mt-2 text-sm font-black text-slate-800">{attempt.manualLabel?.errorType || "—"}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 sm:col-span-2">
                      <p className="text-xs font-black uppercase text-slate-400">Teacher Transcript</p>
                      <p className="mt-2 text-sm font-black text-slate-800">{attempt.manualLabel?.teacherTranscript || "—"}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 sm:col-span-2">
                      <p className="text-xs font-black uppercase text-slate-400">Placeholder Features</p>
                      <p className="mt-2 break-words text-xs font-bold text-slate-600">
                        {JSON.stringify(attempt.features || {})}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!detail?.attempts?.length && (
              <p className="rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">
                No attempts recorded for this session.
              </p>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

const SpeechSupportResults = () => {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [detailSessionId, setDetailSessionId] = useState("");

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await getFilteredAdminSpeechResults(filters);
      setRecords(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load Speech-Reading Support results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleFilterChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const handleExport = async (type) => {
    try {
      if (type === "attempts") {
        downloadBlob(await exportSpeechAttemptsCsv(), "speech-attempts.csv");
      } else if (type === "sessions") {
        downloadBlob(await exportSpeechSessionsCsv(), "speech-sessions.csv");
      } else {
        downloadBlob(await exportSpeechManualLabelsCsv(), "speech-manual-labels.csv");
      }
    } catch (error) {
      toast.error("CSV export failed");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-teal-700">Speech Processing</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Speech Support Results</h2>
          <p className="mt-3 max-w-3xl text-base font-bold leading-7 text-slate-500">
            Internal Guardian Console monitoring for Speech-Reading Support sessions, attempts, labels, and recommendations.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleExport("attempts")} className="rounded-2xl bg-sky-50 px-4 py-3 text-xs font-black text-sky-700 ring-1 ring-sky-100">Export Attempts CSV</button>
          <button onClick={() => handleExport("sessions")} className="rounded-2xl bg-teal-50 px-4 py-3 text-xs font-black text-teal-700 ring-1 ring-teal-100">Export Sessions CSV</button>
          <button onClick={() => handleExport("labels")} className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white">Export Manual Labels CSV</button>
        </div>
      </div>

      <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="grid gap-4 md:grid-cols-5">
          <Field label="Grade">
            <select className={inputClass} name="grade" value={filters.grade} onChange={handleFilterChange}>
              <option value="">All</option>
              {GRADES.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
            </select>
          </Field>
          <Field label="Support Level">
            <select className={inputClass} name="supportLevel" value={filters.supportLevel} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="low_support">Low support need</option>
              <option value="medium_support">Medium support need</option>
              <option value="high_support">High support need</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
          <Field label="Mode">
            <select className={inputClass} name="mode" value={filters.mode} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="demo">demo</option>
              <option value="assigned">assigned</option>
              <option value="data_collection">data_collection</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
            </select>
          </Field>
          <div className="flex items-end">
            <button onClick={fetchResults} className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Student", "Username", "Grade", "Mode", "Attempts", "Manual Labels", "Support Level", "Score", "Model", "Completed", "Actions"].map((heading) => (
                  <th key={heading} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={11} className="p-10 text-center font-bold text-slate-500">Loading results...</td></tr>
              ) : records.map((record) => {
                const student = record.studentId || {};
                return (
                  <tr key={record._id} className="hover:bg-sky-50/30">
                    <td className="px-5 py-4 font-black text-slate-950">{student.fullName || "Student"}</td>
                    <td className="px-5 py-4 text-sm font-bold text-teal-700">{student.username || "—"}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-600">{student.grade || record.grade || "—"}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-600">{record.mode}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-600">
                      {record.attemptSummary?.validAttemptCount || 0}/{record.attemptSummary?.totalAttemptCount || 0}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-600">{record.manualLabelCount || 0}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                        {supportLabelMap[record.supportLevel] || record.supportLevel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-600">{Math.round((record.supportScore || 0) * 100)}%</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-600">{record.modelVersion || "placeholder_v1"}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-600">
                      {record.completedAt ? new Date(record.completedAt).toLocaleString() : "In progress"}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => setDetailSessionId(record._id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">
                        View Session Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && !records.length && (
                <tr><td colSpan={11} className="p-14 text-center font-bold text-slate-500">No speech sessions completed yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailSessionId && (
        <SessionDetailModal sessionId={detailSessionId} onClose={() => setDetailSessionId("")} />
      )}
    </div>
  );
};

export default SpeechSupportResults;
