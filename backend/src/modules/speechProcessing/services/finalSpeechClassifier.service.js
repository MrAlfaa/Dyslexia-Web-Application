const fs = require("fs");
const path = require("path");

const MODEL_NAME = "final_speech_support_classifier";
const MODEL_VERSION = "final_speech_support_v1";

const projectRoot = path.resolve(__dirname, "../../../../../");

const requiredArtifacts = [
  "final_speech_support_classifier.joblib",
  "final_speech_label_encoder.joblib",
  "final_speech_feature_columns.json",
  "final_speech_training_summary.json",
];

const resolveFinalSpeechModelDir = () => {
  const configured = process.env.LEXILAND_FINAL_SPEECH_MODEL_DIR;
  return configured
    ? path.resolve(configured)
    : path.join(projectRoot, "ML_Model", "final_speech_support_model_artifacts");
};

const getMissingArtifacts = (modelDir) =>
  requiredArtifacts.filter((fileName) => !fs.existsSync(path.join(modelDir, fileName)));

const getFinalSpeechClassifierStatus = () => {
  const modelDir = resolveFinalSpeechModelDir();
  const missingArtifacts = getMissingArtifacts(modelDir);
  return {
    status: missingArtifacts.length ? "not_ready" : "ready",
    modelName: MODEL_NAME,
    modelVersion: MODEL_VERSION,
    modelDir,
    requiredArtifacts,
    missingArtifacts,
    message: missingArtifacts.length
      ? "Final Speech-Reading Support classifier artifacts are not available yet. Train with local labelled Grade 2-5 data first."
      : "Final Speech-Reading Support classifier artifacts are available for Phase 11 integration.",
  };
};

const predictFinalSpeechSupport = async () => ({
  status: "not_ready",
  modelName: MODEL_NAME,
  modelVersion: MODEL_VERSION,
  prediction: "unknown",
  error: "Final speech classifier inference is intentionally disabled until Phase 11 trained artifacts are validated.",
});

module.exports = {
  getFinalSpeechClassifierStatus,
  predictFinalSpeechSupport,
  resolveFinalSpeechModelDir,
};
