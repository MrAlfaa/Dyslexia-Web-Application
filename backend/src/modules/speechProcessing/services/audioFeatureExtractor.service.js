const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const { uploadDir } = require("../middleware/audioUpload.middleware");

const EXTRACTION_VERSION = "basic_audio_v1";
const ANALYSIS_TIMEOUT_MS = 20000;
const NORMALIZED_DIR = path.join(uploadDir, "normalized");

const round = (value, digits = 3) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Number(number.toFixed(digits));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const runBinary = (binary, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(
      binary,
      args,
      {
        timeout: ANALYSIS_TIMEOUT_MS,
        maxBuffer: 1024 * 1024 * 6,
        windowsHide: true,
        ...options,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr;
          error.stdout = stdout;
          return reject(error);
        }
        resolve({ stdout, stderr });
      }
    );
  });

const getPublicUploadPath = (absolutePath) => {
  const relative = path.relative(uploadDir, absolutePath).replace(/\\/g, "/");
  return `/uploads/speech/${relative}`;
};

const getInternalUploadPath = (absolutePath) =>
  path.posix.join("uploads", "speech", path.relative(uploadDir, absolutePath).replace(/\\/g, "/"));

const normalizedPathFor = (filePath) => {
  const parsed = path.parse(filePath);
  return path.join(NORMALIZED_DIR, `${parsed.name}_16k_mono.wav`);
};

const probeAudio = async (filePath) => {
  const { stdout } = await runBinary(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  const info = JSON.parse(stdout || "{}");
  const audioStream = (info.streams || []).find((stream) => stream.codec_type === "audio");
  const durationSec = Number(audioStream?.duration || info.format?.duration || 0);
  const fileStats = fs.statSync(filePath);

  return {
    durationSec: round(durationSec, 3),
    sampleRate: audioStream?.sample_rate ? Number(audioStream.sample_rate) : undefined,
    channels: audioStream?.channels,
    bitRate: audioStream?.bit_rate
      ? Number(audioStream.bit_rate)
      : info.format?.bit_rate
        ? Number(info.format.bit_rate)
        : undefined,
    codecName: audioStream?.codec_name || "",
    formatName: info.format?.format_name || "",
    fileSizeBytes: fileStats.size,
  };
};

const normalizeToWav = async (filePath, normalizedPath) => {
  fs.mkdirSync(path.dirname(normalizedPath), { recursive: true });
  await runBinary(ffmpegPath, [
    "-y",
    "-i",
    filePath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-acodec",
    "pcm_s16le",
    normalizedPath,
  ]);
};

const parseVolumeDetect = (stderr = "") => {
  const meanMatch = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/i);
  const maxMatch = stderr.match(/max_volume:\s*(-?[\d.]+)\s*dB/i);
  return {
    meanVolumeDb: meanMatch ? round(meanMatch[1], 2) : undefined,
    maxVolumeDb: maxMatch ? round(maxMatch[1], 2) : undefined,
  };
};

const runVolumeDetect = async (normalizedPath) => {
  const { stderr } = await runBinary(ffmpegPath, [
    "-hide_banner",
    "-i",
    normalizedPath,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);
  return parseVolumeDetect(stderr);
};

const parseWavPcm16 = (wavPath) => {
  const buffer = fs.readFileSync(wavPath);
  let offset = 12;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === "data") {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0 || dataSize <= 0) {
    return { rmsAmplitude: 0, peakAmplitude: 0, clippingRatio: 0 };
  }

  const sampleCount = Math.floor(dataSize / 2);
  if (sampleCount <= 0) {
    return { rmsAmplitude: 0, peakAmplitude: 0, clippingRatio: 0 };
  }
  let sumSquares = 0;
  let peak = 0;
  let clipped = 0;

  for (let i = 0; i < sampleCount; i += 1) {
    const sample = buffer.readInt16LE(dataOffset + i * 2);
    const normalized = Math.abs(sample) / 32768;
    sumSquares += normalized * normalized;
    if (normalized > peak) peak = normalized;
    if (normalized >= 0.98) clipped += 1;
  }

  const rms = Math.sqrt(sumSquares / sampleCount);
  return {
    rmsAmplitude: round(rms, 5),
    peakAmplitude: round(peak, 5),
    clippingRatio: round(clipped / sampleCount, 5),
  };
};

