const PLAYABLE_PRIMARY_STATES = new Set(["current", "available"]);
const REPLAY_STATES = new Set(["completed", "replay"]);
const PRESENTATION_STATES = new Set(["current", "available", "completed", "replay", "locked"]);

const getRecommendedActivityId = (recommendation) => {
  const activityId =
    recommendation?.nextActivityId ?? recommendation?.nextActivity?.activityId;

  return typeof activityId === "string" && activityId.trim()
    ? activityId.trim()
    : null;
};

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
  const primaryMatches = recommendedActivityId
    ? normalizedZones
        .map((zone, index) => ({ zone, index }))
        .filter(
          ({ zone }) =>
            zone.activityId === recommendedActivityId &&
            PLAYABLE_PRIMARY_STATES.has(zone.state)
        )
    : [];
  const primaryMatch = primaryMatches.length === 1 ? primaryMatches[0] : null;
  const zones = normalizedZones.map((zone, index) => ({
    ...zone,
    isPrimary: index === primaryMatch?.index,
  }));
  const replayActivities = zones.filter((zone) => zone.state === "replay");
  const primaryAction = primaryMatch
    ? {
        ...zones[primaryMatch.index],
        kind: checkpointDue ? "checkpoint" : "activity",
        labelKey: checkpointDue
          ? "safari_start_trail_check"
          : "safari_play_leos_pick",
      }
    : null;

  let trailMessage = "safari_trail_waiting";
  if (checkpointDue && primaryAction) {
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
