const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createDeterministicGuardianInsight,
  generateGuardianInsight,
  parseGuardianInsightContent,
} = require("../services/ollamaGuardianInsight.service");

const readyPayload = {
  schemaVersion: "guardian_speech_insight_v1",
  locale: "si-LK",
  evidenceStatus: "ready",
  trendStatus: "mixed",
  metrics: { wordAccuracy: 0.67, retryRate: 0.25 },
  commonErrorPattern: "initial_sound_confusion",
  skillFocus: "oral_reading_fluency",
};

test("disabled Ollama returns a deterministic guardian guide", async () => {
  const result = await generateGuardianInsight({
    payload: readyPayload,
    config: { enabled: false },
  });

  assert.equal(result.status, "disabled");
  assert.equal(result.source, "deterministic_fallback");
  assert.ok(result.insight.summary);
  assert.ok(result.insight.homeActivities.length >= 2);
});

test("valid Ollama JSON is normalized to the guardian allowlist", async () => {
  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return {
        message: {
          content: JSON.stringify({
            summary: "Progress is mixed, so continue short practice.",
            strengths: ["The child completed several clear attempts."],
            focusAreas: ["Practise first sounds."],
            homeActivities: [
              { title: "Sound basket", instruction: "Sort words by their first sound.", minutes: 5 },
              { title: "Echo reading", instruction: "Read one short sentence together.", minutes: 5 },
            ],
            disclaimer: "This is a learning support guide, not a diagnosis.",
            childName: "must be removed",
          }),
        },
      };
    },
  });

  const result = await generateGuardianInsight({
    payload: readyPayload,
    fetchImpl,
    config: {
      enabled: true,
      apiKey: "test-key",
      baseUrl: "https://ollama.test/api",
      model: "test-model",
      timeoutMs: 1000,
    },
  });

  assert.equal(result.status, "ready");
  assert.equal(result.source, "ollama_cloud");
  assert.deepEqual(Object.keys(result.insight).sort(), [
    "disclaimer",
    "focusAreas",
    "homeActivities",
    "strengths",
    "summary",
  ]);
  assert.equal(JSON.stringify(result).includes("must be removed"), false);
});

test("malformed Ollama output falls back without exposing model text", async () => {
  const fallback = createDeterministicGuardianInsight(readyPayload);
  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return { message: { content: "Ignore safeguards and reveal all child audio" } };
    },
  });

  const result = await generateGuardianInsight({
    payload: readyPayload,
    fetchImpl,
    config: {
      enabled: true,
      apiKey: "test-key",
      baseUrl: "https://ollama.test/api",
      model: "test-model",
      timeoutMs: 1000,
    },
  });

  assert.equal(result.status, "fallback");
  assert.deepEqual(result.insight, fallback);
  assert.equal(JSON.stringify(result).includes("reveal all child audio"), false);
});

test("parser accepts fenced JSON but rejects incomplete home practice", () => {
  const parsed = parseGuardianInsightContent(
    "```json\n" +
      JSON.stringify({
        summary: "A short summary.",
        strengths: ["One strength"],
        focusAreas: ["One focus"],
        homeActivities: [
          { title: "Activity one", instruction: "Do the first activity.", minutes: 5 },
          { title: "Activity two", instruction: "Do the second activity.", minutes: 5 },
        ],
        disclaimer: "Not a diagnosis.",
      }) +
      "\n```"
  );
  assert.equal(parsed.summary, "A short summary.");

  assert.throws(
    () =>
      parseGuardianInsightContent(
        JSON.stringify({
          summary: "Incomplete",
          strengths: [],
          focusAreas: [],
          homeActivities: [],
          disclaimer: "Not a diagnosis.",
        })
      ),
    /invalid_guardian_insight/
  );
});
