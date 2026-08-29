const SELECTION_TASK_TYPES = new Set(["first_sound", "minimal_pair"]);

const normalizeAnswer = (value) => String(value ?? "").trim();

const getExpectedAnswer = (prompt) =>
  normalizeAnswer(prompt?.correctAnswer || prompt?.targetSound || prompt?.targetText);

const buildLeoImprovementAttemptPolicy = ({
  prompt,
  attemptPhase,
  selectedAnswer,
} = {}) => {
  if (!prompt || typeof prompt !== "object") {
    throw new TypeError("A server-resolved Leo prompt is required");
  }

  const taskType = normalizeAnswer(prompt.taskType);
  const targetText = normalizeAnswer(prompt.targetText);
  const targetPhonemes = Array.isArray(prompt.targetPhonemes)
    ? [...prompt.targetPhonemes]
    : [];
  const isSelection =
    attemptPhase === "training" && SELECTION_TASK_TYPES.has(taskType);
  const normalizedSelectedAnswer = normalizeAnswer(selectedAnswer);
  const selectedAnswerProvided = normalizedSelectedAnswer.length > 0;
  const expectedAnswer = getExpectedAnswer(prompt);
  const selectedCorrect = isSelection
    ? selectedAnswerProvided &&
      normalizedSelectedAnswer.toLowerCase() === expectedAnswer.toLowerCase()
    : undefined;

  return {
    taskType,
    targetText,
    targetPhonemes,
    expectedAnswer,
    isSelection,
    requiresRecording: !isSelection,
    selectedAnswer: normalizedSelectedAnswer,
    selectedAnswerProvided,
    selectedCorrect,
  };
};

module.exports = {
  buildLeoImprovementAttemptPolicy,
};
