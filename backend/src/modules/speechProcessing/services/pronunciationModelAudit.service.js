const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "../../../../../");
const artifactDir = path.join(
  projectRoot,
  "ML_Model",
  "lexiland_pronunciation_support_model_artifacts",
  "model_artifacts"
);
const summaryPath = path.join(artifactDir, "training_summary.json");

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
};

const getPronunciationModelEvaluation = () => {
  const summary = readJson(summaryPath);
  const requiredArtifacts = [
    "pronunciation_support_classifier.joblib",
    "support_label_encoder.joblib",
    "feature_columns.json",
    "training_summary.json",
  ];
  const missingArtifacts = requiredArtifacts.filter(
    (fileName) => !fs.existsSync(path.join(artifactDir, fileName))
  );

  return {
    status: missingArtifacts.length ? "artifact_incomplete" : "prototype_v1_unverified_split",
    deploymentEligible: false,
    purpose: summary?.model_purpose || "Pronunciation support signal",
    reportedMetrics: summary?.results || {},
    featureCount: summary?.feature_count ?? null,
    labels: summary?.labels || [],
    datasetsUsed: summary?.datasets_used || {},
    missingArtifacts,
    audit: {
      sourceTrainingRowsAvailable: false,
      speakerDisjointSplitVerified: false,
      probabilityCalibrationVerified: false,
      confusionMatrixAvailable: false,
      perClassMetricsAvailable: false,
      balancedAccuracyAvailable: false,
    },
    limitations: [
      ...(summary?.important_limitations || []),
      "The reported split cannot be independently reproduced from files currently stored in this repository.",
      "Probabilities must not be used as a calibrated longitudinal score until calibration is verified.",
    ],
    requiredNextEvidence: [
      "De-identified source feature rows with participant or speaker group identifiers",
      "Speaker-disjoint train, validation, and held-out test split",
      "Confusion matrix and per-class precision, recall, and F1",
      "Balanced accuracy and probability calibration report",
    ],
  };
};

module.exports = { getPronunciationModelEvaluation };
