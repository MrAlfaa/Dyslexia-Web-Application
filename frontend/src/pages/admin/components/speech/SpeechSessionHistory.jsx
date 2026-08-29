import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  getGuardianSpeechSessionHistory,
  recomputeSpeechAssessment,
  reprocessSpeechAttemptAnalysis,
} from "../../../../services/admin/api";
import GuardianPageHeader from "../../../../components/guardian/ui/GuardianPageHeader";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianEmptyState from "../../../../components/guardian/ui/GuardianEmptyState";
import GuardianStatusBadge from "../../../../components/guardian/ui/GuardianStatusBadge";
import GuardianModal from "../../../../components/guardian/ui/GuardianModal";
import GuardianButton from "../../../../components/guardian/ui/GuardianButton";
import GuardianSelect from "../../../../components/guardian/ui/GuardianSelect";
import GuardianRequestState from "../../../../components/guardian/ui/GuardianRequestState";
import { useGuardianChild } from "../../../../contexts/GuardianChildContext";
import { formatDate, formatPercent } from "./speechGuardianUtils";
import SentenceReadingAnalysis from "./SentenceReadingAnalysis";
import { useGuardianPageData } from "./shared";

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

const formatWordAccuracy = (value) =>
  value === undefined || value === null ? "No data" : formatPercent(value);

const formatPhonemeRate = (value) =>
  value === undefined || value === null ? "No sound-pattern data" : formatPercent(value);

const formatSoundPath = (tokens = []) =>
  Array.isArray(tokens) && tokens.length ? tokens.join(" - ") : "-";

const formatPatternLabel = (value) =>
  String(value || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const API_ORIGIN = "http://localhost:5000";

const getPlaybackUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
};

const processingText = {
  pending: "Pending",
  processing: "Processing",
  completed: "Ready",
  failed: "Failed",
  skipped: "Local",
};

const ProcessingBadge = ({ label, value }) => (
  <span className="rounded-full border border-[#D8ECE3] bg-white px-3 py-1 text-[11px] font-bold text-[#37546B]">
    {label}: {processingText[value] || value || "Not started"}
  </span>
);

