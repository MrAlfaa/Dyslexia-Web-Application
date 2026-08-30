export const formatSupportScore = (value, unavailable = "Not calibrated") => {
  if (value === null || value === undefined || value === "") return unavailable;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${Math.round(parsed * 100)}%` : unavailable;
};

export const resolveAttemptAsrProvider = (attempt = {}, unavailable = "Not available") =>
  attempt.wordReading?.asrProvider || attempt.sentenceReading?.asrProvider || unavailable;
