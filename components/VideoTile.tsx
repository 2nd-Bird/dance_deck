import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { VideoItem } from '../types';

interface VideoTileProps {
    video: VideoItem;
    width: number;
}

let hasLoggedTileLayout = false;

export default function VideoTile({ video, width }: VideoTileProps) {
    const getThumbnail = () => {
        if (video.thumbnailUri) {
            return { uri: video.thumbnailUri };
        }
        // Fallback logic could go here (e.g. static assets based on type)
        return null;
    };

    return (
        <View style={[styles.wrapper, { width, height: width }]}>
            <Link href={`/video/${video.id}`} asChild>
                <Pressable
                    style={styles.container}
                    onLayout={(event) => {
                        if (!__DEV__ || hasLoggedTileLayout) return;
                        hasLoggedTileLayout = true;
                        const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
                        console.log(
                            '[Home][Tile][layout]',
                            JSON.stringify({ id: video.id, layoutWidth, layoutHeight })
                        );
                    }}
                >
                    {video.thumbnailUri ? (
                        <Image
                            source={{ uri: video.thumbnailUri }}
                            style={styles.image}
                            resizeMode="cover"
                            onError={(event) => {
                                if (!__DEV__) return;
                                console.log(
                                    '[Home][Thumbnail][error]',
                                    JSON.stringify({
                                        id: video.id,
                                        uri: video.thumbnailUri ?? null,
                                        error: event.nativeEvent?.error ?? null,
                                    })
                                );
                            }}
                        />
                    ) : (
                        <View style={styles.placeholder}>
                            <MaterialCommunityIcons name="video" size={32} color="#fff" />
                        </View>
                    )}
                    {/* Overlay icon for video type if needed */}
                    <View style={styles.iconOverlay}>
                        <MaterialCommunityIcons name="file-video" size={16} color="white" />
                    </View>
                </Pressable>
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        overflow: 'hidden',
    },
    container: {
        flex: 1,
        borderWidth: 0.5,
        borderColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconOverlay: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 4,
        padding: 2,
    }
});
