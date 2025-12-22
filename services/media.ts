import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';
import uuid from 'react-native-uuid';
import { VideoItem } from '@/types';

type LegacyPickerResult = {
  cancelled?: boolean;
  canceled?: boolean;
  uri?: string;
  width?: number;
  height?: number;
  duration?: number | null;
  fileName?: string | null;
  assetId?: string | null;
};

export const getVideoAssetFromPicker = (
  result: ImagePicker.ImagePickerResult | LegacyPickerResult
): ImagePicker.ImagePickerAsset | null => {
  if ('assets' in result && result.assets && result.assets.length > 0) {
    return result.assets[0];
  }
  if ('uri' in result && result.uri) {
    return {
      uri: result.uri,
      width: result.width ?? 0,
      height: result.height ?? 0,
      fileName: result.fileName ?? null,
      duration: result.duration ?? null,
      assetId: result.assetId ?? null,
      type: 'video',
    };
  }
  return null;
};

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

const resolveAssetUri = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
  if (asset.assetId) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
      return info.localUri ?? info.uri ?? asset.uri;
    } catch (e) {
      console.warn('Failed to resolve media asset info', e);
    }
  }
  return asset.uri;
};

const createThumbnailForVideo = async (sourceUri: string, id: string): Promise<string | undefined> => {
  await ensureMediaDirs();
  const { thumbDir } = getMediaDirs();
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(sourceUri, { time: 1000 });
    const thumbDest = `${thumbDir}${id}.jpg`;
    try {
      await FileSystem.copyAsync({ from: uri, to: thumbDest });
      return thumbDest;
    } catch (copyError) {
      console.warn('Failed to persist thumbnail', copyError);
      return uri;
    }
  } catch (e) {
    console.warn('Could not generate thumbnail', e);
    return undefined;
  }
};

export const importLocalVideoAsset = async (
  asset: ImagePicker.ImagePickerAsset
): Promise<VideoItem> => {
  await ensureMediaDirs();
  const { videoDir } = getMediaDirs();
  const id = uuid.v4() as string;
  const extension = getExtension(asset.uri, asset.fileName) || '.mp4';
  const videoUri = `${videoDir}${id}${extension}`;

  const resolvedUri = await resolveAssetUri(asset);
  let sourceUri = resolvedUri;
  try {
    await FileSystem.copyAsync({ from: resolvedUri, to: videoUri });
    sourceUri = videoUri;
  } catch (e) {
    console.warn('Failed to copy video to app storage', e);
  }

  const thumbnailUri = await createThumbnailForVideo(sourceUri, id);

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

export const ensureVideoThumbnail = async (video: VideoItem): Promise<VideoItem> => {
  if (video.thumbnailUri) return video;
  const thumbnailUri = await createThumbnailForVideo(video.uri, video.id);
  if (!thumbnailUri) return video;
  return { ...video, thumbnailUri };
};
