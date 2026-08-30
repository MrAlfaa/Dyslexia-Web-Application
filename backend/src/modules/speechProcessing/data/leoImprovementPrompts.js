const chooseFirstSound = {
  instructionSi: "පළමු ශබ්දය තෝරන්න",
  instructionEn: "Choose the first sound",
  difficulty: "easy",
  skill: "initial_sound_recognition",
};

const listenRepeat = {
  instructionSi: "අසා නැවත කියන්න",
  instructionEn: "Listen and repeat",
  difficulty: "easy",
  skill: "pronunciation_practice",
};

const robotWord = {
  instructionSi: "රොබෝ වචනය කියවන්න",
  instructionEn: "Read this robot word",
  difficulty: "medium",
  skill: "pseudoword_decoding",
};

const soundTwin = {
  instructionSi: "නියම වචනය තෝරන්න",
  instructionEn: "Choose the word Leo says",
  difficulty: "medium",
  skill: "sound_discrimination",
};

const storyTrail = {
  instructionSi: "වාක්‍යය කියවන්න",
  instructionEn: "Read the sentence aloud",
  difficulty: "medium",
  skill: "oral_reading_fluency",
};

module.exports = {
  leo_first_sound_hunt: [
    {
      promptId: "LEO_FSH_001",
      activityId: "leo_first_sound_hunt",
      taskType: "first_sound",
      targetText: "cat",
      targetSound: "K",
      targetPhonemes: ["K", "AE", "T"],
      options: ["K", "B", "D"],
      ...chooseFirstSound,
    },
    {
      promptId: "LEO_FSH_002",
      activityId: "leo_first_sound_hunt",
      taskType: "first_sound",
      targetText: "bat",
      targetSound: "B",
      targetPhonemes: ["B", "AE", "T"],
      options: ["B", "P", "T"],
      ...chooseFirstSound,
    },
    {
      promptId: "LEO_FSH_003",
      activityId: "leo_first_sound_hunt",
      taskType: "first_sound",
      targetText: "dog",
      targetSound: "D",
      targetPhonemes: ["D", "AO", "G"],
      options: ["D", "T", "G"],
      ...chooseFirstSound,
    },
    {
      promptId: "LEO_FSH_004",
      activityId: "leo_first_sound_hunt",
      taskType: "first_sound",
      targetText: "sun",
      targetSound: "S",
      targetPhonemes: ["S", "AH", "N"],
      options: ["S", "F", "SH"],
      ...chooseFirstSound,
    },
    {
      promptId: "LEO_FSH_005",
      activityId: "leo_first_sound_hunt",
      taskType: "first_sound",
      targetText: "fish",
      targetSound: "F",
      targetPhonemes: ["F", "IH", "SH"],
      options: ["F", "S", "V"],
      ...chooseFirstSound,
    },
  ],
  leo_echo_roar: ["cat", "ship", "ball", "tree", "fish"].map((word, index) => ({
    promptId: `LEO_ECHO_${String(index + 1).padStart(3, "0")}`,
    activityId: "leo_echo_roar",
    taskType: "listen_repeat",
    targetText: word,
    targetPhonemes:
      {
        cat: ["K", "AE", "T"],
        ship: ["SH", "IH", "P"],
        ball: ["B", "AO", "L"],
        tree: ["T", "R", "IY"],
        fish: ["F", "IH", "SH"],
      }[word] || [],
    ...listenRepeat,
  })),
  leo_robot_words: [
    ["mip", ["M", "IH", "P"]],
    ["blim", ["B", "L", "IH", "M"]],
    ["sote", ["S", "OW", "T"]],
    ["plam", ["P", "L", "AE", "M"]],
    ["fep", ["F", "EH", "P"]],
  ].map(([targetText, targetPhonemes], index) => ({
    promptId: `LEO_ROBOT_${String(index + 1).padStart(3, "0")}`,
    activityId: "leo_robot_words",
    taskType: "pseudoword_read",
    targetText,
    targetPhonemes,
    ...robotWord,
  })),
  leo_sound_twins: [
    ["bat", "pat", "b_vs_p"],
    ["big", "pig", "b_vs_p"],
    ["cap", "cat", "p_vs_t"],
    ["fan", "van", "f_vs_v"],
    ["sip", "ship", "s_vs_sh"],
  ].map(([targetText, pairText, confusionGroup], index) => ({
    promptId: `LEO_TWIN_${String(index + 1).padStart(3, "0")}`,
    activityId: "leo_sound_twins",
    taskType: "minimal_pair",
    targetText,
    pairText,
    targetSound: targetText[0].toUpperCase(),
    targetPhonemes: [],
    options: [targetText, pairText],
    correctAnswer: targetText,
    confusionGroup,
    ...soundTwin,
  })),
  leo_story_roar: [
    "The cat sat.",
    "The dog can run.",
    "I see a big sun.",
    "The fish can swim.",
    "Leo has a red ball.",
  ].map((targetText, index) => ({
    promptId: `LEO_STORY_${String(index + 1).padStart(3, "0")}`,
    activityId: "leo_story_roar",
    taskType: "sentence_read",
    targetText,
    contentType: "sentence",
    gradeMin: 2,
    gradeMax: 5,
    wordCount: targetText.trim().split(/\s+/).length,
    targetPhonemes: [],
    ...storyTrail,
  })),
};
