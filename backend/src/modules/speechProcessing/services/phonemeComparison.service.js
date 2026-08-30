const { normalizeSpeechText } = require("./wordReadingAnalyzer.service");

const VOWEL_TOKENS = new Set([
  "A",
  "E",
  "I",
  "O",
  "U",
  "AI",
  "AR",
  "EE",
  "ER",
  "IGH",
  "OA",
  "OI",
  "OO",
  "OR",
  "OW",
]);

const DIGRAPH_RULES = [
  ["tch", "CH"],
  ["dge", "J"],
  ["igh", "IGH"],
  ["sh", "SH"],
  ["ch", "CH"],
  ["th", "TH"],
  ["ph", "F"],
  ["wh", "W"],
  ["ck", "K"],
  ["ng", "NG"],
  ["qu", "KW"],
  ["ee", "EE"],
  ["ea", "EE"],
  ["oo", "OO"],
  ["ai", "AI"],
  ["ay", "AI"],
  ["oa", "OA"],
  ["ow", "OW"],
  ["ou", "OW"],
  ["oi", "OI"],
  ["oy", "OI"],
  ["er", "ER"],
  ["ir", "ER"],
  ["ur", "ER"],
  ["ar", "AR"],
  ["or", "OR"],
];

const LETTER_MAP = {
  a: "A",
  b: "B",
  c: "K",
  d: "D",
  e: "E",
  f: "F",
  g: "G",
  h: "H",
  i: "I",
  j: "J",
  k: "K",
  l: "L",
  m: "M",
  n: "N",
  o: "O",
  p: "P",
  q: "K",
  r: "R",
  s: "S",
  t: "T",
  u: "U",
  v: "V",
  w: "W",
  x: "KS",
  y: "Y",
  z: "Z",
};

const ROUND_DIGITS = 3;

const round = (value, digits = ROUND_DIGITS) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(digits));
};

const isLikelyPseudoword = (word = "") => {
  const normalized = normalizeSpeechText(word);
  if (!normalized) return false;
  return /^(mip|blim|sote|plam|fep)$/i.test(normalized);
};

const tokenizeWordToPhonemes = (word) => {
  const normalized = normalizeSpeechText(word);
  const tokens = [];
  let index = 0;

  while (index < normalized.length) {
    const remaining = normalized.slice(index);
    const matched = DIGRAPH_RULES.find(([pattern]) => remaining.startsWith(pattern));
    if (matched) {
      tokens.push(matched[1]);
      index += matched[0].length;
      continue;
    }

    const char = normalized[index];
    if (char === "e" && index === normalized.length - 1 && normalized.length > 2) {
      index += 1;
      continue;
    }
    if (char === "c" && /[eiy]/.test(normalized[index + 1] || "")) {
      tokens.push("S");
    } else if (char === "g" && /[eiy]/.test(normalized[index + 1] || "")) {
      tokens.push("J");
    } else {
      tokens.push(LETTER_MAP[char] || char.toUpperCase());
    }
    index += 1;
  }

  return tokens;
};

const getTokenDistance = (targetTokens = [], asrTokens = []) => {
  const rows = targetTokens.length + 1;
  const cols = asrTokens.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = targetTokens[row - 1] === asrTokens[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  let row = targetTokens.length;
  let col = asrTokens.length;
  const operations = {
    insertionCount: 0,
    deletionCount: 0,
    substitutionCount: 0,
  };

  while (row > 0 || col > 0) {
    if (
      row > 0 &&
      col > 0 &&
      matrix[row][col] ===
        matrix[row - 1][col - 1] + (targetTokens[row - 1] === asrTokens[col - 1] ? 0 : 1)
    ) {
      if (targetTokens[row - 1] !== asrTokens[col - 1]) {
        operations.substitutionCount += 1;
      }
      row -= 1;
      col -= 1;
    } else if (row > 0 && matrix[row][col] === matrix[row - 1][col] + 1) {
      operations.deletionCount += 1;
      row -= 1;
    } else {
      operations.insertionCount += 1;
      col -= 1;
    }
  }

  return {
    phonemeEditDistance: matrix[targetTokens.length][asrTokens.length],
    ...operations,
  };
};

const getLeadingConsonants = (tokens = []) => {
  const consonants = [];
  for (const token of tokens) {
    if (VOWEL_TOKENS.has(token)) break;
    consonants.push(token);
  }
  return consonants;
};

const getTrailingConsonants = (tokens = []) => {
  const consonants = [];
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (VOWEL_TOKENS.has(token)) break;
    consonants.unshift(token);
  }
  return consonants;
};

