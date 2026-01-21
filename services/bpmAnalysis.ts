const DEFAULT_ANALYSIS_DURATION_SEC = 60;
const FRAME_SIZE = 1024;
const HOP_SIZE = 512;
const MIN_BPM = 60;
const MAX_BPM = 200;
const ONSET_THRESHOLD_RATIO = 0.3;
const MICRO_ADJUST_WINDOW_SEC = 0.05;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function normalizeTempoWithPrior(
  rawBpm: number,
  confidence: number,
  beatAlignmentScores?: { bpm: number; score: number }[]
): {
  normalizedBpm: number;
  tempoFamily: number[];
  reasoning: string;
} {
  const candidates = [rawBpm, rawBpm / 2, rawBpm * 2];

  const getPriorScore = (bpm: number) => {
    if (bpm >= 80 && bpm <= 130) return 1.0;
    if (bpm >= 60 && bpm < 80) return 0.7;
    if (bpm > 130 && bpm <= 160) return 0.6;
    if (bpm > 160 && bpm <= 200) return 0.3;
    return 0.1;
  };

  const getAlignmentScore = (bpm: number) => {
    if (!beatAlignmentScores || beatAlignmentScores.length === 0) return 0;
    let bestScore = 0;
    let closestDiff = Number.POSITIVE_INFINITY;

    for (let i = 0; i < beatAlignmentScores.length; i += 1) {
      const entry = beatAlignmentScores[i];
      const diff = Math.abs(entry.bpm - bpm);
      if (diff < closestDiff) {
        closestDiff = diff;
        bestScore = entry.score;
      }
    }

    return closestDiff <= 1 ? bestScore : 0;
  };

  let bestCandidate = candidates[0];
  let bestScore = -Infinity;
  const scoreDetails: string[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const priorScore = getPriorScore(candidate);
    const alignmentScore = getAlignmentScore(candidate);
    const combinedScore = priorScore + alignmentScore;
    scoreDetails.push(
      `${candidate.toFixed(2)}(prior=${priorScore.toFixed(2)},align=${alignmentScore.toFixed(2)},score=${combinedScore.toFixed(2)})`
    );

    if (
      combinedScore > bestScore ||
      (combinedScore === bestScore &&
        Math.abs(candidate - rawBpm) < Math.abs(bestCandidate - rawBpm))
    ) {
      bestScore = combinedScore;
      bestCandidate = candidate;
    }
  }

  const reasoning = `raw=${rawBpm.toFixed(2)}, conf=${confidence.toFixed(2)}, candidates=${scoreDetails.join(", ")}, chosen=${bestCandidate.toFixed(2)}`;

  return {
    normalizedBpm: bestCandidate,
    tempoFamily: candidates,
    reasoning,
  };
}

function computeFrameEnergies(
  buffer: Float32Array,
  frameSize: number,
  hopSize: number
): number[] {
  const frameCount = Math.floor((buffer.length - frameSize) / hopSize) + 1;
  const energies = new Array(frameCount);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const start = frameIndex * hopSize;
    let sumSquares = 0;

    for (let i = 0; i < frameSize; i += 1) {
      const sample = buffer[start + i];
      sumSquares += sample * sample;
    }

    energies[frameIndex] = Math.sqrt(sumSquares / frameSize);
  }

  return energies;
}

function computeOnsetFunction(energies: number[]): { onset: number[]; maxOnset: number } {
  if (energies.length < 2) {
    return { onset: [], maxOnset: 0 };
  }

  const onset = new Array(energies.length - 1);
  let maxOnset = 0;

  for (let i = 1; i < energies.length; i += 1) {
    const diff = energies[i] - energies[i - 1];
    const value = diff > 0 ? diff : 0;
    onset[i - 1] = value;
    if (value > maxOnset) {
      maxOnset = value;
    }
  }

  if (maxOnset > 0) {
    for (let i = 0; i < onset.length; i += 1) {
      onset[i] = onset[i] / maxOnset;
    }
  }

  return { onset, maxOnset };
}

function computeAutocorrelation(onset: number[], minLag: number, maxLag: number): number[] {
  const autocorrelation = new Array(maxLag - minLag + 1).fill(0);

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    const limit = onset.length - lag;
    for (let i = 0; i < limit; i += 1) {
      sum += onset[i] * onset[i + lag];
    }
    autocorrelation[lag - minLag] = sum;
  }

  return autocorrelation;
}

function pickBestLag(
  autocorrelation: number[],
  minLag: number
): { lag: number; peak: number; peakContrast: number } {
  let maxPeak = 0;
  let maxIndex = 0;
  let sum = 0;

  for (let i = 0; i < autocorrelation.length; i += 1) {
    const value = autocorrelation[i];
    sum += value;
    if (value > maxPeak) {
      maxPeak = value;
      maxIndex = i;
    }
  }

  const mean = autocorrelation.length > 0 ? sum / autocorrelation.length : 0;
  const peakContrast = maxPeak > 0 ? (maxPeak - mean) / maxPeak : 0;

  return {
    lag: minLag + maxIndex,
    peak: maxPeak,
    peakContrast: clamp(peakContrast, 0, 1),
  };
}

