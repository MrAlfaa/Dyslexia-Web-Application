const express = require("express");
const router = express.Router();
const controller = require("./subscription.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth.middleware");

router.get("/me", verifyToken, isAdmin, controller.getMySubscription);
router.put("/me/dev-change-plan", verifyToken, isAdmin, controller.devChangePlan);

module.exports = router;
