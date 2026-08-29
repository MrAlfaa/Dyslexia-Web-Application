const ALLOWED_STATES = new Set(["current", "available", "completed", "replay"]);

const getLeoActivityAccess = ({ activities = [], activityId } = {}) => {
  const activity = activities.find((item) => item.activityId === activityId);
  if (!activity) {
    return {
      allowed: false,
      state: "unknown",
      lockReason: "Leo could not find this activity.",
    };
  }

  return {
    allowed: ALLOWED_STATES.has(activity.state),
    state: activity.state,
    lockReason: activity.lockReason || "Complete the activity shown as Leo's Pick first.",
  };
};

module.exports = { getLeoActivityAccess };
