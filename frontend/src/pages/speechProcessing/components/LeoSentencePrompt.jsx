import { useTranslation } from "react-i18next";

function LeoSentencePrompt({ prompt }) {
  const { t } = useTranslation("sp");
  const chunks = Array.isArray(prompt?.displayChunks) && prompt.displayChunks.length
    ? prompt.displayChunks
    : [prompt?.targetText].filter(Boolean);
  const hasSegmentProgress = Boolean(
    prompt?.paragraphId &&
    Number.isInteger(Number(prompt?.segmentNo)) &&
    Number.isInteger(Number(prompt?.segmentCount)) &&
    Number(prompt.segmentNo) > 0 &&
    Number(prompt.segmentCount) > 0
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl" data-testid="leo-sentence-prompt">
      {hasSegmentProgress && (
        <p className="mb-3 text-sm font-black text-emerald-800" aria-live="polite">
          {t("sentence_progress", {
            current: prompt.segmentNo,
            total: prompt.segmentCount,
          })}
        </p>
      )}
      <div
        className="min-w-0 text-center text-2xl font-black leading-relaxed text-slate-950 sm:text-3xl"
        aria-label={prompt?.targetText}
      >
        {chunks.map((chunk, index) => (
          <span
            key={`${prompt?.promptId || "sentence"}-${index}`}
            className="block max-w-full break-words [overflow-wrap:anywhere]"
          >
            {chunk}{index < chunks.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export default LeoSentencePrompt;
