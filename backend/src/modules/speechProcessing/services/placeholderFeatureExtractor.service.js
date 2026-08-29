const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const taskDifficultyPenalty = {
  read_aloud_word: 0,
  minimal_pair_read: 0.08,
  minimal_pair: 0.08,
  pseudoword_read: 0.14,
  sentence_read: 0.06,
  listen_repeat: 0.04,
};

const leoBaseScore = {
  read_aloud_word: 0.8,
  pseudoword_read: 0.62,
  minimal_pair_read: 0.7,
  minimal_pair: 0.7,
  sentence_read: 0.68,
  listen_repeat: 0.78,
};

const invalidAudioMessages = {
  too_short: "Leo could not hear enough. Let's try again!",
  audio_too_short: "Leo could not hear enough. Let's try again!",
  too_quiet: "Please speak a little louder for Leo.",
  mostly_silence: "Leo could not hear your voice. Try again.",
  no_speech_detected: "Leo could not hear your voice. Try again.",
  too_loud_or_clipped: "That was very loud. Try again softly.",
  audio_normalization_failed: "Leo could not check that sound. Let's try one more time.",
  audio_analysis_failed: "Leo could not check that sound. Let's try one more time.",
  audio_analysis_timeout: "Leo could not check that sound. Let's try one more time.",
  file_missing: "Leo could not hear your sound. Let's try again!",
  missing_audio_file: "Leo could not hear your sound. Let's try again!",
};

const round = (value, digits = 2) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Number(number.toFixed(digits));
};

const getBaseScore = (taskType, isLeoIdentification) =>
  leoBaseScore[taskType] ?? (isLeoIdentification ? 0.66 : 0.86);

const getDeterministicOffset = (promptId) =>
  promptId
    ? (String(promptId)
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        7) /
      100
    : 0;

const getInvalidChildFeedback = (reason) =>
  invalidAudioMessages[reason] || "Leo could not check that sound. Let's try one more time.";

const canUsePlaceholderAudio = ({
  nodeEnv,
  placeholderRequested,
  hasFile,
  isSelection,
} = {}) =>
  nodeEnv !== "production" &&
  placeholderRequested === true &&
  hasFile !== true &&
  isSelection !== true;

const buildSelectionFeatures = ({
  audioDurationMs,
  attemptNo,
  taskType,
  promptId,
  targetText,
  targetPhonemes,
  playedAudioFirst,
  mode,
  skill,
  selectedAnswer,
  expectedAnswer,
}) => {
  const currentAttemptNo = Math.max(Number(attemptNo) || 1, 1);
  const retryCount = Math.max(currentAttemptNo - 1, 0);
  const selectedCorrectPlaceholder =
    String(selectedAnswer || "").toLowerCase().trim() ===
    String(expectedAnswer || "").toLowerCase().trim();
  const score = selectedCorrectPlaceholder ? 0.9 : 0.45;

  return {
    validAudio: true,
    invalidReason: "",
    audioDurationSec: round((Number(audioDurationMs) || 900) / 1000),
    serverAudioDurationSec: undefined,
    frontendAudioDurationSec: round((Number(audioDurationMs) || 900) / 1000),
    durationMismatchMs: undefined,
    estimatedSpeechSec: 0,
    silenceRatio: 0,
    pauseCount: 0,
    meanVolumeDb: undefined,
    maxVolumeDb: undefined,
    rmsAmplitude: undefined,
    clippingRatio: 0,
    audioQualityScore: 1,
    audioQualityLabel: "selection",
    audioSizeBytes: 0,
    responseLatencySec: round(0.7 + retryCount * 0.2),
    speechDurationSec: 0,
    wordCorrectPlaceholder: selectedCorrectPlaceholder,
    selectedCorrectPlaceholder,
    selectedAnswer,
    expectedAnswer,
    phonemeErrorRatePlaceholder: round(1 - score),
    pronunciationScorePlaceholder: score,
    retryCount,
    taskDifficultyWeight: 0,
    playedAudioFirst: Boolean(playedAudioFirst),
    skill,
    taskType,
    promptId,
    targetText,
    targetPhonemes,
    mode,
    dataSource: "basic_audio_features_v1",
  };
};

