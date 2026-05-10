const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const MODEL_VERSION = "pronunciation_support_v1";
const MODEL_NAME = "pronunciation_support_classifier";
const TIMEOUT_MS = 30000;

const backendRoot = path.resolve(__dirname, "../../../../");
const projectRoot = path.resolve(__dirname, "../../../../../");
const predictorScript = path.resolve(
  __dirname,
  "../ml/predict_pronunciation_support.py"
);

const artifactFileNames = [
  "pronunciation_support_classifier.joblib",
  "support_label_encoder.joblib",
  "feature_columns.json",
];

const failed = (error) => ({
  status: "failed",
  modelName: MODEL_NAME,
  modelVersion: MODEL_VERSION,
  error: String(error || "Pronunciation model failed"),
  predictedAt: new Date(),
});

const skipped = (reason) => ({
  status: "skipped",
  modelName: MODEL_NAME,
  modelVersion: MODEL_VERSION,
  error: reason || "",
  predictedAt: new Date(),
});

const hasRequiredArtifacts = (dir) =>
  artifactFileNames.every((fileName) => fs.existsSync(path.join(dir, fileName)));

const resolveArtifactDir = () => {
  const configured = process.env.LEXILAND_PRONUNCIATION_MODEL_DIR;
  const baseDir = configured
    ? path.resolve(configured)
    : path.join(projectRoot, "ML_Model", "lexiland_pronunciation_support_model_artifacts");

  const candidates = [baseDir, path.join(baseDir, "model_artifacts")];
  const found = candidates.find(hasRequiredArtifacts);
  if (found) return { ok: true, modelDir: found };

  const zipPath = `${baseDir}.zip`;
  if (!fs.existsSync(baseDir) && fs.existsSync(zipPath)) {
    return {
      ok: false,
      error: "Model artifact zip found but extracted folder missing. Please extract it first.",
    };
  }

  return {
    ok: false,
    error: `Pronunciation model artifacts missing at ${baseDir}`,
  };
};

const resolveAudioPath = (audioPath) => {
  if (!audioPath) return "";
  if (path.isAbsolute(audioPath)) return audioPath;
  return path.resolve(backendRoot, audioPath);
};

const runPython = ({ pythonBin, audioPath, modelDir }) =>
  new Promise((resolve, reject) => {
    const args = [
      predictorScript,
      "--audio",
      audioPath,
      "--model-dir",
      modelDir,
    ];
    const child = spawn(pythonBin, args, {
      cwd: projectRoot,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);

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
        reject(new Error("Pronunciation model prediction timed out"));
        return;
      }
      const text = stdout.trim();
      if (!text) {
        reject(new Error(stderr.trim() || `Python predictor exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error(`Invalid JSON from Python predictor: ${text.slice(0, 240)}`));
      }
    });
  });

const normalizeSuccess = (result) => ({
  status: "success",
  modelName: result.modelName || MODEL_NAME,
  modelVersion: result.modelVersion || MODEL_VERSION,
  prediction: result.prediction || "",
  probabilities: result.probabilities || {},
  predictedPronunciationScore:
    result.predictedPronunciationScore === null ||
    result.predictedPronunciationScore === undefined
      ? undefined
      : Number(result.predictedPronunciationScore),
  featuresUsedCount: Number(result.featuresUsedCount || 0),
  audioFeaturesSummary: result.audioFeaturesSummary || {},
  predictedAt: new Date(),
});

const predictPronunciationSupport = async ({ normalizedAudioPath, validAudio } = {}) => {
  if (!validAudio) return skipped("audio_invalid");

  const audioPath = resolveAudioPath(normalizedAudioPath);
  if (!audioPath || !fs.existsSync(audioPath)) {
    return skipped("normalized_audio_missing");
  }

  if (!fs.existsSync(predictorScript)) {
    return failed("Python predictor script missing");
  }

  const artifact = resolveArtifactDir();
  if (!artifact.ok) return failed(artifact.error);

  const configuredPython = process.env.PYTHON_BIN;
  const candidates = configuredPython ? [configuredPython] : ["python", "python3"];
  let lastError = null;

  for (const pythonBin of candidates) {
    try {
      const result = await runPython({
        pythonBin,
        audioPath,
        modelDir: artifact.modelDir,
      });
      if (result.status !== "success") {
        return failed(result.error || "Python predictor returned failed status");
      }
      return normalizeSuccess(result);
    } catch (error) {
      lastError = error;
      if (configuredPython || error.code !== "ENOENT") break;
    }
  }

  return failed(lastError?.message || "Python predictor failed");
};

module.exports = {
  MODEL_NAME,
  MODEL_VERSION,
  predictPronunciationSupport,
  resolveArtifactDir,
};
