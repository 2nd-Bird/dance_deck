export type VideoSourceType = 'local';

export interface LoopBookmark {
    id: string;
    bpm: number;
    phaseMillis: number;
    loopLengthBeats: number;
    loopStartMillis: number;
    createdAt: number;
}

export interface VideoItem {
    id: string;
    sourceType: VideoSourceType;
    uri: string; // File system path for local
    thumbnailUri?: string;
    title?: string; // Modifiable for local videos
    tags: string[];
    memo?: string;
    createdAt: number;
    updatedAt?: number;
    duration?: number; // Duration in seconds
    bpm?: number;
    bpmAuto?: {
        bpm: number;
        confidence: number;
        tempoFamilyCandidates?: number[];
        beatTimesSec?: number[]; // Beat Map (beat heads in seconds)
        analyzedAt: string; // ISO timestamp
        version: "1";
    };
    bpmSource?: "manual" | "auto";
    phaseMillis?: number;
    loopLengthBeats?: number;
    loopStartMillis?: number;
    loopBookmarks?: LoopBookmark[];
}