exports.extractPlaceholderFeatures = ({
  file,
  fileMetadata,
  audioAnalysis,
  audioDurationMs,
  attemptNo,
  taskType,
  promptId,
  targetText,
  targetPhonemes = [],
  playedAudioFirst,
  mode,
  skill,
  allowPlaceholderAudio = false,
  isSelection = false,
  selectedAnswer,
  expectedAnswer,
}) => {
  // TODO: Replace placeholder scoring with calibrated pronunciation features and real ML.
  // TODO: Add Whisper/wav2vec2 and phoneme-comparison features in a later phase.
  const currentAttemptNo = Math.max(Number(attemptNo) || 1, 1);
  const retryCount = Math.max(currentAttemptNo - 1, 0);
  if (isSelection === true) {
    return buildSelectionFeatures({
      audioDurationMs,
      attemptNo,
      taskType,
      promptId,
      targetText,
      targetPhonemes,
      playedAudioFirst,
      mode,
      skill,
      selectedAnswer,
      expectedAnswer,
    });
  }

  const metadata = audioAnalysis?.audioMetadata || {};
  const volume = audioAnalysis?.volumeFeatures || {};
  const silence = audioAnalysis?.silenceFeatures || {};
  const quality = audioAnalysis?.audioQuality || {};
  const hasAudioAnalysis = Boolean(audioAnalysis);
  const serverAudioDurationMs = Number(audioAnalysis?.serverAudioDurationMs || 0);
  const frontendAudioDurationMs = Number(
    audioAnalysis?.frontendAudioDurationMs ?? audioDurationMs ?? 0
  );
  const durationMs = hasAudioAnalysis
    ? serverAudioDurationMs || frontendAudioDurationMs
    : Number(audioDurationMs) || 0;
  const audioDurationSec = round(durationMs / 1000);
  const audioSizeBytes = Number(
    metadata.fileSizeBytes ||
      fileMetadata?.audioSizeBytes ||
      fileMetadata?.size ||
      file?.size ||
      0
  );
  const hasFile = Boolean(file || audioSizeBytes || allowPlaceholderAudio);
  const legacyInvalidReason = !hasFile
    ? "missing_audio_file"
    : durationMs < 500
      ? "audio_too_short"
      : durationMs > 30000
        ? "audio_too_long"
        : "";
  const validAudio = hasAudioAnalysis ? Boolean(quality.validAudio) : !legacyInvalidReason;
  const invalidReason = hasAudioAnalysis ? quality.invalidReason || "" : legacyInvalidReason;
  const audioQualityScore = hasAudioAnalysis
    ? Number(quality.qualityScore ?? 0)
    : validAudio
      ? 1
      : 0;
  const isLeoIdentification = mode === "identification";
  const baseScore = getBaseScore(taskType, isLeoIdentification);
  const deterministicOffset = getDeterministicOffset(promptId);

  if (!validAudio) {
    return {
      validAudio,
      invalidReason,
      childFeedback: getInvalidChildFeedback(invalidReason),
      audioDurationSec,
      serverAudioDurationSec: round(serverAudioDurationMs / 1000),
      frontendAudioDurationSec: round(frontendAudioDurationMs / 1000),
      durationMismatchMs: audioAnalysis?.durationMismatchMs,
      estimatedSpeechSec: round(silence.estimatedSpeechSec || 0),
      silenceRatio: round(silence.silenceRatio || 0, 3),
      pauseCount: silence.pauseCount || 0,
      meanVolumeDb: volume.meanVolumeDb,
      maxVolumeDb: volume.maxVolumeDb,
      rmsAmplitude: volume.rmsAmplitude,
      peakAmplitude: volume.peakAmplitude,
      clippingRatio: volume.clippingRatio,
      audioQualityScore,
      audioQualityLabel: quality.qualityLabel || "invalid",
      audioSizeBytes,
      responseLatencySec: round(0.8 + retryCount * 0.25),
      speechDurationSec: round(silence.estimatedSpeechSec || audioDurationSec || 0),
      wordCorrectPlaceholder: false,
      phonemeErrorRatePlaceholder: 1,
      pronunciationScorePlaceholder: 0,
      retryCount,
      taskDifficultyWeight: taskDifficultyPenalty[taskType] ?? 0.05,
      playedAudioFirst: Boolean(playedAudioFirst),
      skill,
      taskType,
      promptId,
      targetText,
      targetPhonemes,
      mode,
      dataSource: hasAudioAnalysis ? "basic_audio_features_v1" : "real_audio_placeholder_features",
    };
  }

  const durationFit =
    audioDurationSec >= 0.7 && audioDurationSec <= 4
      ? 1
      : audioDurationSec < 0.7
        ? 0.72
        : 0.84;
  const penalty = isLeoIdentification ? 0 : taskDifficultyPenalty[taskType] ?? 0.05;
  const retryPenalty = Math.min(retryCount * 0.04, 0.12);
  const rawScore =
    (baseScore * durationFit + deterministicOffset - penalty - retryPenalty) *
    clamp(audioQualityScore, 0, 1);
  const pronunciationScorePlaceholder = clamp(rawScore, 0, 0.98);
  const phonemeErrorRatePlaceholder = round(1 - pronunciationScorePlaceholder);

  return {
    validAudio,
    invalidReason: "",
    childFeedback:
      audioQualityScore < 0.75
        ? "Good try! Next time speak a little clearer for Leo."
        : undefined,
    audioDurationSec,
    serverAudioDurationSec: round(serverAudioDurationMs / 1000),
    frontendAudioDurationSec: round(frontendAudioDurationMs / 1000),
    durationMismatchMs: audioAnalysis?.durationMismatchMs,
    estimatedSpeechSec: round(silence.estimatedSpeechSec || Math.max(audioDurationSec - 0.1, 0)),
    silenceRatio: round(silence.silenceRatio || 0, 3),
    pauseCount: silence.pauseCount || 0,
    meanVolumeDb: volume.meanVolumeDb,
    maxVolumeDb: volume.maxVolumeDb,
    rmsAmplitude: volume.rmsAmplitude,
    peakAmplitude: volume.peakAmplitude,
    clippingRatio: volume.clippingRatio,
    audioQualityScore,
    audioQualityLabel: quality.qualityLabel || "good",
    audioSizeBytes,
    responseLatencySec: round(0.8 + retryCount * 0.25),
    speechDurationSec: round(silence.estimatedSpeechSec || Math.max(audioDurationSec - 0.1, 0)),
    wordCorrectPlaceholder: pronunciationScorePlaceholder >= 0.62,
    phonemeErrorRatePlaceholder,
    pronunciationScorePlaceholder: round(pronunciationScorePlaceholder),
    retryCount,
    taskDifficultyWeight: penalty,
    playedAudioFirst: Boolean(playedAudioFirst),
    skill,
    taskType,
    promptId,
    targetText,
    targetPhonemes,
    mode,
    dataSource: hasAudioAnalysis ? "basic_audio_features_v1" : "real_audio_placeholder_features",
  };
};

exports.getInvalidAudioChildFeedback = getInvalidChildFeedback;
exports.canUsePlaceholderAudio = canUsePlaceholderAudio;
