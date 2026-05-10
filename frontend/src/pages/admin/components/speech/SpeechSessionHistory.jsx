import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getAdminStudents, getGuardianSpeechSessionHistory } from "../../../../services/admin/api";
import GuardianPageHeader from "../../../../components/guardian/ui/GuardianPageHeader";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianEmptyState from "../../../../components/guardian/ui/GuardianEmptyState";
import GuardianStatusBadge from "../../../../components/guardian/ui/GuardianStatusBadge";
import ChildSelector from "../../../../components/guardian/ui/ChildSelector";
import GuardianModal from "../../../../components/guardian/ui/GuardianModal";
import GuardianButton from "../../../../components/guardian/ui/GuardianButton";
import GuardianSelect from "../../../../components/guardian/ui/GuardianSelect";
import { formatDate, formatPercent } from "./speechGuardianUtils";

const qualityText = {
  good: "Good audio",
  fair: "Fair audio",
  poor: "Poor audio",
  invalid: "Invalid recording",
};

const supportSignalText = {
  low_support: "Low Support",
  medium_support: "Medium Support",
  high_support: "High Support",
  unknown: "Unknown",
};

const formatModelScore = (value) =>
  value === undefined || value === null || value === "" ? "-" : Number(value).toFixed(2);

const formatProbabilities = (probabilities = {}) =>
  Object.entries(probabilities)
    .map(([label, value]) => `${supportSignalText[label] || label}: ${formatPercent(value)}`)
    .join(" | ");

