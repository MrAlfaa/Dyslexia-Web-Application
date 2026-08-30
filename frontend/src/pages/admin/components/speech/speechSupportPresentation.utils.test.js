import test from "node:test";
import assert from "node:assert/strict";
import {
  formatSupportScore,
  resolveAttemptAsrProvider,
} from "./speechSupportPresentation.utils.js";

test("uncalibrated support scores are not rendered as zero percent", () => {
  assert.equal(formatSupportScore(undefined), "Not calibrated");
  assert.equal(formatSupportScore(null), "Not calibrated");
  assert.equal(formatSupportScore(""), "Not calibrated");
  assert.equal(formatSupportScore(0), "0%");
  assert.equal(formatSupportScore(0.68), "68%");
});

test("ASR provider falls back to sentence-reading evidence", () => {
  assert.equal(
    resolveAttemptAsrProvider({ sentenceReading: { asrProvider: "whisper" } }),
    "whisper"
  );
  assert.equal(
    resolveAttemptAsrProvider({ wordReading: { asrProvider: "word-asr" } }),
    "word-asr"
  );
});
