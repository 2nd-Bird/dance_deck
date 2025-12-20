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
    phaseMillis?: number;
    loopLengthBeats?: number;
    loopStartMillis?: number;
    loopBookmarks?: LoopBookmark[];
}
