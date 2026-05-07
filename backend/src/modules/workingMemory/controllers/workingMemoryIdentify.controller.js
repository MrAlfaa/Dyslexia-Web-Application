const WorkingMemoryIdentify = require("../models/workingMemoryIdentify.model");

exports.saveResult = async (req, res) => {
  try {
    const { studentId, grade, questionResults, metrics } = req.body;

    // The frontend payload currently might not explicitly provide these, so we calculate them strictly from the results
    const totalQuestions = questionResults ? questionResults.length : 0;
    const totalScore = questionResults ? questionResults.filter(q => q.isCorrect).length : 0;
    const totalTimeTaken = questionResults ? questionResults.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0) : 0;

    const data = new WorkingMemoryIdentify({
      studentId,
      grade,
      totalScore,
      totalQuestions,
      totalTimeTaken,
      questionResults,
      metrics
    });

    await data.save();

    res.status(201).json({
      success: true,
      message: "Working memory results saved",
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getStudentResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    const results = await WorkingMemoryIdentify.find({ studentId }).sort({ createdAt: -1 });

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