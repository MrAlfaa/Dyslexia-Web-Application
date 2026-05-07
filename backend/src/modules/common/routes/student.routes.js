const express = require("express");
const router = express.Router();

const studentController = require("../controllers/student.controller");
const { verifyToken } = require("../../../middleware/auth.middleware");

// Routes
router.get("/profile", verifyToken, studentController.getProfile);
router.put("/profile", verifyToken, studentController.updateProfile);

module.exports = router;
