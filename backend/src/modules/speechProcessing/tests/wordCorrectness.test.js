const test = require("node:test");
const assert = require("node:assert/strict");

const {
  analyzeWordCorrectness,
  normalizeSpeechText,
} = require("../services/wordReadingAnalyzer.service");

test("normalizes simple Whisper text", () => {
  assert.equal(normalizeSpeechText("Bat."), "bat");
  assert.equal(normalizeSpeechText(" pat "), "pat");
  assert.equal(normalizeSpeechText("The word is bat", { targetWord: "bat" }), "bat");
  assert.equal(normalizeSpeechText("I said bat", { targetWord: "bat" }), "bat");
});

test("bat vs bat is correct", () => {
  const result = analyzeWordCorrectness("bat", "bat");
  assert.equal(result.wordCorrect, true);
  assert.equal(result.possibleError, "none");
  assert.equal(result.editDistance, 0);
  assert.equal(result.similarityScore, 1);
});

test("bat vs pat detects initial sound confusion", () => {
  const result = analyzeWordCorrectness("bat", "pat");
  assert.equal(result.wordCorrect, false);
  assert.equal(result.initialSoundError, true);
  assert.equal(result.finalSoundError, false);
  assert.equal(result.editDistance, 1);
  assert.equal(result.similarityScore, 0.67);
  assert.match(result.possibleError, /initial sound confusion/);
});

test("bat vs bad detects final sound confusion", () => {
  const result = analyzeWordCorrectness("bat", "bad");
  assert.equal(result.wordCorrect, false);
  assert.equal(result.initialSoundError, false);
  assert.equal(result.finalSoundError, true);
  assert.equal(result.possibleError, "final sound confusion: t -> d");
});

test("empty ASR returns asr_empty", () => {
  const result = analyzeWordCorrectness("cat", "");
  assert.equal(result.wordCorrect, false);
  assert.equal(result.possibleError, "asr_empty");
});

test("ship vs sip reports a likely sound error", () => {
  const result = analyzeWordCorrectness("ship", "sip");
  assert.equal(result.wordCorrect, false);
  assert.ok(
    result.possibleError.includes("initial sound confusion") ||
      result.possibleError.includes("substitution")
  );
});