const getVowels = (tokens = []) => tokens.filter((token) => VOWEL_TOKENS.has(token));

const arraysEqual = (left = [], right = []) =>
  left.length === right.length && left.every((item, index) => item === right[index]);

const getErrorPattern = ({
  phonemeErrorRate,
  initialSoundError,
  finalSoundError,
  vowelMismatch,
  consonantClusterError,
  deletionCount,
  insertionCount,
  substitutionCount,
}) => {
  if (!phonemeErrorRate) return "none";
  if (initialSoundError) return "initial_sound_pattern";
  if (finalSoundError) return "final_sound_pattern";
  if (vowelMismatch) return "vowel_sound_pattern";
  if (consonantClusterError) return "consonant_cluster_pattern";
  if (deletionCount > insertionCount && deletionCount >= substitutionCount) return "possible_phoneme_deletion";
  if (insertionCount > deletionCount && insertionCount >= substitutionCount) return "possible_phoneme_insertion";
  return "possible_phoneme_substitution";
};

const buildWarnings = ({ normalizedTargetWord, normalizedAsrText, targetText, taskType }) => {
  const warnings = [];
  if (!normalizedAsrText) warnings.push("asr_empty");
  if (isLikelyPseudoword(normalizedTargetWord) || String(taskType || "").includes("pseudo")) {
    warnings.push("pseudoword_asr_low_confidence");
  }
  if (String(targetText || normalizedTargetWord).trim().includes(" ")) {
    warnings.push("single_word_sound_pattern_only");
  }
  return warnings;
};

const analyzePhonemeComparison = ({
  targetWord,
  asrText,
  wordReading = {},
  taskType = "",
  targetText = "",
} = {}) => {
  const normalizedTargetWord =
    wordReading.normalizedTargetWord || normalizeSpeechText(targetWord || targetText);
  const normalizedAsrText =
    wordReading.normalizedAsrText || normalizeSpeechText(asrText, { targetWord: normalizedTargetWord });

  if (!normalizedTargetWord) {
    return {
      status: "skipped",
      targetPhonemes: [],
      asrPhonemes: [],
      phonemeEditDistance: 0,
      phonemeErrorRate: 0,
      initialSoundError: false,
      finalSoundError: false,
      vowelMismatch: false,
      consonantClusterError: false,
      deletionCount: 0,
      insertionCount: 0,
      substitutionCount: 0,
      errorPattern: "target_word_missing",
      confidence: "low",
      warnings: ["target_word_missing"],
      createdAt: new Date(),
    };
  }

  const targetPhonemes = tokenizeWordToPhonemes(normalizedTargetWord);
  if (!normalizedAsrText) {
    return {
      status: "asr_empty",
      targetPhonemes,
      asrPhonemes: [],
      phonemeEditDistance: targetPhonemes.length,
      phonemeErrorRate: targetPhonemes.length ? 1 : 0,
      initialSoundError: false,
      finalSoundError: false,
      vowelMismatch: false,
      consonantClusterError: false,
      deletionCount: targetPhonemes.length,
      insertionCount: 0,
      substitutionCount: 0,
      errorPattern: "asr_empty",
      confidence: "low",
      warnings: buildWarnings({ normalizedTargetWord, normalizedAsrText, targetText, taskType }),
      createdAt: new Date(),
    };
  }

  const asrPhonemes = tokenizeWordToPhonemes(normalizedAsrText);
  const counts = getTokenDistance(targetPhonemes, asrPhonemes);
  const maxLength = Math.max(targetPhonemes.length, asrPhonemes.length, 1);
  const phonemeErrorRate = round(counts.phonemeEditDistance / maxLength);
  const initialSoundError =
    Boolean(targetPhonemes.length && asrPhonemes.length) &&
    targetPhonemes[0] !== asrPhonemes[0] &&
    phonemeErrorRate <= 0.5;
  const finalSoundError =
    !initialSoundError &&
    Boolean(targetPhonemes.length && asrPhonemes.length) &&
    targetPhonemes.at(-1) !== asrPhonemes.at(-1) &&
    phonemeErrorRate <= 0.5;
  const targetVowels = getVowels(targetPhonemes);
  const asrVowels = getVowels(asrPhonemes);
  const vowelMismatch =
    targetVowels.length > 0 && asrVowels.length > 0 && !arraysEqual(targetVowels, asrVowels);
  const targetLeadingCluster = getLeadingConsonants(targetPhonemes);
  const asrLeadingCluster = getLeadingConsonants(asrPhonemes);
  const targetTrailingCluster = getTrailingConsonants(targetPhonemes);
  const asrTrailingCluster = getTrailingConsonants(asrPhonemes);
  const consonantClusterError =
    (targetLeadingCluster.length > 1 && !arraysEqual(targetLeadingCluster, asrLeadingCluster)) ||
    (targetTrailingCluster.length > 1 && !arraysEqual(targetTrailingCluster, asrTrailingCluster));
  const warnings = buildWarnings({ normalizedTargetWord, normalizedAsrText, targetText, taskType });
  const confidence = warnings.includes("pseudoword_asr_low_confidence") ? "medium" : "medium_high";
  const errorPattern = getErrorPattern({
    phonemeErrorRate,
    initialSoundError,
    finalSoundError,
    vowelMismatch,
    consonantClusterError,
    ...counts,
  });

  return {
    status: "completed",
    targetPhonemes,
    asrPhonemes,
    phonemeEditDistance: counts.phonemeEditDistance,
    phonemeErrorRate,
    initialSoundError,
    finalSoundError,
    vowelMismatch,
    consonantClusterError,
    deletionCount: counts.deletionCount,
    insertionCount: counts.insertionCount,
    substitutionCount: counts.substitutionCount,
    errorPattern,
    confidence,
    warnings,
    createdAt: new Date(),
  };
};

