import React, { useCallback, useRef } from 'react';
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
    const hasLoggedRenderItem = useRef(false);
    const hasLoggedLayout = useRef(false);
    const hasLoggedContentSize = useRef(false);

    const renderItem = useCallback(
        ({ item }: { item: VideoItem }) => {
            if (__DEV__ && !hasLoggedRenderItem.current) {
                hasLoggedRenderItem.current = true;
                console.log(
                    '[Home][FlatList][renderItem]',
                    JSON.stringify({ firstId: item.id, thumbnailUri: item.thumbnailUri ?? null })
                );
            }
            return <VideoTile video={item} width={tileWidth} />;
        },
        [tileWidth]
    );

    const getItemLayout = useCallback(
        (_: ArrayLike<VideoItem> | null | undefined, index: number) => {
            const row = Math.floor(index / numColumns);
            return { length: tileWidth, offset: tileWidth * row, index };
        },
        [tileWidth, numColumns]
    );

    return (
        <FlatList
            data={videos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            contentContainerStyle={styles.container}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={onViewableItemsChanged ? { itemVisiblePercentThreshold: 1 } : undefined}
            getItemLayout={getItemLayout}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            removeClippedSubviews
            onLayout={(event) => {
                if (!__DEV__ || hasLoggedLayout.current) return;
                hasLoggedLayout.current = true;
                const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
                console.log(
                    '[Home][FlatList][layout]',
                    JSON.stringify({
                        layoutWidth,
                        layoutHeight,
                        windowWidth: width,
                        tileWidth,
                        dataCount: videos.length,
                    })
                );
                if (layoutWidth === 0 || layoutHeight === 0 || tileWidth === 0) {
                    console.log(
                        '[ASSERT]',
                        JSON.stringify({
                            layoutWidth,
                            layoutHeight,
                            windowWidth: width,
                            tileWidth,
                            dataCount: videos.length,
                        })
                    );
                }
            }}
            onContentSizeChange={(contentWidth, contentHeight) => {
                if (!__DEV__ || hasLoggedContentSize.current) return;
                hasLoggedContentSize.current = true;
                console.log(
                    '[Home][FlatList][contentSize]',
                    JSON.stringify({ contentWidth, contentHeight, dataCount: videos.length })
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 100, // Space for tab bar or FAB
    }
});
