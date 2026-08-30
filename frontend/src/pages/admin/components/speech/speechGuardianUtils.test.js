import test from "node:test";
import assert from "node:assert/strict";

import { formatSpeechLabel } from "./speechGuardianUtils.js";

test("formats stored speech identifiers for guardian-facing display", () => {
  assert.equal(formatSpeechLabel("speech_reading_practice"), "Speech reading practice");
  assert.equal(formatSpeechLabel("vowel-sound_pattern"), "Vowel sound pattern");
});

test("uses the provided fallback when a speech identifier is missing", () => {
  assert.equal(formatSpeechLabel("", "Waiting"), "Waiting");
  assert.equal(formatSpeechLabel(null, "Not available"), "Not available");
});
