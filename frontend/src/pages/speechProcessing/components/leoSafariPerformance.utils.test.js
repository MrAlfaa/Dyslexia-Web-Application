import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getSafariQuality,
  getSafariRenderSettings,
} from "./leoSafariPerformance.utils.js";

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
