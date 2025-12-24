import VideoGrid from '@/components/VideoGrid';
import { filterVideosByTags, parseTagQuery, sortVideosByRecency, TagSearchMode } from '@/services/library';
import { ensureVideoThumbnail, getVideoAssetFromPicker, importLocalVideoAsset } from '@/services/media';
import { addVideo, getVideos, saveVideos } from '@/services/storage';
import { VideoItem } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View, ViewToken } from 'react-native';

export default function HomeScreen() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<TagSearchMode>('and');
  const loadSequence = useRef(0);
  const lastStorageSnapshot = useRef({ count: 0, firstId: null as string | null, lastId: null as string | null });
  const hasLoggedViewableItems = useRef(false);
  const pendingImportIds = useRef<Set<string>>(new Set());

  const ensureThumbnails = useCallback(async (items: VideoItem[]) => {
    const updated = await Promise.all(items.map((video) => ensureVideoThumbnail(video)));
    const changed = updated.some((video, index) => video.thumbnailUri !== items[index]?.thumbnailUri);
    return { updated, changed };
  }, []);

  const loadData = useCallback(async () => {
    const sequence = loadSequence.current + 1;
    loadSequence.current = sequence;
    const startTime = Date.now();
    if (__DEV__) {
      console.log('[Library][loadData][start]', JSON.stringify({ loadId: sequence }));
    }
    setLoading(true);
    try {
      const data = await getVideos();
      lastStorageSnapshot.current = {
        count: data.length,
        firstId: data[0]?.id ?? null,
        lastId: data.length > 0 ? data[data.length - 1]?.id ?? null : null,
      };
      if (__DEV__) {
        console.log(
          '[Library][loadData][end]',
          JSON.stringify({
            loadId: sequence,
            storageCount: data.length,
            storageFirstId: lastStorageSnapshot.current.firstId,
            storageLastId: lastStorageSnapshot.current.lastId,
            tookMs: Date.now() - startTime,
          })
        );
      }
      if (__DEV__) {
        console.log('[Library] load videos', {
          count: data.length,
          first: data[0] ?? null,
        });
      }
      const { updated, changed } = await ensureThumbnails(data);
      const sorted = sortVideosByRecency(updated);
      if (sequence !== loadSequence.current) {
        return;
      }
      if (pendingImportIds.current.size > 0) {
        const incomingIds = new Set(sorted.map((video) => video.id));
        const missingIds = Array.from(pendingImportIds.current).filter((id) => !incomingIds.has(id));
        if (missingIds.length > 0) {
          if (__DEV__) {
            console.log('[Library] skip stale load', { missingIds });
          }
          return;
        }
        pendingImportIds.current.clear();
      }
      setVideos(sorted);
      if (changed && pendingImportIds.current.size === 0) {
        await saveVideos(sorted);
      }
    } catch (error) {
      console.warn('Failed to load library', error);
    } finally {
      if (sequence === loadSequence.current) {
        setLoading(false);
      }
    }
  }, [ensureThumbnails]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredVideos = useMemo(
    () => filterVideosByTags(videos, searchQuery, searchMode),
    [videos, searchQuery, searchMode]
  );
  const selectedTags = useMemo(() => parseTagQuery(searchQuery), [searchQuery]);

  useEffect(() => {
    if (!__DEV__) return;
    const firstId = filteredVideos[0]?.id ?? null;
    const lastId = filteredVideos.length > 0 ? filteredVideos[filteredVideos.length - 1]?.id ?? null : null;
    const payload = {
      videosCount: videos.length,
      filteredCount: filteredVideos.length,
      selectedTags,
      mode: searchMode,
      searchText: searchQuery,
      isLoading: loading,
      firstId,
      lastId,
    };
    console.log('[HomeRender]', JSON.stringify(payload));
    if (
      lastStorageSnapshot.current.count > 0 &&
      selectedTags.length === 0 &&
      searchQuery.trim().length === 0 &&
      filteredVideos.length === 0
    ) {
      console.log(
        '[ASSERT]',
        JSON.stringify({
          storageCount: lastStorageSnapshot.current.count,
          filteredCount: filteredVideos.length,
          selectedTags,
          searchText: searchQuery,
        })
      );
    }
  });

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      if (!__DEV__ || hasLoggedViewableItems.current) return;
      hasLoggedViewableItems.current = true;
      console.log('[Home][FlatList][viewable]', JSON.stringify({ count: viewableItems.length }));
    },
    []
  );

  const handleAddVideo = async (video: VideoItem) => {
    await addVideo(video);
    pendingImportIds.current.add(video.id);
    loadSequence.current += 1;
    setVideos((prev) => {
      const next = sortVideosByRecency([video, ...prev]);
      return next;
    });
    setLoading(false);
  };

  const handleImportLocal = async () => {
    try {
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      if (!mediaPermission.granted) {
        Alert.alert('Permission required', 'Allow access to your media library to import videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'] as ImagePicker.MediaType[],
        allowsEditing: false,
        quality: 1,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });

      const asset = getVideoAssetFromPicker(result);
      if (__DEV__ && asset) {
        console.log('[Import] picker asset', {
          uri: asset.uri,
          fileName: asset.fileName,
          duration: asset.duration,
          type: asset.type,
          assetId: asset.assetId,
        });
      }
      if (asset) {
        const importedVideo = await importLocalVideoAsset(asset);
        const newVideo = await ensureVideoThumbnail(importedVideo);
        await handleAddVideo(newVideo);
      }
    } catch (error) {
      console.warn('Failed to pick video', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tags..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        <View style={styles.searchModeToggle}>
          <Pressable
            style={[styles.searchModeButton, searchMode === 'and' && styles.searchModeButtonActive]}
            onPress={() => setSearchMode('and')}
          >
            <Text style={[styles.searchModeText, searchMode === 'and' && styles.searchModeTextActive]}>
              AND
            </Text>
          </Pressable>
          <Pressable
            style={[styles.searchModeButton, searchMode === 'or' && styles.searchModeButtonActive]}
            onPress={() => setSearchMode('or')}
          >
            <Text style={[styles.searchModeText, searchMode === 'or' && styles.searchModeTextActive]}>
              OR
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#000" style={styles.loader} />
      ) : (
        <VideoGrid videos={filteredVideos} onViewableItemsChanged={handleViewableItemsChanged} />
      )}

      {/* Floating Action Button */}
      <Pressable style={styles.fab} onPress={handleImportLocal}>
        <MaterialCommunityIcons name="plus" size={32} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  searchModeToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  searchModeButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchModeButtonActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  searchModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
  },
  searchModeTextActive: {
    color: '#fff',
  },
  loader: {
    marginTop: 50,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
