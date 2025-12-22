import VideoGrid from '@/components/VideoGrid';
import { filterVideosByTags, sortVideosByRecency, TagSearchMode } from '@/services/library';
import { ensureVideoThumbnail, getVideoAssetFromPicker, importLocalVideoAsset } from '@/services/media';
import { addVideo, getVideos, saveVideos } from '@/services/storage';
import { VideoItem } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function HomeScreen() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<TagSearchMode>('and');

  const ensureThumbnails = async (items: VideoItem[]) => {
    const updated = await Promise.all(items.map((video) => ensureVideoThumbnail(video)));
    const changed = updated.some((video, index) => video.thumbnailUri !== items[index]?.thumbnailUri);
    if (changed) {
      await saveVideos(sortVideosByRecency(updated));
    }
    return updated;
  };

  const loadData = async () => {
    setLoading(true);
    const data = await getVideos();
    const hydrated = await ensureThumbnails(data);
    const sorted = sortVideosByRecency(hydrated);
    setVideos(sorted);
    setFilteredVideos(sorted);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    setFilteredVideos(filterVideosByTags(videos, searchQuery, searchMode));
  }, [searchQuery, videos, searchMode]);

  const handleAddVideo = async (video: VideoItem) => {
    await addVideo(video);
    setVideos((prev) => {
      const next = sortVideosByRecency([video, ...prev]);
      setFilteredVideos(filterVideosByTags(next, searchQuery, searchMode));
      return next;
    });
  };

  const handleImportLocal = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'] as ImagePicker.MediaType[],
        allowsEditing: false,
        quality: 1,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });

      const asset = getVideoAssetFromPicker(result);
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
        <VideoGrid videos={filteredVideos} />
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
