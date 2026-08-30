const NON_SENTENCE_TOKEN_CHARS = /[^a-z0-9\s']/gi;
const {
  analyzeWordCorrectness,
  normalizeSpeechText,
} = require("./wordReadingAnalyzer.service");
const SENTENCE_READING_TASK_TYPES = new Set([
  "sentence_read",
  "paragraph_segment_read",
]);

const roundMetric = (value) => Number(value.toFixed(4));

const normalizeSentenceText = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(NON_SENTENCE_TOKEN_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text) => (text ? text.split(" ") : []);

const alignTokens = (targetTokens, asrTokens) => {
  const matrix = Array.from({ length: targetTokens.length + 1 }, (_, row) => [row]);

  for (let column = 1; column <= asrTokens.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= targetTokens.length; row += 1) {
    for (let column = 1; column <= asrTokens.length; column += 1) {
      const substitutionCost = targetTokens[row - 1] === asrTokens[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost
      );
    }
  }

  const omittedWords = [];
  const insertedWords = [];
  const substitutions = [];
  let matchedWordCount = 0;
  let row = targetTokens.length;
  let column = asrTokens.length;

  while (row > 0 || column > 0) {
    if (
      row > 0 &&
      column > 0 &&
      targetTokens[row - 1] === asrTokens[column - 1] &&
      matrix[row][column] === matrix[row - 1][column - 1]
    ) {
      matchedWordCount += 1;
      row -= 1;
      column -= 1;
      continue;
    }

    if (
      row > 0 &&
      column > 0 &&
      matrix[row][column] === matrix[row - 1][column - 1] + 1
    ) {
      substitutions.push({ expected: targetTokens[row - 1], heard: asrTokens[column - 1] });
      row -= 1;
      column -= 1;
      continue;
    }

    if (row > 0 && matrix[row][column] === matrix[row - 1][column] + 1) {
      omittedWords.push(targetTokens[row - 1]);
      row -= 1;
      continue;
    }

    insertedWords.push(asrTokens[column - 1]);
    column -= 1;
  }

  return {
    tokenEditDistance: matrix[targetTokens.length][asrTokens.length],
    matchedWordCount,
    tokenErrors: {
      omittedWords: omittedWords.reverse(),
      insertedWords: insertedWords.reverse(),
      substitutions: substitutions.reverse(),
    },
  };
};

const getWordsPerMinute = (recognizedWordCount, audioDurationMs) => {
  const duration = Number(audioDurationMs);
  if (!recognizedWordCount || !Number.isFinite(duration) || duration <= 0) return null;
  return roundMetric((recognizedWordCount * 60000) / duration);
};

const analyzeSentenceReading = ({ targetText, asrText, audioDurationMs } = {}) => {
  const normalizedTargetText = normalizeSentenceText(targetText);
  const normalizedAsrText = normalizeSentenceText(asrText);
  const targetTokens = tokenize(normalizedTargetText);
  const asrTokens = tokenize(normalizedAsrText);
  const { tokenEditDistance, matchedWordCount, tokenErrors } = alignTokens(targetTokens, asrTokens);
  const targetWordCount = targetTokens.length;
  const recognizedWordCount = asrTokens.length;
  const omittedWordCount = tokenErrors.omittedWords.length;
  const insertedWordCount = tokenErrors.insertedWords.length;
  const substitutedWordCount = tokenErrors.substitutions.length;
  const hasTarget = targetWordCount > 0;
  const hasAsr = recognizedWordCount > 0;
  const wordErrorRate = hasTarget ? roundMetric(tokenEditDistance / targetWordCount) : null;
  const wordCoverage = hasTarget ? roundMetric(matchedWordCount / targetWordCount) : null;
  const comparisonLength = Math.max(targetWordCount, recognizedWordCount);
  const sentenceSimilarity = comparisonLength
    ? roundMetric(Math.max(0, 1 - tokenEditDistance / comparisonLength))
    : 0;
  const exactMatch = hasTarget && hasAsr && tokenEditDistance === 0;
  const partialMatch = !exactMatch && Boolean(wordCoverage !== null && wordCoverage >= 0.6);
  const wordsPerMinute = getWordsPerMinute(recognizedWordCount, audioDurationMs);
  const warnings = [];

  if (!hasTarget) warnings.push("target_empty");
  if (!hasAsr) warnings.push("asr_empty");
  if (hasTarget && hasAsr && (tokenEditDistance > 0 || wordCoverage < 1)) {
    warnings.push("asr_transcript_incomplete");
  }
  const duration = Number(audioDurationMs);
  if (!Number.isFinite(duration) || duration <= 0) warnings.push("audio_duration_unavailable");

  return {
    normalizedTargetText,
    normalizedAsrText,
    targetWordCount,
    recognizedWordCount,
    matchedWordCount,
    omittedWordCount,
    insertedWordCount,
    substitutedWordCount,
    tokenEditDistance,
    wordErrorRate,
    wordCoverage,
    sentenceSimilarity,
    exactMatch,
    partialMatch,
    wordsPerMinute,
    tokenErrors,
    status: !hasTarget ? "skipped" : !hasAsr ? "asr_empty" : "valid",
    warnings,
  };
};

const isSentenceReadingTask = (taskType) => SENTENCE_READING_TASK_TYPES.has(taskType);

const createUnavailableSentenceReading = ({
  targetText,
  status,
  warning,
  asrProvider,
  asrModel,
}) => {
  const normalizedTargetText = normalizeSentenceText(targetText);
  return {
    targetText: String(targetText || ""),
    asrText: "",
    normalizedTargetText,
    normalizedAsrText: "",
    targetWordCount: normalizedTargetText ? normalizedTargetText.split(" ").length : 0,
    recognizedWordCount: null,
    matchedWordCount: null,
    omittedWordCount: null,
    insertedWordCount: null,
    substitutedWordCount: null,
    tokenEditDistance: null,
    wordErrorRate: null,
    wordCoverage: null,
    sentenceSimilarity: null,
    exactMatch: false,
    partialMatch: false,
    wordsPerMinute: null,
    tokenErrors: {
      omittedWords: [],
      insertedWords: [],
      substitutions: [],
    },
    status,
    warnings: warning ? [warning] : [],
    asrProvider: asrProvider || "",
    asrModel: asrModel || "",
  };
};

const analyzeReadingTask = ({
  taskType,
  targetText,
  targetWord,
  asrText,
  audioDurationMs,
  asrProvider,
  asrModel,
  status,
  warning,
} = {}) => {
  if (!isSentenceReadingTask(taskType)) {
    const resolvedTargetWord = normalizeSpeechText(targetWord || targetText);
    const analysis = analyzeWordCorrectness(resolvedTargetWord, asrText);
    return {
      wordReading: {
        targetWord: resolvedTargetWord,
        asrText: String(asrText || ""),
        ...analysis,
        attemptStatus: status || (analysis.normalizedAsrText ? "valid" : "asr_empty"),
        asrProvider: asrProvider || "",
        asrModel: asrModel || "",
        error: warning || (analysis.normalizedAsrText ? "" : "asr_empty"),
      },
    };
  }

  if (status && status !== "valid" && status !== "asr_empty") {
    return {
      sentenceReading: createUnavailableSentenceReading({
        targetText,
        status,
        warning,
        asrProvider,
        asrModel,
      }),
    };
  }

  return {
    sentenceReading: {
      targetText: String(targetText || ""),
      asrText: String(asrText || ""),
      ...analyzeSentenceReading({ targetText, asrText, audioDurationMs }),
      asrProvider: asrProvider || "",
      asrModel: asrModel || "",
    },
  };
};

const getChildSentenceFeedback = (sentenceReading = {}) => {
  if (sentenceReading.status === "invalid_audio") {
    return {
      state: "retry",
      message: "හඬ පැහැදිලි නැහැ. නැවත කියවමු.",
    };
  }
  if (sentenceReading.status === "valid") {
    return {
      state: "complete",
      message: "Great reading! Leo heard your story.",
    };
  }
  if (sentenceReading.status === "asr_empty") {
    return {
      state: "saved",
      message: "Your recording was saved. You can continue.",
    };
  }
  return {
    state: "processing",
    message: "Leo is still listening.",
  };
};

module.exports = {
  analyzeReadingTask,
  analyzeSentenceReading,
  getChildSentenceFeedback,
  isSentenceReadingTask,
  normalizeSentenceText,
};
