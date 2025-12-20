import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { VideoItem } from '../types';

interface VideoTileProps {
    video: VideoItem;
    width: number;
}

export default function VideoTile({ video, width }: VideoTileProps) {
    const getThumbnail = () => {
        if (video.thumbnailUri) {
            return { uri: video.thumbnailUri };
        }
        // Fallback logic could go here (e.g. static assets based on type)
        return null;
    };

    return (
        <Link href={`/video/${video.id}`} asChild>
            <Pressable style={[styles.container, { width, height: width }]}>
                {video.thumbnailUri ? (
                    <Image source={{ uri: video.thumbnailUri }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={[styles.placeholder, { width, height: width }]}>
                        <MaterialCommunityIcons name="video" size={32} color="#fff" />
                    </View>
                )}
                {/* Overlay icon for video type if needed */}
                <View style={styles.iconOverlay}>
                    <MaterialCommunityIcons name="file-video" size={16} color="white" />
                </View>
            </Pressable>
        </Link>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 0.5,
        borderColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
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
