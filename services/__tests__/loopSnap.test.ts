import {
  findNearestBeatIndex,
  resolveBeatSpanFromBeatMap,
  resolveFixedLoopFromBeatMap,
  resolveSnapMillis,
} from "../loopSnap";

describe("loopSnap helpers", () => {
  const beatMapSec = [0, 0.5, 1.0, 1.5, 2.0, 2.5];

  it("finds nearest beat index", () => {
    expect(findNearestBeatIndex(0.26, beatMapSec)).toBe(1);
    expect(findNearestBeatIndex(1.74, beatMapSec)).toBe(3);
  });

  it("keeps drag continuous unless within threshold", () => {
    const far = resolveSnapMillis({
      candidateMillis: 690,
      beatMapSec,
      bpm: 120,
      phaseMillis: 0,
      mode: "drag",
      snapThresholdMillis: 40,
    });
    const near = resolveSnapMillis({
      candidateMillis: 485,
      beatMapSec,
      bpm: 120,
      phaseMillis: 0,
      mode: "drag",
      snapThresholdMillis: 40,
    });

    expect(far).toBe(690);
    expect(near).toBe(500);
  });

  it("always snaps on commit", () => {
    const value = resolveSnapMillis({
      candidateMillis: 690,
      beatMapSec,
      bpm: 120,
      phaseMillis: 0,
      mode: "commit",
      snapThresholdMillis: 10,
    });
    expect(value).toBe(500);
  });

  it("falls back to phase-aware grid when beat map is missing", () => {
    const value = resolveSnapMillis({
      candidateMillis: 1175,
      beatMapSec: [],
      bpm: 120,
      phaseMillis: 250,
      mode: "commit",
      snapThresholdMillis: 0,
    });
    expect(value).toBe(1250);
  });

  it("keeps fixed beat counts from beat map and clamps near the tail", () => {
    const loop = resolveFixedLoopFromBeatMap({
      startCandidateMillis: 2400,
      beatsPerLoop: 3,
      beatMapSec,
      durationMillis: 2600,
    });
    expect(loop).not.toBeNull();
    expect(loop?.startIndex).toBe(2);
    expect(loop?.endIndex).toBe(5);
    expect(loop?.endMillis).toBe(2500);
  });

  it("resolves a valid beat span for handle edits", () => {
    const span = resolveBeatSpanFromBeatMap({
      startCandidateMillis: 520,
      endCandidateMillis: 1480,
      beatMapSec,
      durationMillis: 2600,
    });
    expect(span).not.toBeNull();
    expect(span?.startIndex).toBe(1);
    expect(span?.endIndex).toBe(3);
    expect(span?.beatCount).toBe(2);
  });
});
