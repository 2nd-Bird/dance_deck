import { VideoItem } from "@/types";

export type TagSearchMode = "and" | "or";

const normalizeTag = (raw: string) => raw.trim().replace(/^#/, "").toLowerCase();

export const parseTagQuery = (query: string): string[] => {
    if (!query.trim()) return [];
    return query
        .split(/[\s,]+/)
        .map(normalizeTag)
        .filter(Boolean);
};

export const filterVideosByTags = (
    videos: VideoItem[],
    query: string,
    mode: TagSearchMode
): VideoItem[] => {
    const tags = parseTagQuery(query);
    if (tags.length === 0) return videos;

    return videos.filter((video) => {
        const videoTags = (video.tags || []).map((tag) => tag.toLowerCase());
        if (mode === "and") {
            return tags.every((tag) => videoTags.includes(tag));
        }
        return tags.some((tag) => videoTags.includes(tag));
    });
};

export const sortVideosByRecency = (videos: VideoItem[]): VideoItem[] => {
    return [...videos].sort((a, b) => {
        const aTime = a.updatedAt ?? a.createdAt;
        const bTime = b.updatedAt ?? b.createdAt;
        return bTime - aTime;
    });
};
