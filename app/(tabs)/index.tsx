import AddVideoModal from '@/components/AddVideoModal';
import VideoGrid from '@/components/VideoGrid';
import { filterVideosByTags, sortVideosByRecency, TagSearchMode } from '@/services/library';
import { addVideo, getVideos } from '@/services/storage';
import { VideoItem } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function HomeScreen() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<TagSearchMode>('and');

  const loadData = async () => {
    setLoading(true);
    const data = await getVideos();
    const sorted = sortVideosByRecency(data);
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
    loadData();
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
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="plus" size={32} color="white" />
      </Pressable>

      <AddVideoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddVideo}
      />
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
