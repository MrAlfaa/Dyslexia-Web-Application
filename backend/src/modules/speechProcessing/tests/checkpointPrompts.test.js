const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getCheckpointPrompts,
  getCheckpointPromptById,
} = require("../data/leoCheckpointPrompts");

test("checkpoint forms contain four grade-appropriate recording prompts", () => {
  const prompts = getCheckpointPrompts({ grade: "3", sequenceNo: 1 });

  assert.equal(prompts.length, 4);
  assert.equal(prompts.filter((prompt) => prompt.taskType === "read_aloud_word").length, 2);
  assert.equal(prompts.filter((prompt) => prompt.taskType === "pseudoword_read").length, 1);
  assert.equal(prompts.filter((prompt) => prompt.taskType === "sentence_read").length, 1);
  assert.ok(prompts.every((prompt) => prompt.requiresRecording));
});

test("checkpoint forms rotate by sequence and prompt ids remain resolvable", () => {
  const first = getCheckpointPrompts({ grade: "4", sequenceNo: 1 });
  const second = getCheckpointPrompts({ grade: "4", sequenceNo: 2 });

  assert.notDeepEqual(
    first.map((prompt) => prompt.targetText),
    second.map((prompt) => prompt.targetText)
  );
  assert.equal(getCheckpointPromptById(second[0].promptId).targetText, second[0].targetText);
});

test("prompt form rotation is independent from formal checkpoint sequence", () => {
  const formD = getCheckpointPrompts({ grade: 3, sequenceNo: 1, formNo: 4 });
  assert.equal(formD.length, 4);
  assert.ok(formD.every((prompt) => prompt.form === 4));
});
