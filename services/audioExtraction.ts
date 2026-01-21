import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

type ExtractionOptions = {
  maxDurationSec?: number;
  sampleRate?: number;
};

const DEFAULT_MAX_DURATION_SEC = 75;
const DEFAULT_SAMPLE_RATE = 22050;

const getAudioContextCtor = () => {
  const globalAny = globalThis as typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return globalAny.AudioContext ?? globalAny.webkitAudioContext ?? null;
};

const base64ToArrayBuffer = (base64: string) => {
  if (typeof atob !== 'function') {
    throw new Error('Base64 decoding is unavailable in this environment');
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const loadVideoBytes = async (videoUri: string): Promise<ArrayBuffer> => {
  try {
    const info = await FileSystem.getInfoAsync(videoUri);
    if (info.exists) {
      const base64 = await FileSystem.readAsStringAsync(info.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64ToArrayBuffer(base64);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('Audio extraction: FileSystem read failed, falling back to fetch', error);
    }
  }

  const response = await fetch(videoUri);
  if (!response.ok) {
    throw new Error(`Failed to load video data (status ${response.status})`);
  }
  return response.arrayBuffer();
};

const assertAudioTrack = async (videoUri: string) => {
  let sound: Audio.Sound | null = null;
  try {
    const result = await Audio.Sound.createAsync(
      { uri: videoUri },
      { shouldPlay: false }
    );
    sound = result.sound;
    const status = result.status as AVPlaybackStatus;
    if (!status.isLoaded) {
      const errorMessage = status.error ?? 'Video contains no audio track';
      throw new Error(errorMessage);
    }
    if (status.durationMillis === 0) {
      throw new Error('Video contains no audio track');
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unsupported video format or missing audio track';
    if (/no audio/i.test(message)) {
      throw new Error('Video contains no audio track');
    }
    throw new Error(`Unsupported video format or missing audio track: ${message}`);
  } finally {
    if (sound) {
      await sound.unloadAsync();
    }
  }
};

const toMono = (buffer: AudioBuffer, maxDurationSec: number): Float32Array => {
  const durationSec = Math.min(buffer.duration, maxDurationSec);
  const sampleCount = Math.max(0, Math.floor(durationSec * buffer.sampleRate));
  if (sampleCount === 0) {
    return new Float32Array();
  }

  if (buffer.numberOfChannels <= 1) {
    return buffer.getChannelData(0).slice(0, sampleCount);
  }

  const channels = buffer.numberOfChannels;
  const output = new Float32Array(sampleCount);
  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < sampleCount; i += 1) {
      output[i] += data[i] ?? 0;
    }
  }
  for (let i = 0; i < sampleCount; i += 1) {
    output[i] /= channels;
  }
  return output;
};

const resampleLinear = (
  input: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array => {
  if (sourceRate === targetRate) {
    return input.slice();
  }
  if (input.length === 0) {
    return new Float32Array();
  }
  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(leftIndex + 1, input.length - 1);
    const fraction = position - leftIndex;
    output[i] =
      input[leftIndex] * (1 - fraction) + input[rightIndex] * fraction;
  }
  return output;
};

export async function extractAudioFromVideo(
  videoUri: string,
  options: ExtractionOptions = {}
): Promise<{
  audioBuffer: Float32Array;
  sampleRate: number;
  durationSec: number;
}> {
  const maxDurationSec = options.maxDurationSec ?? DEFAULT_MAX_DURATION_SEC;
  const targetSampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;

  if (!videoUri) {
    throw new Error('A video URI is required for audio extraction');
  }
  if (maxDurationSec <= 0) {
    throw new Error('maxDurationSec must be greater than 0');
  }
  if (targetSampleRate <= 0) {
    throw new Error('sampleRate must be greater than 0');
  }

  const audioContextCtor = getAudioContextCtor();
  if (!audioContextCtor) {
    await assertAudioTrack(videoUri);
    throw new Error(
      'Audio extraction requires Web Audio API support; add a native decoder for this platform'
    );
  }

  const audioContext = new audioContextCtor();
  try {
    const bytes = await loadVideoBytes(videoUri);
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      audioContext.decodeAudioData(
        bytes.slice(0),
        (decoded) => resolve(decoded),
        (error) => reject(error ?? new Error('Failed to decode audio data'))
      );
    });

    if (!audioBuffer.numberOfChannels) {
      throw new Error('Video contains no audio track');
    }

    const mono = toMono(audioBuffer, maxDurationSec);
    if (!mono.length) {
      throw new Error('Video contains no audio track');
    }

    const resampled = resampleLinear(mono, audioBuffer.sampleRate, targetSampleRate);
    return {
      audioBuffer: resampled,
      sampleRate: targetSampleRate,
      durationSec: resampled.length / targetSampleRate,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unsupported video format or missing audio track';
    if (/no audio/i.test(message)) {
      throw new Error('Video contains no audio track');
    }
    throw new Error(`Unsupported video format or audio extraction failed: ${message}`);
  } finally {
    await audioContext.close();
  }
}