const parseSilenceDetect = (stderr = "", durationSec = 0) => {
  const starts = [];
  const segments = [];
  const startRegex = /silence_start:\s*([\d.]+)/g;
  const endRegex = /silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g;
  let match;

  while ((match = startRegex.exec(stderr)) !== null) {
    starts.push(Number(match[1]));
  }

  while ((match = endRegex.exec(stderr)) !== null) {
    const end = Number(match[1]);
    const duration = Number(match[2]);
    segments.push({
      start: round(Math.max(end - duration, 0), 3),
      end: round(end, 3),
      duration: round(duration, 3),
    });
  }

  if (starts.length > segments.length) {
    const start = starts[starts.length - 1];
    const duration = Math.max(durationSec - start, 0);
    if (duration > 0) {
      segments.push({
        start: round(start, 3),
        end: round(durationSec, 3),
        duration: round(duration, 3),
      });
    }
  }

  const totalSilenceSec = segments.reduce((sum, item) => sum + Number(item.duration || 0), 0);
  const longestSilenceSec = segments.reduce(
    (max, item) => Math.max(max, Number(item.duration || 0)),
    0
  );
  const estimatedSpeechSec = Math.max(durationSec - totalSilenceSec, 0);

  return {
    silenceSegmentCount: segments.length,
    totalSilenceSec: round(totalSilenceSec, 3) || 0,
    longestSilenceSec: round(longestSilenceSec, 3) || 0,
    silenceRatio: durationSec ? round(totalSilenceSec / durationSec, 3) : 0,
    estimatedSpeechSec: round(estimatedSpeechSec, 3) || 0,
    pauseCount: segments.length,
    hasSpeech: estimatedSpeechSec >= 0.3,
    segments,
  };
};

const runSilenceDetect = async (normalizedPath, durationSec) => {
  const { stderr } = await runBinary(ffmpegPath, [
    "-hide_banner",
    "-i",
    normalizedPath,
    "-af",
    "silencedetect=noise=-35dB:d=0.25",
    "-f",
    "null",
    "-",
  ]);
  return parseSilenceDetect(stderr, durationSec);
};

const getBaseInvalidReason = (metadata) => {
  if (!metadata) return "metadata_missing";
  if (!metadata.durationSec || !metadata.sampleRate) return "metadata_missing";
  if (metadata.durationSec < 0.5) return "too_short";
  if (metadata.durationSec > 30) return "too_long";
  if (!metadata.codecName || !metadata.formatName) return "unsupported_audio_format";
  return "";
};

const computeAudioQualityScore = ({
  audioMetadata,
  volumeFeatures,
  silenceFeatures,
  durationMismatchMs,
  analysisError,
}) => {
  const warnings = [];
  const baseInvalidReason = analysisError || getBaseInvalidReason(audioMetadata);
  const tooQuiet = Boolean(
    volumeFeatures?.meanVolumeDb !== undefined
      ? volumeFeatures.meanVolumeDb < -45
      : Number(volumeFeatures?.rmsAmplitude || 0) < 0.005
  );
  const tooLoudOrClipped = Boolean(
    Number(volumeFeatures?.clippingRatio || 0) > 0.01 ||
      (volumeFeatures?.maxVolumeDb !== undefined && volumeFeatures.maxVolumeDb > -0.5)
  );
  const mostlySilence = Number(silenceFeatures?.silenceRatio || 0) > 0.85;
  const noSpeech = silenceFeatures && !silenceFeatures.hasSpeech;

  let invalidReason = baseInvalidReason;
  if (!invalidReason && noSpeech) invalidReason = "no_speech_detected";
  if (!invalidReason && mostlySilence) invalidReason = "mostly_silence";

  let qualityScore = invalidReason ? 0 : 1;
  if (!invalidReason) {
    if (tooQuiet) {
      warnings.push("too_quiet");
      qualityScore -= 0.25;
    }
    if (tooLoudOrClipped) {
      warnings.push("too_loud_or_clipped");
      qualityScore -= 0.25;
    }
    if (mostlySilence) {
      warnings.push("mostly_silence");
      qualityScore -= 0.25;
    }
    if (Math.abs(Number(durationMismatchMs || 0)) > 1500) {
      warnings.push("client_server_duration_mismatch");
      qualityScore -= 0.05;
    }
  }

  qualityScore = round(clamp(qualityScore, 0, 1), 2);
  const qualityLabel = invalidReason
    ? "invalid"
    : qualityScore >= 0.75
      ? "good"
      : qualityScore >= 0.45
        ? "fair"
        : "poor";

  return {
    validAudio: !invalidReason,
    invalidReason,
    warnings,
    qualityScore,
    qualityLabel,
  };
};

