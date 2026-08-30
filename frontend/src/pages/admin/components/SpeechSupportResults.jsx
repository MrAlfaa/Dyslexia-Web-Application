import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, SlidersHorizontal, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import GuardianCard from "../../../components/guardian/ui/GuardianCard";
import GuardianPageHeader from "../../../components/guardian/ui/GuardianPageHeader";
import GuardianRequestState from "../../../components/guardian/ui/GuardianRequestState";
import GuardianStatCard from "../../../components/guardian/ui/GuardianStatCard";
import GuardianStatusBadge from "../../../components/guardian/ui/GuardianStatusBadge";
import { useGuardianChild } from "../../../contexts/GuardianChildContext";
import {
  exportSpeechAttemptsCsv,
  exportSpeechManualLabelsCsv,
  exportSpeechSessionsCsv,
  getFilteredAdminSpeechResults,
  getSpeechSessionDetail,
} from "../../../services/admin/api";
import { downloadBlob, Field, GRADES, inputClass, ModalShell } from "./speech/shared";
import { formatSpeechLabel } from "./speech/speechGuardianUtils";

const API_ORIGIN = "http://localhost:5000";

const initialFilters = {
  grade: "",
  supportLevel: "",
  mode: "",
  status: "",
};

const toAudioUrl = (value) => {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `${API_ORIGIN}${value}`;
};

const getActivityLabel = (record) =>
  formatSpeechLabel(record.activityId, record.mode ? formatSpeechLabel(record.mode) : "Speech session");

