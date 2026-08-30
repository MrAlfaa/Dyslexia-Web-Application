export const formatStatusBadgeLabel = (value) => {
  if (!value) return "Unknown";
  const normalized = String(value).trim().replaceAll(/[_-]+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};
