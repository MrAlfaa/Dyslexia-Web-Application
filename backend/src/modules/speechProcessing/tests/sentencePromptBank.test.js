const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getStoryPromptsForGrade,
  getSentencePromptById,
  hardPrompts,
  harderPrompts,
  paragraphPrompts,
} = require("../data/leoSentenceReadingPrompts");
const {
  getCheckpointPrompts,
  getCheckpointSentence,
  getCheckpointPromptById,
} = require("../data/leoCheckpointPrompts");

test("Grade 2 receives only short sentence prompts", () => {
  const prompts = getStoryPromptsForGrade({ grade: 2, seed: "student-a" });

  assert.ok(prompts.every((prompt) => prompt.difficulty === "short"));
  assert.equal(prompts.length, 5);
});

test("Grade 5 receives harder sentences and one grouped paragraph", () => {
  const prompts = getStoryPromptsForGrade({
    grade: 5,
    seed: "student-a",
    includeParagraph: true,
  });

  assert.equal(prompts.filter((prompt) => prompt.difficulty === "harder").length, 3);
  const paragraph = prompts.filter((prompt) => prompt.paragraphId);
  assert.equal(paragraph.length, 3);
  assert.deepEqual(paragraph.map((prompt) => prompt.segmentNo), [1, 2, 3]);
});

test("selection is deterministic for the same grade and seed", () => {
  assert.deepEqual(
    getStoryPromptsForGrade({ grade: 4, seed: "session-1" }).map((prompt) => prompt.promptId),
    getStoryPromptsForGrade({ grade: 4, seed: "session-1" }).map((prompt) => prompt.promptId)
  );
});

test("sentence prompts expose stable reading metadata and lookup", () => {
  const prompt = getStoryPromptsForGrade({ grade: 4, seed: "metadata" })[0];

  for (const field of [
    "promptId",
    "taskType",
    "contentType",
    "targetText",
    "gradeMin",
    "gradeMax",
    "difficulty",
    "wordCount",
    "paragraphId",
    "segmentNo",
    "segmentCount",
    "displayChunks",
  ]) {
    assert.ok(Object.hasOwn(prompt, field), `missing ${field}`);
  }
  assert.equal(getSentencePromptById(prompt.promptId), prompt);
  assert.equal(prompt.wordCount, prompt.targetText.trim().split(/\s+/).length);
  assert.ok(Array.isArray(prompt.displayChunks));
});

test("grade-aware checkpoints preserve four prompts and replace only the sentence", () => {
  for (const [grade, difficulty] of [
    [2, "short"],
    [3, "short"],
    [4, "hard"],
    [5, "harder"],
  ]) {
    const prompts = getCheckpointPrompts({ grade, formNo: 1 });
    assert.equal(prompts.length, 4);
    assert.equal(prompts.filter((prompt) => prompt.taskType === "sentence_read").length, 1);
    assert.equal(getCheckpointSentence({ grade, formNo: 1 }).difficulty, difficulty);
    assert.equal(prompts.filter((prompt) => prompt.taskType === "pseudoword_read").length, 1);
  }
});

test("prompt bank preserves the complete supplied hard, harder, and paragraph corpus", () => {
  assert.deepEqual(hardPrompts.map((prompt) => prompt.targetText), [
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
  ]);
  assert.deepEqual(harderPrompts.map((prompt) => prompt.targetText), [
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
  ]);
  assert.deepEqual(
    Array.from({ length: 4 }, (_, paragraphIndex) =>
      paragraphPrompts
        .filter((prompt) => prompt.paragraphId === `LEO_PARAGRAPH_${paragraphIndex + 1}`)
        .sort((a, b) => a.segmentNo - b.segmentNo)
        .map((prompt) => prompt.targetText)
    ),
    [
      [
        "On Saturday morning, Ravi visited his grandmother with his little sister.",
        "They helped her clean the garden and water the colourful flowers.",
        "After finishing their work, they sat under a large tree and listened to the birds singing.",
      ],
      [
        "Maya arrived at school early because her teacher had planned a special reading activity.",
        "She carefully opened her book and read the story aloud to the class.",
        "After reading, the teacher asked several questions about the characters in the story.",
      ],
      [
        "One afternoon, Nimal noticed a small bird sitting near the garden gate.",
        "The bird looked frightened and could not fly very far.",
        "Nimal called his mother, and together they carefully moved the bird to a safe place.",
      ],
      [
        "During the school holiday, the children visited a large farm outside the village.",
        "They saw cows, chickens, rabbits, and colourful butterflies.",
        "Their teacher explained how farmers take care of animals and grow vegetables.",
      ],
    ]
  );
});

test("checkpoint sentence IDs resolve to the selected target and difficulty", () => {
  for (const grade of [2, 3, 4, 5]) {
    const sentence = getCheckpointPrompts({ grade, formNo: 1 }).find(
      (prompt) => prompt.taskType === "sentence_read"
    );
    const resolved = getCheckpointPromptById(sentence.promptId);

    assert.equal(resolved.promptId, sentence.promptId);
    assert.equal(resolved.targetText, sentence.targetText);
    assert.equal(resolved.difficulty, sentence.difficulty);
  }
});
