import { analyzeBPM } from "../bpmAnalysis";

function makeClickTrack(
  bpm: number,
  durationSec: number,
  sampleRate: number
): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const buffer = new Float32Array(length);
  const intervalSamples = Math.floor((60 * sampleRate) / bpm);
  const pulseWidth = Math.max(1, Math.floor(sampleRate * 0.005));

  for (let i = 0; i < length; i += intervalSamples) {
    const end = Math.min(length, i + pulseWidth);
    for (let j = i; j < end; j += 1) {
      buffer[j] = 1;
    }
  }

  return buffer;
}

describe("analyzeBPM", () => {
  it("estimates tempo from a steady click track", async () => {
    const sampleRate = 8000;
    const targetBpm = 120;
    const buffer = makeClickTrack(targetBpm, 8, sampleRate);

    const result = await analyzeBPM(buffer, sampleRate);

    expect(result.bpm).toBeGreaterThan(0);
    expect(Math.abs(result.bpm - targetBpm)).toBeLessThan(5);
    expect(result.confidence).toBeGreaterThan(0.4);
    expect(result.beatTimesSec.length).toBeGreaterThan(5);
  });
});
