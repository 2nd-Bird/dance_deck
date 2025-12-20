import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoItem } from '../types';

const STORAGE_KEY = 'DANCE_DECK_VIDEOS';

export const getVideos = async (): Promise<VideoItem[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Error loading videos', e);
        return [];
    }
};

export const saveVideos = async (videos: VideoItem[]): Promise<void> => {
    try {
        const jsonValue = JSON.stringify(videos);
        await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (e) {
        console.error('Error saving videos', e);
    }
};

export const addVideo = async (video: VideoItem): Promise<void> => {
    const videos = await getVideos();
    const now = Date.now();
    const newVideo = {
        ...video,
        createdAt: video.createdAt ?? now,
        updatedAt: video.updatedAt ?? now,
    };
    const newVideos = [newVideo, ...videos];
    await saveVideos(newVideos);
};

export const deleteVideo = async (id: string): Promise<void> => {
    const videos = await getVideos();
    const newVideos = videos.filter((v) => v.id !== id);
    await saveVideos(newVideos);
};

export const updateVideo = async (updatedVideo: VideoItem): Promise<void> => {
    const videos = await getVideos();
    const now = Date.now();
    const videoWithUpdatedAt = { ...updatedVideo, updatedAt: now };
    const newVideos = videos.map((v) => (v.id === updatedVideo.id ? videoWithUpdatedAt : v));
    await saveVideos(newVideos);
};
