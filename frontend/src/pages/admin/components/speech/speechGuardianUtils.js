export const supportLabels = {
  low_support: "Low Support",
  medium_support: "Medium Support",
  high_support: "High Support",
  unknown: "Unknown",
};

export const formatPercent = (value) =>
  value === undefined || value === null || Number.isNaN(Number(value))
    ? "-"
    : `${Math.round(Number(value) * 100)}%`;

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

export const activityTitle = (activity) => activity?.title || "Not selected";

export const activityById = (activities = [], id) =>
  activities.find((activity) => activity.activityId === id);