const getInitialPhonemeComparison = ({ targetWord, features, wordReading } = {}) => {
  if (!features?.validAudio) {
    return {
      ...analyzePhonemeComparison({ targetWord, wordReading: { normalizedAsrText: "" } }),
      status: "skipped",
      errorPattern: "invalid_audio",
      warnings: ["audio_invalid"],
    };
  }
  if (wordReading?.attemptStatus && wordReading.attemptStatus !== "processing") {
    return analyzePhonemeComparison({ targetWord, wordReading });
  }
  return {
    ...analyzePhonemeComparison({ targetWord, wordReading: { normalizedAsrText: "" } }),
    status: "processing",
    phonemeEditDistance: 0,
    phonemeErrorRate: 0,
    deletionCount: 0,
    errorPattern: "processing",
    warnings: ["background_processing_pending"],
  };
};

const getChildSoundFeedback = (phonemeComparison = {}) => {
  if (!phonemeComparison || phonemeComparison.status === "processing") {
    return null;
  }
  if (phonemeComparison.status === "skipped") {
    return null;
  }
  if (phonemeComparison.status === "asr_empty") {
    return {
      state: "retry",
      message: "Leo needs a clearer sound path. Try saying the word again.",
      focusAreas: ["Clear voice"],
    };
  }
  if (!phonemeComparison.phonemeErrorRate) {
    return {
      state: "strong",
      message: "Your sound path is strong.",
      focusAreas: ["First sound", "Ending sound", "Vowel sound"],
    };
  }

  const focusAreas = [];
  if (phonemeComparison.initialSoundError) focusAreas.push("First sound");
  if (phonemeComparison.finalSoundError) focusAreas.push("Ending sound");
  if (phonemeComparison.vowelMismatch) focusAreas.push("Vowel sound");
  if (phonemeComparison.consonantClusterError) focusAreas.push("Sound blend");

  return {
    state: "practice",
    message: focusAreas.length
      ? "Leo will help with this sound path."
      : "Leo heard your sound. Keep practicing the word path.",
    focusAreas: focusAreas.length ? focusAreas : ["Word sound"],
  };
};

module.exports = {
  analyzePhonemeComparison,
  getChildSoundFeedback,
  getInitialPhonemeComparison,
  tokenizeWordToPhonemes,
};
