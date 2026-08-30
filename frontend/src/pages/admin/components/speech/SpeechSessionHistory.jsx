import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  getGuardianSpeechSessionHistory,
  recomputeSpeechAssessment,
  reprocessSpeechAttemptAnalysis,
} from "../../../../services/admin/api";
import GuardianButton from "../../../../components/guardian/ui/GuardianButton";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianEmptyState from "../../../../components/guardian/ui/GuardianEmptyState";
import GuardianPageHeader from "../../../../components/guardian/ui/GuardianPageHeader";
import GuardianRequestState from "../../../../components/guardian/ui/GuardianRequestState";
import GuardianSelect from "../../../../components/guardian/ui/GuardianSelect";
import { useGuardianChild } from "../../../../contexts/GuardianChildContext";
import SpeechSessionDrawer from "./SpeechSessionDrawer";
import {
  isSessionActionCurrent,
  summarizeSessionQuality,
} from "./speechSessionPresentation.utils";
import { useGuardianPageData } from "./shared";

const formatDate = (value, language, unavailable) => {
  if (!value) return unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unavailable;
  return date.toLocaleDateString(language === "si" ? "si-LK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getActivityTitle = (session, t) =>
  session.activity?.title ||
  (session.mode === "identification"
    ? t("guardian_session_identification_activity")
    : t("guardian_session_default_activity"));

function SpeechSessionHistory() {
  const { t, i18n } = useTranslation("sp");
  const {
    selectedChildId,
    selectedChild,
    state: childState,
    error: childError,
    refreshChildren,
  } = useGuardianChild();
  const [selectedSession, setSelectedSession] = useState(null);
  const [modeFilter, setModeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [adminActionId, setAdminActionId] = useState("");
  const selectedSessionRef = useRef(null);
  const selectedChildIdRef = useRef(selectedChildId);
  const actionSequenceRef = useRef(0);

  const loadHistory = useCallback(async (childId) => {
    const response = await getGuardianSpeechSessionHistory(childId);
    return response.data?.data || null;
  }, []);
  const pageRequest = useGuardianPageData({
    enabled: childState === "ready",
    selectedChildId,
    load: loadHistory,
  });
  const history = pageRequest.data;
  const canViewTechnical = Boolean(history?.viewer?.canViewTechnical);

  useEffect(() => () => {
    actionSequenceRef.current += 1;
    selectedSessionRef.current = null;
  }, []);

  useEffect(() => {
    selectedChildIdRef.current = selectedChildId;
    actionSequenceRef.current += 1;
    selectedSessionRef.current = null;
    setSelectedSession(null);
    setAdminActionId("");
  }, [selectedChildId]);

  const sessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (history?.sessions || []).filter((session) => {
      const modeMatches = modeFilter === "all" || session.mode === modeFilter;
      const searchable = `${session.mode || ""} ${session.activity?.title || ""} ${session.status || ""}`.toLowerCase();
      return modeMatches && (!query || searchable.includes(query));
    });
  }, [history?.sessions, modeFilter, search]);

  const effectiveState = childState === "ready" ? pageRequest.state : childState;
  const effectiveError = childState === "ready" ? pageRequest.error : childError;
  const retry = childState === "ready" ? pageRequest.retry : refreshChildren;

  const openSession = (session) => {
    actionSequenceRef.current += 1;
    selectedSessionRef.current = session;
    setSelectedSession(session);
    setAdminActionId("");
  };

  const closeSession = useCallback(() => {
    actionSequenceRef.current += 1;
    selectedSessionRef.current = null;
    setSelectedSession(null);
    setAdminActionId("");
  }, []);

  const isCurrentAction = (sequence, childId, sessionId) =>
    isSessionActionCurrent({
      sequence,
      currentSequence: actionSequenceRef.current,
      childId,
      currentChildId: selectedChildIdRef.current,
      sessionId,
      currentSession: selectedSessionRef.current,
    });

  const recomputeSelectedSession = async () => {
    const session = selectedSessionRef.current;
    if (!canViewTechnical || !session?._id || adminActionId) return;

    const sessionId = session._id;
    const childId = selectedChildIdRef.current;
    const sequence = actionSequenceRef.current + 1;
    actionSequenceRef.current = sequence;
    setAdminActionId(sessionId);
    try {
      const response = await recomputeSpeechAssessment(sessionId);
      if (!isCurrentAction(sequence, childId, sessionId)) return;

      const snapshots = response.data?.data?.snapshots || [];
      const latest = snapshots[snapshots.length - 1];
      setSelectedSession((previous) => {
        if (!previous || previous._id !== sessionId || !isCurrentAction(sequence, childId, sessionId)) {
          return previous;
        }
        const next = {
          ...previous,
          snapshotStatus: latest?.status || previous.snapshotStatus,
          assessmentSnapshots: snapshots,
        };
        selectedSessionRef.current = next;
        return next;
      });
      toast.success(t("guardian_session_recompute_success"));
    } catch (error) {
      if (isCurrentAction(sequence, childId, sessionId)) {
        toast.error(error.response?.data?.message || t("guardian_session_recompute_error"));
      }
    } finally {
      if (isCurrentAction(sequence, childId, sessionId)) setAdminActionId("");
    }
  };

  const reprocessAttempt = async (attemptId) => {
    const session = selectedSessionRef.current;
    if (!canViewTechnical || !attemptId || !session?._id || adminActionId) return;

    const sessionId = session._id;
    const childId = selectedChildIdRef.current;
    const sequence = actionSequenceRef.current + 1;
    actionSequenceRef.current = sequence;
    setAdminActionId(attemptId);
    try {
      const response = await reprocessSpeechAttemptAnalysis(attemptId);
      if (!isCurrentAction(sequence, childId, sessionId)) return;

      const updated = response.data?.data || {};
      setSelectedSession((previous) => {
        if (!previous || previous._id !== sessionId || !isCurrentAction(sequence, childId, sessionId)) {
          return previous;
        }
        const next = {
          ...previous,
          attempts: (previous.attempts || []).map((attempt) =>
            attempt._id === attemptId ? { ...attempt, ...updated } : attempt
          ),
        };
        selectedSessionRef.current = next;
        return next;
      });
      toast.success(t("guardian_session_reprocess_success"));
    } catch (error) {
      if (isCurrentAction(sequence, childId, sessionId)) {
        toast.error(error.response?.data?.message || t("guardian_session_reprocess_error"));
      }
    } finally {
      if (isCurrentAction(sequence, childId, sessionId)) setAdminActionId("");
    }
  };

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title={t("guardian_session_history_title")}
        subtitle={t("guardian_session_history_subtitle")}
      />

      {effectiveState !== "ready" ? (
        <GuardianRequestState state={effectiveState} error={effectiveError} onRetry={retry} />
      ) : !selectedChild ? (
        <GuardianRequestState state="no_owned_children" />
      ) : (
        <>
          <GuardianCard className="p-3.5">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <label>
                <span className="sr-only">{t("guardian_session_search_label")}</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("guardian_session_search_placeholder")}
                  className="guardian-focus min-h-10 w-full rounded-lg border border-[#D7E2DC] bg-white px-3 py-2 text-[13px] font-medium text-[#101828] outline-none focus:border-[#157A5A]"
                />
              </label>
              <label>
                <span className="sr-only">{t("guardian_session_mode_filter")}</span>
                <GuardianSelect value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
                  <option value="all">{t("guardian_session_mode_all")}</option>
                  <option value="identification">{t("guardian_session_mode_identification")}</option>
                  <option value="improvement">{t("guardian_session_mode_improvement")}</option>
                </GuardianSelect>
              </label>
            </div>
          </GuardianCard>

          {sessions.length ? (
            <GuardianCard className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-left">
                  <thead className="border-b border-[#E5EDE7] bg-[#F8FBF8]">
                    <tr className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#5B6475]">
                      <th className="px-3.5 py-2.5">{t("guardian_session_date")}</th>
                      <th className="px-3.5 py-2.5">{t("guardian_session_mode")}</th>
                      <th className="px-3.5 py-2.5">{t("guardian_session_activity")}</th>
                      <th className="px-3.5 py-2.5">{t("guardian_session_quality_status")}</th>
                      <th className="px-3.5 py-2.5">{t("guardian_session_attempts")}</th>
                      <th className="px-3.5 py-2.5 text-right">{t("guardian_session_action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EDE7]">
                    {sessions.map((session) => {
                      const quality = summarizeSessionQuality(session);
                      return (
                        <tr key={session._id} className="align-middle hover:bg-[#FBFDFC]">
                          <td className="whitespace-nowrap px-3.5 py-3 text-xs font-medium text-[#5B6475]">
                            {formatDate(session.completedAt, i18n.language, t("guardian_not_available"))}
                          </td>
                          <td className="px-3.5 py-3 text-xs font-semibold text-[#101828]">
                            {t(`guardian_session_mode_${session.mode || "unknown"}`)}
                          </td>
                          <td className="max-w-[260px] px-3.5 py-3 text-[13px] font-semibold text-[#101828]">
                            {getActivityTitle(session, t)}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#F5F7F6] px-2.5 py-1 text-xs font-semibold text-[#5B6475]">
                                {t(`guardian_session_quality_${quality.status}`)}
                              </span>
                              <span className="rounded-full bg-[#EAF7F0] px-2.5 py-1 text-xs font-semibold text-[#0F5F48]">
                                {t(`guardian_session_status_${session.status || "unknown"}`)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-[13px] font-semibold text-[#101828]">{quality.total}</td>
                          <td className="px-3.5 py-3 text-right">
                            <GuardianButton variant="secondary" onClick={() => openSession(session)}>
                              {t("guardian_session_view")}
                            </GuardianButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GuardianCard>
          ) : (
            <GuardianEmptyState
              title={t("guardian_session_no_matches")}
              message={t("guardian_session_no_matches_message")}
            />
          )}
        </>
      )}

      {selectedSession && (
        <SpeechSessionDrawer
          key={selectedSession._id}
          session={selectedSession}
          isSuperAdmin={canViewTechnical}
          actionId={adminActionId}
          onClose={closeSession}
          onRecompute={recomputeSelectedSession}
          onReprocess={reprocessAttempt}
        />
      )}
    </div>
  );
}

export default SpeechSessionHistory;
