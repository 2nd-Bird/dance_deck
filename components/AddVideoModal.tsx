import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import uuid from 'react-native-uuid';
import { VideoItem } from '../types';

interface AddVideoModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (video: VideoItem) => void;
}

export default function AddVideoModal({ visible, onClose, onAdd }: AddVideoModalProps) {
    const handleImportLocal = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];

                let thumbnailUri = undefined;
                try {
                    const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
                        time: 1000,
                    });
                    thumbnailUri = uri;
                } catch (e) {
                    console.warn("Could not generate thumbnail", e);
                }

                const now = Date.now();
                const newVideo: VideoItem = {
                    id: uuid.v4() as string,
                    sourceType: 'local',
                    uri: asset.uri,
                    thumbnailUri: thumbnailUri,
                    title: asset.fileName || 'Local Video',
                    tags: [],
                    createdAt: now,
                    updatedAt: now,
                    duration: asset.duration ? asset.duration / 1000 : 0,
                };
                onAdd(newVideo);
                onClose();
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to pick video');
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Add New Video</Text>
                    <Pressable onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={24} color="black" />
                    </Pressable>
                </View>

                <View style={styles.content}>
                    <Pressable style={[styles.button, styles.primaryButton]} onPress={handleImportLocal}>
                        <MaterialCommunityIcons name="folder-multiple-image" size={24} color="white" />
                        <Text style={styles.buttonText}>Import from Gallery</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        gap: 20,
    },
    button: {
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    primaryButton: {
        backgroundColor: '#000',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
