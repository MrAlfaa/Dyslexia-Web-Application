const promptBank = [
  {
    promptId: "SP001",
    taskType: "read_aloud_word",
    targetText: "cat",
    grade: "2",
    targetPhonemes: ["K", "AE", "T"],
  },
  {
    promptId: "SP002",
    taskType: "read_aloud_word",
    targetText: "bat",
    grade: "2",
    targetPhonemes: ["B", "AE", "T"],
  },
  {
    promptId: "SP003",
    taskType: "pseudoword_read",
    targetText: "blim",
    grade: "3",
    targetPhonemes: ["B", "L", "IH", "M"],
  },
  {
    promptId: "SP004",
    taskType: "minimal_pair_read",
    targetText: "pat",
    grade: "2",
    targetPhonemes: ["P", "AE", "T"],
  },
  {
    promptId: "SP005",
    taskType: "sentence_read",
    targetText: "The cat sat.",
    grade: "4",
    targetPhonemes: [],
  },
];

module.exports = promptBank;
