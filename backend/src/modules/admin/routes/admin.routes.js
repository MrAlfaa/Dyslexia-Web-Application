const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { verifyToken, isAdmin } = require("../../../middleware/auth.middleware");

// Auth routes
router.post("/register", adminController.registerAdmin);
router.post("/login", adminController.loginAdmin);

// Dashboard routes
router.get("/students", verifyToken, isAdmin, adminController.getAllStudents);
router.post("/students", verifyToken, isAdmin, adminController.createStudentByAdmin);
router.put("/students/:id", verifyToken, isAdmin, adminController.updateStudentScoped);
router.delete("/students/:id", verifyToken, isAdmin, adminController.deactivateStudent);

router.get("/results/working-memory/identify", verifyToken, isAdmin, adminController.getWMIdentifyResults);
router.get("/results/phonological-awareness/identify", verifyToken, isAdmin, adminController.getPAIdentifyResults);

module.exports = router;
