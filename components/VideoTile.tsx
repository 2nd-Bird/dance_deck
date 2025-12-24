import { Link } from 'expo-router';
import React from 'react';
import { VideoItem } from '../types';
import LibraryTile from './LibraryTile';

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
        <Link href={`/video/${video.id}`} asChild>
            <LibraryTile
                width={width}
                thumbnailUri={getThumbnail()?.uri}
                onLayout={(event) => {
                    if (!__DEV__ || hasLoggedTileLayout) return;
                    hasLoggedTileLayout = true;
                    const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
                    console.log(
                        '[Home][Tile][layout]',
                        JSON.stringify({ id: video.id, layoutWidth, layoutHeight })
                    );
                }}
                onThumbnailError={() => {
                    if (!__DEV__) return;
                    console.log(
                        '[Home][Thumbnail][error]',
                        JSON.stringify({
                            id: video.id,
                            uri: video.thumbnailUri ?? null,
                        })
                    );
                }}
            />
        </Link>
    );
}