const analyzeAudio = async ({ filePath, frontendAudioDurationMs } = {}) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      extractionVersion: EXTRACTION_VERSION,
      extractionStatus: "failed",
      extractionError: "file_missing",
      audioQuality: {
        validAudio: false,
        invalidReason: "file_missing",
        warnings: [],
        qualityScore: 0,
        qualityLabel: "invalid",
      },
    };
  }

  const normalizedPath = normalizedPathFor(filePath);
  let normalizedCreated = false;
  let phase = "probe";

  try {
    const audioMetadata = await probeAudio(filePath);
    const serverAudioDurationMs = audioMetadata.durationSec
      ? Math.round(audioMetadata.durationSec * 1000)
      : undefined;
    const durationMismatchMs =
      frontendAudioDurationMs !== undefined && serverAudioDurationMs !== undefined
        ? Math.round(Number(frontendAudioDurationMs) - serverAudioDurationMs)
        : undefined;

    phase = "normalize";
    await normalizeToWav(filePath, normalizedPath);
    normalizedCreated = true;

    phase = "analyze";
    const [volumeFromFfmpeg, silenceFeatures] = await Promise.all([
      runVolumeDetect(normalizedPath).catch(() => ({})),
      runSilenceDetect(normalizedPath, audioMetadata.durationSec || 0).catch(() => ({
        silenceSegmentCount: 0,
        totalSilenceSec: 0,
        longestSilenceSec: 0,
        silenceRatio: 0,
        estimatedSpeechSec: audioMetadata.durationSec || 0,
        pauseCount: 0,
        hasSpeech: Boolean(audioMetadata.durationSec && audioMetadata.durationSec >= 0.3),
        segments: [],
      })),
    ]);
    const amplitudeFeatures = parseWavPcm16(normalizedPath);
    const volumeFeatures = {
      ...volumeFromFfmpeg,
      ...amplitudeFeatures,
    };
    volumeFeatures.tooQuiet = Boolean(
      volumeFeatures.meanVolumeDb !== undefined
        ? volumeFeatures.meanVolumeDb < -45
        : Number(volumeFeatures.rmsAmplitude || 0) < 0.005
    );
    volumeFeatures.tooLoudOrClipped = Boolean(
      Number(volumeFeatures.clippingRatio || 0) > 0.01 ||
        (volumeFeatures.maxVolumeDb !== undefined && volumeFeatures.maxVolumeDb > -0.5)
    );

    const audioQuality = computeAudioQualityScore({
      audioMetadata,
      volumeFeatures,
      silenceFeatures,
      durationMismatchMs,
    });

    return {
      extractionVersion: EXTRACTION_VERSION,
      extractionStatus: "completed",
      normalizedAudioPath: getInternalUploadPath(normalizedPath),
      normalizedAudioUrl: getPublicUploadPath(normalizedPath),
      serverAudioDurationMs,
      frontendAudioDurationMs:
        frontendAudioDurationMs !== undefined ? Number(frontendAudioDurationMs) : undefined,
      durationMismatchMs,
      audioMetadata,
      volumeFeatures,
      silenceFeatures,
      audioQuality,
    };
  } catch (error) {
    if (normalizedCreated && fs.existsSync(normalizedPath)) {
      try {
        fs.unlinkSync(normalizedPath);
      } catch {
        // Best-effort cleanup only.
      }
    }

    return {
      extractionVersion: EXTRACTION_VERSION,
      extractionStatus: "failed",
      extractionError:
        error.code === "ETIMEDOUT"
          ? "audio_analysis_timeout"
          : phase === "normalize"
            ? "audio_normalization_failed"
            : "audio_analysis_failed",
      audioQuality: {
        validAudio: false,
        invalidReason:
          error.code === "ETIMEDOUT"
            ? "audio_analysis_timeout"
            : phase === "normalize"
              ? "audio_normalization_failed"
              : "audio_analysis_failed",
        warnings: [],
        qualityScore: 0,
        qualityLabel: "invalid",
      },
    };
  }
};

module.exports = {
  EXTRACTION_VERSION,
  analyzeAudio,
  computeAudioQualityScore,
};
