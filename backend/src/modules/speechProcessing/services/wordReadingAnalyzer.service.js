const NON_WORD_CHARS = /[^a-z0-9\s']/gi;

const phrasePrefixes = [
  /^the\s+word\s+is\s+/i,
  /^word\s+is\s+/i,
  /^i\s+said\s+/i,
  /^i\s+say\s+/i,
  /^i\s+read\s+/i,
  /^it\s+is\s+/i,
  /^it's\s+/i,
  /^this\s+is\s+/i,
];

const normalizeBase = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(NON_WORD_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeSpeechText = (text, options = {}) => {
  let normalized = normalizeBase(text);
  if (!normalized) return "";

  phrasePrefixes.some((pattern) => {
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, "").trim();
      return true;
    }
    return false;
  });

  const words = normalized.split(/\s+/).filter(Boolean);
  const targetWord = normalizeBase(options.targetWord).split(/\s+/)[0] || "";
  if (targetWord && words.includes(targetWord)) return targetWord;
  return words[0] || "";
};

const levenshteinDistance = (left, right) => {
  const a = String(left || "");
  const b = String(right || "");
  const matrix = Array.from({ length: a.length + 1 }, (_, row) => [row]);

  for (let col = 1; col <= b.length; col += 1) matrix[0][col] = col;

  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      const substitutionCost = a[row - 1] === b[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + substitutionCost
      );
    }
  }

  return matrix[a.length][b.length];
};

const getSimilarityScore = (target, asr) => {
  const maxLength = Math.max(target.length, asr.length);
  if (!maxLength) return 0;
  const distance = levenshteinDistance(target, asr);
  return Number(Math.max(0, 1 - distance / maxLength).toFixed(2));
};

const hasSameSuffix = (target, asr) =>
  target.length > 1 && asr.length > 1 && target.slice(1) === asr.slice(1);

const hasSamePrefix = (target, asr) =>
  target.length > 1 && asr.length > 1 && target.slice(0, -1) === asr.slice(0, -1);

const getPossibleError = ({
  normalizedTargetWord,
  normalizedAsrText,
  wordCorrect,
  initialSoundError,
  finalSoundError,
  similarityScore,
}) => {
  if (!normalizedAsrText) return "asr_empty";
  if (wordCorrect) return "none";
  if (initialSoundError) {
    return `initial sound confusion: ${normalizedTargetWord[0]} -> ${normalizedAsrText[0]}`;
  }
  if (finalSoundError) {
    return `final sound confusion: ${normalizedTargetWord.at(-1)} -> ${normalizedAsrText.at(-1)}`;
  }
  if (
    Math.abs(normalizedAsrText.length - normalizedTargetWord.length) === 1 &&
    Number(similarityScore || 0) >= 0.5
  ) {
    return "possible substitution error";
  }
  if (normalizedAsrText.length < normalizedTargetWord.length) return "possible deletion error";
  if (normalizedAsrText.length > normalizedTargetWord.length) return "possible insertion error";
  return "possible substitution error";
};

const analyzeWordCorrectness = (targetWord, asrText) => {
  const normalizedTargetWord = normalizeSpeechText(targetWord);
  const normalizedAsrText = normalizeSpeechText(asrText, { targetWord: normalizedTargetWord });
  const wordCorrect =
    Boolean(normalizedTargetWord) &&
    Boolean(normalizedAsrText) &&
    normalizedTargetWord === normalizedAsrText;
  const editDistance = levenshteinDistance(normalizedTargetWord, normalizedAsrText);
  const similarityScore = getSimilarityScore(normalizedTargetWord, normalizedAsrText);
  const initialSoundError =
    !wordCorrect &&
    Boolean(normalizedTargetWord && normalizedAsrText) &&
    normalizedTargetWord[0] !== normalizedAsrText[0] &&
    (hasSameSuffix(normalizedTargetWord, normalizedAsrText) || similarityScore >= 0.5);
  const finalSoundError =
    !wordCorrect &&
    !initialSoundError &&
    Boolean(normalizedTargetWord && normalizedAsrText) &&
    normalizedTargetWord.at(-1) !== normalizedAsrText.at(-1) &&
    (hasSamePrefix(normalizedTargetWord, normalizedAsrText) || similarityScore >= 0.5);

  return {
    normalizedTargetWord,
    normalizedAsrText,
    wordCorrect,
    editDistance,
    similarityScore,
    initialSoundError,
    finalSoundError,
    possibleError: getPossibleError({
      normalizedTargetWord,
      normalizedAsrText,
      wordCorrect,
      initialSoundError,
      finalSoundError,
      similarityScore,
    }),
  };
};

const getChildWordFeedback = (wordReading = {}) => {
  if (wordReading.attemptStatus === "invalid_audio") {
    return "හඬ පැහැදිලි නැහැ. කරුණාකර නැවත record කරන්න.";
  }
  if (wordReading.wordCorrect) {
    return "හොඳයි! ඔයා වචනය නිවැරදිව කිව්වා.";
  }
  if (wordReading.attemptStatus === "valid") {
    return "නැවත උත්සාහ කරමු. මුල් sound එක බලන්න.";
  }
  return "";
};

module.exports = {
  normalizeSpeechText,
  analyzeWordCorrectness,
  getChildWordFeedback,
};
