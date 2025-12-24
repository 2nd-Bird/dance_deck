import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import { Image, Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface LibraryTileProps extends Omit<PressableProps, 'style' | 'children'> {
    thumbnailUri?: string | null;
    width: number;
    height?: number;
    showVideoBadge?: boolean;
    onThumbnailError?: () => void;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}

const LibraryTile = forwardRef<View, LibraryTileProps>(
    (
        {
            thumbnailUri,
            width,
            height = width,
            showVideoBadge = true,
            style,
            children,
            onThumbnailError,
            ...pressableProps
        },
        ref
    ) => {
        return (
            <View style={[styles.wrapper, { width, height }]}>
                <Pressable ref={ref} style={[styles.container, style]} {...pressableProps}>
                    {thumbnailUri ? (
                        <Image
                            source={{ uri: thumbnailUri }}
                            style={styles.image}
                            resizeMode="cover"
                            onError={onThumbnailError}
                        />
                    ) : (
                        <View style={styles.placeholder}>
                            <MaterialCommunityIcons name="video" size={32} color="#fff" />
                        </View>
                    )}
                    {showVideoBadge && (
                        <View style={styles.iconOverlay}>
                            <MaterialCommunityIcons name="file-video" size={16} color="white" />
                        </View>
                    )}
                    {children}
                </Pressable>
            </View>
        );
    }
);

LibraryTile.displayName = 'LibraryTile';

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
    },
});

export default LibraryTile;
