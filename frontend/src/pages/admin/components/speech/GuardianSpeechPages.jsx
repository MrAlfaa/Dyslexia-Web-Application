import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  getAdminStudents,
  getFilteredAdminSpeechResults,
  getGuardianSpeechIdentificationResult,
  getSpeechSessionDetail,
  getSpeechSystemActivities,
} from "../../../../services/admin/api";

const supportText = {
  low_support: "Low Support",
  medium_support: "Medium Support",
  high_support: "High Support",
  unknown: "Unknown",
};

const activityTitle = (activities, id) =>
  activities.find((activity) => activity.activityId === id)?.title ||
  id ||
  "Not selected";

function GuardianSpeechPages({ mode }) {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [identificationResult, setIdentificationResult] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedChild = useMemo(
    () => children.find((child) => child._id === selectedChildId),
    [children, selectedChildId]
  );

  const speechProgress = selectedChild?.lexilandProgress?.speech || {};
  const guardianSpeech =
    mode === "identification" && identificationResult
      ? {
          identificationStatus: identificationResult.identificationStatus,
          supportLevel: identificationResult.supportLevel,
          supportScore: identificationResult.supportScore,
          identificationCompletedAt: identificationResult.completedAt,
          recommendedActivityIds:
            identificationResult.recommendedActivityIds || [],
        }
      : speechProgress;
  const recommendedIds = guardianSpeech.recommendedActivityIds || [];

  const title =
    mode === "identification"
      ? "Identification Result"
      : mode === "improvement"
        ? "Improvement Progress"
        : mode === "history"
          ? "Session History"
          : "Speech Overview";

  const load = async () => {
    setLoading(true);
    try {
      const [childrenRes, sessionsRes, activitiesRes] = await Promise.all([
        getAdminStudents(),
        getFilteredAdminSpeechResults({ mode: mode === "history" ? "" : undefined }),
        getSpeechSystemActivities(),
      ]);
      const childList = childrenRes.data?.data || [];
      setChildren(childList);
      setSelectedChildId((current) => current || childList[0]?._id || "");
      setSessions(sessionsRes.data?.data || []);
      setActivities(activitiesRes.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load speech progress");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadIdentificationResult = async () => {
      if (mode !== "identification" || !selectedChildId) {
        setIdentificationResult(null);
        return;
      }

      try {
        const response = await getGuardianSpeechIdentificationResult(selectedChildId);
        setIdentificationResult(response.data?.data || null);
      } catch (error) {
        setIdentificationResult(null);
        toast.error(error.response?.data?.message || "Could not load Leo's result");
      }
    };

    loadIdentificationResult();
  }, [mode, selectedChildId]);

  const childSessions = sessions.filter((session) =>
    selectedChildId
      ? String(session.studentId?._id || session.studentId) === String(selectedChildId)
      : true
  );

  const openDetail = async (sessionId) => {
    try {
      const response = await getSpeechSessionDetail(sessionId);
      setDetail(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load session detail");
    }
  };

  if (loading) {
    return (
      <div className="h-16 w-16 animate-spin rounded-full border-8 border-emerald-50 border-t-emerald-600" />
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
            Speech Processing
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-base font-bold text-slate-500">
            Monitor Leo's Sound Safari progress and recommendations for learning support.
          </p>
        </div>
        <select
          value={selectedChildId}
          onChange={(event) => setSelectedChildId(event.target.value)}
          className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        >
          {children.map((child) => (
            <option key={child._id} value={child._id}>
              {child.fullName} ({child.username || "no username"})
            </option>
          ))}
        </select>
      </div>

      {!selectedChild ? (
        <div className="rounded-[2rem] bg-white p-10 text-center font-black text-slate-400 ring-1 ring-slate-100">
          No children added yet.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            {[
              ["Child", selectedChild.fullName],
              ["Identification", guardianSpeech.identificationStatus || "not_started"],
              ["Support Level", supportText[guardianSpeech.supportLevel] || "Unknown"],
              [
                "Support Score",
                guardianSpeech.supportScore !== undefined &&
                guardianSpeech.supportScore !== null
                  ? `${Math.round(Number(guardianSpeech.supportScore) * 100)}%`
                  : "-",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {label}
                </p>
                <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </section>

          {mode !== "history" && (
            <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-emerald-100/50 ring-1 ring-emerald-100">
              <h3 className="text-2xl font-black text-slate-950">
                {mode === "improvement" ? "Recommended Training Path" : "Leo's Summary"}
              </h3>
              <p className="mt-3 text-base font-bold leading-7 text-slate-600">
                {guardianSpeech.identificationStatus === "completed"
                  ? "Leo found that this child needs a personalized sound and reading practice path."
                  : "Leo's First Sound Check has not been completed yet."}
              </p>
              {mode === "identification" && (
                <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-100">
                  This is a speech-reading support indicator, not a clinical diagnosis.
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                {(recommendedIds.length ? recommendedIds : ["No recommendation yet"]).map((id) => (
                  <span
                    key={id}
                    className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-100"
                  >
                    {activityTitle(activities, id)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {mode === "identification" && identificationResult?.recentSession && (
            <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-emerald-100/45 ring-1 ring-emerald-100">
              <h3 className="text-2xl font-black text-slate-950">Latest Sound Check</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                {[
                  ["Status", identificationResult.recentSession.status],
                  ["Model", identificationResult.recentSession.modelVersion],
                  [
                    "Attempts",
                    `${identificationResult.attemptsSummary?.validAttemptCount || 0}/${identificationResult.attemptsSummary?.totalAttemptCount || 0} valid`,
                  ],
                  [
                    "Completed",
                    identificationResult.completedAt
                      ? new Date(identificationResult.completedAt).toLocaleDateString()
                      : "-",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/45 ring-1 ring-slate-100">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  {["Mode", "Status", "Score", "Attempts", "Completed", "Action"].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {childSessions.map((session) => (
                  <tr key={session._id}>
                    <td className="px-5 py-4 text-sm font-bold">{session.mode}</td>
                    <td className="px-5 py-4 text-sm font-bold">{session.status}</td>
                    <td className="px-5 py-4 text-sm font-bold">
                      {session.supportScore ?? "-"}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold">
                      {session.attemptSummary?.totalAttemptCount || 0}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold">
                      {session.completedAt
                        ? new Date(session.completedAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openDetail(session._id)}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {!childSessions.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm font-black uppercase tracking-[0.2em] text-slate-400"
                    >
                      No speech sessions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-950">Session Detail</h3>
                <p className="text-sm font-bold text-slate-500">
                  Audio is shown when available.
                </p>
              </div>
              <button
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
            </div>
            <div className="mt-6 space-y-4">
              {detail.attempts.map((attempt) => (
                <div
                  key={attempt._id}
                  className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100"
                >
                  <p className="text-lg font-black text-slate-950">{attempt.targetText}</p>
                  <p className="text-sm font-bold text-slate-500">
                    {attempt.taskType} | valid audio: {String(attempt.validAudio)}
                  </p>
                  {attempt.audioUrl && (
                    <audio
                      controls
                      src={`http://localhost:5000${attempt.audioUrl}`}
                      className="mt-3 w-full"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuardianSpeechPages;
