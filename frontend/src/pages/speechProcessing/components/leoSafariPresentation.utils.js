const PLAYABLE_PRIMARY_STATES = new Set(["current", "available"]);
const REPLAY_STATES = new Set(["completed", "replay"]);
const PRESENTATION_STATES = new Set(["current", "available", "completed", "replay", "locked"]);

const getRecommendedActivityId = (recommendation) =>
  recommendation?.nextActivityId || recommendation?.nextActivity?.activityId || null;

const normalizeZone = (activity) => {
  const backendState = activity?.state || "locked";
  const recognizedState = PRESENTATION_STATES.has(backendState)
    ? backendState
    : "locked";
  const state = REPLAY_STATES.has(recognizedState) ? "replay" : recognizedState;

  return {
    ...activity,
    backendState,
    state,
    stateLabelKey: `safari_zone_${state}`,
    isPrimary: false,
    canStart: PLAYABLE_PRIMARY_STATES.has(state),
    replayAction: state === "replay"
      ? {
          activityId: activity.activityId,
          kind: "replay",
          labelKey: "safari_replay_activity",
          countsTowardCompletion: false,
        }
      : null,
  };
};

export function buildSafariPresentation({
  activities = [],
  recommendation = null,
  checkpointDue = false,
} = {}) {
  const recommendedActivityId = getRecommendedActivityId(recommendation);
  const normalizedZones = Array.isArray(activities)
    ? activities.filter(Boolean).map(normalizeZone)
    : [];
  const primaryZone = normalizedZones.find(
    (zone) =>
      zone.activityId === recommendedActivityId &&
      PLAYABLE_PRIMARY_STATES.has(zone.state)
  );
  const zones = normalizedZones.map((zone) => ({
    ...zone,
    isPrimary: zone.activityId === primaryZone?.activityId,
  }));
  const replayActivities = zones.filter((zone) => zone.state === "replay");
  const primaryAction = primaryZone
    ? {
        ...zones.find((zone) => zone.activityId === primaryZone.activityId),
        kind: checkpointDue ? "checkpoint" : "activity",
        labelKey: checkpointDue
          ? "safari_start_trail_check"
          : "safari_play_leos_pick",
      }
    : null;

  let trailMessage = "safari_trail_waiting";
  if (checkpointDue) {
    trailMessage = "safari_trail_checkpoint_ready";
  } else if (primaryAction) {
    trailMessage = "safari_trail_continue";
  } else if (zones.length > 0 && replayActivities.length === zones.length) {
    trailMessage = "safari_trail_complete";
  }

  return {
    zones,
    primaryAction,
    replayActivities,
    trailMessage,
  };
}
