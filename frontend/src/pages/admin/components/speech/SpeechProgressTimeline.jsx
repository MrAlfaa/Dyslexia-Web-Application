import { useTranslation } from "react-i18next";
import { getSentenceDeltaDetails } from "./SpeechProgressTimeline.utils";

const toneByStatus = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-900",
  positive_trend: "border-emerald-200 bg-emerald-50 text-emerald-900",
  processing: "border-sky-200 bg-sky-50 text-sky-900",
  needs_review: "border-amber-200 bg-amber-50 text-amber-900",
  mixed: "border-amber-200 bg-amber-50 text-amber-900",
  insufficient_data: "border-slate-200 bg-slate-50 text-slate-700",
};

const hasMetric = (value) =>
  value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

const formatPercent = (value, unavailable = "-") =>
  hasMetric(value) ? `${Math.round(Number(value) * 100)}%` : unavailable;

const getSentenceMetrics = (snapshot) => ({
  coverage: snapshot?.metrics?.meanSentenceCoverage,
  wordErrorRate: snapshot?.metrics?.meanSentenceWordErrorRate,
});

const hasSentenceMetrics = (snapshot) => {
  const metrics = getSentenceMetrics(snapshot);
  return hasMetric(metrics.coverage) || hasMetric(metrics.wordErrorRate);
};

const formatDelta = (details, t) => {
  if (!details) return t("guardian_not_available");
  if (details.direction === "unchanged") return t("guardian_sentence_change_unchanged");
  return t(
    details.improved
      ? `guardian_sentence_change_${details.direction}_improvement`
      : `guardian_sentence_change_${details.direction}_review`,
    { value: details.percentagePoints }
  );
};

const titleFor = (snapshot, t) => {
  if (snapshot.kind === "baseline") return t("guardian_timeline_baseline");
  if (snapshot.kind === "checkpoint") {
    return t("guardian_timeline_trail_check", { number: snapshot.sequenceNo });
  }
  return t("guardian_timeline_game_estimate");
};

const statusFor = (status, t) =>
  t(`guardian_trend_${status}`, {
    defaultValue: String(status || "processing").replaceAll("_", " "),
  });

function SentenceMetricValue({ label, value, unavailable }) {
  return (
    <span>
      {label} <strong>{formatPercent(value, unavailable)}</strong>
    </span>
  );
}

function SentenceMetricComparison({ label, baselineValue, currentValue, lowerIsBetter, t }) {
  const delta = getSentenceDeltaDetails(baselineValue, currentValue, lowerIsBetter);

  return (
    <div>
      <p className="font-bold">{label}</p>
      <p className="mt-1 opacity-80">
        {t("guardian_sentence_baseline_current", {
          baseline: formatPercent(baselineValue, t("guardian_not_available")),
          current: formatPercent(currentValue, t("guardian_not_available")),
        })}
      </p>
      <p className={`mt-1 font-bold ${delta?.improved ? "text-emerald-800" : ""}`}>
        {formatDelta(delta, t)}
      </p>
    </div>
  );
}

function SentenceTimelineMetrics({ snapshot, baseline, t }) {
  if (!hasSentenceMetrics(snapshot)) return null;

  const current = getSentenceMetrics(snapshot);
  const baselineMetrics = getSentenceMetrics(baseline);
  const isFormalComparison = snapshot.kind === "checkpoint";

  return (
    <div className="mt-3 border-t border-current/15 pt-3" aria-label={t("guardian_sentence_timeline_title")}>
      <p className="text-xs font-bold">{t("guardian_sentence_timeline_title")}</p>
      {isFormalComparison ? (
        <div className="mt-2 grid gap-3 text-xs sm:grid-cols-2">
          {hasMetric(current.coverage) && (
            <SentenceMetricComparison
              label={t("guardian_sentence_coverage")}
              baselineValue={baselineMetrics.coverage}
              currentValue={current.coverage}
              lowerIsBetter={false}
              t={t}
            />
          )}
          {hasMetric(current.wordErrorRate) && (
            <SentenceMetricComparison
              label={t("guardian_sentence_word_error_rate")}
              baselineValue={baselineMetrics.wordErrorRate}
              currentValue={current.wordErrorRate}
              lowerIsBetter
              t={t}
            />
          )}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {hasMetric(current.coverage) && (
            <SentenceMetricValue
              label={t("guardian_sentence_coverage")}
              value={current.coverage}
              unavailable={t("guardian_not_available")}
            />
          )}
          {hasMetric(current.wordErrorRate) && (
            <SentenceMetricValue
              label={t("guardian_sentence_word_error_rate")}
              value={current.wordErrorRate}
              unavailable={t("guardian_not_available")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SpeechProgressTimeline({ baseline, activityEstimates = [], checkpoints = [] }) {
  const { t, i18n } = useTranslation("sp");
  const items = [baseline, ...activityEstimates, ...checkpoints]
    .filter(Boolean)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  if (!items.length) {
    return <p className="text-sm font-medium text-[#5B6475]">{t("guardian_timeline_no_evidence")}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((snapshot, index) => {
        const status = snapshot.trendStatus || snapshot.status || "processing";
        return (
          <div key={snapshot._id || `${snapshot.kind}-${snapshot.sequenceNo}-${index}`} className="grid grid-cols-[28px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className={`mt-1 h-3.5 w-3.5 rounded-full ${status === "positive_trend" || snapshot.status === "ready" ? "bg-emerald-500" : status === "processing" ? "bg-sky-500" : "bg-amber-500"}`} />
              {index < items.length - 1 && <span className="mt-1 h-full min-h-14 w-px bg-[#D8ECE3]" />}
            </div>
            <div className={`rounded-lg border px-4 py-3 ${toneByStatus[status] || toneByStatus[snapshot.status] || toneByStatus.insufficient_data}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{titleFor(snapshot, t)}</p>
                  <p className="mt-0.5 text-xs font-semibold opacity-75">{statusFor(status, t)}</p>
                </div>
                <p className="text-xs font-semibold opacity-70">
                  {snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleDateString(i18n.resolvedLanguage) : ""}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                <span>{t("guardian_word_accuracy")} <strong>{formatPercent(snapshot.metrics?.wordAccuracy)}</strong></span>
                <span>{t("guardian_similarity")} <strong>{formatPercent(snapshot.metrics?.meanSimilarityScore)}</strong></span>
                <span>{t("guardian_sound_error")} <strong>{formatPercent(snapshot.metrics?.meanPhonemeErrorRate)}</strong></span>
                <span>{t("guardian_retry_rate")} <strong>{formatPercent(snapshot.metrics?.retryRate)}</strong></span>
              </div>
              <SentenceTimelineMetrics snapshot={snapshot} baseline={baseline} t={t} />
              {snapshot.crossVersionComparisonBlocked && (
                <p className="mt-3 text-xs font-bold">{t("guardian_formal_comparison_method_changed")}</p>
              )}
              {snapshot.meaningfulDecision && (
                <p className="mt-3 text-xs font-bold">{t("guardian_meaningful_trend")}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SpeechProgressTimeline;
