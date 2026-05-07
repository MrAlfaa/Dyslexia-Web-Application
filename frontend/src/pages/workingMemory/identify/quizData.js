// ======================
// GRADE 1–3 (Easier)
// ======================

export const QUIZ_DATA_G13 = [
  // 🔢 Digit Span (Forward)
  {
    id: "wm-g13-1",
    category: "Memory Recall",
    type: "SEQUENCE_MEMORY",
    instruction: "Remember the numbers",
    sequence: [3, 7, 2],
  },
  {
    id: "wm-g13-2",
    category: "Memory Recall",
    type: "SEQUENCE_MEMORY",
    instruction: "Remember the numbers",
    sequence: [5, 1, 9],
  },
  {
    id: "wm-g13-3",
    category: "Memory Recall",
    type: "SEQUENCE_MEMORY",
    instruction: "Remember the numbers",
    sequence: [4, 8, 2, 6],
  },

  // 🔤 Word Memory
  {
    id: "wm-g13-4",
    category: "Word Memory",
    type: "WORD_MEMORY",
    instruction: "Remember these words",
    words: ["cat", "ball", "tree"],
  },
  {
    id: "wm-g13-5",
    category: "Word Memory",
    type: "WORD_MEMORY",
    instruction: "Remember these words",
    words: ["sun", "book", "fish"],
  },
  {
    id: "wm-g13-6",
    category: "Word Memory",
    type: "WORD_MEMORY",
    instruction: "Remember these words",
    words: ["dog", "cup", "car"],
  },

  // 🧾 Instruction Following
  {
    id: "wm-g13-7",
    category: "Instruction",
    type: "MULTIPLE_CHOICE",
    instruction: "What should you do first?",
    text: "Clap, then jump",
    options: ["Clap", "Jump"],
    correct: "Clap",
  },
  {
    id: "wm-g13-8",
    category: "Instruction",
    type: "MULTIPLE_CHOICE",
    instruction: "What comes next?",
    text: "Touch your head, then sit",
    options: ["Sit", "Touch head"],
    correct: "Sit",
  },
  {
    id: "wm-g13-9",
    category: "Instruction",
    type: "MULTIPLE_CHOICE",
    instruction: "What is the last step?",
    text: "Jump, clap, sit",
    options: ["Jump", "Clap", "Sit"],
    correct: "Sit",
  },

  // 🔺 Pattern Recognition
  {
    id: "wm-g13-10",
    category: "Pattern",
    type: "MULTIPLE_CHOICE",
    instruction: "What comes next?",
    text: "🔴 🔵 🔴 🔵 ?",
    options: ["🔴", "🔵"],
    correct: "🔴",
  },
  {
    id: "wm-g13-11",
    category: "Pattern",
    type: "MULTIPLE_CHOICE",
    instruction: "Find the pattern",
    text: "⭐ 🌙 ⭐ 🌙 ?",
    options: ["⭐", "🌙"],
    correct: "⭐",
  },
  {
    id: "wm-g13-12",
    category: "Pattern",
    type: "MULTIPLE_CHOICE",
    instruction: "What comes next?",
    text: "1, 2, 1, 2, ?",
    options: ["1", "2"],
    correct: "1",
  },

  // 🧠 Mixed (Memory + Pattern)
  {
    id: "wm-g13-13",
    category: "Pattern",
    type: "MULTIPLE_CHOICE",
    instruction: "What comes next?",
    text: "A B A B ?",
    options: ["A", "B"],
    correct: "A",
  },
  {
    id: "wm-g13-14",
    category: "Instruction",
    type: "MULTIPLE_CHOICE",
    instruction: "What should you do second?",
    text: "Jump, clap, sit",
    options: ["Jump", "Clap", "Sit"],
    correct: "Clap",
  },
  {
    id: "wm-g13-15",
    category: "Memory Recall",
    type: "SEQUENCE_MEMORY",
    instruction: "Remember the numbers",
    sequence: [2, 5, 7],
  },
];


// ======================
// GRADE 4–5 (Harder)
// ======================

