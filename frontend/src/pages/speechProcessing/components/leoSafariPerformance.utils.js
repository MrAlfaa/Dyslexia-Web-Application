const MOBILE_VIEWPORT_MAX = 768;
const LOW_MEMORY_MAX_GB = 2;

export function getSafariQuality({
  webgl = false,
  reducedMotion = false,
  deviceMemory,
  viewportWidth,
  recording = false,
} = {}) {
  if (!webgl || reducedMotion) return "fallback";

  const constrainedMemory =
    Number.isFinite(deviceMemory) && deviceMemory <= LOW_MEMORY_MAX_GB;
  const mobileViewport =
    Number.isFinite(viewportWidth) && viewportWidth <= MOBILE_VIEWPORT_MAX;

  if (recording || constrainedMemory || mobileViewport) return "low";

  return "standard";
}

export function getSafariRenderSettings({
  quality = "standard",
  recording = false,
  active = true,
} = {}) {
  const lowQuality = quality === "low";
  const paused = recording || !active;

  return {
    antialias: !lowQuality,
    dpr: lowQuality ? 1 : [1, 1.5],
    effects: !lowQuality,
    frameloop: lowQuality || paused ? "demand" : "always",
    powerPreference: lowQuality ? "low-power" : "high-performance",
    shadows: !lowQuality && !recording,
  };
}
