const PhonologicalIdentify = require("../models/phonologicalIdentify.model");

exports.saveQuizResult = async (req, res) => {
  try {
    const { studentId, grade, totalScore, totalQuestions, questionResults, totalTimeTaken, metrics } = req.body;

    const newResult = new PhonologicalIdentify({
      studentId,
      grade,
      totalScore,
      totalQuestions,
      questionResults,
      totalTimeTaken,
      metrics,
    });

    await newResult.save();

    res.status(201).json({
      success: true,
      message: "Quiz results saved successfully",
      data: newResult,
    });
  } catch (error) {
    console.error("Error saving quiz result:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save quiz results",
      error: error.message,
    });
  }
};

exports.getStudentResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    const results = await PhonologicalIdentify.find({ studentId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch results",
      error: error.message,
    });
  }
};
