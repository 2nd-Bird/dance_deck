import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import uuid from 'react-native-uuid';
import { VideoItem, VideoSourceType } from '../types';

interface AddVideoModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (video: VideoItem) => void;
}

export default function AddVideoModal({ visible, onClose, onAdd }: AddVideoModalProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);

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

                const newVideo: VideoItem = {
                    id: uuid.v4() as string,
                    sourceType: 'local',
                    uri: asset.uri,
                    thumbnailUri: thumbnailUri,
                    title: asset.fileName || 'Local Video',
                    tags: [],
                    createdAt: Date.now(),
                    duration: asset.duration ? asset.duration / 1000 : 0,
                };
                onAdd(newVideo);
                onClose();
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to pick video');
        }
    };

    const handleAddUrl = () => {
        if (!url) return;

        let type: VideoSourceType = 'youtube'; // Default logic needed
        let thumbnailUri: string | undefined = undefined;

        // Simple detection
        if (url.includes('tiktok.com')) type = 'tiktok';
        else if (url.includes('instagram.com')) type = 'instagram';

        if (url.includes('youtu') || url.includes('youtube')) {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);
            if (match && match[2].length === 11) {
                thumbnailUri = `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
            }
        }

        const newVideo: VideoItem = {
            id: uuid.v4() as string,
            sourceType: type,
            uri: url,
            thumbnailUri: thumbnailUri,
            title: 'Online Video',
            tags: [],
            createdAt: Date.now(),
        };
        onAdd(newVideo);
        setUrl('');
        onClose();
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

                    <View style={styles.dividerContainer}>
                        <View style={styles.line} />
                        <Text style={styles.dividerText}>OR PASTE LINK</Text>
                        <View style={styles.line} />
                    </View>

                    <View style={styles.linkInputContainer}>
                        <MaterialCommunityIcons name="link-variant" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="YouTube, TikTok, Instagram URL"
                            value={url}
                            onChangeText={setUrl}
                            autoCapitalize="none"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <Pressable
                        style={[styles.button, styles.secondaryButton, !url && styles.disabled]}
                        onPress={handleAddUrl}
                        disabled={!url}
                    >
                        <Text style={[styles.buttonText, !url && styles.disabledText]}>Add Link</Text>
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
    secondaryButton: {
        backgroundColor: '#007AFF',
        marginTop: 10,
    },
    disabled: {
        backgroundColor: '#F0F0F0',
        elevation: 0,
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    disabledText: {
        color: '#999',
    },
    linkInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: '#000',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#EEEEEE',
    },
    dividerText: {
        color: '#999',
        fontSize: 12,
        marginHorizontal: 10,
        fontWeight: '500',
    }
});