export const QUIZ_DATA_G45 = [
  // 🔢 Digit Span (Longer)
  {
    id: "wm-g45-1",
    category: "Memory Recall",
    type: "SEQUENCE_MEMORY",
    instruction: "Write the numbers in correct order",
    sequence: [3, 8, 1, 7],
  },
  {
    id: "wm-g45-2",
    category: "Memory Recall",
    type: "SEQUENCE_MEMORY",
    instruction: "Write the numbers in correct order",
    sequence: [9, 2, 6, 4, 1],
  },
  {
    id: "wm-g45-3",
    category: "Memory Recall",
    type: "SEQUENCE_MEMORY",
    instruction: "Write the numbers in correct order",
    sequence: [5, 7, 3, 8, 2],
  },

  // 🔤 Word Memory (More words)
  {
    id: "wm-g45-4",
    category: "Word Memory",
    type: "WORD_MEMORY",
    instruction: "Write the words in correct order",
    words: ["apple", "chair", "river", "dog"],
  },
  {
    id: "wm-g45-5",
    category: "Word Memory",
    type: "WORD_MEMORY",
    instruction: "Write the words in correct order",
    words: ["sun", "pen", "cup", "book"],
  },
  {
    id: "wm-g45-6",
    category: "Word Memory",
    type: "WORD_MEMORY",
    instruction: "Write the words in correct order",
    words: ["tree", "fish", "car", "hat"],
  },

  // 🧾 Instruction Following (Complex)
  {
    id: "wm-g45-7",
    category: "Instruction",
    type: "MULTIPLE_CHOICE",
    instruction: "What should you do third?",
    text: "Clap, jump, spin, sit",
    options: ["Clap", "Jump", "Spin", "Sit"],
    correct: "Spin",
  },
  {
    id: "wm-g45-8",
    category: "Instruction",
    type: "MULTIPLE_CHOICE",
    instruction: "What comes first?",
    text: "Write, read, draw",
    options: ["Write", "Read", "Draw"],
    correct: "Write",
  },
  {
    id: "wm-g45-9",
    category: "Instruction",
    type: "MULTIPLE_CHOICE",
    instruction: "What is the last step?",
    text: "Stand, clap, jump",
    options: ["Stand", "Clap", "Jump"],
    correct: "Jump",
  },

  // 🔺 Pattern Recognition (Harder)
  {
    id: "wm-g45-10",
    category: "Pattern",
    type: "MULTIPLE_CHOICE",
    instruction: "What comes next?",
    text: "2, 4, 6, 8, ?",
    options: ["10", "12", "9"],
    correct: "10",
  },
  {
    id: "wm-g45-11",
    category: "Pattern",
    type: "MULTIPLE_CHOICE",
    instruction: "Find the pattern, and select what comes next",
    text: "A C E G ?",
    options: ["H", "I", "J"],
    correct: "I",
  },
  {
    id: "wm-g45-12",
    category: "Pattern",
    type: "MULTIPLE_CHOICE",
    instruction: "Find the pattern, and select what comes next?",
    text: "5, 10, 15, ?",
    options: ["20", "25", "18"],
    correct: "20",
  },

  // 🧠 Mixed (Advanced)
  {
    id: "wm-g45-13",
    category: "Pattern",
    type: "MULTIPLE_CHOICE",
    instruction: "Find the pattern, and select what comes next?",
    text: "🔺🔺🔵🔺🔺🔵 ?",
    options: ["🔺", "🔵"],
    correct: "🔺",
  },
  {
    id: "wm-g45-14",
    category: "Instruction",
    type: "MULTIPLE_CHOICE",
    instruction: "What should you do second?",
    text: "Sit, clap, jump",
    options: ["Sit", "Clap", "Jump"],
    correct: "Clap",
  },
  {
    id: "wm-g45-15",
    category: "Memory Recall",
    type: "SEQUENCE_MEMORY",
    instruction: "Remember the numbers",
    sequence: [8, 3, 6, 1],
  },
];