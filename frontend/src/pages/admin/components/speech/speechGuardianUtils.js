export const supportLabels = {
  low_support: "Low support need",
  medium_support: "Medium support need",
  high_support: "High support need",
  unknown: "Unknown",
};

export const formatPercent = (value) =>
  value === undefined || value === null || Number.isNaN(Number(value))
    ? "-"
    : `${Math.round(Number(value) * 100)}%`;

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

export const formatSpeechLabel = (value, fallback = "-") => {
  if (!value) return fallback;
  const normalized = String(value).trim().replaceAll(/[_-]+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const activityTitle = (activity) => activity?.title || "Not selected";

export const activityById = (activities = [], id) =>
  activities.find((activity) => activity.activityId === id);
