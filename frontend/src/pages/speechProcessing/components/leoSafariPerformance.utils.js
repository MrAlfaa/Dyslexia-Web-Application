const MOBILE_VIEWPORT_MAX = 768;
const LOW_MEMORY_MAX_GB = 2;

export function getLeoGuideOffset(viewportWidth) {
  return Number.isFinite(viewportWidth) && viewportWidth <= MOBILE_VIEWPORT_MAX
    ? -0.55
    : -1.4;
}

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
  const lowQuality = quality === "low" || recording;
  const paused = recording || !active;

  return {
    dpr: lowQuality ? 1 : [1, 1.5],
    effects: !lowQuality,
    frameloop: lowQuality || paused ? "demand" : "always",
    shadows: !lowQuality,
  };
}

export function readSafariCapabilities({
  browserWindow = globalThis.window,
  browserDocument = globalThis.document,
  browserNavigator = globalThis.navigator,
} = {}) {
  if (!browserWindow || !browserDocument) {
    return {
      webgl: false,
      reducedMotion: true,
      deviceMemory: undefined,
      viewportWidth: 0,
    };
  }

  let webgl = false;
  try {
    const canvas = browserDocument.createElement("canvas");
    webgl = Boolean(
      browserWindow.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    webgl = false;
  }

  return {
    webgl,
    reducedMotion:
      browserWindow.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
    deviceMemory: browserNavigator?.deviceMemory,
    viewportWidth: browserWindow.innerWidth,
  };
}
