import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import GuardianButton from "../../../../components/guardian/ui/GuardianButton";
import GuardianModal from "../../../../components/guardian/ui/GuardianModal";
import SentenceReadingAnalysis from "./SentenceReadingAnalysis";
import {
  buildSessionTabs,
  getAttemptPlaybackUrl,
  summarizeSessionQuality,
} from "./speechSessionPresentation.utils";

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const formatPercent = (value, unavailable) =>
  hasValue(value) && Number.isFinite(Number(value))
    ? `${Math.round(Number(value) * 100)}%`
    : unavailable;

const formatNumber = (value, unavailable, digits = 2) =>
  hasValue(value) && Number.isFinite(Number(value))
    ? Number(value).toFixed(digits)
    : unavailable;

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

const formatDuration = (milliseconds, t) =>
  hasValue(milliseconds) && Number(milliseconds) > 0
    ? t("guardian_session_seconds", { count: (Number(milliseconds) / 1000).toFixed(1) })
    : t("guardian_not_available");

const SafeStat = ({ label, value }) => (
  <div className="rounded-xl border border-[#E5EDE7] bg-[#F8FBF8] p-3">
    <dt className="text-[11px] font-semibold uppercase text-[#5B6475]">{label}</dt>
    <dd className="mt-1.5 text-base font-bold text-[#101828]">{value}</dd>
  </div>
);

const QualityPill = ({ status, t }) => {
  const tone = {
    good: "bg-[#EAF7F0] text-[#0F5F48]",
    fair: "bg-[#FFF6DF] text-[#94600A]",
    poor: "bg-[#FFF0F0] text-[#B42318]",
    review: "bg-[#FFF0F0] text-[#B42318]",
    unavailable: "bg-[#F5F7F6] text-[#5B6475]",
  }[status] || "bg-[#F5F7F6] text-[#5B6475]";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {t(`guardian_session_quality_${status}`)}
    </span>
  );
};

