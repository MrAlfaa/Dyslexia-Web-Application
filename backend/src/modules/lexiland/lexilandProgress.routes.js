const express = require("express");
const router = express.Router();
const controller = require("./lexilandProgress.controller");
const { verifyToken } = require("../../middleware/auth.middleware");

router.get("/progress/:childId", verifyToken, controller.getProgress);
router.post("/progress/recalculate/:childId", verifyToken, controller.recalculateProgress);

module.exports = router;