function SpeechSessionHistory() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [history, setHistory] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [modeFilter, setModeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedChild = useMemo(
    () => children.find((child) => child._id === selectedChildId),
    [children, selectedChildId]
  );

  useEffect(() => {
    const loadChildren = async () => {
      try {
        const response = await getAdminStudents();
        const list = response.data?.data || [];
        setChildren(list);
        setSelectedChildId(list[0]?._id || "");
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not load children");
      } finally {
        setLoading(false);
      }
    };
    loadChildren();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedChildId) {
        setHistory(null);
        return;
      }
      try {
        const response = await getGuardianSpeechSessionHistory(selectedChildId);
        setHistory(response.data?.data || null);
      } catch (error) {
        setHistory(null);
        toast.error(error.response?.data?.message || "Could not load session history");
      }
    };
    loadHistory();
  }, [selectedChildId]);

  const sessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (history?.sessions || []).filter((session) => {
      const modeOk = modeFilter === "all" || session.mode === modeFilter;
      const label = `${session.mode || ""} ${session.activity?.title || ""} ${session.status || ""}`.toLowerCase();
      return modeOk && (!query || label.includes(query));
    });
  }, [history?.sessions, modeFilter, search]);

  if (loading) {
    return <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#EAF7F0] border-t-[#157A5A]" />;
  }

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title="Session History"
        subtitle="Review Leo sessions, attempts, audio availability, and placeholder scores."
        actions={<ChildSelector childrenList={children} selectedChildId={selectedChildId} onChange={setSelectedChildId} />}
      />

      {!selectedChild ? (
        <GuardianEmptyState title="No children yet" message="Add a child to review Leo's session history." />
      ) : (
        <>
          <GuardianCard className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search sessions..."
                className="guardian-focus w-full rounded-2xl border border-[#E5EDE7] bg-white px-4 py-3 text-sm font-medium text-[#101828] outline-none focus:border-[#157A5A]"
              />
              <GuardianSelect value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
                <option value="all">All modes</option>
                <option value="identification">Identification</option>
                <option value="improvement">Improvement</option>
              </GuardianSelect>
            </div>
          </GuardianCard>

          {sessions.length ? (
            <GuardianCard className="p-0">
              <div className="hidden grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.8fr_auto] gap-4 border-b border-[#E5EDE7] px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#5B6475] lg:grid">
                <span>Session</span>
                <span>Mode</span>
                <span>Status</span>
                <span>Score</span>
                <span>Completed</span>
                <span>Action</span>
              </div>

              <div className="divide-y divide-[#E5EDE7]">
                {sessions.map((session) => (
                  <div key={session._id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.8fr_auto] lg:items-center">
                    <div>
                      <p className="text-sm font-bold text-[#101828]">
                        {session.activity?.title || (session.mode === "identification" ? "Leo's First Sound Check" : "Leo Session")}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[#5B6475]">
                        {session.attempts?.length || 0} attempts | {session.modelVersion || "placeholder_v1"}
                      </p>
                    </div>
                    <p className="text-sm font-medium capitalize text-[#5B6475]">{session.mode || "-"}</p>
                    <GuardianStatusBadge value={session.status} />
                    <p className="text-sm font-semibold text-[#101828]">{formatPercent(session.supportScore)}</p>
                    <p className="text-sm font-medium text-[#5B6475]">{formatDate(session.completedAt)}</p>
                    <GuardianButton variant="secondary" onClick={() => setSelectedSession(session)}>
                      View
                    </GuardianButton>
                  </div>
                ))}
              </div>
            </GuardianCard>
          ) : (
            <GuardianEmptyState title="No matching sessions" message="Try a different filter, or wait until your child completes a Leo activity." />
          )}
        </>
      )}

      {selectedSession && (
        <GuardianModal
          title={selectedSession.activity?.title || "Session Detail"}
          subtitle={`${selectedSession.mode || "speech"} | ${selectedSession.status || "unknown"}`}
          onClose={() => setSelectedSession(null)}
        >
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Score", formatPercent(selectedSession.supportScore)],
              ["Stars", selectedSession.starsEarned || 0],
              ["Pronunciation Signal", supportSignalText[selectedSession.pronunciationSummary?.dominantPrediction] || selectedSession.pronunciationSummary?.status || "No signal"],
              ["Completed", formatDate(selectedSession.completedAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#E5EDE7] bg-[#F8FBF8] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6475]">{label}</p>
                <p className="mt-2 text-lg font-bold text-[#101828]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[20px] border border-[#D8EAF7] bg-[#F3FAFF] p-4">
            <p className="text-sm font-semibold text-[#24516F]">Prototype Model Signal</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
              <span>Status: {selectedSession.pronunciationSummary?.status || "no_predictions"}</span>
              <span>Valid predictions: {selectedSession.pronunciationSummary?.validPredictionCount || 0}</span>
              <span>Mean score: {formatModelScore(selectedSession.pronunciationSummary?.meanPronunciationScore)}</span>
              <span>Version: {selectedSession.pronunciationSummary?.modelVersion || "-"}</span>
            </div>
            {selectedSession.pronunciationSummary?.meanProbabilities && (
              <p className="mt-2 text-xs font-semibold text-[#37556D]">
                {formatProbabilities(selectedSession.pronunciationSummary.meanProbabilities)}
              </p>
            )}
          </div>

          <div className="mt-6 grid gap-3">
            {(selectedSession.attempts || []).map((attempt) => (
              <article key={attempt._id} className="rounded-[20px] border border-[#E5EDE7] bg-[#F8FBF8] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="text-base font-bold text-[#101828]">{attempt.targetText || attempt.promptId}</h4>
                    <p className="mt-1 text-sm font-medium text-[#5B6475]">
                      {attempt.taskType} | valid audio: {String(attempt.validAudio)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#5B6475]">
                      Placeholder score: {formatPercent(attempt.features?.pronunciationScorePlaceholder)}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs font-semibold text-[#5B6475] sm:grid-cols-2">
                      <span>Quality: {qualityText[attempt.audioQuality?.qualityLabel] || "Not extracted"}</span>
                      <span>Duration: {attempt.serverAudioDurationMs ? `${(attempt.serverAudioDurationMs / 1000).toFixed(2)}s` : "-"}</span>
                      <span>Speech: {attempt.silenceFeatures?.estimatedSpeechSec !== undefined ? `${attempt.silenceFeatures.estimatedSpeechSec}s` : "-"}</span>
                      <span>Silence: {attempt.silenceFeatures?.silenceRatio !== undefined ? `${Math.round(attempt.silenceFeatures.silenceRatio * 100)}%` : "-"}</span>
                      <span>Pauses: {attempt.silenceFeatures?.pauseCount ?? "-"}</span>
                      <span>Volume: {attempt.volumeFeatures?.meanVolumeDb !== undefined ? `${attempt.volumeFeatures.meanVolumeDb} dB` : "-"}</span>
                      <span>Extraction: {attempt.extractionStatus || "pending"}</span>
                      <span>Reason: {attempt.invalidReason || attempt.audioQuality?.invalidReason || "-"}</span>
                    </div>
                    {attempt.itemResult?.childFeedback && (
                      <p className="mt-3 rounded-2xl border border-[#D8ECE3] bg-white px-4 py-2 text-sm font-medium text-[#0F5F48]">
                        {attempt.itemResult.childFeedback}
                      </p>
                    )}
                    <div className="mt-3 rounded-2xl border border-[#D8EAF7] bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#24516F]">
                        Pronunciation Support Signal
                      </p>
                      <div className="mt-2 grid gap-2 text-xs font-semibold text-[#5B6475] sm:grid-cols-2">
                        <span>Status: {attempt.pronunciationModel?.status || "not_run"}</span>
                        <span>Signal: {supportSignalText[attempt.pronunciationModel?.prediction] || attempt.pronunciationModel?.prediction || "-"}</span>
                        <span>Pronunciation score: {formatModelScore(attempt.pronunciationModel?.predictedPronunciationScore)}</span>
                        <span>Features used: {attempt.pronunciationModel?.featuresUsedCount || "-"}</span>
                        <span>Model version: {attempt.pronunciationModel?.modelVersion || "-"}</span>
                        <span>RMS mean: {attempt.pronunciationModel?.audioFeaturesSummary?.rms_mean ?? "-"}</span>
                      </div>
                      {attempt.pronunciationModel?.probabilities && (
                        <p className="mt-2 text-xs font-semibold text-[#37556D]">
                          {formatProbabilities(attempt.pronunciationModel.probabilities)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-full max-w-sm space-y-2">
                    {attempt.audioUrl && (
                      <audio controls src={`http://localhost:5000${attempt.audioUrl}`} className="w-full" />
                    )}
                    {attempt.normalizedAudioUrl && (
                      <audio controls src={`http://localhost:5000${attempt.normalizedAudioUrl}`} className="w-full" />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </GuardianModal>
      )}
    </div>
  );
}

export default SpeechSessionHistory;