const SessionDetailModal = ({ sessionId, isSuperAdmin, onClose }) => {
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
    void loadDetail();
  }, [sessionId]);

  return (
    <ModalShell
      title="Speech session review"
      subtitle="Listen to the recordings and review the child-friendly speech-reading evidence."
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <div className="p-5">
        {loading ? (
          <p className="py-10 text-center text-sm font-semibold text-slate-500">Loading session...</p>
        ) : (
          <div className="space-y-3">
            {(detail?.attempts || []).map((attempt, index) => (
              <article key={attempt._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-teal-700">
                      Attempt {index + 1} · {formatSpeechLabel(attempt.taskType, "Speech task")}
                    </p>
                    <h4 className="mt-1.5 text-base font-bold leading-6 text-slate-950">
                      {attempt.targetText || "Speech prompt"}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <GuardianStatusBadge value={attempt.validAudio ? "completed" : "needs_review"} />
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        {formatSpeechLabel(attempt.audioQuality?.qualityLabel, attempt.validAudio ? "Usable audio" : "Unusable audio")}
                      </span>
                    </div>
                    {attempt.audioUrl && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <Volume2 className="h-4 w-4 text-teal-700" /> Recording
                        </div>
                        <audio className="w-full" src={toAudioUrl(attempt.audioUrl)} controls preload="none" />
                      </div>
                    )}
                  </div>
                  <dl className="grid content-start gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                      <dt className="text-[10px] font-semibold uppercase text-slate-400">Learning result</dt>
                      <dd className="mt-1 text-[13px] font-semibold text-slate-800">
                        {attempt.childFeedback || attempt.itemResult?.childFeedback || "Recorded for review"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                      <dt className="text-[10px] font-semibold uppercase text-slate-400">Stars</dt>
                      <dd className="mt-1 text-[13px] font-semibold text-slate-800">
                        {attempt.starsEarned ?? attempt.itemResult?.starsEarned ?? "-"}
                      </dd>
                    </div>
                    {isSuperAdmin && (
                      <>
                        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                          <dt className="text-[10px] font-semibold uppercase text-slate-400">Manual label</dt>
                          <dd className="mt-1 text-[13px] font-semibold text-slate-800">
                            {attempt.manualLabel?.speechSupportLabel || "Not labelled"}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                          <dt className="text-[10px] font-semibold uppercase text-slate-400">Error type</dt>
                          <dd className="mt-1 text-[13px] font-semibold text-slate-800">
                            {attempt.manualLabel?.errorType || "-"}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>
              </article>
            ))}
            {!detail?.attempts?.length && (
              <p className="rounded-lg bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                No attempts were recorded for this session.
              </p>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

const SpeechSupportResults = () => {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isSuperAdmin = adminUser.role === "super admin";
  const {
    selectedChildId,
    state: childState,
    error: childError,
    refreshChildren,
  } = useGuardianChild();
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState(null);
  const [detailSessionId, setDetailSessionId] = useState("");

  const fetchResults = useCallback(async (appliedFilters = initialFilters) => {
    if (!selectedChildId) return;
    setLoading(true);
    setRequestError(null);
    try {
      const response = await getFilteredAdminSpeechResults({
        ...appliedFilters,
        studentId: selectedChildId,
      });
      setRecords(response.data?.data || []);
    } catch (error) {
      setRequestError(error);
      toast.error(error.response?.data?.message || "Failed to load speech support results");
    } finally {
      setLoading(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (childState === "ready") void fetchResults(initialFilters);
  }, [childState, fetchResults]);

  const summary = useMemo(() => {
    const completed = records.filter((record) => record.status === "completed").length;
    const validRecordings = records.reduce(
      (total, record) => total + Number(record.attemptSummary?.validAttemptCount || 0),
      0
    );
    const totalRecordings = records.reduce(
      (total, record) => total + Number(record.attemptSummary?.totalAttemptCount || 0),
      0
    );
    const latestResult = records.find(
      (record) => record.status === "completed" && record.supportLevel && record.supportLevel !== "unknown"
    );
    return { completed, validRecordings, totalRecordings, latestResult };
  }, [records]);

  const handleFilterChange = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
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
    } catch {
      toast.error("CSV export failed");
    }
  };

  const effectiveState = childState !== "ready"
    ? childState
    : requestError
      ? "request_failed"
      : "ready";

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        eyebrow="Speech Processing"
        title="Speech Support Results"
        subtitle="Review the selected child's speech-reading support indicator, recording evidence, and completed sessions."
        actions={isSuperAdmin ? (
          <>
            <button onClick={() => handleExport("attempts")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
              <Download className="h-4 w-4" /> Attempts CSV
            </button>
            <button onClick={() => handleExport("sessions")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
              <Download className="h-4 w-4" /> Sessions CSV
            </button>
            <button onClick={() => handleExport("labels")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              <Download className="h-4 w-4" /> Labels CSV
            </button>
          </>
        ) : null}
      />

      {effectiveState !== "ready" ? (
        <GuardianRequestState
          state={effectiveState}
          error={requestError || childError}
          onRetry={childState === "ready" ? () => fetchResults(filters) : refreshChildren}
          onAddChild={() => navigate("/admin/students")}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <GuardianStatCard label="Sessions" value={records.length} helper="Sessions matching the current filters" tone="slate" />
            <GuardianStatCard label="Completed" value={summary.completed} helper="Completed speech-reading sessions" tone="emerald" />
            <GuardianStatCard label="Usable recordings" value={`${summary.validRecordings}/${summary.totalRecordings}`} helper="Clear enough for learning review" tone="sky" />
            <div className="rounded-lg border border-[#DCE5E0] bg-[#FFF9EB] p-4 shadow-[0_4px_14px_rgba(16,36,30,0.045)]">
              <p className="text-xs font-semibold text-[#5B6475]">Latest support indicator</p>
              <div className="mt-2">
                <GuardianStatusBadge value={summary.latestResult?.supportLevel || "unknown"} type="support" />
              </div>
              <p className="mt-2 text-xs font-medium text-[#667085]">Pronunciation-support evidence, not a diagnosis</p>
            </div>
          </div>

          <GuardianCard>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Grade">
                <select className={inputClass} name="grade" value={filters.grade} onChange={handleFilterChange}>
                  <option value="">All grades</option>
                  {GRADES.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
                </select>
              </Field>
              <Field label="Support need">
                <select className={inputClass} name="supportLevel" value={filters.supportLevel} onChange={handleFilterChange}>
                  <option value="">All indicators</option>
                  <option value="low_support">Low support need</option>
                  <option value="medium_support">Medium support need</option>
                  <option value="high_support">High support need</option>
                  <option value="unknown">Pending / unknown</option>
                </select>
              </Field>
              <Field label="Session type">
                <select className={inputClass} name="mode" value={filters.mode} onChange={handleFilterChange}>
                  <option value="">All session types</option>
                  <option value="identification">Identification</option>
                  <option value="improvement">Improvement</option>
                  {isSuperAdmin && <option value="data_collection">Data collection</option>}
                  {isSuperAdmin && <option value="assigned">Assigned</option>}
                  {isSuperAdmin && <option value="demo">Demo</option>}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputClass} name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="">All statuses</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </Field>
              <div className="flex items-end">
                <button onClick={() => fetchResults(filters)} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#17211E] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0F5F48]">
                  <SlidersHorizontal className="h-4 w-4" /> Apply filters
                </button>
              </div>
            </div>
          </GuardianCard>

          <div className="overflow-hidden rounded-lg border border-[#DCE5E0] bg-white shadow-[0_4px_14px_rgba(16,36,30,0.045)]">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full">
                <thead className="bg-[#F6F9F7]">
                  <tr>
                    {["Session", "Type", "Recording evidence", "Support indicator", "Status", "Action"].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#667085]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEEA]">
                  {loading ? (
                    <tr><td colSpan={6} className="p-10 text-center text-sm font-semibold text-slate-500">Loading results...</td></tr>
                  ) : records.map((record) => {
                    const student = record.studentId || {};
                    const validAttempts = Number(record.attemptSummary?.validAttemptCount || 0);
                    const totalAttempts = Number(record.attemptSummary?.totalAttemptCount || 0);
                    return (
                      <tr key={record._id} className="align-top transition hover:bg-[#FBFDFC]">
                        <td className="px-4 py-4">
                          <p className="text-[13px] font-bold text-[#101828]">{student.fullName || "Student"}</p>
                          <p className="mt-1 text-xs font-medium text-[#667085]">
                            {record.completedAt ? new Date(record.completedAt).toLocaleString() : "Not completed"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[13px] font-semibold text-[#101828]">{getActivityLabel(record)}</p>
                          <p className="mt-1 text-xs font-medium text-[#667085]">{formatSpeechLabel(record.mode, "Speech session")}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[13px] font-bold text-[#101828]">{validAttempts}/{totalAttempts} usable</p>
                          {isSuperAdmin && (
                            <p className="mt-1 text-xs font-medium text-[#667085]">{record.manualLabelCount || 0} manual label(s)</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <GuardianStatusBadge value={record.supportLevel || "unknown"} type="support" />
                        </td>
                        <td className="px-4 py-4">
                          <GuardianStatusBadge value={record.status || "in_progress"} />
                          {record.snapshotStatus && (
                            <p className="mt-2 text-xs font-medium text-[#667085]">Evidence: {formatSpeechLabel(record.snapshotStatus)}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <button onClick={() => setDetailSessionId(record._id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DCE5E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition hover:border-[#9FCDBB] hover:bg-[#F3FAF6]">
                            <Eye className="h-4 w-4" /> Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && !records.length && (
                    <tr><td colSpan={6} className="p-12 text-center text-sm font-semibold text-slate-500">No speech sessions match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {detailSessionId && (
        <SessionDetailModal
          sessionId={detailSessionId}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setDetailSessionId("")}
        />
      )}
    </div>
  );
};

export default SpeechSupportResults;
