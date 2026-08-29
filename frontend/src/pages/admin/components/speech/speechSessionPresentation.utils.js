const SESSION_TABS = [
  { id: "summary", label: "guardian_session_tab_summary" },
  { id: "recording", label: "guardian_session_tab_recording" },
  { id: "word_sound", label: "guardian_session_tab_word_sound" },
];

export const buildSessionTabs = ({ isSuperAdmin = false } = {}) => {
  const tabs = SESSION_TABS.map((tab) => ({ ...tab, visible: true }));

  if (isSuperAdmin) {
    tabs.push({
      id: "technical",
      label: "guardian_session_tab_technical",
      visible: true,
    });
  }

  return tabs;
};

export const summarizeSessionQuality = (session = {}) => {
  const attempts = Array.isArray(session.attempts) ? session.attempts : [];
  const counts = attempts.reduce(
    (summary, attempt) => {
      const label = attempt.audioQuality?.qualityLabel;
      if (label === "good") summary.good += 1;
      else if (label === "fair") summary.fair += 1;
      else if (label === "poor") summary.poor += 1;
      if (attempt.validAudio === false || label === "invalid") summary.unusable += 1;
      return summary;
    },
    { total: attempts.length, good: 0, fair: 0, poor: 0, unusable: 0 }
  );

  const status = counts.unusable > 0
    ? "review"
    : counts.good > 0
      ? "good"
      : counts.fair > 0
        ? "fair"
        : counts.poor > 0
          ? "poor"
          : "unavailable";

  return { ...counts, status };
};

export const getAttemptPlaybackUrl = (attempt = {}, apiOrigin = "http://localhost:5000") => {
  const value = attempt.audioStorage?.originalSecureUrl || attempt.audioUrl || "";
  if (!value || typeof value !== "string") return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${apiOrigin}${value.startsWith("/") ? value : `/${value}`}`;
};

export const isSessionActionCurrent = ({
  sequence,
  currentSequence,
  childId,
  currentChildId,
  sessionId,
  currentSession,
}) =>
  sequence === currentSequence &&
  childId === currentChildId &&
  Boolean(currentSession) &&
  currentSession._id === sessionId;
