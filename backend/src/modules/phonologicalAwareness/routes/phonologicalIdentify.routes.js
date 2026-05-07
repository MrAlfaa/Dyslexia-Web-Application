const express = require("express");
const router = express.Router();
const phonologicalIdentifyController = require("../controllers/phonologicalIdentify.controller");

router.post("/save-result", phonologicalIdentifyController.saveQuizResult);
router.get("/student-results/:studentId", phonologicalIdentifyController.getStudentResults);

module.exports = router;
