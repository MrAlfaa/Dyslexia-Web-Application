const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ASR_PROVIDER = "whisper";
const DEFAULT_MODEL_SIZE = "tiny.en";
const DEFAULT_TIMEOUT_MS = 45000;

const backendRoot = path.resolve(__dirname, "../../../../");
const projectRoot = path.resolve(__dirname, "../../../../../");
const transcribeScript = path.resolve(__dirname, "../ml/transcribe_whisper.py");

const failed = (error, extra = {}) => ({
  status: "failed",
  asrProvider: ASR_PROVIDER,
  asrModel: extra.asrModel || process.env.WHISPER_MODEL_SIZE || DEFAULT_MODEL_SIZE,
  asrText: "",
  error: String(error || "Whisper transcription failed"),
});

const skipped = (reason) => ({
  status: "skipped",
  asrProvider: ASR_PROVIDER,
  asrModel: process.env.WHISPER_MODEL_SIZE || DEFAULT_MODEL_SIZE,
  asrText: "",
  error: reason || "",
});

const resolveAudioPath = (audioPath) => {
  if (!audioPath) return "";
  if (path.isAbsolute(audioPath)) return audioPath;
  return path.resolve(backendRoot, audioPath);
};

const runPython = ({ pythonBin, audioPath }) =>
  new Promise((resolve, reject) => {
    const args = [
      transcribeScript,
      "--audio",
      audioPath,
      "--model-size",
      process.env.WHISPER_MODEL_SIZE || DEFAULT_MODEL_SIZE,
      "--device",
      process.env.WHISPER_DEVICE || "cpu",
      "--compute-type",
      process.env.WHISPER_COMPUTE_TYPE || "int8",
    ];
    const child = spawn(pythonBin, args, {
      cwd: projectRoot,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeoutMs = Number(process.env.WHISPER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error("Whisper transcription timed out"));
        return;
      }
      const text = stdout.trim();
      if (!text) {
        reject(new Error(stderr.trim() || `Whisper script exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error(`Invalid JSON from Whisper script: ${text.slice(0, 240)}`));
      }
    });
  });

const normalizeSuccess = (result) => ({
  status: "success",
  asrProvider: result.asrProvider || ASR_PROVIDER,
  asrModel: result.asrModel || process.env.WHISPER_MODEL_SIZE || DEFAULT_MODEL_SIZE,
  asrText: String(result.asrText || "").trim(),
  language: result.language || "",
  durationSec:
    result.durationSec === undefined || result.durationSec === null
      ? undefined
      : Number(result.durationSec),
});

const transcribeAudio = async ({ audioPath, validAudio = true } = {}) => {
  if (process.env.MOCK_ASR_TEXT !== undefined) {
    return {
      status: "success",
      asrProvider: "mock",
      asrModel: "MOCK_ASR_TEXT",
      asrText: String(process.env.MOCK_ASR_TEXT || "").trim(),
    };
  }

  if (!validAudio) return skipped("audio_invalid");

  const resolvedAudioPath = resolveAudioPath(audioPath);
  if (!resolvedAudioPath || !fs.existsSync(resolvedAudioPath)) {
    return skipped("normalized_audio_missing");
  }
  const stats = fs.statSync(resolvedAudioPath);
  if (!stats.size) return skipped("audio_file_empty");

  if (!fs.existsSync(transcribeScript)) {
    return failed("Whisper Python script missing");
  }

  const configuredPython = process.env.PYTHON_BIN;
  const candidates = configuredPython ? [configuredPython] : ["python", "python3"];
  let lastError = null;

  for (const pythonBin of candidates) {
    try {
      const result = await runPython({ pythonBin, audioPath: resolvedAudioPath });
      if (result.status !== "success") {
        return failed(result.error || "Whisper returned failed status", result);
      }
      return normalizeSuccess(result);
    } catch (error) {
      lastError = error;
      if (configuredPython || error.code !== "ENOENT") break;
    }
  }

  return failed(lastError?.message || "Whisper transcription failed");
};

module.exports = {
  transcribeAudio,
  ASR_PROVIDER,
};