const DatasetBadge = ({ readiness = {} }) => (
  <span
    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${
      readiness.datasetReady
        ? "bg-[#EAF7F0] text-[#0F5F48]"
        : "bg-[#FFF4E5] text-[#9A5B00]"
    }`}
  >
    {readiness.datasetReady
      ? "Dataset ready"
      : `${readiness.supportLabelCount || 0} support labels`}
  </span>
);

const SoundPatternBadge = ({ active, label }) => (
  <span
    className={`rounded-full px-3 py-1 text-[11px] font-black ${
      active
        ? "bg-[#FFF4E5] text-[#9A5B00]"
        : "bg-[#EAF7F0] text-[#0F5F48]"
    }`}
  >
    {label}: {active ? "Needs review" : "Clear"}
  </span>
);

function SpeechSessionHistory() {
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isSuperAdmin = adminUser.role === "super admin";
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

  useEffect(() => {
    setSelectedSession(null);
  }, [selectedChildId]);

  const sessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (history?.sessions || []).filter((session) => {
      const modeOk = modeFilter === "all" || session.mode === modeFilter;
      const label = `${session.mode || ""} ${session.activity?.title || ""} ${session.status || ""}`.toLowerCase();
      return modeOk && (!query || label.includes(query));
    });
  }, [history?.sessions, modeFilter, search]);

  const effectiveState = childState === "ready" ? pageRequest.state : childState;
  const effectiveError = childState === "ready" ? pageRequest.error : childError;
  const retry = childState === "ready" ? pageRequest.retry : refreshChildren;

  const recomputeSelectedSession = async () => {
    if (!selectedSession?._id || adminActionId) return;
    try {
      setAdminActionId(selectedSession._id);
      const response = await recomputeSpeechAssessment(selectedSession._id);
      const snapshots = response.data?.data?.snapshots || [];
      const latest = snapshots[snapshots.length - 1];
      setSelectedSession((previous) => ({
        ...previous,
        snapshotStatus: latest?.status || previous.snapshotStatus,
        assessmentSnapshots: snapshots,
      }));
      toast.success("Assessment snapshot recomputed as a new revision");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not recompute assessment");
    } finally {
      setAdminActionId("");
    }
  };

  const reprocessAttempt = async (attemptId) => {
    if (!attemptId || adminActionId) return;
    try {
      setAdminActionId(attemptId);
      const response = await reprocessSpeechAttemptAnalysis(attemptId);
      const updated = response.data?.data || {};
      setSelectedSession((previous) => ({
        ...previous,
        attempts: (previous.attempts || []).map((attempt) =>
          attempt._id === attemptId ? { ...attempt, ...updated } : attempt
        ),
      }));
      toast.success("Attempt analysis reprocessed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reprocess this attempt");
    } finally {
      setAdminActionId("");
    }
  };

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title="Session History"
        subtitle="Review Leo sessions, recordings, word evidence, sound patterns, and formal assessment status."
      />

      {effectiveState !== "ready" ? (
        <GuardianRequestState
          state={effectiveState}
          error={effectiveError}
          onRetry={retry}
        />
      ) : !selectedChild ? (
        <GuardianRequestState state="no_owned_children" />
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
                <span>Assessment</span>
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
                        {session.attempts?.length || 0} attempts
                        {isSuperAdmin ? ` | ${session.modelVersion || "No model version"}` : ""}
                      </p>
                      <div className="mt-2">
                        <DatasetBadge readiness={session.datasetReadiness} />
                      </div>
                    </div>
                    <p className="text-sm font-medium capitalize text-[#5B6475]">{session.mode || "-"}</p>
                    <GuardianStatusBadge value={session.status} />
                    <p className="text-sm font-semibold capitalize text-[#101828]">{session.snapshotStatus?.replaceAll("_", " ") || "Not assessed"}</p>
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
              ["Word Accuracy", formatWordAccuracy(selectedSession.wordReadingSummary?.wordReadingAccuracy)],
              ["Sound Patterns", formatPhonemeRate(selectedSession.phonemeSummary?.meanPhonemeErrorRate)],
              ["Dataset", selectedSession.datasetReadiness?.datasetReady ? "Ready" : "Needs labels"],
              ["Completed", formatDate(selectedSession.completedAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#E5EDE7] bg-[#F8FBF8] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6475]">{label}</p>
                <p className="mt-2 text-lg font-bold text-[#101828]">{value}</p>
              </div>
            ))}
          </div>

          {isSuperAdmin && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#D8EAF7] bg-[#F3FAFF] p-4">
              <div>
                <p className="text-sm font-bold text-[#24516F]">Super-admin assessment tools</p>
                <p className="mt-1 text-xs font-semibold text-[#5B6475]">Recompute creates a new immutable snapshot revision.</p>
              </div>
              <GuardianButton
                variant="secondary"
                disabled={Boolean(adminActionId)}
                onClick={recomputeSelectedSession}
              >
                {adminActionId === selectedSession._id ? "Recomputing..." : "Recompute Snapshot"}
              </GuardianButton>
            </div>
          )}

          <div className="mt-4 rounded-[20px] border border-[#D8EAF7] bg-[#F3FAFF] p-4">
            <p className="text-sm font-semibold text-[#24516F]">Audio Quality</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
              <span>Total attempts: {(selectedSession.attempts || []).length}</span>
              <span>Good audio: {(selectedSession.attempts || []).filter((attempt) => attempt.audioQuality?.qualityLabel === "good").length}</span>
              <span>Fair audio: {(selectedSession.attempts || []).filter((attempt) => attempt.audioQuality?.qualityLabel === "fair").length}</span>
              <span>Retry/invalid: {(selectedSession.attempts || []).filter((attempt) => attempt.validAudio === false || attempt.audioQuality?.qualityLabel === "invalid").length}</span>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[#D8ECE3] bg-[#F8FBF8] p-4">
            <p className="text-sm font-semibold text-[#0F5F48]">Word Reading Analysis</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
              <span>Analyzed attempts: {selectedSession.wordReadingSummary?.analyzedAttemptCount || 0}</span>
              <span>Correct words: {selectedSession.wordReadingSummary?.correctWordCount || 0}</span>
              <span>Accuracy: {formatWordAccuracy(selectedSession.wordReadingSummary?.wordReadingAccuracy)}</span>
              <span>Common possible error: {selectedSession.wordReadingSummary?.commonPossibleError || "-"}</span>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[#E7D7FF] bg-[#FBF8FF] p-4">
            <p className="text-sm font-semibold text-[#5B2B8A]">Sound Pattern Analysis</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
              <span>Analyzed attempts: {selectedSession.phonemeSummary?.analyzedAttemptCount || 0}</span>
              <span>Mean sound error: {formatPhonemeRate(selectedSession.phonemeSummary?.meanPhonemeErrorRate)}</span>
              <span>First-sound review: {formatPhonemeRate(selectedSession.phonemeSummary?.initialSoundErrorRate)}</span>
              <span>Ending-sound review: {formatPhonemeRate(selectedSession.phonemeSummary?.finalSoundErrorRate)}</span>
              <span>Vowel review: {formatPhonemeRate(selectedSession.phonemeSummary?.vowelMismatchRate)}</span>
              <span>Blend review: {formatPhonemeRate(selectedSession.phonemeSummary?.consonantClusterErrorRate)}</span>
              <span>Attempts needing review: {selectedSession.phonemeSummary?.attemptsNeedingReview || 0}</span>
              <span>Common pattern: {formatPatternLabel(selectedSession.phonemeSummary?.commonErrorPattern)}</span>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[#E8E1C8] bg-[#FFFDF5] p-4">
            <p className="text-sm font-semibold text-[#7A5600]">Dataset Readiness</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <span>Manual labels: {selectedSession.datasetReadiness?.labelledAttemptCount || 0}</span>
              <span>Support labels: {selectedSession.datasetReadiness?.supportLabelCount || 0}</span>
              <span>Status: {selectedSession.datasetReadiness?.datasetReady ? "Ready for export" : "Needs teacher labels"}</span>
            </div>
          </div>

          {(selectedSession.attempts || []).some((attempt) =>
            ["pending", "processing"].includes(attempt.processingStatus)
          ) && (
            <div className="mt-4 rounded-[20px] border border-[#F4D7A1] bg-[#FFF9EB] p-4 text-sm font-semibold text-[#8A5A10]">
              Analysis processing: some media, ASR, or pronunciation signals are still updating. Audio playback will use local files until cloud media is ready.
            </div>
          )}

          <div className="mt-4 rounded-[20px] border border-[#D8EAF7] bg-[#F3FAFF] p-4">
            <p className="text-sm font-semibold text-[#24516F]">Pronunciation Support Signal</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
              <span>Status: {selectedSession.pronunciationSummary?.status || "no_predictions"}</span>
              <span>Valid predictions: {selectedSession.pronunciationSummary?.validPredictionCount || 0}</span>
              <span>Mean score: {formatModelScore(selectedSession.pronunciationSummary?.meanPronunciationScore)}</span>
              {isSuperAdmin && (
                <span>Version: {selectedSession.pronunciationSummary?.modelVersion || "-"}</span>
              )}
            </div>
            {isSuperAdmin && selectedSession.pronunciationSummary?.meanProbabilities && (
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
                    {isSuperAdmin && (
                      <p className="mt-1 text-sm font-medium text-[#5B6475]">
                        Placeholder score: {formatPercent(attempt.features?.pronunciationScorePlaceholder)}
                      </p>
                    )}
                    <div className="mt-3 grid gap-2 text-xs font-semibold text-[#5B6475] sm:grid-cols-2">
                      <span>Quality: {qualityText[attempt.audioQuality?.qualityLabel] || "Not extracted"}</span>
                      <span>Duration: {attempt.serverAudioDurationMs ? `${(attempt.serverAudioDurationMs / 1000).toFixed(2)}s` : "-"}</span>
                      <span>Reason: {attempt.invalidReason || attempt.audioQuality?.invalidReason || "-"}</span>
                      {isSuperAdmin && (
                        <>
                          <span>Speech: {attempt.silenceFeatures?.estimatedSpeechSec !== undefined ? `${attempt.silenceFeatures.estimatedSpeechSec}s` : "-"}</span>
                          <span>Silence: {attempt.silenceFeatures?.silenceRatio !== undefined ? `${Math.round(attempt.silenceFeatures.silenceRatio * 100)}%` : "-"}</span>
                          <span>Pauses: {attempt.silenceFeatures?.pauseCount ?? "-"}</span>
                          <span>Volume: {attempt.volumeFeatures?.meanVolumeDb !== undefined ? `${attempt.volumeFeatures.meanVolumeDb} dB` : "-"}</span>
                          <span>Extraction: {attempt.extractionStatus || "pending"}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ProcessingBadge label="Overall" value={attempt.processingStatus} />
                      {isSuperAdmin && (
                        <>
                          <ProcessingBadge label="Media sync" value={attempt.processingSteps?.cloudinary || attempt.audioStorage?.uploadStatus} />
                          <ProcessingBadge label="ASR" value={attempt.processingSteps?.asr} />
                          <ProcessingBadge label="Pronunciation" value={attempt.processingSteps?.pronunciationModel} />
                        </>
                      )}
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
                        {isSuperAdmin && (
                          <>
                            <span>Features used: {attempt.pronunciationModel?.featuresUsedCount || "-"}</span>
                            <span>Model version: {attempt.pronunciationModel?.modelVersion || "-"}</span>
                            <span>RMS mean: {attempt.pronunciationModel?.audioFeaturesSummary?.rms_mean ?? "-"}</span>
                          </>
                        )}
                      </div>
                      {isSuperAdmin && attempt.pronunciationModel?.probabilities && (
                        <p className="mt-2 text-xs font-semibold text-[#37556D]">
                          {formatProbabilities(attempt.pronunciationModel.probabilities)}
                        </p>
                      )}
                    </div>
                    {attempt.wordReading && (
                      <div className="mt-3 rounded-2xl border border-[#D8ECE3] bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F5F48]">
                          Word Reading Analysis
                        </p>
                        <div className="mt-2 grid gap-2 text-xs font-semibold text-[#5B6475] sm:grid-cols-2">
                          <span>Target word: {attempt.wordReading.targetWord || "-"}</span>
                          <span>Leo heard: {attempt.wordReading.normalizedAsrText || attempt.wordReading.asrText || "-"}</span>
                          <span>Word correctness: {attempt.wordReading.wordCorrect ? "Correct" : "Needs practice"}</span>
                          <span>Possible sound error: {attempt.wordReading.possibleError || "-"}</span>
                          <span>Initial sound error: {attempt.wordReading.initialSoundError ? "Yes" : "No"}</span>
                          <span>Final sound error: {attempt.wordReading.finalSoundError ? "Yes" : "No"}</span>
                          <span>Edit distance: {attempt.wordReading.editDistance ?? "-"}</span>
                          <span>Similarity: {formatWordAccuracy(attempt.wordReading.similarityScore)}</span>
                          <span>Status: {attempt.wordReading.attemptStatus || "-"}</span>
                          {isSuperAdmin && <span>ASR: {attempt.wordReading.asrProvider || "-"}</span>}
                        </div>
                      </div>
                    )}
                    <SentenceReadingAnalysis
                      sentenceReading={attempt.sentenceReading}
                      fallbackTargetText={attempt.targetText}
                    />
                    {attempt.phonemeComparison && (
                      <div className="mt-3 rounded-2xl border border-[#E7D7FF] bg-white px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5B2B8A]">
                            Sound Pattern Analysis
                          </p>
                          <span className="rounded-full bg-[#F4ECFF] px-3 py-1 text-[11px] font-black text-[#5B2B8A]">
                            {attempt.phonemeComparison.status || "skipped"}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs font-semibold text-[#5B6475] sm:grid-cols-2">
                          <span>Target sound path: {formatSoundPath(attempt.phonemeComparison.targetPhonemes)}</span>
                          <span>Leo heard path: {formatSoundPath(attempt.phonemeComparison.asrPhonemes)}</span>
                          <span>Sound error rate: {formatPhonemeRate(attempt.phonemeComparison.phonemeErrorRate)}</span>
                          <span>Pattern: {formatPatternLabel(attempt.phonemeComparison.errorPattern)}</span>
                          <span>Edit distance: {attempt.phonemeComparison.phonemeEditDistance ?? "-"}</span>
                          <span>Confidence: {formatPatternLabel(attempt.phonemeComparison.confidence)}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <SoundPatternBadge active={attempt.phonemeComparison.initialSoundError} label="First sound" />
                          <SoundPatternBadge active={attempt.phonemeComparison.finalSoundError} label="Ending sound" />
                          <SoundPatternBadge active={attempt.phonemeComparison.vowelMismatch} label="Vowel" />
                          <SoundPatternBadge active={attempt.phonemeComparison.consonantClusterError} label="Blend" />
                        </div>
                        {attempt.phonemeComparison.warnings?.length > 0 && (
                          <p className="mt-3 rounded-2xl bg-[#FFF9EB] px-3 py-2 text-xs font-bold text-[#8A5A10]">
                            Note: {attempt.phonemeComparison.warnings.map(formatPatternLabel).join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                    {isSuperAdmin && (
                      <div className="mt-3">
                        <GuardianButton
                          variant="ghost"
                          disabled={Boolean(adminActionId) || !attempt.normalizedAudioPath}
                          onClick={() => reprocessAttempt(attempt._id)}
                        >
                          {adminActionId === attempt._id ? "Reprocessing..." : "Reprocess Analysis"}
                        </GuardianButton>
                      </div>
                    )}
                  </div>
                  <div className="w-full max-w-sm space-y-2">
                    {(attempt.audioStorage?.originalSecureUrl || attempt.audioUrl) && (
                      <audio
                        controls
                        src={getPlaybackUrl(attempt.audioStorage?.originalSecureUrl || attempt.audioUrl)}
                        className="w-full"
                      />
                    )}
                    {(attempt.audioStorage?.normalizedSecureUrl || attempt.normalizedAudioUrl) && (
                      <audio
                        controls
                        src={getPlaybackUrl(attempt.audioStorage?.normalizedSecureUrl || attempt.normalizedAudioUrl)}
                        className="w-full"
                      />
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
