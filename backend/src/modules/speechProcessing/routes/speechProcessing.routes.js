const express = require("express");
const router = express.Router();

const controller = require("../controllers/speechProcessing.controller");
const guardianInsightController = require("../controllers/guardianInsight.controller");
const { uploadSpeechAudio } = require("../middleware/audioUpload.middleware");
const {
  verifyToken,
  isAdmin,
  isSuperAdmin,
} = require("../../../middleware/auth.middleware");

router.get("/prompts", verifyToken, controller.getPrompts);
router.get("/my-assignments", verifyToken, controller.getMyAssignments);
router.get("/child/progress", verifyToken, controller.getChildSpeechProgress);
router.get("/child/progress-trend", verifyToken, controller.getChildProgressTrend);
router.get("/identification/status", verifyToken, controller.getIdentificationStatus);
router.get("/identification/prompts", verifyToken, controller.getIdentificationPrompts);
router.post("/identification/start", verifyToken, controller.startIdentification);
router.post(
  "/identification/attempt",
  verifyToken,
  uploadSpeechAudio,
  controller.submitIdentificationAttempt
);
router.post("/identification/complete", verifyToken, controller.completeIdentification);
router.get("/improvement/status", verifyToken, controller.getImprovementStatus);
router.get("/improvement/activities", verifyToken, controller.getImprovementActivities);
router.get("/improvement/recommendation", verifyToken, controller.getImprovementRecommendation);
router.get("/improvement/map", verifyToken, controller.getImprovementMap);
router.get("/improvement/activity/:activityId", verifyToken, controller.getImprovementActivityDetail);
router.post("/improvement/session/start", verifyToken, controller.startImprovementSession);
router.post(
  "/improvement/attempt",
  verifyToken,
  uploadSpeechAudio,
  controller.submitImprovementAttempt
);
router.post(
  "/improvement/session/:sessionId/complete",
  verifyToken,
  controller.completeImprovementSession
);
router.get("/system-activities", verifyToken, controller.getSystemActivities);
router.get("/recommendations/:childId", verifyToken, controller.getRecommendations);
router.post("/session/start", verifyToken, controller.startSession);
router.post("/attempt/analyze", verifyToken, uploadSpeechAudio, controller.analyzeAttempt);
router.post(
  "/attempt/upload",
  verifyToken,
  uploadSpeechAudio,
  controller.uploadAttempt
);
router.post(
  "/session/:sessionId/complete",
  verifyToken,
  controller.completeSession
);
router.get("/my-progress", verifyToken, controller.getMyProgress);

