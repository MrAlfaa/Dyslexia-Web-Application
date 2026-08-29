const express = require("express");
const router = express.Router();
const controller = require("./subscription.controller");
const {
  verifyToken,
  isAdmin,
  isSuperAdmin: requireSuperAdmin,
} = require("../../middleware/auth.middleware");

function isSuperAdmin(req, res, next) {
  return requireSuperAdmin(req, res, next);
}

router.get("/me", verifyToken, isAdmin, controller.getMySubscription);
router.put("/me/dev-change-plan", verifyToken, isSuperAdmin, controller.devChangePlan);

module.exports = router;
