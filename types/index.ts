export type VideoSourceType = 'local' | 'youtube' | 'tiktok' | 'instagram';

export interface VideoItem {
    id: string;
    sourceType: VideoSourceType;
    uri: string; // File system path for local, URL for remote
    thumbnailUri?: string;
    title?: string; // Modifiable for local videos
    tags: string[];
    memo?: string;
    createdAt: number;
    duration?: number; // Duration in seconds
}
