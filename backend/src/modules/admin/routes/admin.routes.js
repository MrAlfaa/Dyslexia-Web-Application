const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { verifyToken, isAdmin, isSuperAdmin } = require("../../../middleware/auth.middleware");

// Auth routes
router.post("/register", adminController.registerAdmin);
router.post("/login", adminController.loginAdmin);

// Dashboard routes
router.get("/students", verifyToken, isAdmin, adminController.getAllStudents);
router.put("/students/:id", verifyToken, isSuperAdmin, adminController.superAdminUpdateStudent);
router.delete("/students/:id", verifyToken, isSuperAdmin, adminController.deleteStudent);

router.get("/results/working-memory/identify", verifyToken, isAdmin, adminController.getWMIdentifyResults);
router.get("/results/phonological-awareness/identify", verifyToken, isAdmin, adminController.getPAIdentifyResults);

module.exports = router;
