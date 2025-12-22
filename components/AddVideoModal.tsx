import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { getVideoAssetFromPicker, importLocalVideoAsset } from '@/services/media';
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
                mediaTypes: ['videos'] as ImagePicker.MediaType[],
                allowsEditing: false,
                quality: 1,
                preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
            });

            const asset = getVideoAssetFromPicker(result);
            if (asset) {
                const newVideo = await importLocalVideoAsset(asset);
                onAdd(newVideo);
                onClose();
            }
        } catch (error) {
            console.warn('Failed to pick video', error);
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
