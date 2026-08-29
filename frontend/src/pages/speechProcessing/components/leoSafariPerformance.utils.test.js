import assert from "node:assert/strict";
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
      antialias: false,
      dpr: 1,
      effects: false,
      frameloop: "demand",
      powerPreference: "low-power",
      shadows: false,
    }
  );
});

test("standard quality animates only while the map is active", () => {
  assert.deepEqual(
    getSafariRenderSettings({ quality: "standard", recording: false, active: true }),
    {
      antialias: true,
      dpr: [1, 1.5],
      effects: true,
      frameloop: "always",
      powerPreference: "high-performance",
      shadows: true,
    }
  );
  assert.equal(
    getSafariRenderSettings({ quality: "standard", recording: true, active: true }).frameloop,
    "demand"
  );
  assert.equal(
    getSafariRenderSettings({ quality: "standard", recording: true, active: true }).shadows,
    false
  );
});