router.get("/admin/results", verifyToken, isAdmin, controller.getAdminResults);
router.get(
  "/guardian/identification-result/:childId",
  verifyToken,
  isAdmin,
  controller.getGuardianIdentificationResult
);
router.get(
  "/guardian/overview/:childId",
  verifyToken,
  isAdmin,
  controller.getGuardianSpeechOverview
);
router.get(
  "/guardian/improvement-progress/:childId",
  verifyToken,
  isAdmin,
  controller.getGuardianImprovementProgress
);
router.get(
  "/guardian/session-history/:childId",
  verifyToken,
  isAdmin,
  controller.getGuardianSessionHistory
);
router.get(
  "/guardian/progress-comparison/:childId",
  verifyToken,
  isAdmin,
  controller.getGuardianProgressComparison
);
router.get(
  "/guardian/checkpoints/:childId",
  verifyToken,
  isAdmin,
  controller.getGuardianCheckpoints
);
router.get(
  "/guardian/insight/:childId",
  verifyToken,
  isAdmin,
  guardianInsightController.getGuardianInsight
);
router.post(
  "/guardian/insight/:childId/refresh",
  verifyToken,
  isAdmin,
  guardianInsightController.refreshGuardianInsight
);
router.get(
  "/guardian/activity-plan/:childId",
  verifyToken,
  isAdmin,
  controller.getGuardianActivityPlan
);
router.get(
  "/guardian/activity-progress/:childId",
  verifyToken,
  isAdmin,
  controller.getGuardianActivityProgress
);
router.get("/admin/sessions", verifyToken, isAdmin, controller.getAdminSessions);
router.get(
  "/admin/sessions/:sessionId",
  verifyToken,
  isAdmin,
  controller.getAdminSessionDetail
);
router.post(
  "/admin/session/:sessionId/complete",
  verifyToken,
  isSuperAdmin,
  controller.completeAdminSession
);
router.post(
  "/admin/data-collection/session/start",
  verifyToken,
  isSuperAdmin,
  controller.startDataCollectionSession
);
router.post(
  "/admin/attempt/upload",
  verifyToken,
  isSuperAdmin,
  uploadSpeechAudio,
  controller.uploadAdminAttempt
);
router.post(
  "/admin/attempts/:attemptId/label",
  verifyToken,
  isSuperAdmin,
  controller.labelAttempt
);
router.get(
  "/admin/attempts/unlabeled",
  verifyToken,
  isSuperAdmin,
  controller.getUnlabeledAttempts
);
router.get(
  "/admin/attempts/:attemptId/audio-features",
  verifyToken,
  isSuperAdmin,
  controller.getAttemptAudioFeatures
);
router.get(
  "/admin/attempts/:attemptId/pronunciation-model",
  verifyToken,
  isSuperAdmin,
  controller.getAttemptPronunciationModel
);
router.post(
  "/admin/attempts/:attemptId/media-sync",
  verifyToken,
  isSuperAdmin,
  controller.retryAttemptMediaSync
);
router.post(
  "/admin/attempts/:attemptId/reprocess-analysis",
  verifyToken,
  isSuperAdmin,
  controller.reprocessAttemptAnalysis
);
router.post(
  "/admin/assessments/recompute/:sessionId",
  verifyToken,
  isSuperAdmin,
  controller.recomputeAssessmentSnapshots
);
router.post(
  "/admin/assessments/backfill",
  verifyToken,
  isSuperAdmin,
  controller.backfillAssessmentSnapshots
);
router.get(
  "/admin/model-evaluation",
  verifyToken,
  isSuperAdmin,
  controller.getPronunciationModelEvaluation
);

router.post(
  "/admin/prompts/seed",
  verifyToken,
  isSuperAdmin,
  controller.seedDefaultPrompts
);
router.get("/admin/prompts", verifyToken, isSuperAdmin, controller.getAdminPrompts);
router.post("/admin/prompts", verifyToken, isSuperAdmin, controller.createPrompt);
router.put("/admin/prompts/:id", verifyToken, isSuperAdmin, controller.updatePrompt);
router.delete("/admin/prompts/:id", verifyToken, isSuperAdmin, controller.deletePrompt);

router.get(
  "/admin/assignments",
  verifyToken,
  isSuperAdmin,
  controller.getAssignments
);
router.post(
  "/admin/assignments",
  verifyToken,
  isSuperAdmin,
  controller.createAssignment
);
router.put(
  "/admin/assignments/:id",
  verifyToken,
  isSuperAdmin,
  controller.updateAssignment
);
router.put(
  "/admin/assignments/:id/cancel",
  verifyToken,
  isSuperAdmin,
  controller.cancelAssignment
);

router.get(
  "/admin/export/attempts.csv",
  verifyToken,
  isSuperAdmin,
  controller.exportAttemptsCsv
);
router.get(
  "/admin/export/sessions.csv",
  verifyToken,
  isSuperAdmin,
  controller.exportSessionsCsv
);
router.get(
  "/admin/export/manual-labels.csv",
  verifyToken,
  isSuperAdmin,
  controller.exportManualLabelsCsv
);
router.get(
  "/admin/export/dataset/attempt-features.csv",
  verifyToken,
  isSuperAdmin,
  controller.exportDatasetAttemptFeaturesCsv
);
router.get(
  "/admin/export/dataset/session-features.csv",
  verifyToken,
  isSuperAdmin,
  controller.exportDatasetSessionFeaturesCsv
);
router.get(
  "/admin/export/dataset/data-collection-template.csv",
  verifyToken,
  isSuperAdmin,
  controller.exportDatasetTemplateCsv
);
router.get(
  "/admin/final-classifier/status",
  verifyToken,
  isSuperAdmin,
  controller.getFinalSpeechClassifierStatus
);

module.exports = router;
