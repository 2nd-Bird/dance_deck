import LibraryTile from "@/components/LibraryTile";
import TapTempoButton from "@/components/TapTempoButton";
import { getVideos, updateVideo } from "@/services/storage";
import { LoopBookmark, VideoItem } from "@/types";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import uuid from 'react-native-uuid';

export default function VideoPlayerScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const videoRef = useRef<Video>(null);

    const [videoItem, setVideoItem] = useState<VideoItem | null>(null);
    const [loading, setLoading] = useState(true);

    // Playback State
    const [positionMillis, setPositionMillis] = useState(0);
    const [durationMillis, setDurationMillis] = useState(0);
    const [rate, setRate] = useState(1.0);
    const [isMirrored, setIsMirrored] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(false);

    // Orientation State
    const [orientation, setOrientation] = useState(ScreenOrientation.Orientation.PORTRAIT_UP);
    const { width: windowWidth } = useWindowDimensions();

    // Loop & Beat State
    const [bpm, setBpm] = useState(120);
    const [phaseMillis, setPhaseMillis] = useState(0);
    const [loopLengthBeats, setLoopLengthBeats] = useState(8);
    const [loopStartMillis, setLoopStartMillis] = useState(0);
    const [loopEnabled, setLoopEnabled] = useState(true);
    const [loopBookmarks, setLoopBookmarks] = useState<LoopBookmark[]>([]);
    const [timelineWidth, setTimelineWidth] = useState(0);
    const [activeLoopDrag, setActiveLoopDrag] = useState<null | "start" | "end" | "range">(null);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubPositionMillis, setScrubPositionMillis] = useState(0);
    const [showBpmTools, setShowBpmTools] = useState(false);
    const loopDragStart = useRef({ start: 0, end: 0 });
    const timelineWidthRef = useRef(timelineWidth);
    const playheadDragStart = useRef(0);
    const scrubPositionRef = useRef(0);
    const loopStartRef = useRef(loopStartMillis);
    const durationRef = useRef(durationMillis);
    const bpmRef = useRef(bpm);
    const loopDurationRef = useRef(0);

    // Metadata State (Notes)
    const [memo, setMemo] = useState("");
    const [title, setTitle] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [availableTags, setAvailableTags] = useState<string[]>([]);

    // Save debouncing
    const saveTimeoutRef = useRef<any>(null);

    const loadVideo = useCallback(async () => {
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
    }, [id, router]);

    useEffect(() => {
        loadVideo();
    }, [loadVideo]);

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
    }, [memo, title, tags, bpm, phaseMillis, loopLengthBeats, loopStartMillis, loopBookmarks, videoItem]);

    const LOOP_EPSILON_MS = 50;
    const LOOP_HANDLE_WIDTH = 24;
    const getBeatDuration = useCallback(() => 60000 / bpm, [bpm]);
    const getLoopDuration = useCallback(
        () => getBeatDuration() * loopLengthBeats,
        [getBeatDuration, loopLengthBeats]
    );
    const loopDurationMillis = getLoopDuration();
    const loopEndMillis = loopStartMillis + loopDurationMillis;

    const clampLoopStart = useCallback(
        (value: number) => {
            const loopDuration = getLoopDuration();
            const maxStart = Math.max(0, durationMillis - loopDuration);
            return Math.min(Math.max(value, 0), maxStart);
        },
        [durationMillis, getLoopDuration]
    );

    useEffect(() => {
        setLoopStartMillis((current) => clampLoopStart(current));
    }, [clampLoopStart, durationMillis, bpm, loopLengthBeats, phaseMillis]);

    useEffect(() => {
        loopStartRef.current = loopStartMillis;
    }, [loopStartMillis]);

    useEffect(() => {
        timelineWidthRef.current = timelineWidth;
    }, [timelineWidth]);

    useEffect(() => {
        durationRef.current = durationMillis;
    }, [durationMillis]);

    useEffect(() => {
        bpmRef.current = bpm;
    }, [bpm]);

    useEffect(() => {
        loopDurationRef.current = getLoopDuration();
    }, [getLoopDuration]);

    const getMinLoopDurationFromRefs = () => {
        const duration = durationRef.current;
        if (duration <= 0) return 0;
        const beat = 60000 / Math.max(1, bpmRef.current);
        return Math.min(duration, Math.max(250, beat * 0.5));
    };

    const clampLoopStartForDuration = (value: number, loopDuration: number) => {
        const maxStart = Math.max(0, durationMillis - loopDuration);
        return Math.min(Math.max(value, 0), maxStart);
    };

    const getPositionFromX = (x: number) => {
        const width = timelineWidthRef.current;
        const duration = durationRef.current;
        if (width <= 0 || duration <= 0) return 0;
        const clamped = Math.min(Math.max(x, 0), width);
        return (clamped / width) * duration;
    };

    const displayPositionMillis = isScrubbing ? scrubPositionMillis : positionMillis;

    const playheadLeft = useMemo(() => {
        if (!durationMillis || timelineWidth === 0) return 0;
        const rawLeft = (displayPositionMillis / durationMillis) * timelineWidth;
        return Math.min(Math.max(rawLeft, 0), timelineWidth);
    }, [durationMillis, timelineWidth, displayPositionMillis]);

    const loopStartLeft = useMemo(() => {
        if (!durationMillis || timelineWidth === 0) return 0;
        const rawLeft = (loopStartMillis / durationMillis) * timelineWidth;
        return Math.min(Math.max(rawLeft, 0), timelineWidth);
    }, [durationMillis, timelineWidth, loopStartMillis]);

    const loopEndLeft = useMemo(() => {
        if (!durationMillis || timelineWidth === 0) return 0;
        const rawLeft = (loopEndMillis / durationMillis) * timelineWidth;
        return Math.min(Math.max(rawLeft, 0), timelineWidth);
    }, [durationMillis, timelineWidth, loopEndMillis]);

    const loopRangeWidth = Math.max(0, loopEndLeft - loopStartLeft);

    const playheadPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () =>
                durationRef.current > 0 && timelineWidthRef.current > 0,
            onMoveShouldSetPanResponder: () =>
                durationRef.current > 0 && timelineWidthRef.current > 0,
            onPanResponderGrant: (event) => {
                playheadDragStart.current = event.nativeEvent.locationX;
                const nextPosition = getPositionFromX(playheadDragStart.current);
                scrubPositionRef.current = nextPosition;
                setIsScrubbing(true);
                setScrubPositionMillis(nextPosition);
            },
            onPanResponderMove: (_event, gestureState) => {
                const nextX = playheadDragStart.current + gestureState.dx;
                const nextPosition = getPositionFromX(nextX);
                scrubPositionRef.current = nextPosition;
                setScrubPositionMillis(nextPosition);
            },
            onPanResponderRelease: () => {
                setIsScrubbing(false);
                videoRef.current?.setPositionAsync(scrubPositionRef.current);
            },
            onPanResponderTerminate: () => {
                setIsScrubbing(false);
                videoRef.current?.setPositionAsync(scrubPositionRef.current);
            },
        })
    ).current;

    const loopStartPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () =>
                durationRef.current > 0 && timelineWidthRef.current > 0,
            onMoveShouldSetPanResponder: () =>
                durationRef.current > 0 && timelineWidthRef.current > 0,
            onPanResponderGrant: () => {
                setActiveLoopDrag("start");
                loopDragStart.current = {
                    start: loopStartRef.current,
                    end: loopStartRef.current + loopDurationRef.current,
                };
            },
            onPanResponderMove: (_event, gestureState) => {
                const width = timelineWidthRef.current;
                const duration = durationRef.current;
                if (width <= 0 || duration <= 0) return;
                const delta = (gestureState.dx / width) * duration;
                const minDuration = getMinLoopDurationFromRefs();
                const end = loopDragStart.current.end;
                const nextStart = loopDragStart.current.start + delta;
                const clampedStart = Math.min(Math.max(nextStart, 0), Math.max(0, end - minDuration));
                const nextDuration = Math.max(minDuration, end - clampedStart);
                setLoopStartMillis(clampedStart);
                setLoopLengthBeats(nextDuration / (60000 / Math.max(1, bpmRef.current)));
            },
            onPanResponderRelease: () => {
                setActiveLoopDrag(null);
            },
            onPanResponderTerminate: () => {
                setActiveLoopDrag(null);
            },
        })
    ).current;

    const loopEndPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () =>
                durationRef.current > 0 && timelineWidthRef.current > 0,
            onMoveShouldSetPanResponder: () =>
                durationRef.current > 0 && timelineWidthRef.current > 0,
            onPanResponderGrant: () => {
                setActiveLoopDrag("end");
                loopDragStart.current = {
                    start: loopStartRef.current,
                    end: loopStartRef.current + loopDurationRef.current,
                };
            },
            onPanResponderMove: (_event, gestureState) => {
                const width = timelineWidthRef.current;
                const duration = durationRef.current;
                if (width <= 0 || duration <= 0) return;
                const delta = (gestureState.dx / width) * duration;
                const minDuration = getMinLoopDurationFromRefs();
                const start = loopDragStart.current.start;
                const nextEnd = loopDragStart.current.end + delta;
                const clampedEnd = Math.min(
                    Math.max(nextEnd, start + minDuration),
                    duration
                );
                const nextDuration = Math.max(minDuration, clampedEnd - start);
                setLoopLengthBeats(nextDuration / (60000 / Math.max(1, bpmRef.current)));
            },
            onPanResponderRelease: () => {
                setActiveLoopDrag(null);
            },
            onPanResponderTerminate: () => {
                setActiveLoopDrag(null);
            },
        })
    ).current;

    const loopRangePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () =>
                durationRef.current > 0 && timelineWidthRef.current > 0,
            onMoveShouldSetPanResponder: () =>
                durationRef.current > 0 && timelineWidthRef.current > 0,
            onPanResponderGrant: () => {
                setActiveLoopDrag("range");
                loopDragStart.current = {
                    start: loopStartRef.current,
                    end: loopStartRef.current + loopDurationRef.current,
                };
            },
            onPanResponderMove: (_event, gestureState) => {
                const width = timelineWidthRef.current;
                const duration = durationRef.current;
                if (width <= 0 || duration <= 0) return;
                const delta = (gestureState.dx / width) * duration;
                const length = loopDragStart.current.end - loopDragStart.current.start;
                let nextStart = loopDragStart.current.start + delta;
                nextStart = Math.min(Math.max(nextStart, 0), Math.max(0, duration - length));
                setLoopStartMillis(nextStart);
            },
            onPanResponderRelease: () => {
                setActiveLoopDrag(null);
            },
            onPanResponderTerminate: () => {
                setActiveLoopDrag(null);
            },
        })
    ).current;


    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
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

    const formatCounts = (beats: number) => {
        const rounded = Math.round(beats);
        if (Math.abs(beats - rounded) < 0.05) return `${rounded}`;
        return beats.toFixed(1);
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

    const handleSelectLoopLength = (beats: number) => {
        const beatDuration = 60000 / Math.max(1, bpm);
        const loopDuration = beatDuration * beats;
        const safeDuration = durationMillis ? Math.min(loopDuration, durationMillis) : loopDuration;
        const adjustedBeats = safeDuration / beatDuration;
        const basePosition = Number.isFinite(positionMillis) && positionMillis > 0 ? positionMillis : loopStartMillis;
        const nextStart = clampLoopStartForDuration(basePosition, safeDuration);
        setLoopLengthBeats(adjustedBeats);
        setLoopStartMillis(nextStart);
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
    const bookmarkTileSize = Math.min(140, Math.max(96, windowWidth / 3));

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
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Loop</Text>
                                <Pressable
                                    style={styles.bpmToggle}
                                    onPress={() => setShowBpmTools((current) => !current)}
                                >
                                    <MaterialCommunityIcons name="metronome" size={16} color="#111" />
                                    <Text style={styles.bpmToggleText}>{bpm} BPM</Text>
                                    <MaterialCommunityIcons
                                        name={showBpmTools ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color="#111"
                                    />
                                </Pressable>
                            </View>
                            {showBpmTools && (
                                <View style={styles.bpmPanel}>
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
                                    <View style={styles.bpmTapRow}>
                                        <TapTempoButton onSetBpm={handleTapTempo} label="Tap Tempo" tone="dark" />
                                    </View>
                                </View>
                            )}

                            <View style={styles.loopLengthRow}>
                                {[4, 8, 16, 32].map((beats) => {
                                    const isActive = Math.abs(loopLengthBeats - beats) < 0.01;
                                    return (
                                        <Pressable
                                            key={beats}
                                            style={[
                                                styles.loopLengthButton,
                                                isActive && styles.loopLengthButtonActive,
                                            ]}
                                            onPress={() => handleSelectLoopLength(beats)}
                                        >
                                            <Text
                                                style={[
                                                    styles.loopLengthText,
                                                    isActive && styles.loopLengthTextActive,
                                                ]}
                                            >
                                                {beats} counts
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <View style={styles.timelineSection}>
                                <View style={styles.timelineHeader}>
                                    <Text style={styles.timelineLabel}>Timeline</Text>
                                    <Text style={styles.timelineValue}>
                                        {formatTime(loopStartMillis)} - {formatTime(loopEndMillis)}
                                    </Text>
                                </View>
                                <View
                                    style={styles.timelineTrack}
                                    onLayout={(event) => setTimelineWidth(event.nativeEvent.layout.width)}
                                >
                                    <View style={styles.timelineBase} />
                                    <View style={styles.playheadScrubArea} {...playheadPanResponder.panHandlers} />
                                    <View
                                        style={[
                                            styles.loopRange,
                                            activeLoopDrag && styles.loopRangeActive,
                                            {
                                                left: loopStartLeft,
                                                width: loopRangeWidth,
                                            },
                                        ]}
                                        {...loopRangePanResponder.panHandlers}
                                    />
                                    <View
                                        style={[
                                            styles.loopHandle,
                                            styles.loopHandleLeft,
                                            activeLoopDrag === "start" && styles.loopHandleActive,
                                            {
                                                left: Math.max(0, loopStartLeft - LOOP_HANDLE_WIDTH / 2),
                                            },
                                        ]}
                                        {...loopStartPanResponder.panHandlers}
                                    >
                                        <View style={styles.loopHandleGrip} />
                                    </View>
                                    <View
                                        style={[
                                            styles.loopHandle,
                                            styles.loopHandleRight,
                                            activeLoopDrag === "end" && styles.loopHandleActive,
                                            {
                                                left: Math.min(
                                                    Math.max(0, timelineWidth - LOOP_HANDLE_WIDTH),
                                                    loopEndLeft - LOOP_HANDLE_WIDTH / 2
                                                ),
                                            },
                                        ]}
                                        {...loopEndPanResponder.panHandlers}
                                    >
                                        <View style={styles.loopHandleGrip} />
                                    </View>
                                    <View style={[styles.playhead, { left: playheadLeft }]} />
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Loop Bookmarks</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.bookmarkRow}
                            >
                                <LibraryTile
                                    width={bookmarkTileSize}
                                    thumbnailUri={videoItem.thumbnailUri}
                                    onPress={handleSaveBookmark}
                                >
                                    <View style={[styles.bookmarkOverlay, styles.bookmarkOverlayPrimary]}>
                                        <MaterialCommunityIcons name="bookmark-plus" size={20} color="#fff" />
                                        <Text style={styles.bookmarkOverlayText}>Save</Text>
                                    </View>
                                </LibraryTile>
                                {loopBookmarks.map((bookmark) => (
                                    <LibraryTile
                                        key={bookmark.id}
                                        width={bookmarkTileSize}
                                        thumbnailUri={videoItem.thumbnailUri}
                                        onPress={() => applyBookmark(bookmark)}
                                    >
                                        <View style={styles.bookmarkOverlay}>
                                            <Text style={styles.bookmarkOverlayTitle}>
                                                {formatCounts(bookmark.loopLengthBeats)} counts
                                            </Text>
                                            <Text style={styles.bookmarkOverlaySub}>{bookmark.bpm} BPM</Text>
                                        </View>
                                    </LibraryTile>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Metadata</Text>
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
                        </View>

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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111',
    },
    bpmToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#f1f1f1',
    },
    bpmToggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#111',
    },
    bpmPanel: {
        gap: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f8f8f8',
        borderWidth: 1,
        borderColor: '#eee',
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
    bookmarkOverlay: {
        position: 'absolute',
        left: 6,
        right: 6,
        bottom: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        gap: 2,
    },
    bookmarkOverlayPrimary: {
        top: 6,
        bottom: 6,
        justifyContent: 'center',
    },
    bookmarkOverlayText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    bookmarkOverlayTitle: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    bookmarkOverlaySub: {
        color: '#ddd',
        fontSize: 10,
        fontWeight: '600',
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
    bpmTapRow: {
        alignItems: 'flex-start',
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
    timelineSection: {
        gap: 8,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timelineLabel: {
        color: '#111',
        fontSize: 12,
        fontWeight: '600',
    },
    timelineValue: {
        color: '#666',
        fontSize: 12,
    },
    timelineTrack: {
        width: '100%',
        height: 56,
        borderRadius: 12,
        backgroundColor: '#f2f2f2',
        justifyContent: 'center',
        overflow: 'visible',
    },
    timelineBase: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e2e2',
        backgroundColor: '#f7f7f7',
    },
    playheadScrubArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 16,
        zIndex: 3,
    },
    loopRange: {
        position: 'absolute',
        top: 14,
        bottom: 6,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#f5c842',
        backgroundColor: 'rgba(245,200,66,0.18)',
    },
    loopRangeActive: {
        borderColor: '#f0b429',
        backgroundColor: 'rgba(245,200,66,0.28)',
        shadowColor: '#f0b429',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
    loopHandle: {
        position: 'absolute',
        top: 10,
        width: 24,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#f5c842',
        borderWidth: 1,
        borderColor: '#d8a700',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4,
    },
    loopHandleLeft: {
        borderTopRightRadius: 6,
        borderBottomRightRadius: 6,
    },
    loopHandleRight: {
        borderTopLeftRadius: 6,
        borderBottomLeftRadius: 6,
    },
    loopHandleActive: {
        backgroundColor: '#f0b429',
        borderColor: '#c98f00',
    },
    loopHandleGrip: {
        width: 2,
        height: 18,
        borderRadius: 1,
        backgroundColor: '#7a5b00',
    },
    playhead: {
        position: 'absolute',
        top: 6,
        bottom: 6,
        width: 2,
        backgroundColor: '#ff3b30',
        zIndex: 2,
    },
});
