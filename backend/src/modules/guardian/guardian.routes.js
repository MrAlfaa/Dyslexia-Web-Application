const express = require("express");
const router = express.Router();
const adminController = require("../admin/controllers/admin.controller");
const { verifyToken, isAdmin } = require("../../middleware/auth.middleware");

router.get("/children", verifyToken, isAdmin, adminController.getAllStudents);
router.post("/children", verifyToken, isAdmin, adminController.createStudentByAdmin);
router.put("/children/:id", verifyToken, isAdmin, adminController.updateStudentScoped);
router.delete("/children/:id/deactivate", verifyToken, isAdmin, adminController.deactivateStudent);

module.exports = router;
