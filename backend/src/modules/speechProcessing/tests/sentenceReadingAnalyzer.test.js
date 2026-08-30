const test = require("node:test");
const assert = require("node:assert/strict");

const {
  analyzeSentenceReading,
  getChildSentenceFeedback,
  normalizeSentenceText,
} = require("../services/sentenceReadingAnalyzer.service");

test("normalizes a complete sentence instead of one word", () => {
  assert.equal(normalizeSentenceText(" The little girl read. "), "the little girl read");
});

test("reports one omitted word", () => {
  const result = analyzeSentenceReading({
    targetText: "the little girl read the book",
    asrText: "the little girl read book",
    audioDurationMs: 6000,
  });

  assert.equal(result.omittedWordCount, 1);
  assert.equal(result.wordErrorRate, 0.1667);
  assert.equal(result.wordCoverage, 0.8333);
  assert.equal(result.wordsPerMinute, 50);
  assert.deepEqual(result.tokenErrors, {
    omittedWords: ["the"],
    insertedWords: [],
    substitutions: [],
  });
  assert.ok(result.warnings.includes("asr_transcript_incomplete"));
});

test("aligns insertions and substitutions at token level", () => {
  const result = analyzeSentenceReading({
    targetText: "the little girl reads books",
    asrText: "the very little girl read book",
    audioDurationMs: 5000,
  });

  assert.equal(result.tokenEditDistance, 3);
  assert.equal(result.insertedWordCount, 1);
  assert.equal(result.substitutedWordCount, 2);
  assert.equal(result.wordErrorRate, 0.6);
  assert.equal(result.sentenceSimilarity, 0.5);
  assert.deepEqual(result.tokenErrors, {
    omittedWords: [],
    insertedWords: ["very"],
    substitutions: [
      { expected: "reads", heard: "read" },
      { expected: "books", heard: "book" },
    ],
  });
});

test("marks an exact normalized sentence as valid", () => {
  const result = analyzeSentenceReading({
    targetText: "The cat ran.",
    asrText: "the cat ran",
    audioDurationMs: 3000,
  });

  assert.equal(result.status, "valid");
  assert.equal(result.exactMatch, true);
  assert.equal(result.partialMatch, false);
  assert.equal(result.wordCoverage, 1);
  assert.equal(result.sentenceSimilarity, 1);
  assert.ok(!result.warnings.includes("asr_transcript_incomplete"));
});

test("uses coverage for partial match without treating an empty transcript as partial", () => {
  const partialResult = analyzeSentenceReading({
    targetText: "the cat ran quickly",
    asrText: "the cat ran",
  });
  const emptyResult = analyzeSentenceReading({ targetText: "the cat ran", asrText: "" });

  assert.equal(partialResult.partialMatch, true);
  assert.equal(partialResult.wordsPerMinute, null);
  assert.equal(emptyResult.partialMatch, false);
});

test("empty ASR is explicit and does not fabricate pace", () => {
  const result = analyzeSentenceReading({ targetText: "the cat ran", asrText: "" });

  assert.equal(result.status, "asr_empty");
  assert.equal(result.wordsPerMinute, null);
  assert.equal(result.wordErrorRate, 1);
  assert.deepEqual(result.warnings, ["asr_empty", "audio_duration_unavailable"]);
});

test("empty ASR with a usable duration still has no reading pace", () => {
  const result = analyzeSentenceReading({
    targetText: "the cat ran",
    asrText: "",
    audioDurationMs: 3000,
  });

  assert.equal(result.status, "asr_empty");
  assert.equal(result.wordsPerMinute, null);
  assert.ok(!result.warnings.includes("audio_duration_unavailable"));
});

test("empty ASR receives neutral saved feedback without a recognition claim", () => {
  assert.deepEqual(getChildSentenceFeedback({ status: "asr_empty" }), {
    state: "saved",
    message: "Your recording was saved. You can continue.",
  });
});
