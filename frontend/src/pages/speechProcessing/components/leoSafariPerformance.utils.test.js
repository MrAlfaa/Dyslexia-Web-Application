import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getLeoGuideOffset,
  getSafariQuality,
  getSafariRenderSettings,
} from "./leoSafariPerformance.utils.js";

test("the 3D Leo guide stays inside narrow safari viewports", () => {
  assert.equal(getLeoGuideOffset(390), -0.55);
  assert.equal(getLeoGuideOffset(768), -0.55);
  assert.equal(getLeoGuideOffset(769), -1.4);
  assert.equal(getLeoGuideOffset(1366), -1.4);
});

test("recording and constrained devices reduce rendering quality", () => {
  assert.equal(
    getSafariQuality({
      webgl: true,
      reducedMotion: false,
      recording: true,
      deviceMemory: 8,
      viewportWidth: 1366,
    }),
    "low"
  );
  assert.equal(
    getSafariQuality({
      webgl: true,
      reducedMotion: false,
      recording: false,
      deviceMemory: 2,
      viewportWidth: 1366,
    }),
    "low"
  );
  assert.equal(
    getSafariQuality({
      webgl: true,
      reducedMotion: false,
      recording: false,
      deviceMemory: 8,
      viewportWidth: 640,
    }),
    "low"
  );
});

test("missing WebGL or reduced motion uses the complete fallback", () => {
  assert.equal(getSafariQuality({ webgl: false }), "fallback");
  assert.equal(getSafariQuality({ webgl: true, reducedMotion: true }), "fallback");
});

test("capable devices use standard rendering quality", () => {
  assert.equal(
    getSafariQuality({
      webgl: true,
      reducedMotion: false,
      recording: false,
      deviceMemory: 8,
      viewportWidth: 1366,
    }),
    "standard"
  );
});

test("low quality renders on demand without shadows or visual effects", () => {
  assert.deepEqual(
    getSafariRenderSettings({ quality: "low", recording: false, active: true }),
    {
      dpr: 1,
      effects: false,
      frameloop: "demand",
      shadows: false,
    }
  );
});

test("standard quality animates while active and recording lowers dynamic settings", () => {
  assert.deepEqual(
    getSafariRenderSettings({ quality: "standard", recording: false, active: true }),
    {
      dpr: [1, 1.5],
      effects: true,
      frameloop: "always",
      shadows: true,
    }
  );
  assert.deepEqual(
    getSafariRenderSettings({ quality: "standard", recording: true, active: true }),
    {
      dpr: 1,
      effects: false,
      frameloop: "demand",
      shadows: false,
    }
  );
});

test("the live training route owns adaptive quality and keeps authoritative actions", async () => {
  const routeSource = await readFile(
    new URL("../LeoTrainingSafari.jsx", import.meta.url),
    "utf8"
  );

  assert.match(routeSource, /getSafariQuality/);
  assert.match(routeSource, /quality === "fallback"/);
  assert.match(routeSource, /zones=\{presentation\.zones\}/);
  assert.match(routeSource, /quality=\{quality\}/);
  assert.match(routeSource, /checkpointDue=\{authoritativeCheckpointDue\}/);
  assert.match(routeSource, /onClick=\{\(\) => requestActivity\(primaryAction\)\}/);
  assert.match(routeSource, /onReplay=\{requestActivity\}/);
});

test("recording pauses compact-map descendant animations", async () => {
  const [activitySource, identificationSource, globalCss] = await Promise.all([
    readFile(new URL("./LeoActivityPlay.jsx", import.meta.url), "utf8"),
    readFile(new URL("../LeoIdentificationGame.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../../index.css", import.meta.url), "utf8"),
  ]);

  assert.match(activitySource, /recording-animations-paused/);
  assert.match(identificationSource, /recording-animations-paused/);
  assert.match(
    globalCss,
    /\.recording-animations-paused[\s\S]*animation-play-state:\s*paused\s*!important/
  );
});

test("the safari renders a procedural recording-aware 3D Leo", async () => {
  const leoComponentUrl = new URL("./ProceduralLeo3D.jsx", import.meta.url);
  assert.equal(existsSync(leoComponentUrl), true, "ProceduralLeo3D.jsx must exist");

  const [mapSource, leoSource] = await Promise.all([
    readFile(new URL("./LeoSafari3DMap.jsx", import.meta.url), "utf8"),
    readFile(leoComponentUrl, "utf8"),
  ]);

  assert.match(mapSource, /import ProceduralLeo3D from "\.\/ProceduralLeo3D"/);
  assert.match(mapSource, /<ProceduralLeo3D/);
  assert.doesNotMatch(mapSource, /Billboard|useTexture|leoImage/);
  assert.match(mapSource, /shadows=\{renderSettings\.shadows \? "basic" : false\}/);
  assert.match(leoSource, /useFrame/);
  assert.match(leoSource, /sphereGeometry/);
  assert.match(leoSource, /capsuleGeometry/);
  assert.match(leoSource, /tubeGeometry/);
  assert.match(leoSource, /recording/);
});
