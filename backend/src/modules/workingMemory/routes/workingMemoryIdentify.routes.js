const express = require("express");
const router = express.Router();

const controller = require("../controllers/workingMemoryIdentify.controller");

router.post("/save-result", controller.saveResult);
router.get("/student-results/:studentId", controller.getStudentResults);

module.exports = router;