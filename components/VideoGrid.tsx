import React from 'react';
import { FlatList, StyleSheet, useWindowDimensions, ViewToken } from 'react-native';
import { VideoItem } from '../types';
import VideoTile from './VideoTile';

interface VideoGridProps {
    videos: VideoItem[];
    onViewableItemsChanged?: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
}

export default function VideoGrid({ videos, onViewableItemsChanged }: VideoGridProps) {
    const { width } = useWindowDimensions();
    const numColumns = 3;
    const tileWidth = width / numColumns;

    return (
        <FlatList
            data={videos}
            renderItem={({ item }) => <VideoTile video={item} width={tileWidth} />}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            contentContainerStyle={styles.container}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={onViewableItemsChanged ? { itemVisiblePercentThreshold: 1 } : undefined}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 100, // Space for tab bar or FAB
    }
});
