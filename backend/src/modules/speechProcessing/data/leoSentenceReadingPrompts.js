const improvementPrompts = require("./leoImprovementPrompts");

const stableHash = (value) => [...String(value)].reduce(
  (hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0,
  2166136261
);

const rotate = (items, offset) =>
  items.map((_, index) => items[(index + offset) % items.length]);

const splitDisplayChunks = (text) =>
  text
    .split(/(?<=,)|(?<=\b(?:and|but|because|while|so)\b)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

const createPrompt = ({
  promptId,
  targetText,
  difficulty,
  gradeMin,
  gradeMax,
  paragraphId = null,
  segmentNo = null,
  segmentCount = null,
  contentType = "sentence",
}) => ({
  promptId,
  taskType: "sentence_read",
  contentType,
  targetText,
  gradeMin,
  gradeMax,
  difficulty,
  wordCount: targetText.trim().split(/\s+/).length,
  paragraphId,
  segmentNo,
  segmentCount,
  displayChunks: splitDisplayChunks(targetText),
});

const shortPrompts = (improvementPrompts.leo_story_roar || []).map((prompt) =>
  createPrompt({
    promptId: prompt.promptId,
    targetText: prompt.targetText,
    difficulty: "short",
    gradeMin: 2,
    gradeMax: 5,
  })
);

const hardTexts = [
  "The little girl carefully packed her colourful books into her school bag.",
  "The children played happily together after the heavy rain stopped.",
  "Ravi brought his favourite storybook to school on Monday morning.",
  "The friendly teacher asked the children to read a short paragraph aloud.",
  "The small brown rabbit quickly jumped behind the green bushes.",
  "My grandmother prepared a delicious breakfast for the whole family.",
  "The clever boy remembered to bring his blue umbrella before leaving home.",
  "The children watched several beautiful butterflies flying around the garden.",
  "After finishing his homework, Nimal went outside to play with his brother.",
  "The little bird suddenly flew across the garden and landed on a tall tree.",
  "Sara carefully placed the colourful pencils beside her drawing book.",
  "The farmer carried a heavy basket of vegetables from the garden.",
  "During the school holiday, Maya visited her grandmother in the countryside.",
  "The children were excited because their teacher planned an interesting classroom activity.",
  "Before going to bed, the boy read an exciting story about a brave rabbit.",
];

const harderTexts = [
  "The little boy searched carefully under the table because he could not find his favourite blue pencil.",
  "After the thunderstorm ended, the children went outside and looked at the bright rainbow in the sky.",
  "The teacher asked everyone to listen carefully before answering the difficult question.",
  "Ravi accidentally dropped his schoolbag while running quickly across the playground.",
  "The girl remembered that she had left her homework book beside the window.",
  "The children quietly listened to their grandmother while she told them an interesting story.",
  "Before breakfast, Nimal carefully arranged his books, pencils, and lunch box inside his schoolbag.",
  "The little rabbit became frightened when it heard a sudden noise coming from behind the bushes.",
  "After completing their classroom activity, the students worked together to clean the tables.",
  "The boy was excited when his grandfather gave him a beautiful wooden puzzle.",
];

const paragraphTexts = [
  "On Saturday morning, Ravi visited his grandmother with his little sister.",
  "They helped her clean the garden and water the colourful flowers.",
  "After finishing their work, they sat under a large tree and listened to the birds singing.",
  "Maya arrived at school early because her teacher had planned a special reading activity.",
  "She carefully opened her book and read the story aloud to the class.",
  "After reading, the teacher asked several questions about the characters in the story.",
  "One afternoon, Nimal noticed a small bird sitting near the garden gate.",
  "The bird looked frightened and could not fly very far.",
  "Nimal called his mother, and together they carefully moved the bird to a safe place.",
  "During the school holiday, the children visited a large farm outside the village.",
  "They saw cows, chickens, rabbits, and colourful butterflies.",
  "Their teacher explained how farmers take care of animals and grow vegetables.",
];

const hardPrompts = hardTexts.map((targetText, index) =>
  createPrompt({
    promptId: `LEO_SENTENCE_HARD_${String(index + 1).padStart(2, "0")}`,
    targetText,
    difficulty: "hard",
    gradeMin: 3,
    gradeMax: 4,
  })
);

const harderPrompts = harderTexts.map((targetText, index) =>
  createPrompt({
    promptId: `LEO_SENTENCE_HARDER_${String(index + 16).padStart(2, "0")}`,
    targetText,
    difficulty: "harder",
    gradeMin: 5,
    gradeMax: 5,
  })
);

const paragraphPrompts = paragraphTexts.map((targetText, index) => {
  const paragraphIndex = Math.floor(index / 3) + 1;
  return createPrompt({
    promptId: `LEO_PARAGRAPH_${paragraphIndex}_${(index % 3) + 1}`,
    targetText,
    difficulty: "paragraph",
    gradeMin: 5,
    gradeMax: 5,
    paragraphId: `LEO_PARAGRAPH_${paragraphIndex}`,
    segmentNo: (index % 3) + 1,
    segmentCount: 3,
    contentType: "paragraph_segment",
  });
});

const allPrompts = [...shortPrompts, ...hardPrompts, ...harderPrompts, ...paragraphPrompts];

const select = (items, count, seed) =>
  rotate(items, stableHash(seed) % items.length).slice(0, count);

const getStoryPromptsForGrade = ({ grade = 2, seed = "default", includeParagraph = false } = {}) => {
  const childGrade = Number(grade);
  if (!Number.isInteger(childGrade) || childGrade < 2 || childGrade > 5) return [];

  const warmupCount = { 2: 5, 3: 3, 4: 2, 5: 1 }[childGrade];
  const selected = select(shortPrompts, warmupCount, `${seed}:short:${childGrade}`);
  if (childGrade === 2) return selected;

  const challengePool = childGrade === 5 ? harderPrompts : hardPrompts;
  const challengeCount = childGrade === 3 ? 2 : 3;
  selected.push(...select(challengePool, challengeCount, `${seed}:challenge:${childGrade}`));

  if (childGrade === 5 && includeParagraph) {
    const paragraphNo = stableHash(`${seed}:paragraph`) % 4;
    selected.push(...paragraphPrompts.slice(paragraphNo * 3, paragraphNo * 3 + 3));
  }
  return selected;
};

const getSentencePromptById = (promptId) =>
  allPrompts.find((prompt) => prompt.promptId === promptId);

module.exports = {
  allPrompts,
  shortPrompts,
  hardPrompts,
  harderPrompts,
  paragraphPrompts,
  getStoryPromptsForGrade,
  getSentencePromptById,
};
