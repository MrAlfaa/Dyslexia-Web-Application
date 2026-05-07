const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");

// Routes
router.post("/register/student", authController.registerStudent);
router.post("/register/admin", authController.registerAdmin);
router.post("/login", authController.login);

module.exports = router;