const hasMetric = (value) =>
  value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

export const createLatestRequestTracker = () => {
  let sequence = 0;

  return {
    next() {
      sequence += 1;
      return sequence;
    },
    isCurrent(requestId) {
      return requestId === sequence;
    },
    invalidate() {
      sequence += 1;
    },
  };
};

export const getSentenceDeltaDetails = (baselineValue, currentValue, lowerIsBetter) => {
  if (!hasMetric(baselineValue) || !hasMetric(currentValue)) return null;

  const delta = Number(currentValue) - Number(baselineValue);
  const percentagePoints = Math.round(Math.abs(delta) * 100);
  if (percentagePoints === 0) {
    return { direction: "unchanged", percentagePoints: 0, improved: false };
  }

  return {
    direction: delta > 0 ? "higher" : "lower",
    percentagePoints,
    improved: lowerIsBetter ? delta < 0 : delta > 0,
  };
};
