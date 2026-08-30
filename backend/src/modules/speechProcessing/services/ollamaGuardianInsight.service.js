const DEFAULT_TIMEOUT_MS = 15000;
const MAX_TEXT_LENGTH = 600;
const MAX_LIST_ITEMS = 4;

const cleanText = (value, maxLength = MAX_TEXT_LENGTH) =>
  String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const cleanTextList = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 220))
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
};

const cleanHomeActivities = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((activity) => ({
      title: cleanText(activity?.title, 80),
      instruction: cleanText(activity?.instruction, 260),
      minutes: Math.max(3, Math.min(15, Number(activity?.minutes) || 5)),
    }))
    .filter((activity) => activity.title && activity.instruction)
    .slice(0, 3);
};

const parseGuardianInsightContent = (content) => {
  const raw = String(content || "").trim();
  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(withoutFence);
  } catch {
    throw new Error("invalid_guardian_insight_json");
  }

  const insight = {
    summary: cleanText(parsed?.summary),
    strengths: cleanTextList(parsed?.strengths),
    focusAreas: cleanTextList(parsed?.focusAreas),
    homeActivities: cleanHomeActivities(parsed?.homeActivities),
    disclaimer: cleanText(parsed?.disclaimer, 260),
  };

  if (
    !insight.summary ||
    insight.strengths.length < 1 ||
    insight.focusAreas.length < 1 ||
    insight.homeActivities.length < 2 ||
    !insight.disclaimer
  ) {
    throw new Error("invalid_guardian_insight_shape");
  }

  return insight;
};

const createDeterministicGuardianInsight = (payload = {}) => {
  const sinhala = payload.locale !== "en-US";
  const noEvidence = payload.evidenceStatus !== "ready";
  const hasRetryConcern = Number(payload.metrics?.retryRate) >= 0.3;
  const errorPattern = payload.commonErrorPattern && payload.commonErrorPattern !== "none_observed"
    ? payload.commonErrorPattern.replaceAll("_", " ")
    : "sound patterns";

  if (sinhala) {
    return {
      summary: noEvidence
        ? "පැහැදිලි progress guide එකක් සකස් කිරීමට තව speech-reading උත්සාහ අවශ්‍යයි."
        : "ලැබී ඇති speech-reading සාක්ෂි අනුව කෙටි සහ නිතර පුහුණුව දිගටම කිරීම සුදුසුයි.",
      strengths: [
        noEvidence ? "දරුවා Leo පුහුණුව ආරම්භ කර ඇත." : "සම්පූර්ණ කළ පැහැදිලි උත්සාහ progress එක නිරීක්ෂණයට උපකාරී වේ.",
      ],
      focusAreas: [
        hasRetryConcern ? "හඬ පැහැදිලිව සහ නිහඬ පරිසරයක recording කිරීම." : `${errorPattern} සඳහා කෙටි පුහුණුව.`,
      ],
      homeActivities: [
        { title: "Sound basket", instruction: "එකම මුල් sound එක ඇති English words තුනක් එකට කියවන්න.", minutes: 5 },
        { title: "Echo reading", instruction: "Guardian එක් කෙටි English sentence එකක් කියවා දරුවාට නැවත කියවීමට දෙන්න.", minutes: 5 },
      ],
      disclaimer: "මෙය learning-support guide එකක් පමණි; diagnosis එකක් නොවේ.",
    };
  }

  return {
    summary: noEvidence
      ? "More speech-reading attempts are needed before a clear progress guide can be prepared."
      : "The available speech-reading evidence supports continuing short, regular practice.",
    strengths: [noEvidence ? "The child has started Leo practice." : "Completed clear attempts help monitor progress."],
    focusAreas: [hasRetryConcern ? "Record clearly in a quiet space." : `Use short practice for ${errorPattern}.`],
    homeActivities: [
      { title: "Sound basket", instruction: "Read three English words that start with the same sound.", minutes: 5 },
      { title: "Echo reading", instruction: "Read one short English sentence, then ask the child to repeat it.", minutes: 5 },
    ],
    disclaimer: "This is a learning-support guide, not a diagnosis.",
  };
};

const getOllamaGuardianConfig = (env = process.env) => ({
  enabled: String(env.OLLAMA_CLOUD_ENABLED || "false").toLowerCase() === "true",
  apiKey: env.OLLAMA_API_KEY || "",
  baseUrl: env.OLLAMA_BASE_URL || "https://ollama.com/api",
  model: env.OLLAMA_MODEL || "gpt-oss:20b",
  timeoutMs: Math.max(1000, Number(env.OLLAMA_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS),
});

const buildPrompt = (payload) => `You are Leo's Guardian Guide for a Grade 2-5 English speech-reading practice app.
Use only the aggregate JSON evidence below. Do not diagnose dyslexia, infer identity, or invent measurements.
Return one JSON object only with: summary (string), strengths (1-3 strings), focusAreas (1-3 strings), homeActivities (2-3 objects with title, instruction, minutes), disclaimer (string).
Write in ${payload.locale === "en-US" ? "plain English" : "simple parent-friendly Sinhala while keeping English task words in English"}.
Keep activities safe, low-cost, and 3-10 minutes long.
Evidence: ${JSON.stringify(payload)}`;

const generateGuardianInsight = async ({
  payload,
  fetchImpl = global.fetch,
  config = getOllamaGuardianConfig(),
} = {}) => {
  const fallback = createDeterministicGuardianInsight(payload);
  if (!config.enabled || !config.apiKey || !config.model || typeof fetchImpl !== "function") {
    return { status: "disabled", source: "deterministic_fallback", insight: fallback };
  }
  if (payload?.evidenceStatus !== "ready") {
    return { status: "insufficient_data", source: "deterministic_fallback", insight: fallback };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${String(config.baseUrl).replace(/\/$/, "")}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        messages: [{ role: "user", content: buildPrompt(payload) }],
        options: { temperature: 0.2 },
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`ollama_http_${response.status}`);
    const body = await response.json();
    const insight = parseGuardianInsightContent(body?.message?.content);
    return { status: "ready", source: "ollama_cloud", insight };
  } catch (error) {
    const code = error?.name === "AbortError" ? "timeout" : "unavailable";
    return { status: "fallback", source: "deterministic_fallback", reason: code, insight: fallback };
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  createDeterministicGuardianInsight,
  generateGuardianInsight,
  getOllamaGuardianConfig,
  parseGuardianInsightContent,
};
