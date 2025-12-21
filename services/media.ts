import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import uuid from 'react-native-uuid';
import { VideoItem } from '@/types';

const getMediaDirs = () => {
  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error('File system is unavailable');
  }
  const mediaDir = `${baseDir}media/`;
  return {
    mediaDir,
    videoDir: `${mediaDir}videos/`,
    thumbDir: `${mediaDir}thumbnails/`,
  };
};

const ensureMediaDirs = async () => {
  const { videoDir, thumbDir } = getMediaDirs();
  await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
  await FileSystem.makeDirectoryAsync(thumbDir, { intermediates: true });
};

const getExtension = (uri: string, fileName?: string | null) => {
  const candidate = fileName ?? uri;
  const match = candidate.match(/\.([A-Za-z0-9]+)(?:\?|$)/);
  return match ? `.${match[1].toLowerCase()}` : '';
};

export const importLocalVideoAsset = async (
  asset: ImagePicker.ImagePickerAsset
): Promise<VideoItem> => {
  await ensureMediaDirs();
  const { videoDir, thumbDir } = getMediaDirs();
  const id = uuid.v4() as string;
  const extension = getExtension(asset.uri, asset.fileName) || '.mp4';
  const videoUri = `${videoDir}${id}${extension}`;

  let sourceUri = asset.uri;
  try {
    await FileSystem.copyAsync({ from: asset.uri, to: videoUri });
    sourceUri = videoUri;
  } catch (e) {
    console.warn('Failed to copy video to app storage', e);
  }

  let thumbnailUri: string | undefined;
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(sourceUri, { time: 1000 });
    const thumbDest = `${thumbDir}${id}.jpg`;
    try {
      await FileSystem.copyAsync({ from: uri, to: thumbDest });
      thumbnailUri = thumbDest;
    } catch (copyError) {
      console.warn('Failed to persist thumbnail', copyError);
      thumbnailUri = uri;
    }
  } catch (e) {
    console.warn('Could not generate thumbnail', e);
  }

  const now = Date.now();
  return {
    id,
    sourceType: 'local',
    uri: sourceUri,
    thumbnailUri,
    title: asset.fileName || 'Local Video',
    tags: [],
    createdAt: now,
    updatedAt: now,
    duration: asset.duration ? asset.duration / 1000 : 0,
  };
};
