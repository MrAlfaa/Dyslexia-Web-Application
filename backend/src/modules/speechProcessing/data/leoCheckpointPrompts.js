const {
  getStoryPromptsForGrade,
  getSentencePromptById,
} = require("./leoSentenceReadingPrompts");

const forms = [
  [
    ["sun", "read_aloud_word", ["S", "AH", "N"]],
    ["fish", "read_aloud_word", ["F", "IH", "SH"]],
    ["nup", "pseudoword_read", ["N", "AH", "P"]],
    ["The cat can run.", "sentence_read", []],
  ],
  [
    ["map", "read_aloud_word", ["M", "AE", "P"]],
    ["ship", "read_aloud_word", ["SH", "IH", "P"]],
    ["teg", "pseudoword_read", ["T", "EH", "G"]],
    ["The dog is big.", "sentence_read", []],
  ],
  [
    ["van", "read_aloud_word", ["V", "AE", "N"]],
    ["chop", "read_aloud_word", ["CH", "AA", "P"]],
    ["vop", "pseudoword_read", ["V", "AA", "P"]],
    ["A red hen can hop.", "sentence_read", []],
  ],
  [
    ["leg", "read_aloud_word", ["L", "EH", "G"]],
    ["thin", "read_aloud_word", ["TH", "IH", "N"]],
    ["zib", "pseudoword_read", ["Z", "IH", "B"]],
    ["The frog sat on a log.", "sentence_read", []],
  ],
];

const checkpointPrompts = forms.flatMap((form, formIndex) =>
  form.map(([targetText, taskType, targetPhonemes], promptIndex) => ({
    promptId: `LEO_CP_${formIndex + 1}_${promptIndex + 1}`,
    form: formIndex + 1,
    order: promptIndex + 1,
    taskType,
    targetText,
    targetPhonemes,
    gradeMin: "2",
    gradeMax: "5",
    skill:
      taskType === "pseudoword_read"
        ? "pseudoword_decoding"
        : taskType === "sentence_read"
          ? "fluency"
          : "pronunciation_practice",
    instructionSi:
      taskType === "sentence_read"
        ? "වාක්‍යය හඬින් කියවන්න"
        : taskType === "pseudoword_read"
          ? "මෙම රොබෝ වචනය කියවන්න"
          : "වචනය හඬින් කියවන්න",
    instructionEn:
      taskType === "sentence_read"
        ? "Read the sentence aloud"
        : taskType === "pseudoword_read"
          ? "Read this robot word"
          : "Read the word aloud",
    requiresRecording: true,
    assessmentRole: "checkpoint",
  }))
);

const getCheckpointSentence = ({ grade = 2, formNo = 1 } = {}) => {
  const childGrade = Number(grade);
  const difficulty = childGrade >= 5 ? "harder" : childGrade >= 4 ? "hard" : "short";
  const prompts = getStoryPromptsForGrade({
    grade: childGrade,
    seed: `checkpoint:${formNo}`,
    includeParagraph: false,
  });
  const sentence = prompts.find((prompt) => prompt.difficulty === difficulty);
  if (sentence) return { ...sentence, taskType: "sentence_read", assessmentRole: "checkpoint" };

  return getStoryPromptsForGrade({ grade: 2, seed: `checkpoint:${formNo}` })[0];
};

const getCheckpointPrompts = ({ grade, sequenceNo = 1, formNo } = {}) => {
  const rotationValue = formNo || sequenceNo;
  const form = ((Math.max(Number(rotationValue) || 1, 1) - 1) % forms.length) + 1;
  const childGrade = Number(grade || 2);
  return checkpointPrompts.filter(
    (prompt) =>
      prompt.form === form &&
      childGrade >= Number(prompt.gradeMin) &&
      childGrade <= Number(prompt.gradeMax)
  ).map((prompt) => {
    if (prompt.taskType !== "sentence_read") return prompt;

    const selectedSentence = getCheckpointSentence({ grade: childGrade, formNo: form });
    return {
      ...prompt,
      ...selectedSentence,
      promptId: selectedSentence.promptId,
      form: prompt.form,
      order: prompt.order,
      gradeMin: prompt.gradeMin,
      gradeMax: prompt.gradeMax,
      requiresRecording: prompt.requiresRecording,
      assessmentRole: prompt.assessmentRole,
      instructionSi: prompt.instructionSi,
      instructionEn: prompt.instructionEn,
    };
  });
};

const getCheckpointPromptById = (promptId) =>
  checkpointPrompts.find((prompt) => prompt.promptId === promptId) ||
  getSentencePromptById(promptId);

module.exports = {
  checkpointPrompts,
  getCheckpointPrompts,
  getCheckpointSentence,
  getCheckpointPromptById,
};