function collectOnsetTimes(
  onset: number[],
  sampleRate: number,
  hopSize: number,
  threshold: number
): number[] {
  const times: number[] = [];

  for (let i = 0; i < onset.length; i += 1) {
    if (onset[i] >= threshold) {
      const timeSec = ((i + 1) * hopSize) / sampleRate;
      times.push(timeSec);
    }
  }

  return times;
}

function buildBeatTimes(
  startTime: number,
  intervalSec: number,
  durationSec: number,
  onsetTimes: number[]
): number[] {
  const beatTimes: number[] = [];

  if (intervalSec <= 0) {
    return beatTimes;
  }

  let onsetIndex = 0;

  for (let i = 0; ; i += 1) {
    const beatTime = startTime + i * intervalSec;
    if (beatTime > durationSec) {
      break;
    }

    let adjusted = beatTime;

    if (onsetTimes.length > 0) {
      while (onsetIndex + 1 < onsetTimes.length && onsetTimes[onsetIndex + 1] <= beatTime) {
        onsetIndex += 1;
      }

      const prev = onsetTimes[onsetIndex];
      const next = onsetIndex + 1 < onsetTimes.length ? onsetTimes[onsetIndex + 1] : prev;
      const nearest =
        Math.abs(prev - beatTime) <= Math.abs(next - beatTime) ? prev : next;

      if (Math.abs(nearest - beatTime) <= MICRO_ADJUST_WINDOW_SEC) {
        adjusted = nearest;
      }
    }

    if (beatTimes.length > 0 && adjusted <= beatTimes[beatTimes.length - 1]) {
      adjusted = beatTime;
    }

    beatTimes.push(adjusted);
  }

  return beatTimes;
}

export async function analyzeBPM(
  audioBuffer: Float32Array,
  sampleRate: number
): Promise<{
  bpm: number;
  confidence: number;
  beatTimesSec: number[];
  tempoFamilyCandidates?: number[];
}> {
  if (audioBuffer.length === 0 || sampleRate <= 0) {
    return {
      bpm: 0,
      confidence: 0,
      beatTimesSec: [],
      tempoFamilyCandidates: [],
    };
  }

  const totalDurationSec = audioBuffer.length / sampleRate;
  const analysisDurationSec = Math.min(totalDurationSec, DEFAULT_ANALYSIS_DURATION_SEC);
  const analysisSamples = Math.floor(analysisDurationSec * sampleRate);
  const analysisBuffer = audioBuffer.subarray(0, analysisSamples);

  if (analysisBuffer.length < FRAME_SIZE * 2) {
    return {
      bpm: 0,
      confidence: 0,
      beatTimesSec: [],
      tempoFamilyCandidates: [],
    };
  }

  const energies = computeFrameEnergies(analysisBuffer, FRAME_SIZE, HOP_SIZE);
  const energyMean = energies.reduce((sum, value) => sum + value, 0) / energies.length;
  const energyVariance =
    energies.reduce((sum, value) => sum + (value - energyMean) ** 2, 0) / energies.length;
  const energyStd = Math.sqrt(energyVariance);

  if (energyMean < 1e-4 || energyStd < 1e-4) {
    return {
      bpm: 0,
      confidence: 0,
      beatTimesSec: [],
      tempoFamilyCandidates: [],
    };
  }

  const { onset, maxOnset } = computeOnsetFunction(energies);
  if (onset.length === 0 || maxOnset === 0) {
    return {
      bpm: 0,
      confidence: 0,
      beatTimesSec: [],
      tempoFamilyCandidates: [],
    };
  }

  const minLag = Math.max(
    1,
    Math.floor((60 * sampleRate) / (MAX_BPM * HOP_SIZE))
  );
  const maxLag = Math.min(
    onset.length - 2,
    Math.ceil((60 * sampleRate) / (MIN_BPM * HOP_SIZE))
  );

  if (maxLag <= minLag) {
    return {
      bpm: 0,
      confidence: 0,
      beatTimesSec: [],
      tempoFamilyCandidates: [],
    };
  }

  const autocorrelation = computeAutocorrelation(onset, minLag, maxLag);
  const { lag, peakContrast } = pickBestLag(autocorrelation, minLag);
  const rawBpm = (60 * sampleRate) / (HOP_SIZE * lag);
  const dynamic = clamp(energyStd / (energyMean + 1e-6), 0, 1);
  const confidence = clamp(peakContrast * dynamic, 0, 1);
  const normalization = normalizeTempoWithPrior(rawBpm, confidence);
  const normalizedBpm =
    Number.isFinite(normalization.normalizedBpm) && normalization.normalizedBpm > 0
      ? normalization.normalizedBpm
      : rawBpm;

  const onsetThreshold = ONSET_THRESHOLD_RATIO;
  const onsetTimes = collectOnsetTimes(onset, sampleRate, HOP_SIZE, onsetThreshold);
  const startTime = onsetTimes.length > 0 ? onsetTimes[0] : 0;
  const beatTimesSec = buildBeatTimes(
    startTime,
    60 / normalizedBpm,
    totalDurationSec,
    onsetTimes
  );

  const tempoFamilyCandidates =
    normalizedBpm > 0 ? normalization.tempoFamily : [];

  return {
    bpm: normalizedBpm,
    confidence,
    beatTimesSec,
    tempoFamilyCandidates,
  };
}
