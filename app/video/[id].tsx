import TapTempoButton from "@/components/TapTempoButton";
import { getVideos, updateVideo } from "@/services/storage";
import { LoopBookmark, VideoItem } from "@/types";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import uuid from 'react-native-uuid';

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

    // Loop & Beat State
    const [bpm, setBpm] = useState(120);
    const [phaseMillis, setPhaseMillis] = useState(0);
    const [loopLengthBeats, setLoopLengthBeats] = useState(8);
    const [loopStartMillis, setLoopStartMillis] = useState(0);
    const [loopEnabled, setLoopEnabled] = useState(true);
    const [loopBookmarks, setLoopBookmarks] = useState<LoopBookmark[]>([]);
    const [loopBarWidth, setLoopBarWidth] = useState(0);
    const loopDragStart = useRef({ loopStart: 0 });
    const loopDragValue = useRef(0);
    const loopBarWidthRef = useRef(loopBarWidth);
    const loopStartRef = useRef(loopStartMillis);
    const durationRef = useRef(durationMillis);
    const phaseMillisRef = useRef(phaseMillis);
    const bpmRef = useRef(bpm);
    const loopLengthRef = useRef(loopLengthBeats);
    const loopDurationRef = useRef(0);
    const loopWindowWidthRef = useRef(0);

    // Metadata State (Notes)
    const [memo, setMemo] = useState("");
    const [title, setTitle] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [availableTags, setAvailableTags] = useState<string[]>([]);

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
            setBpm(Math.max(20, found.bpm || 120));
            setPhaseMillis(found.phaseMillis || 0);
            setLoopLengthBeats(found.loopLengthBeats || 8);
            setLoopStartMillis(found.loopStartMillis || 0);
            setLoopBookmarks(found.loopBookmarks || []);
            const tagSet = new Set<string>();
            videos.forEach((video) => {
                (video.tags || []).forEach((tag) => tagSet.add(tag));
            });
            setAvailableTags(Array.from(tagSet).sort((a, b) => a.localeCompare(b)));
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
            const updated = {
                ...videoItem,
                memo,
                title,
                tags,
                bpm,
                phaseMillis,
                loopLengthBeats,
                loopStartMillis,
                loopBookmarks,
                updatedAt: Date.now(),
            };
            await updateVideo(updated);
            setVideoItem(updated);
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [memo, title, tags, bpm, phaseMillis, loopLengthBeats, loopStartMillis, loopBookmarks]);

    const LOOP_EPSILON_MS = 50;
    const getBeatDuration = () => 60000 / bpm;
    const getLoopDuration = () => getBeatDuration() * loopLengthBeats;
    const loopDurationMillis = getLoopDuration();

    const clampLoopStart = (value: number) => {
        const loopDuration = getLoopDuration();
        const maxStart = Math.max(0, durationMillis - loopDuration);
        return Math.min(Math.max(value, 0), maxStart);
    };

    useEffect(() => {
        setLoopStartMillis((current) => clampLoopStart(current));
    }, [durationMillis, bpm, loopLengthBeats, phaseMillis]);

    useEffect(() => {
        loopStartRef.current = loopStartMillis;
    }, [loopStartMillis]);

    useEffect(() => {
        loopBarWidthRef.current = loopBarWidth;
    }, [loopBarWidth]);

    useEffect(() => {
        durationRef.current = durationMillis;
    }, [durationMillis]);

    useEffect(() => {
        phaseMillisRef.current = phaseMillis;
    }, [phaseMillis]);

    useEffect(() => {
        bpmRef.current = bpm;
    }, [bpm]);

    useEffect(() => {
        loopLengthRef.current = loopLengthBeats;
    }, [loopLengthBeats]);

    useEffect(() => {
        loopDurationRef.current = getLoopDuration();
    }, [bpm, loopLengthBeats]);

    const loopWindowWidth = useMemo(() => {
        if (!durationMillis || loopBarWidth === 0) return 0;
        const ratio = loopDurationMillis / durationMillis;
        if (!Number.isFinite(ratio)) return 0;
        return Math.min(loopBarWidth, Math.max(24, ratio * loopBarWidth));
    }, [durationMillis, loopDurationMillis, loopBarWidth]);

    useEffect(() => {
        loopWindowWidthRef.current = loopWindowWidth;
    }, [loopWindowWidth]);

    const loopWindowLeft = useMemo(() => {
        if (!durationMillis || loopBarWidth === 0) return 0;
        const rawLeft = (loopStartMillis / durationMillis) * loopBarWidth;
        const maxLeft = Math.max(0, loopBarWidth - loopWindowWidth);
        return Math.min(Math.max(rawLeft, 0), maxLeft);
    }, [durationMillis, loopBarWidth, loopStartMillis, loopWindowWidth]);

    const playheadLeft = useMemo(() => {
        if (!durationMillis || loopBarWidth === 0) return 0;
        const rawLeft = (positionMillis / durationMillis) * loopBarWidth;
        return Math.min(Math.max(rawLeft, 0), loopBarWidth);
    }, [durationMillis, loopBarWidth, positionMillis]);

    const clampLoopStartFromRefs = (value: number) => {
        const loopDuration = loopDurationRef.current;
        const maxStart = Math.max(0, durationRef.current - loopDuration);
        return Math.min(Math.max(value, 0), maxStart);
    };

    const snapLoopStartFromRefs = (value: number) => {
        const beat = 60000 / Math.max(1, bpmRef.current);
        const beatsFromPhase = Math.round((value - phaseMillisRef.current) / beat);
        const snapped = phaseMillisRef.current + beatsFromPhase * beat;
        return clampLoopStartFromRefs(snapped);
    };

    const loopPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () =>
                durationRef.current > 0 && loopBarWidthRef.current > 0,
            onMoveShouldSetPanResponder: () =>
                durationRef.current > 0 && loopBarWidthRef.current > 0,
            onPanResponderGrant: () => {
                loopDragStart.current = { loopStart: loopStartRef.current };
                loopDragValue.current = loopStartRef.current;
            },
            onPanResponderMove: (_event, gestureState) => {
                const barWidth = loopBarWidthRef.current;
                const duration = durationRef.current;
                const windowWidth = loopWindowWidthRef.current;
                if (barWidth <= 0 || duration <= 0) return;
                const maxLeft = Math.max(0, barWidth - windowWidth);
                const currentLeft = (loopDragStart.current.loopStart / duration) * barWidth;
                const nextLeft = Math.min(Math.max(currentLeft + gestureState.dx, 0), maxLeft);
                const nextStart = clampLoopStartFromRefs((nextLeft / barWidth) * duration);
                loopDragValue.current = nextStart;
                setLoopStartMillis(nextStart);
            },
            onPanResponderRelease: () => {
                setLoopStartMillis(snapLoopStartFromRefs(loopDragValue.current));
            },
            onPanResponderTerminate: () => {
                setLoopStartMillis(snapLoopStartFromRefs(loopDragValue.current));
            },
        })
    ).current;


    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setStatus(status);
        setPositionMillis(status.positionMillis);
        setDurationMillis(status.durationMillis || 0);
        setIsPlaying(status.isPlaying);

        const loopDuration = getLoopDuration();
        const loopEnd = loopStartMillis + loopDuration;
        if (loopEnabled && loopDuration > 0 && status.positionMillis >= loopEnd - LOOP_EPSILON_MS) {
            videoRef.current?.setPositionAsync(loopStartMillis);
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

    const handleTapTempo = (nextBpm: number) => {
        setBpm(Math.max(20, nextBpm));
    };

    const adjustBpm = (delta: number) => {
        setBpm((current) => Math.max(20, current + delta));
    };

    const handleSetPhase = () => {
        setPhaseMillis(positionMillis);
    };

    const handleSaveBookmark = () => {
        if (!durationMillis) {
            Alert.alert("Bookmark Error", "Video duration is not available yet.");
            return;
        }
        const loopDuration = getLoopDuration();
        if (loopStartMillis + loopDuration > durationMillis) {
            Alert.alert("Bookmark Error", "Loop window exceeds video duration.");
            return;
        }

        const bookmark: LoopBookmark = {
            id: uuid.v4() as string,
            bpm,
            phaseMillis,
            loopLengthBeats,
            loopStartMillis,
            createdAt: Date.now(),
        };
        setLoopBookmarks((current) => [bookmark, ...current]);
    };

    const applyBookmark = (bookmark: LoopBookmark) => {
        setBpm(bookmark.bpm);
        setPhaseMillis(bookmark.phaseMillis);
        setLoopLengthBeats(bookmark.loopLengthBeats);
        setLoopStartMillis(bookmark.loopStartMillis);
        setLoopEnabled(true);
        videoRef.current?.setPositionAsync(bookmark.loopStartMillis);
        videoRef.current?.playAsync();
    };

    // Tag Management
    const addTag = (rawTag?: string) => {
        const candidate = (rawTag ?? newTag).trim().replace(/^#/, "");
        if (!candidate) return;
        const normalizedCandidate = candidate.toLowerCase();
        if (tags.some((tag) => tag.toLowerCase() === normalizedCandidate)) {
            setNewTag("");
            return;
        }
        const updatedTags = [...tags, candidate];
        setTags(updatedTags);
        setNewTag("");
        if (!availableTags.some((tag) => tag.toLowerCase() === normalizedCandidate)) {
            setAvailableTags((current) =>
                [...current, candidate].sort((a, b) => a.localeCompare(b))
            );
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const tagSuggestions = availableTags.filter((tag) => {
        const query = newTag.trim().replace(/^#/, "").toLowerCase();
        if (!query) return false;
        if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return false;
        return tag.toLowerCase().includes(query);
    }).slice(0, 6);


    if (loading || !videoItem) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    const canPlayNative = videoItem.uri.startsWith('file://')
        || videoItem.uri.includes('.mp4')
        || videoItem.uri.includes('.mov');

    const isLandscape = orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
    const loopEndMillis = loopStartMillis + loopDurationMillis;

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
                            isLooping={false}
                            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                            rate={rate}
                            shouldCorrectPitch
                        />
                    ) : (
                        // Placeholder for unsupported format
                        <View style={styles.webPlaceholder}>
                            <MaterialCommunityIcons name="video-off" size={64} color="#666" />
                            <Text style={{ color: '#999' }}>Unsupported video format</Text>
                        </View>
                    )}

                    {/* OVERLAY CONTROLS */}
                    {controlsVisible && (
                        <Pressable style={styles.overlay} onPress={handleVideoTap}>
                            <LinearGradient
                                colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.7)']}
                                style={styles.overlayGradient}
                            >
                                {/* Top Row: Back & Title */}
                                <View style={styles.topControlRow}>
                                    <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                                        <MaterialCommunityIcons name="chevron-down" size={32} color="white" />
                                    </Pressable>
                                    <Text style={styles.overlayTitle} numberOfLines={1}>{title || "Untitled"}</Text>
                                    <View style={styles.iconBtn} />
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
                                        <Pressable style={styles.toolItem} onPress={() => { const rates = [0.25, 0.5, 0.75, 1.0]; const idx = rates.indexOf(rate); setRate(rates[(idx + 1) % 4]); }}>
                                            <MaterialCommunityIcons name="speedometer" size={24} color={rate !== 1.0 ? "#FF0000" : "white"} />
                                            <Text style={styles.toolText}>{rate}x</Text>
                                        </Pressable>

                                        {/* Mirror */}
                                        <Pressable style={styles.toolItem} onPress={() => setIsMirrored(!isMirrored)}>
                                            <MaterialCommunityIcons name="swap-horizontal" size={24} color={isMirrored ? "#FF0000" : "white"} />
                                            <Text style={styles.toolText}>Mirror</Text>
                                        </Pressable>

                                        {/* Loop Toggle */}
                                        <Pressable style={styles.toolItem} onPress={() => setLoopEnabled(!loopEnabled)}>
                                            <MaterialCommunityIcons name={loopEnabled ? "repeat" : "repeat-off"} size={24} color={loopEnabled ? "#FF0000" : "white"} />
                                            <Text style={styles.toolText}>Loop</Text>
                                        </Pressable>

                                        {/* Tap Tempo */}
                                        <View style={styles.toolItem}>
                                            <TapTempoButton onSetBpm={handleTapTempo} />
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
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Loop Bookmarks</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.bookmarkRow}
                            >
                                <Pressable
                                    style={[styles.bookmarkTile, styles.bookmarkTilePrimary]}
                                    onPress={handleSaveBookmark}
                                >
                                    <View style={styles.bookmarkTileBody}>
                                        <MaterialCommunityIcons name="bookmark-plus" size={26} color="#fff" />
                                        <Text style={styles.bookmarkTileText}>Save</Text>
                                    </View>
                                    <View style={styles.bookmarkTileIconOverlay}>
                                        <MaterialCommunityIcons name="file-video" size={16} color="white" />
                                    </View>
                                </Pressable>
                                {loopBookmarks.map((bookmark) => (
                                    <Pressable
                                        key={bookmark.id}
                                        style={styles.bookmarkTile}
                                        onPress={() => applyBookmark(bookmark)}
                                    >
                                        <View style={styles.bookmarkTileBody}>
                                            <Text style={styles.bookmarkTileTitle}>{bookmark.loopLengthBeats} counts</Text>
                                            <Text style={styles.bookmarkTileSub}>{bookmark.bpm} BPM</Text>
                                            <Text style={styles.bookmarkTileSub}>
                                                {formatTime(bookmark.loopStartMillis)}
                                            </Text>
                                        </View>
                                        <View style={styles.bookmarkTileIconOverlay}>
                                            <MaterialCommunityIcons name="file-video" size={16} color="white" />
                                        </View>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Loop Controls</Text>
                            <View style={styles.bpmRow}>
                                <Pressable style={styles.bpmButton} onPress={() => adjustBpm(-1)}>
                                    <MaterialCommunityIcons name="minus" size={18} color="#fff" />
                                </Pressable>
                                <Text style={styles.bpmValue}>{bpm} BPM</Text>
                                <Pressable style={styles.bpmButton} onPress={() => adjustBpm(1)}>
                                    <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                                </Pressable>
                                <Pressable style={styles.phaseButton} onPress={handleSetPhase}>
                                    <Text style={styles.phaseButtonText}>Here is 1</Text>
                                </Pressable>
                            </View>

                            <View style={styles.loopLengthRow}>
                                {[4, 8, 16, 32].map((beats) => (
                                    <Pressable
                                        key={beats}
                                        style={[
                                            styles.loopLengthButton,
                                            loopLengthBeats === beats && styles.loopLengthButtonActive,
                                        ]}
                                        onPress={() => setLoopLengthBeats(beats)}
                                    >
                                        <Text
                                            style={[
                                                styles.loopLengthText,
                                                loopLengthBeats === beats && styles.loopLengthTextActive,
                                            ]}
                                        >
                                            {beats} counts
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            <View style={styles.loopSliderRow}>
                                <View style={styles.loopSliderHeader}>
                                    <Text style={styles.loopSliderLabel}>Loop window</Text>
                                    <Text style={styles.loopSliderValue}>
                                        {formatTime(loopStartMillis)} - {formatTime(loopEndMillis)}
                                    </Text>
                                </View>
                                <View
                                    style={styles.loopTrack}
                                    onLayout={(event) => {
                                        setLoopBarWidth(event.nativeEvent.layout.width);
                                    }}
                                    {...loopPanResponder.panHandlers}
                                >
                                    <View style={styles.loopTrackBackground} />
                                    <View
                                        style={[
                                            styles.loopWindow,
                                            {
                                                width: loopWindowWidth,
                                                left: loopWindowLeft,
                                            },
                                        ]}
                                    />
                                    <View style={[styles.loopPlayhead, { left: playheadLeft }]} />
                                </View>
                            </View>
                        </View>

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
                                    onSubmitEditing={() => addTag()}
                                />
                            </View>
                        </View>
                        {tagSuggestions.length > 0 && (
                            <View style={styles.suggestionsRow}>
                                {tagSuggestions.map((tag) => (
                                    <Pressable
                                        key={tag}
                                        style={styles.suggestionPill}
                                        onPress={() => addTag(tag)}
                                    >
                                        <Text style={styles.suggestionText}>#{tag}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}

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
        gap: 16,
    },
    section: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111',
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
    suggestionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: -10,
        marginBottom: 10,
    },
    suggestionPill: {
        backgroundColor: '#eee',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    suggestionText: {
        color: '#333',
        fontSize: 12,
        fontWeight: '600',
    },
    notesInput: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        minHeight: 200,
        textAlignVertical: 'top',
    },
    bookmarkRow: {
        gap: 10,
        paddingRight: 10,
    },
    bookmarkTile: {
        width: 110,
        height: 110,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: '#000',
        backgroundColor: '#333',
        overflow: 'hidden',
    },
    bookmarkTilePrimary: {
        backgroundColor: '#111',
    },
    bookmarkTileBody: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        padding: 12,
    },
    bookmarkTileText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    bookmarkTileTitle: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    bookmarkTileSub: {
        color: '#bbb',
        fontSize: 11,
    },
    bookmarkTileIconOverlay: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 4,
        padding: 2,
    },
    bpmRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    bpmButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bpmValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
    },
    phaseButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    phaseButtonText: {
        color: '#111',
        fontWeight: '600',
        fontSize: 12,
    },
    loopLengthRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    loopLengthButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    loopLengthButtonActive: {
        backgroundColor: '#111',
        borderColor: '#111',
    },
    loopLengthText: {
        color: '#111',
        fontSize: 12,
        fontWeight: '600',
    },
    loopLengthTextActive: {
        color: '#fff',
    },
    loopSliderRow: {
        gap: 6,
    },
    loopSliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    loopSliderLabel: {
        color: '#111',
        fontSize: 12,
        fontWeight: '600',
    },
    loopSliderValue: {
        color: '#666',
        fontSize: 12,
    },
    loopTrack: {
        width: '100%',
        height: 28,
        borderRadius: 8,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    loopTrackBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    loopWindow: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: 6,
        backgroundColor: 'rgba(17,17,17,0.9)',
    },
    loopPlayhead: {
        position: 'absolute',
        top: 2,
        bottom: 2,
        width: 2,
        backgroundColor: '#ff3b30',
    },
});
