const assert = require("node:assert/strict");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const transcribeScript = path.resolve(__dirname, "../ml/transcribe_whisper.py");

test("Whisper runner prefers cached model files before network access", () => {
  const fakeModuleDir = mkdtempSync(path.join(os.tmpdir(), "lexiland-whisper-test-"));
  const fakeAudioPath = path.join(fakeModuleDir, "sample.wav");

  writeFileSync(fakeAudioPath, "test audio placeholder");
  writeFileSync(
    path.join(fakeModuleDir, "faster_whisper.py"),
    [
      "class Segment:",
      "    text = 'The dog can run.'",
      "",
      "class Info:",
      "    language = 'en'",
      "    duration = 1.25",
      "",
      "class WhisperModel:",
      "    def __init__(self, *args, **kwargs):",
      "        if kwargs.get('local_files_only') is not True:",
      "            raise RuntimeError('cached model was not preferred')",
      "",
      "    def transcribe(self, *args, **kwargs):",
      "        return [Segment()], Info()",
      "",
    ].join("\n")
  );

  try {
    const result = spawnSync(
      "python",
      [
        transcribeScript,
        "--audio",
        fakeAudioPath,
        "--model-size",
        "tiny.en",
        "--device",
        "cpu",
        "--compute-type",
        "int8",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PYTHONPATH: fakeModuleDir,
        },
      }
    );

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout.trim());
    assert.equal(payload.status, "success");
    assert.equal(payload.asrText, "The dog can run.");
  } finally {
    rmSync(fakeModuleDir, { recursive: true, force: true });
  }
});
