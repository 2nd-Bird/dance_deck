import TapTempoButton from "@/components/TapTempoButton";
import { getVideos, updateVideo } from "@/services/storage";
import { VideoItem } from "@/types";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";

export default function VideoPlayerScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const videoRef = useRef<Video>(null);

    const [videoItem, setVideoItem] = useState<VideoItem | null>(null);
    const [loading, setLoading] = useState(true);

    // Playback State
    const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
    const [positionMillis, setPositionMillis] = useState(0);
    const [durationMillis, setDurationMillis] = useState(0);
    const [rate, setRate] = useState(1.0);
    const [isMirrored, setIsMirrored] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);

    // Orientation State
    const [orientation, setOrientation] = useState(ScreenOrientation.Orientation.PORTRAIT_UP);

    // A-B Loop State
    const [loopA, setLoopA] = useState<number | null>(null);
    const [loopB, setLoopB] = useState<number | null>(null);

    // Metadata State (Notes)
    const [memo, setMemo] = useState("");
    const [title, setTitle] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");

    // Save debouncing
    const saveTimeoutRef = useRef<any>(null);

    useEffect(() => {
        loadVideo();
    }, [id]);

    useEffect(() => {
        // Allow rotation for this screen
        ScreenOrientation.unlockAsync();

        const subscription = ScreenOrientation.addOrientationChangeListener((evt) => {
            setOrientation(evt.orientationInfo.orientation);
        });

        return () => {
            ScreenOrientation.removeOrientationChangeListener(subscription);
            // Lock back to portrait on exit
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []);

    const loadVideo = async () => {
        const videos = await getVideos();
        const found = videos.find(v => v.id === id);
        if (found) {
            setVideoItem(found);
            setMemo(found.memo || "");
            setTitle(found.title || "");
            setTags(found.tags || []);
        } else {
            Alert.alert("Error", "Video not found");
            router.back();
        }
        setLoading(false);
    };

    // Auto-Save Logic
    useEffect(() => {
        if (!videoItem) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            if (memo !== videoItem.memo || title !== videoItem.title || tags !== videoItem.tags) {
                const updated = { ...videoItem, memo, title, tags };
                await updateVideo(updated);
            }
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [memo, title, tags]);


    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setStatus(status);
        setPositionMillis(status.positionMillis);
        setDurationMillis(status.durationMillis || 0);
        setIsPlaying(status.isPlaying);

        // A-B Loop Logic
        if (loopA !== null && loopB !== null && status.positionMillis >= loopB) {
            // seek to A
            videoRef.current?.setPositionAsync(loopA);
        }
    };

    const togglePlay = () => {
        if (isPlaying) videoRef.current?.pauseAsync();
        else videoRef.current?.playAsync();
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Overlay Visibility Logic
    useEffect(() => {
        let timeout: any;
        if (controlsVisible && isPlaying) {
            timeout = setTimeout(() => setControlsVisible(false), 3000);
        }
        return () => clearTimeout(timeout);
    }, [controlsVisible, isPlaying]);

    const handleVideoTap = () => {
        setControlsVisible(!controlsVisible);
    };

    // Smart Loop
    const handleSetSmartLoop = (bpm: number, lengthInCounts: number) => {
        if (!status?.isLoaded) return;

        const secondsPerBeat = 60 / bpm;
        const lengthInSeconds = secondsPerBeat * lengthInCounts;
        const lengthInMillis = lengthInSeconds * 1000;

        const start = positionMillis;
        const end = start + lengthInMillis;

        // Check if end is within duration
        if (end > (status.durationMillis || 0)) {
            Alert.alert("Loop Error", "Loop segment exceeds video duration.");
            return;
        }

        setLoopA(start);
        setLoopB(end);
        videoRef.current?.playAsync();
        setControlsVisible(true);
    };

    // Download Logic
    const handleDownload = async () => {
        if (!videoItem) return;

        // 1. Check if direct link (generic)
        let downloadUrl = videoItem.uri;

        // Basic resolver for TikTok (Demo purpose, unofficial)
        if (videoItem.sourceType === 'tiktok' && videoItem.uri.includes('tiktok.com')) {
            // Try to use a known public API if simple enough, else just try the URL
            // e.g. https://www.tikwm.com/api/?url=...
            // For stability in this demo, we will try to download the original URL.
            // However, TikTok web urls are HTML. We will skip complex resolving and show alert.
        } else if (videoItem.sourceType === 'youtube') {
            Alert.alert("Unsupported", "YouTube direct download is blocked by TOS. Please use a local video or direct MP4 link.");
            return;
        }

        Alert.alert("Downloading...", "Starting download in background.");

        try {
            const filename = `${videoItem.id}.mp4`;
            // Explicitly cast or handle
            const docDir = FileSystem.documentDirectory;
            if (!docDir) throw new Error("No document directory");
            const fileUri = `${docDir}${filename}`;

            const downloadResumable = FileSystem.createDownloadResumable(
                downloadUrl,
                fileUri
            );

            const result = await downloadResumable.downloadAsync();

            if (result && result.uri) {
                const updated = {
                    ...videoItem,
                    uri: result.uri,
                    sourceType: 'local' as const
                };
                await updateVideo(updated);
                setVideoItem(updated);
                Alert.alert("Success", "Video downloaded to local storage!");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Download Failed", "Could not download the video. Ensure it is a direct link.");
        }
    };

    // Tag Management
    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            const updatedTags = [...tags, newTag.trim()];
            setTags(updatedTags);
            setNewTag("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };


    if (loading || !videoItem) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    const isLocal = videoItem.sourceType === 'local';
    // If sourceType is local OR generic url ending in mp4
    const canPlayNative = isLocal || videoItem.uri.includes('.mp4') || videoItem.uri.includes('.mov');

    const isLandscape = orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;

    return (
        <View style={styles.container}>
            <StatusBar hidden={isLandscape} />
            <Stack.Screen options={{ headerShown: false }} />

            {/* TOP: Video Area (Expand in Landscape) */}
            <View style={[styles.videoArea, isLandscape ? styles.videoAreaLandscape : {}]}>
                <Pressable style={styles.videoWrapper} onPress={handleVideoTap}>
                    {canPlayNative ? (
                        <Video
                            ref={videoRef}
                            style={[styles.video, isMirrored && { transform: [{ scaleX: -1 }] }]}
                            source={{ uri: videoItem.uri }}
                            useNativeControls={false}
                            resizeMode={ResizeMode.CONTAIN}
                            isLooping={loopA === null}
                            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                            rate={rate}
                            shouldCorrectPitch
                        />
                    ) : (
                        // Placeholder for Webview/YouTube
                        <View style={styles.webPlaceholder}>
                            <MaterialCommunityIcons name="web" size={64} color="#666" />
                            <Text style={{ color: '#999' }}>Streaming (No Practice Tools)</Text>
                            <Text style={{ color: '#666', fontSize: 10, marginTop: 5 }}>Download to enable features</Text>
                        </View>
                    )}

                    {/* OVERLAY CONTROLS */}
                    {controlsVisible && (
                        <Pressable style={styles.overlay} onPress={handleVideoTap}>
                            <LinearGradient
                                colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.7)']}
                                style={styles.overlayGradient}
                            >
                                {/* Top Row: Back & Title & Download */}
                                <View style={styles.topControlRow}>
                                    <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                                        <MaterialCommunityIcons name="chevron-down" size={32} color="white" />
                                    </Pressable>
                                    <Text style={styles.overlayTitle} numberOfLines={1}>{title || "Untitled"}</Text>
                                    <Pressable onPress={handleDownload} style={styles.iconBtn}>
                                        <MaterialCommunityIcons name={isLocal ? "check-circle" : "download"} size={24} color={isLocal ? "#4CD964" : "white"} />
                                    </Pressable>
                                </View>

                                {/* Middle Row: Play/Pause */}
                                <View style={styles.middleControlRow}>
                                    <Pressable onPress={() => videoRef.current?.setPositionAsync(positionMillis - 5000)}>
                                        <MaterialCommunityIcons name="rewind-5" size={36} color="white" />
                                    </Pressable>

                                    <Pressable onPress={togglePlay} style={styles.bigPlayBtn}>
                                        <MaterialCommunityIcons name={isPlaying ? "pause-circle" : "play-circle"} size={isLandscape ? 60 : 72} color="white" />
                                    </Pressable>

                                    <Pressable onPress={() => videoRef.current?.setPositionAsync(positionMillis + 5000)}>
                                        <MaterialCommunityIcons name="fast-forward-5" size={36} color="white" />
                                    </Pressable>
                                </View>

                                {/* Bottom Row: Seek & Tools */}
                                <View style={styles.bottomControlContainer}>
                                    <View style={styles.timeRow}>
                                        <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
                                        <Slider
                                            style={styles.slider}
                                            minimumValue={0}
                                            maximumValue={durationMillis}
                                            value={positionMillis}
                                            onSlidingComplete={(val) => videoRef.current?.setPositionAsync(val)}
                                            minimumTrackTintColor="#FF0000"
                                            maximumTrackTintColor="rgba(255,255,255,0.3)"
                                            thumbTintColor="#FF0000"
                                        />
                                        <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
                                    </View>

                                    {/* Toolbar */}
                                    <View style={styles.toolbar}>
                                        {/* Speed */}
                                        <Pressable style={styles.toolItem} onPress={() => { const rates = [0.5, 0.75, 1.0]; const idx = rates.indexOf(rate); setRate(rates[(idx + 1) % 3]); }}>
                                            <MaterialCommunityIcons name="speedometer" size={24} color={rate !== 1.0 ? "#FF0000" : "white"} />
                                            <Text style={styles.toolText}>{rate}x</Text>
                                        </Pressable>

                                        {/* Mirror */}
                                        <Pressable style={styles.toolItem} onPress={() => setIsMirrored(!isMirrored)}>
                                            <MaterialCommunityIcons name="swap-horizontal" size={24} color={isMirrored ? "#FF0000" : "white"} />
                                            <Text style={styles.toolText}>Mirror</Text>
                                        </Pressable>

                                        {/* A-B Loop (Manual) */}
                                        <Pressable style={styles.toolItem} onPress={() => {
                                            if (loopA === null) setLoopA(positionMillis);
                                            else if (loopB === null) setLoopB(positionMillis);
                                            else { setLoopA(null); setLoopB(null); }
                                        }}>
                                            <MaterialCommunityIcons name={loopA !== null ? (loopB !== null ? "repeat-once" : "map-marker-path") : "repeat"} size={24} color={(loopA !== null || loopB !== null) ? "#FF0000" : "white"} />
                                            <Text style={styles.toolText}>{loopA !== null ? (loopB !== null ? "On" : "Set B") : "Loop"}</Text>
                                        </Pressable>

                                        {/* Smart Loop */}
                                        <View style={styles.toolItem}>
                                            <TapTempoButton onSetLoop={handleSetSmartLoop} />
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </Pressable>
                    )}
                </Pressable>
            </View>

            {/* BOTTOM: Notes & Metadata Area (Hide in Landscape) */}
            {!isLandscape && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.notesArea}
                >
                    <ScrollView contentContainerStyle={styles.notesContent}>

                        <View style={styles.metaRow}>
                            <TextInput
                                style={styles.titleInput}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Video Title"
                                placeholderTextColor="#999"
                            />
                        </View>

                        {/* Tags */}
                        <View style={styles.tagsRow}>
                            {tags.map((tag, i) => (
                                <View key={i} style={styles.tagPill}>
                                    <Text style={styles.tagPillText}>#{tag}</Text>
                                    <Pressable onPress={() => removeTag(tag)}>
                                        <MaterialCommunityIcons name="close" size={12} color="#fff" />
                                    </Pressable>
                                </View>
                            ))}
                            <View style={styles.addTagWrapper}>
                                <MaterialCommunityIcons name="tag-plus" size={16} color="#666" />
                                <TextInput
                                    style={styles.addTagInput}
                                    placeholder="Add tag..."
                                    value={newTag}
                                    onChangeText={setNewTag}
                                    onSubmitEditing={addTag}
                                />
                            </View>
                        </View>

                        <TextInput
                            style={styles.notesInput}
                            value={memo}
                            onChangeText={setMemo}
                            placeholder="Type notes here... (Auto-saved)"
                            multiline
                            scrollEnabled={false}
                        />

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111',
    },
    // Video Area
    videoArea: {
        width: '100%',
        height: 300,
        backgroundColor: '#000',
        zIndex: 10,
    },
    videoAreaLandscape: {
        flex: 1,
        height: '100%',
    },
    videoWrapper: {
        flex: 1,
    },
    video: {
        flex: 1,
        backgroundColor: 'black',
    },
    webPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 20,
    },
    overlayGradient: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    iconBtn: {
        padding: 8,
    },
    overlayTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        flex: 1,
        marginLeft: 10,
    },
    middleControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
    },
    bigPlayBtn: {
        opacity: 0.9,
    },
    bottomControlContainer: {
        paddingBottom: 20,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    slider: {
        flex: 1,
        marginHorizontal: 10,
        height: 40,
    },
    timeText: {
        color: '#ddd',
        fontSize: 12,
        fontVariant: ['tabular-nums'],
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        paddingTop: 10,
    },
    toolItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
    },
    toolText: {
        color: 'white',
        fontSize: 10,
        marginTop: 4,
    },
    // Notes Area
    notesArea: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20,
        overflow: 'hidden',
    },
    notesContent: {
        padding: 20,
    },
    metaRow: {
        marginBottom: 10,
    },
    titleInput: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    tagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        gap: 6,
    },
    tagPillText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    addTagWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    addTagInput: {
        marginLeft: 5,
        fontSize: 12,
        minWidth: 60,
    },
    notesInput: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        minHeight: 200,
        textAlignVertical: 'top',
    },
});
