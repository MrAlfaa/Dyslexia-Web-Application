const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pronunciationService = require("../services/pronunciationModel.service");

test("pronunciation prediction uses a configurable child-safe timeout", () => {
  assert.equal(typeof pronunciationService.getPredictionTimeoutMs, "function");

  const original = process.env.PRONUNCIATION_MODEL_TIMEOUT_MS;
  try {
    delete process.env.PRONUNCIATION_MODEL_TIMEOUT_MS;
    assert.equal(pronunciationService.getPredictionTimeoutMs(), 60000);

    process.env.PRONUNCIATION_MODEL_TIMEOUT_MS = "90000";
    assert.equal(pronunciationService.getPredictionTimeoutMs(), 90000);

    process.env.PRONUNCIATION_MODEL_TIMEOUT_MS = "invalid";
    assert.equal(pronunciationService.getPredictionTimeoutMs(), 60000);
  } finally {
    if (original === undefined) delete process.env.PRONUNCIATION_MODEL_TIMEOUT_MS;
    else process.env.PRONUNCIATION_MODEL_TIMEOUT_MS = original;
  }
});

test("speech runtime pins the scikit-learn artifact version", () => {
  const requirementsPath = path.resolve(
    __dirname,
    "../ml/requirements.txt"
  );
  const requirements = readFileSync(requirementsPath, "utf8");

  assert.match(requirements, /^scikit-learn==1\.6\.1$/m);
});