const SafePatternPill = ({ active, label, t }) => (
  <span
    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
      active ? "bg-[#FFF6DF] text-[#94600A]" : "bg-[#EAF7F0] text-[#0F5F48]"
    }`}
  >
    {label}: {t(active ? "guardian_session_review_suggested" : "guardian_session_clear")}
  </span>
);

function SummaryTab({ session, quality, t, language }) {
  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SafeStat label={t("guardian_session_completed")} value={formatDate(session.completedAt, language, t("guardian_not_available"))} />
        <SafeStat label={t("guardian_session_attempts")} value={quality.total} />
        <SafeStat label={t("guardian_session_stars")} value={session.starsEarned || 0} />
        <SafeStat label={t("guardian_session_status")} value={t(`guardian_session_status_${session.status || "unknown"}`)} />
        <SafeStat label={t("guardian_good_audio")} value={quality.good} />
        <SafeStat label={t("guardian_invalid_recordings")} value={quality.unusable} />
      </dl>

      <section className="rounded-xl border border-[#D8ECE3] bg-[#F8FBF8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-[#101828]">{t("guardian_session_recording_summary")}</h4>
            <p className="mt-1 text-sm text-[#5B6475]">{t("guardian_session_recording_summary_help")}</p>
          </div>
          <QualityPill status={quality.status} t={t} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <span>{t("guardian_good_audio")}: <strong>{quality.good}</strong></span>
          <span>{t("guardian_fair_audio")}: <strong>{quality.fair}</strong></span>
          <span>{t("guardian_poor_audio")}: <strong>{quality.poor}</strong></span>
          <span>{t("guardian_invalid_recordings")}: <strong>{quality.unusable}</strong></span>
        </div>
      </section>

      <section className="rounded-xl border border-[#D8EAF7] bg-[#F3FAFF] p-4">
        <h4 className="text-sm font-bold text-[#24516F]">{t("guardian_session_safe_interpretation")}</h4>
        <p className="mt-2 text-sm leading-6 text-[#37556D]">
          {quality.unusable > 0
            ? t("guardian_session_safe_interpretation_retry")
            : t("guardian_session_safe_interpretation_ready")}
        </p>
      </section>
    </div>
  );
}

function RecordingTab({ attempts, t }) {
  if (!attempts.length) {
    return <p className="rounded-xl bg-[#F5F7F6] p-4 text-sm font-medium text-[#5B6475]">{t("guardian_session_no_recordings")}</p>;
  }

  return (
    <div className="space-y-3">
      {attempts.map((attempt, index) => {
        const playbackUrl = getAttemptPlaybackUrl(attempt);
        const quality = attempt.audioQuality?.qualityLabel || "unavailable";
        const safeStatus = attempt.validAudio === false || quality === "invalid" ? "review" : quality;
        return (
          <article key={attempt._id || `${attempt.promptId}-${index}`} className="rounded-xl border border-[#E5EDE7] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[#5B6475]">{t("guardian_session_attempt_number", { count: index + 1 })}</p>
                <h4 className="mt-1 text-base font-bold text-[#101828]">{attempt.targetText || attempt.promptId || t("guardian_not_available")}</h4>
              </div>
              <QualityPill status={safeStatus} t={t} />
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-[#5B6475]">{t("guardian_session_duration")}</dt>
                <dd className="mt-1 font-bold text-[#101828]">{formatDuration(attempt.serverAudioDurationMs, t)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5B6475]">{t("guardian_session_recording_state")}</dt>
                <dd className="mt-1 font-bold text-[#101828]">
                  {t(attempt.validAudio === false ? "guardian_session_record_again" : "guardian_session_ready_to_review")}
                </dd>
              </div>
            </dl>
            {playbackUrl ? (
              <audio controls preload="none" src={playbackUrl} className="mt-4 w-full" aria-label={t("guardian_session_play_recording", { count: index + 1 })} />
            ) : (
              <p className="mt-4 rounded-lg bg-[#F5F7F6] px-3 py-2 text-sm font-medium text-[#5B6475]">{t("guardian_session_recording_unavailable")}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function WordSoundTab({ attempts, t }) {
  if (!attempts.length) {
    return <p className="rounded-xl bg-[#F5F7F6] p-4 text-sm font-medium text-[#5B6475]">{t("guardian_session_no_reading_evidence")}</p>;
  }

  return (
    <div className="space-y-3">
      {attempts.map((attempt, index) => (
        <article key={attempt._id || `${attempt.promptId}-${index}`} className="rounded-xl border border-[#E5EDE7] p-4">
          <h4 className="text-base font-bold text-[#101828]">{attempt.targetText || attempt.promptId || t("guardian_not_available")}</h4>

          {attempt.wordReading ? (
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-[#5B6475]">{t("guardian_session_heard_text")}</dt>
                <dd className="mt-1 break-words font-bold text-[#101828]">{attempt.wordReading.normalizedAsrText || attempt.wordReading.asrText || t("guardian_not_available")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5B6475]">{t("guardian_session_word_observation")}</dt>
                <dd className="mt-1 font-bold text-[#101828]">{t(attempt.wordReading.wordCorrect ? "guardian_session_clear" : "guardian_session_review_suggested")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5B6475]">{t("guardian_similarity")}</dt>
                <dd className="mt-1 font-bold text-[#101828]">{formatPercent(attempt.wordReading.similarityScore, t("guardian_not_available"))}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5B6475]">{t("guardian_session_possible_difference")}</dt>
                <dd className="mt-1 font-bold text-[#101828]">{attempt.wordReading.possibleError ? t("guardian_session_review_suggested") : t("guardian_session_none_observed")}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm font-medium text-[#5B6475]">{t("guardian_session_word_evidence_unavailable")}</p>
          )}

          <SentenceReadingAnalysis sentenceReading={attempt.sentenceReading} fallbackTargetText={attempt.targetText} />

          {attempt.phonemeComparison && (
            <section className="mt-4 border-t border-[#E5EDE7] pt-4">
              <h5 className="text-xs font-semibold uppercase text-[#5B2B8A]">{t("guardian_sound_patterns")}</h5>
              <div className="mt-3 flex flex-wrap gap-2">
                <SafePatternPill active={attempt.phonemeComparison.initialSoundError} label={t("guardian_session_first_sound")} t={t} />
                <SafePatternPill active={attempt.phonemeComparison.finalSoundError} label={t("guardian_session_ending_sound")} t={t} />
                <SafePatternPill active={attempt.phonemeComparison.vowelMismatch} label={t("guardian_session_vowel_sound")} t={t} />
                <SafePatternPill active={attempt.phonemeComparison.consonantClusterError} label={t("guardian_session_blended_sound")} t={t} />
              </div>
            </section>
          )}
        </article>
      ))}
    </div>
  );
}

function TechnicalTab({ session, attempts, actionId, onRecompute, onReprocess, t }) {
  const unavailable = t("guardian_not_available");
  const summary = session.pronunciationSummary || {};
  const readiness = session.datasetReadiness || {};

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#D8EAF7] bg-[#F3FAFF] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-[#24516F]">{t("guardian_session_technical_assessment")}</h4>
            <p className="mt-1 text-xs font-medium text-[#5B6475]">{t("guardian_session_technical_admin_only")}</p>
          </div>
          <GuardianButton variant="secondary" disabled={Boolean(actionId)} onClick={onRecompute}>
            {actionId === session._id ? t("guardian_session_recomputing") : t("guardian_session_recompute")}
          </GuardianButton>
        </div>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <div><dt className="font-bold text-[#5B6475]">{t("guardian_snapshot_status")}</dt><dd>{session.snapshotStatus || unavailable}</dd></div>
          <div><dt className="font-bold text-[#5B6475]">{t("guardian_model_status")}</dt><dd>{summary.status || unavailable}</dd></div>
          <div><dt className="font-bold text-[#5B6475]">{t("guardian_prediction_count")}</dt><dd>{summary.validPredictionCount ?? unavailable}</dd></div>
          <div><dt className="font-bold text-[#5B6475]">{t("guardian_model_version")}</dt><dd>{summary.modelVersion || session.modelVersion || unavailable}</dd></div>
          <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_model_score")}</dt><dd>{formatNumber(summary.meanPronunciationScore, unavailable)}</dd></div>
          <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_dataset_readiness")}</dt><dd>{t(readiness.datasetReady ? "guardian_session_yes" : "guardian_session_no")}</dd></div>
          <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_manual_labels")}</dt><dd>{readiness.labelledAttemptCount ?? unavailable}</dd></div>
          <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_support_labels")}</dt><dd>{readiness.supportLabelCount ?? unavailable}</dd></div>
        </dl>
        {summary.meanProbabilities && (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 text-xs text-[#37556D]">{JSON.stringify(summary.meanProbabilities, null, 2)}</pre>
        )}
      </section>

      {attempts.map((attempt, index) => (
        <article key={attempt._id || `${attempt.promptId}-${index}`} className="rounded-xl border border-[#E5EDE7] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[#5B6475]">{t("guardian_session_attempt_number", { count: index + 1 })}</p>
              <h4 className="mt-1 font-bold text-[#101828]">{attempt.targetText || attempt.promptId || unavailable}</h4>
            </div>
            <GuardianButton variant="ghost" disabled={Boolean(actionId) || !attempt.normalizedAudioPath} onClick={() => onReprocess(attempt._id)}>
              {actionId === attempt._id ? t("guardian_session_reprocessing") : t("guardian_session_reprocess")}
            </GuardianButton>
          </div>
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_processing_status")}</dt><dd>{attempt.processingStatus || unavailable}</dd></div>
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_provider")}</dt><dd>{attempt.wordReading?.asrProvider || unavailable}</dd></div>
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_model_score")}</dt><dd>{formatNumber(attempt.pronunciationModel?.predictedPronunciationScore, unavailable)}</dd></div>
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_model_version")}</dt><dd>{attempt.pronunciationModel?.modelVersion || unavailable}</dd></div>
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_features_used")}</dt><dd>{attempt.pronunciationModel?.featuresUsedCount ?? unavailable}</dd></div>
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_edit_distance")}</dt><dd>{attempt.wordReading?.editDistance ?? attempt.phonemeComparison?.phonemeEditDistance ?? unavailable}</dd></div>
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_confidence")}</dt><dd>{attempt.phonemeComparison?.confidence || unavailable}</dd></div>
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_processing_steps")}</dt><dd>{JSON.stringify(attempt.processingSteps || {})}</dd></div>
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_target_sound_path")}</dt><dd>{(attempt.phonemeComparison?.targetPhonemes || []).join(" - ") || unavailable}</dd></div>
            <div><dt className="font-bold text-[#5B6475]">{t("guardian_session_heard_sound_path")}</dt><dd>{(attempt.phonemeComparison?.asrPhonemes || []).join(" - ") || unavailable}</dd></div>
          </dl>
          {attempt.pronunciationModel?.probabilities && (
            <pre className="mt-3 overflow-x-auto rounded-lg bg-[#F5F7F6] p-3 text-xs">{JSON.stringify(attempt.pronunciationModel.probabilities, null, 2)}</pre>
          )}
        </article>
      ))}
    </div>
  );
}

function SpeechSessionDrawer({
  session,
  isSuperAdmin,
  actionId,
  onClose,
  onRecompute,
  onReprocess,
}) {
  const { t, i18n } = useTranslation("sp");
  const tabs = useMemo(
    () => buildSessionTabs({ session, isSuperAdmin }),
    [session, isSuperAdmin]
  );
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "summary");
  const attempts = Array.isArray(session?.attempts) ? session.attempts : [];
  const quality = useMemo(() => summarizeSessionQuality(session), [session]);

  if (!session) return null;

  const resolvedActiveTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : "summary";

  const title = session.activity?.title || (session.mode === "identification"
    ? t("guardian_session_identification_activity")
    : t("guardian_session_default_activity"));

  return (
    <GuardianModal
      variant="drawer"
      title={title}
      subtitle={t("guardian_session_drawer_subtitle", {
        mode: t(`guardian_session_mode_${session.mode || "unknown"}`),
        date: formatDate(session.completedAt, i18n.language, t("guardian_not_available")),
      })}
      closeLabel={t("guardian_session_close")}
      onClose={onClose}
    >
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-[#E5EDE7]" role="tablist" aria-label={t("guardian_session_detail_sections")}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={resolvedActiveTab === tab.id}
            aria-controls={`guardian-session-panel-${tab.id}`}
            id={`guardian-session-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`guardian-focus min-h-11 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition ${
              resolvedActiveTab === tab.id
                ? "border-[#157A5A] text-[#0F5F48]"
                : "border-transparent text-[#5B6475] hover:text-[#101828]"
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      <div id={`guardian-session-panel-${resolvedActiveTab}`} role="tabpanel" aria-labelledby={`guardian-session-tab-${resolvedActiveTab}`}>
        {resolvedActiveTab === "summary" && <SummaryTab session={session} quality={quality} t={t} language={i18n.language} />}
        {resolvedActiveTab === "recording" && <RecordingTab attempts={attempts} t={t} />}
        {resolvedActiveTab === "word_sound" && <WordSoundTab attempts={attempts} t={t} />}
        {resolvedActiveTab === "technical" && isSuperAdmin && (
          <TechnicalTab session={session} attempts={attempts} actionId={actionId} onRecompute={onRecompute} onReprocess={onReprocess} t={t} />
        )}
      </div>
    </GuardianModal>
  );
}

export default SpeechSessionDrawer;
