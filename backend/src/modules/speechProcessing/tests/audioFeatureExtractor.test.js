const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computeAudioQualityScore,
} = require("../services/audioFeatureExtractor.service");

const metadata = {
  durationSec: 1.32,
  sampleRate: 16000,
  codecName: "pcm_s16le",
  formatName: "wav",
};

const volume = {
  meanVolumeDb: -23.2,
  maxVolumeDb: -1.2,
  rmsAmplitude: 0.0693,
  clippingRatio: 0,
};

test("short listen-and-repeat words reach ASR when speech exists despite trailing silence", () => {
  const quality = computeAudioQualityScore({
    audioMetadata: metadata,
    volumeFeatures: volume,
    silenceFeatures: {
      estimatedSpeechSec: 0.189,
      silenceRatio: 0.857,
      hasSpeech: false,
    },
    taskType: "listen_repeat",
    targetText: "ship",
  });

  assert.equal(quality.validAudio, true);
  assert.equal(quality.invalidReason, "");
  assert.deepEqual(quality.warnings, ["mostly_silence"]);
});

test("single-word audio with no meaningful speech remains invalid", () => {
  const quality = computeAudioQualityScore({
    audioMetadata: metadata,
    volumeFeatures: volume,
    silenceFeatures: {
      estimatedSpeechSec: 0.08,
      silenceRatio: 0.94,
      hasSpeech: false,
    },
    taskType: "listen_repeat",
    targetText: "ship",
  });

  assert.equal(quality.validAudio, false);
  assert.equal(quality.invalidReason, "no_speech_detected");
});

test("sentence recordings keep the stricter silence policy", () => {
  const quality = computeAudioQualityScore({
    audioMetadata: metadata,
    volumeFeatures: volume,
    silenceFeatures: {
      estimatedSpeechSec: 0.4,
      silenceRatio: 0.87,
      hasSpeech: true,
    },
    taskType: "sentence_read",
    targetText: "The ship is blue.",
  });

  assert.equal(quality.validAudio, false);
  assert.equal(quality.invalidReason, "mostly_silence");
});
