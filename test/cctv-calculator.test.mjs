import test from "node:test";
import assert from "node:assert/strict";
import Calc from "../src/lib/cctv/calc.js";

const close = (actual, expected, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, "expected " + expected + ", got " + actual);

test("4 MP H.265 continuous stream estimates 3 Mbps and 32.4 GB/day", () => {
  const result = Calc.calculateGroup({
    qty: 1,
    resolution: "4MP",
    codec: "h265",
    fps: 15,
    scene: "medium",
    mode: "continuous",
    quality: "medium",
    nightIR: false,
    audio: false
  });
  close(result.mbps, 3);
  close(result.gbPerDayPerCam, 32.4);
});

test("SOP worked example returns the expected storage and recorder bandwidth", () => {
  const { project, groups } = Calc.exampleProject();
  const result = Calc.calculateProject(project, groups);
  close(result.totals.rawTB, 48.24);
  close(result.totals.requiredTB, 60.79);
  close(result.totals.aggregateMbps, 158);
  close(result.totals.minRecorderMbps, 225.71);
  assert.equal(result.recorders[0].array.totalDisks, 9);
  assert.notEqual(result.status, "critical");
});

test("measured bitrate overrides the generic planning estimate", () => {
  const result = Calc.calculateGroup({
    qty: 2,
    resolution: "8MP",
    codec: "h264",
    fps: 30,
    scene: "high",
    mode: "continuous",
    measuredMbps: "5"
  });
  assert.equal(result.measured, true);
  close(result.mbps, 5);
  close(result.aggregateMbps, 10);
});

test("PoE load is estimated for a fixed 4 MP IR camera", () => {
  const result = Calc.calculateGroup({
    qty: 4,
    resolution: "4MP",
    codec: "h265",
    fps: 15,
    scene: "medium",
    mode: "continuous",
    nightIR: true,
    poeW: ""
  });
  assert.ok(result.totalPoeW >= 24);
});
