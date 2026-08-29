import { useTranslation } from "react-i18next";

const REVIEW_STATUSES = new Set(["asr_empty", "invalid_audio"]);

const hasMetric = (value) =>
  value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

const formatPercent = (value, unavailable) =>
  hasMetric(value) ? `${Math.round(Number(value) * 100)}%` : unavailable;

const formatCount = (value, unavailable) =>
  hasMetric(value) ? String(Math.max(0, Math.round(Number(value)))) : unavailable;

const getDisplayState = (sentenceReading) => {
  const status = sentenceReading?.status || "unknown";
  if (status === "processing") return "processing";
  if (REVIEW_STATUSES.has(status)) return "needs_review";
  if (status !== "valid") return "unavailable";

  const hasPossibleDifference =
    (hasMetric(sentenceReading.omittedWordCount) && Number(sentenceReading.omittedWordCount) > 0) ||
    (hasMetric(sentenceReading.wordCoverage) && Number(sentenceReading.wordCoverage) < 1) ||
    (hasMetric(sentenceReading.sentenceSimilarity) && Number(sentenceReading.sentenceSimilarity) < 1);

  return hasPossibleDifference ? "possible_difference" : "ready";
};

const hasSentenceEvidence = (sentenceReading) =>
  Boolean(
    sentenceReading &&
      (String(sentenceReading.asrText || "").trim() ||
        ["valid", "processing", "asr_empty", "invalid_audio"].includes(sentenceReading.status) ||
        [
          sentenceReading.wordCoverage,
          sentenceReading.sentenceSimilarity,
          sentenceReading.wordsPerMinute,
          sentenceReading.omittedWordCount,
        ].some(hasMetric))
  );

const toneByState = {
  ready: "border-[#B7DEC9] bg-[#EAF7F0] text-[#0F5F48]",
  processing: "border-[#BBDCF2] bg-[#F3FAFF] text-[#24516F]",
  possible_difference: "border-[#F4D7A1] bg-[#FFF9EB] text-[#8A5A10]",
  needs_review: "border-[#F4D7A1] bg-[#FFF9EB] text-[#8A5A10]",
  unavailable: "border-[#D9DEE7] bg-[#F8F9FB] text-[#5B6475]",
};

function SentenceReadingAnalysis({ sentenceReading, fallbackTargetText = "" }) {
  const { t } = useTranslation("sp");

  if (!hasSentenceEvidence(sentenceReading)) return null;

  const unavailable = t("guardian_not_available");
  const displayState = getDisplayState(sentenceReading);
  const targetText = sentenceReading.targetText || fallbackTargetText || unavailable;
  const heardText = sentenceReading.asrText || unavailable;
  const alertKey = {
    processing: "guardian_sentence_alert_processing",
    possible_difference: "guardian_sentence_alert_possible_difference",
    needs_review:
      sentenceReading.status === "invalid_audio"
        ? "guardian_sentence_alert_invalid_audio"
        : "guardian_sentence_alert_needs_review",
    unavailable: "guardian_sentence_alert_unavailable",
  }[displayState];

  return (
    <section className="mt-3 border-y border-[#D8EAF7] py-3" aria-label={t("guardian_sentence_analysis_title")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#24516F]">
          {t("guardian_sentence_analysis_title")}
        </p>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${toneByState[displayState]}`}>
          {t(`guardian_sentence_status_${displayState}`)}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-5 gap-y-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-bold text-[#5B6475]">{t("guardian_target_sentence")}</dt>
          <dd className="mt-1 break-words font-semibold leading-5 text-[#101828]">{targetText}</dd>
        </div>
        <div>
          <dt className="font-bold text-[#5B6475]">{t("guardian_leo_heard")}</dt>
          <dd className="mt-1 break-words font-semibold leading-5 text-[#101828]">{heardText}</dd>
        </div>
        <div>
          <dt className="font-bold text-[#5B6475]">{t("guardian_sentence_coverage")}</dt>
          <dd className="mt-1 font-semibold text-[#101828]">
            {formatPercent(sentenceReading.wordCoverage, unavailable)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-[#5B6475]">{t("guardian_sentence_similarity")}</dt>
          <dd className="mt-1 font-semibold text-[#101828]">
            {formatPercent(sentenceReading.sentenceSimilarity, unavailable)}
          </dd>
        </div>
        {sentenceReading.wordsPerMinute !== null && sentenceReading.wordsPerMinute !== undefined && (
          <div>
            <dt className="font-bold text-[#5B6475]">{t("guardian_reading_pace")}</dt>
            <dd className="mt-1 font-semibold text-[#101828]">
              {hasMetric(sentenceReading.wordsPerMinute)
                ? t("guardian_words_per_minute", {
                    count: Math.max(0, Math.round(Number(sentenceReading.wordsPerMinute))),
                  })
                : unavailable}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-bold text-[#5B6475]">{t("guardian_omitted_word_count")}</dt>
          <dd className="mt-1 font-semibold text-[#101828]">
            {formatCount(sentenceReading.omittedWordCount, unavailable)}
          </dd>
        </div>
      </dl>

      {alertKey && (
        <p className={`mt-3 border-l-2 px-3 py-2 text-xs font-semibold leading-5 ${toneByState[displayState]}`}>
          {t(alertKey)}
        </p>
      )}
    </section>
  );
}

export default SentenceReadingAnalysis;
