export type SnapMode = "drag" | "commit";

type ResolveSnapMillisArgs = {
  candidateMillis: number;
  beatMapSec?: number[];
  bpm: number;
  phaseMillis: number;
  mode: SnapMode;
  snapThresholdMillis: number;
};

type ResolveFixedLoopFromBeatMapArgs = {
  startCandidateMillis: number;
  beatsPerLoop: number;
  beatMapSec: number[];
  durationMillis: number;
};

type ResolveBeatSpanFromBeatMapArgs = {
  startCandidateMillis: number;
  endCandidateMillis: number;
  beatMapSec: number[];
  durationMillis: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const clampIndex = (index: number, min: number, max: number) => {
  if (max < min) return min;
  return Math.floor(clamp(index, min, max));
};

const getLastBeatIndexWithinDuration = (
  beatMapSec: number[],
  durationMillis: number
): number => {
  if (beatMapSec.length === 0) return -1;
  if (!Number.isFinite(durationMillis) || durationMillis <= 0) {
    return beatMapSec.length - 1;
  }
  const durationSec = durationMillis / 1000;
  for (let i = beatMapSec.length - 1; i >= 0; i -= 1) {
    if (beatMapSec[i] <= durationSec + 1e-6) {
      return i;
    }
  }
  return -1;
};

export const findNearestBeatIndex = (
  valueSeconds: number,
  beatMapSec: number[]
): number => {
  if (beatMapSec.length === 0) return -1;
  let nearestIndex = 0;
  let nearestDiff = Math.abs(beatMapSec[0] - valueSeconds);
  for (let i = 1; i < beatMapSec.length; i += 1) {
    const diff = Math.abs(beatMapSec[i] - valueSeconds);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestIndex = i;
    }
  }
  return nearestIndex;
};

export const resolveSnapMillis = ({
  candidateMillis,
  beatMapSec,
  bpm,
  phaseMillis,
  mode,
  snapThresholdMillis,
}: ResolveSnapMillisArgs): number => {
  const threshold = Math.max(0, snapThresholdMillis);
  if (beatMapSec && beatMapSec.length > 0) {
    const nearestIndex = findNearestBeatIndex(candidateMillis / 1000, beatMapSec);
    if (nearestIndex === -1) return candidateMillis;
    const snappedMillis = beatMapSec[nearestIndex] * 1000;
    if (mode === "commit") return snappedMillis;
    return Math.abs(snappedMillis - candidateMillis) <= threshold
      ? snappedMillis
      : candidateMillis;
  }

  const safeBpm = Math.max(1, bpm);
  const beatMillis = 60000 / safeBpm;
  if (!Number.isFinite(beatMillis) || beatMillis <= 0) {
    return candidateMillis;
  }
  const beatsFromPhase = Math.round((candidateMillis - phaseMillis) / beatMillis);
  const snappedMillis = phaseMillis + beatsFromPhase * beatMillis;
  if (mode === "commit") return snappedMillis;
  return Math.abs(snappedMillis - candidateMillis) <= threshold
    ? snappedMillis
    : candidateMillis;
};

export const resolveFixedLoopFromBeatMap = ({
  startCandidateMillis,
  beatsPerLoop,
  beatMapSec,
  durationMillis,
}: ResolveFixedLoopFromBeatMapArgs): {
  startIndex: number;
  endIndex: number;
  startMillis: number;
  endMillis: number;
} | null => {
  if (beatMapSec.length === 0 || beatsPerLoop <= 0) return null;
  const roundedBeats = Math.max(1, Math.round(beatsPerLoop));
  const lastIndex = getLastBeatIndexWithinDuration(beatMapSec, durationMillis);
  if (lastIndex < 0) return null;
  const maxStartIndex = lastIndex - roundedBeats;
  if (maxStartIndex < 0) return null;

  const nearestStart = findNearestBeatIndex(startCandidateMillis / 1000, beatMapSec);
  const startIndex = clampIndex(nearestStart, 0, maxStartIndex);
  const endIndex = startIndex + roundedBeats;
  return {
    startIndex,
    endIndex,
    startMillis: beatMapSec[startIndex] * 1000,
    endMillis: beatMapSec[endIndex] * 1000,
  };
};

export const resolveBeatSpanFromBeatMap = ({
  startCandidateMillis,
  endCandidateMillis,
  beatMapSec,
  durationMillis,
}: ResolveBeatSpanFromBeatMapArgs): {
  startIndex: number;
  endIndex: number;
  beatCount: number;
  startMillis: number;
  endMillis: number;
} | null => {
  if (beatMapSec.length < 2) return null;
  const lastIndex = getLastBeatIndexWithinDuration(beatMapSec, durationMillis);
  if (lastIndex < 1) return null;

  let startIndex = clampIndex(
    findNearestBeatIndex(startCandidateMillis / 1000, beatMapSec),
    0,
    lastIndex - 1
  );
  let endIndex = clampIndex(
    findNearestBeatIndex(endCandidateMillis / 1000, beatMapSec),
    startIndex + 1,
    lastIndex
  );

  if (endIndex <= startIndex) {
    if (startIndex < lastIndex) {
      endIndex = startIndex + 1;
    } else {
      startIndex = lastIndex - 1;
      endIndex = lastIndex;
    }
  }

  return {
    startIndex,
    endIndex,
    beatCount: endIndex - startIndex,
    startMillis: beatMapSec[startIndex] * 1000,
    endMillis: beatMapSec[endIndex] * 1000,
  };
};
