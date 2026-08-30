const test = require("node:test");
const assert = require("node:assert/strict");

const {
  analyzePhonemeComparison,
  tokenizeWordToPhonemes,
} = require("../services/phonemeComparison.service");

test("tokenizes common English sound patterns", () => {
  assert.deepEqual(tokenizeWordToPhonemes("ship"), ["SH", "I", "P"]);
  assert.deepEqual(tokenizeWordToPhonemes("check"), ["CH", "E", "K"]);
});

test("bat vs bat has no phoneme error", () => {
  const result = analyzePhonemeComparison({ targetWord: "bat", asrText: "bat" });
  assert.equal(result.status, "completed");
  assert.equal(result.phonemeErrorRate, 0);
  assert.equal(result.errorPattern, "none");
  assert.equal(result.initialSoundError, false);
  assert.equal(result.finalSoundError, false);
});

test("bat vs pat detects initial sound pattern", () => {
  const result = analyzePhonemeComparison({ targetWord: "bat", asrText: "pat" });
  assert.equal(result.status, "completed");
  assert.equal(result.initialSoundError, true);
  assert.equal(result.finalSoundError, false);
  assert.equal(result.errorPattern, "initial_sound_pattern");
  assert.equal(result.substitutionCount, 1);
});

test("bat vs bad detects final sound pattern", () => {
  const result = analyzePhonemeComparison({ targetWord: "bat", asrText: "bad" });
  assert.equal(result.status, "completed");
  assert.equal(result.initialSoundError, false);
  assert.equal(result.finalSoundError, true);
  assert.equal(result.errorPattern, "final_sound_pattern");
});

test("ship vs sip detects the sh sound substitution", () => {
  const result = analyzePhonemeComparison({ targetWord: "ship", asrText: "sip" });
  assert.equal(result.status, "completed");
  assert.equal(result.initialSoundError, true);
  assert.equal(result.errorPattern, "initial_sound_pattern");
  assert.ok(result.phonemeErrorRate > 0);
});

test("empty ASR is marked as asr_empty", () => {
  const result = analyzePhonemeComparison({ targetWord: "cat", asrText: "" });
  assert.equal(result.status, "asr_empty");
  assert.equal(result.errorPattern, "asr_empty");
  assert.equal(result.phonemeErrorRate, 1);
  assert.ok(result.warnings.includes("asr_empty"));
});

test("pseudoword comparison includes ASR confidence warning", () => {
  const result = analyzePhonemeComparison({
    targetWord: "blim",
    asrText: "blim",
    taskType: "pseudoword_read",
  });
  assert.equal(result.status, "completed");
  assert.equal(result.phonemeErrorRate, 0);
  assert.ok(result.warnings.includes("pseudoword_asr_low_confidence"));
});
