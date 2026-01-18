import LibraryTile from "@/components/LibraryTile";
import PaywallModal from "@/components/PaywallModal";
import TapTempoButton from "@/components/TapTempoButton";
import { useProStatus } from "@/contexts/ProContext";
import { isProRequired } from "@/services/proGating";
import { trackEvent } from "@/services/analytics";
import { getVideos, updateVideo } from "@/services/storage";
import { LoopBookmark, VideoItem } from "@/types";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as VideoThumbnails from 'expo-video-thumbnails';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, LayoutAnimation, PanResponder, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
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
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [skipFeedback, setSkipFeedback] = useState<null | { x: number; y: number; label: string; key: number }>(null);

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
    const [bookmarkThumbs, setBookmarkThumbs] = useState<Record<string, string>>({});
    const [timelineWidth, setTimelineWidth] = useState(0);
    const [activeLoopDrag, setActiveLoopDrag] = useState<null | "start" | "end" | "range">(null);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubPositionMillis, setScrubPositionMillis] = useState(0);
    const [showBpmTools, setShowBpmTools] = useState(false);
    const [timelineThumbs, setTimelineThumbs] = useState<string[]>([]);
    const DEBUG_TIMELINE_TOUCH = __DEV__;
    const [debugTouchActive, setDebugTouchActive] = useState({
        playhead: false,
        range: false,
        start: false,
        end: false,
    });
    const loopDragStart = useRef({ start: 0, end: 0 });
    const timelineWidthRef = useRef(timelineWidth);
    const playheadDragStart = useRef(0);
    const scrubPositionRef = useRef(0);
    const loopStartRef = useRef(loopStartMillis);
    const durationRef = useRef(durationMillis);
    const positionRef = useRef(positionMillis);
    const bpmRef = useRef(bpm);
    const loopDurationRef = useRef(0);
    const timelineThumbsKeyRef = useRef("");
    const bookmarkThumbsRef = useRef<Record<string, string>>({});
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const overlayHideTimeoutRef = useRef<any>(null);
    const tapTimeoutRef = useRef<any>(null);
    const lastTapRef = useRef(0);
    const videoLayoutRef = useRef({ width: 0, height: 0 });
    const playControlCenterYRef = useRef<number | null>(null);
    const skipFeedbackAnim = useRef(new Animated.Value(0)).current;

    // Metadata State (Notes)
    const [memo, setMemo] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const { isPro } = useProStatus();

    // Save debouncing
    const saveTimeoutRef = useRef<any>(null);

    const setDebugActive = useCallback(
        (key: "playhead" | "range" | "start" | "end", active: boolean) => {
            if (!DEBUG_TIMELINE_TOUCH) return;
            setDebugTouchActive((current) => {
                if (current[key] === active) return current;
                return { ...current, [key]: active };
            });
        },
        [DEBUG_TIMELINE_TOUCH]
    );

    const logTimelineTouch = useCallback(
        (
            target: "playhead" | "range" | "start" | "end",
            phase: "start" | "move" | "end" | "terminate",
            event?: any,
            gestureState?: any
        ) => {
            if (!DEBUG_TIMELINE_TOUCH) return;
            const native = event?.nativeEvent;
            console.log("[TimelineTouch]", {
                target,
                phase,
                x: native?.locationX,
                y: native?.locationY,
                dx: gestureState?.dx,
                dy: gestureState?.dy,
            });
        },
        [DEBUG_TIMELINE_TOUCH]
    );

    const loadVideo = useCallback(async () => {
        const videos = await getVideos();
        const found = videos.find(v => v.id === id);
        if (found) {
            setVideoItem(found);
            setMemo(found.memo || "");
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
    }, [memo, tags, bpm, phaseMillis, loopLengthBeats, loopStartMillis, loopBookmarks, videoItem]);

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
        positionRef.current = positionMillis;
    }, [positionMillis]);

    useEffect(() => {
        bpmRef.current = bpm;
    }, [bpm]);

    useEffect(() => {
        loopDurationRef.current = getLoopDuration();
    }, [getLoopDuration]);

    useEffect(() => {
        if (!controlsVisible && overlayVisible) {
            setOverlayVisible(false);
        }
    }, [controlsVisible, overlayVisible]);

    useEffect(() => {
        Animated.timing(overlayOpacity, {
            toValue: overlayVisible ? 1 : 0,
            duration: overlayVisible ? 160 : 220,
            useNativeDriver: true,
        }).start();
    }, [overlayVisible, overlayOpacity]);

    useEffect(() => {
        if (overlayHideTimeoutRef.current) {
            clearTimeout(overlayHideTimeoutRef.current);
            overlayHideTimeoutRef.current = null;
        }
        if (!overlayVisible || !isPlaying) return;
        overlayHideTimeoutRef.current = setTimeout(() => {
            setOverlayVisible(false);
        }, 1600);
        return () => {
            if (overlayHideTimeoutRef.current) {
                clearTimeout(overlayHideTimeoutRef.current);
                overlayHideTimeoutRef.current = null;
            }
        };
    }, [overlayVisible, isPlaying]);

    useEffect(() => {
        if (!skipFeedback) return;
        skipFeedbackAnim.setValue(0);
        Animated.sequence([
            Animated.timing(skipFeedbackAnim, {
                toValue: 1,
                duration: 420,
                useNativeDriver: true,
            }),
            Animated.timing(skipFeedbackAnim, {
                toValue: 0,
                duration: 240,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setSkipFeedback(null);
        });
    }, [skipFeedback, skipFeedbackAnim]);

    useEffect(() => {
        if (!videoItem?.uri || durationMillis <= 0) return;
        const key = `${videoItem.uri}:${Math.round(durationMillis)}`;
        if (timelineThumbsKeyRef.current === key) return;
        timelineThumbsKeyRef.current = key;
        let cancelled = false;
        const loadTimelineThumbs = async () => {
            const count = 12;
            const interval = durationMillis / count;
            const nextThumbs: string[] = [];
            for (let i = 0; i < count; i += 1) {
                const time = Math.min(durationMillis - 100, Math.max(0, Math.floor(i * interval)));
                try {
                    const { uri } = await VideoThumbnails.getThumbnailAsync(videoItem.uri, { time });
                    if (cancelled) return;
                    nextThumbs.push(uri);
                } catch (error) {
                    if (__DEV__) {
                        console.warn('[Timeline] thumbnail failed', error);
                    }
                }
            }
            if (!cancelled) {
                setTimelineThumbs(nextThumbs);
            }
        };
        loadTimelineThumbs();
        return () => {
            cancelled = true;
        };
    }, [videoItem?.uri, durationMillis]);

    useEffect(() => {
        bookmarkThumbsRef.current = bookmarkThumbs;
    }, [bookmarkThumbs]);

    useEffect(() => {
        if (!videoItem?.uri || loopBookmarks.length === 0) return;
        let cancelled = false;
        const loadBookmarkThumbs = async () => {
            const nextThumbs: Record<string, string> = {};
            for (const bookmark of loopBookmarks) {
                if (bookmarkThumbsRef.current[bookmark.id]) continue;
                const time = Math.max(0, Math.min(bookmark.loopStartMillis, durationRef.current || durationMillis || 0));
                try {
                    const { uri } = await VideoThumbnails.getThumbnailAsync(videoItem.uri, { time });
                    if (cancelled) return;
                    nextThumbs[bookmark.id] = uri;
                } catch (error) {
                    if (__DEV__) {
                        console.warn('[Bookmark] thumbnail failed', error);
                    }
                }
            }
            if (!cancelled && Object.keys(nextThumbs).length > 0) {
                setBookmarkThumbs((current) => ({ ...current, ...nextThumbs }));
            }
        };
        loadBookmarkThumbs();
        return () => {
            cancelled = true;
        };
    }, [videoItem?.uri, loopBookmarks, durationMillis]);

    const getMinLoopDurationFromRefs = () => {
        const duration = durationRef.current;
        if (duration <= 0) return 0;
        const beat = 60000 / Math.max(1, bpmRef.current);
        return Math.min(duration, Math.max(250, beat * 0.5));
    };

    const clampLoopStartForDuration = useCallback(
        (value: number, loopDuration: number) => {
            const maxStart = Math.max(0, durationMillis - loopDuration);
            return Math.min(Math.max(value, 0), maxStart);
        },
        [durationMillis]
    );

    const snapLoopStartToBeat = useCallback(
        (value: number, loopDuration: number) => {
            const beat = getBeatDuration();
            if (!beat || beat <= 0) return value;
            const offset = value - phaseMillis;
            const beats = Math.round(offset / beat);
            const snapped = phaseMillis + beats * beat;
            return clampLoopStartForDuration(snapped, loopDuration);
        },
        [getBeatDuration, phaseMillis, clampLoopStartForDuration]
    );

    const getPositionFromX = (x: number) => {
        const width = timelineWidthRef.current;
        const duration = durationRef.current;
        if (width <= 0 || duration <= 0) return 0;
        const clamped = Math.min(Math.max(x, 0), width);
        return (clamped / width) * duration;
    };

    const isTouchWithinLoopWindow = (x: number) => {
        const width = timelineWidthRef.current;
        const duration = durationRef.current;
        if (width <= 0 || duration <= 0) return false;
        const loopStart = loopStartRef.current;
        const loopEnd = loopStart + loopDurationRef.current;
        const startLeft = (loopStart / duration) * width;
        const endLeft = (loopEnd / duration) * width;
        const padding = LOOP_HANDLE_WIDTH;
        return x >= startLeft - padding && x <= endLeft + padding;
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

    const MIN_LOOP_TOUCH_WIDTH = 44;
    const loopRangeWidth = Math.max(0, loopEndLeft - loopStartLeft);
    const loopRangeTouchWidth = Math.min(
        timelineWidth,
        Math.max(loopRangeWidth, MIN_LOOP_TOUCH_WIDTH)
    );
    const loopRangeTouchLeft = Math.min(
        Math.max(loopStartLeft - (loopRangeTouchWidth - loopRangeWidth) / 2, 0),
        Math.max(0, timelineWidth - loopRangeTouchWidth)
    );

    const playheadPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (event) =>
                durationRef.current > 0
                && timelineWidthRef.current > 0
                && !isTouchWithinLoopWindow(event.nativeEvent.locationX),
            onMoveShouldSetPanResponder: (event) =>
                durationRef.current > 0
                && timelineWidthRef.current > 0
                && !isTouchWithinLoopWindow(event.nativeEvent.locationX),
            onPanResponderGrant: (event) => {
                logTimelineTouch("playhead", "start", event);
                setDebugActive("playhead", true);
                playheadDragStart.current = event.nativeEvent.locationX;
                const nextPosition = getPositionFromX(playheadDragStart.current);
                scrubPositionRef.current = nextPosition;
                setIsScrubbing(true);
                setScrubPositionMillis(nextPosition);
            },
            onPanResponderMove: (event, gestureState) => {
                logTimelineTouch("playhead", "move", event, gestureState);
                const nextX = playheadDragStart.current + gestureState.dx;
                const nextPosition = getPositionFromX(nextX);
                scrubPositionRef.current = nextPosition;
                setScrubPositionMillis(nextPosition);
            },
            onPanResponderRelease: () => {
                logTimelineTouch("playhead", "end");
                setDebugActive("playhead", false);
                setIsScrubbing(false);
                videoRef.current?.setPositionAsync(scrubPositionRef.current);
            },
            onPanResponderTerminate: () => {
                logTimelineTouch("playhead", "terminate");
                setDebugActive("playhead", false);
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
            onPanResponderGrant: (event) => {
                logTimelineTouch("start", "start", event);
                setDebugActive("start", true);
                setActiveLoopDrag("start");
                loopDragStart.current = {
                    start: loopStartRef.current,
                    end: loopStartRef.current + loopDurationRef.current,
                };
            },
            onPanResponderMove: (event, gestureState) => {
                logTimelineTouch("start", "move", event, gestureState);
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
                logTimelineTouch("start", "end");
                setDebugActive("start", false);
                setActiveLoopDrag(null);
            },
            onPanResponderTerminate: () => {
                logTimelineTouch("start", "terminate");
                setDebugActive("start", false);
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
            onPanResponderGrant: (event) => {
                logTimelineTouch("end", "start", event);
                setDebugActive("end", true);
                setActiveLoopDrag("end");
                loopDragStart.current = {
                    start: loopStartRef.current,
                    end: loopStartRef.current + loopDurationRef.current,
                };
            },
            onPanResponderMove: (event, gestureState) => {
                logTimelineTouch("end", "move", event, gestureState);
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
                logTimelineTouch("end", "end");
                setDebugActive("end", false);
                setActiveLoopDrag(null);
            },
            onPanResponderTerminate: () => {
                logTimelineTouch("end", "terminate");
                setDebugActive("end", false);
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
            onPanResponderGrant: (event) => {
                logTimelineTouch("range", "start", event);
                setDebugActive("range", true);
                setActiveLoopDrag("range");
                loopDragStart.current = {
                    start: loopStartRef.current,
                    end: loopStartRef.current + loopDurationRef.current,
                };
            },
            onPanResponderMove: (event, gestureState) => {
                logTimelineTouch("range", "move", event, gestureState);
                const width = timelineWidthRef.current;
                const duration = durationRef.current;
                if (width <= 0 || duration <= 0) return;
                const delta = (gestureState.dx / width) * duration;
                const length = loopDragStart.current.end - loopDragStart.current.start;
                let nextStart = loopDragStart.current.start + delta;
                nextStart = Math.min(Math.max(nextStart, 0), Math.max(0, duration - length));
                loopStartRef.current = nextStart;
                setLoopStartMillis(nextStart);
            },
            onPanResponderRelease: () => {
                logTimelineTouch("range", "end");
                setDebugActive("range", false);
                setActiveLoopDrag(null);
                const snapped = snapLoopStartToBeat(loopStartRef.current, loopDurationRef.current);
                setLoopStartMillis(snapped);
            },
            onPanResponderTerminate: () => {
                logTimelineTouch("range", "terminate");
                setDebugActive("range", false);
                setActiveLoopDrag(null);
                const snapped = snapLoopStartToBeat(loopStartRef.current, loopDurationRef.current);
                setLoopStartMillis(snapped);
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

    const formatLoopLengthLabel = (beats: number) => {
        if (beats < 8) {
            return `${formatCounts(beats)} counts`;
        }
        const eights = beats / 8;
        const rounded = Math.round(eights);
        const display = Math.abs(eights - rounded) < 0.05 ? `${rounded}` : eights.toFixed(1);
        const suffix = Math.abs(eights - 1) < 0.05 ? "eight" : "eights";
        return `${display} ${suffix}`;
    };

    const toggleEditMode = (next: boolean) => {
        setControlsVisible(next);
        if (next) {
            setOverlayVisible(true);
        }
    };

    const handleSkipByDoubleTap = (locationX: number, locationY: number) => {
        const width = videoLayoutRef.current.width || 0;
        if (!width) return;
        const isRight = locationX > width / 2;
        const delta = isRight ? 5000 : -5000;
        const duration = durationRef.current || 0;
        const basePosition = positionRef.current || 0;
        const nextPosition = Math.min(Math.max(basePosition + delta, 0), duration);
        videoRef.current?.setPositionAsync(nextPosition);
        const fallbackY = locationY;
        const overlayY = playControlCenterYRef.current ?? (
            videoLayoutRef.current.height
                ? videoLayoutRef.current.height * 0.5
                : fallbackY
        );
        setSkipFeedback({
            x: locationX,
            y: overlayVisible ? overlayY : fallbackY,
            label: isRight ? "+5s" : "-5s",
            key: Date.now(),
        });
    };

    const handleVideoSurfacePress = (event: any) => {
        const now = Date.now();
        const { locationX, locationY } = event.nativeEvent;
        if (lastTapRef.current && now - lastTapRef.current < 260) {
            if (tapTimeoutRef.current) {
                clearTimeout(tapTimeoutRef.current);
                tapTimeoutRef.current = null;
            }
            lastTapRef.current = 0;
            handleSkipByDoubleTap(locationX, locationY);
            return;
        }
        lastTapRef.current = now;
        tapTimeoutRef.current = setTimeout(() => {
            tapTimeoutRef.current = null;
            if (!controlsVisible) {
                toggleEditMode(true);
                return;
            }
            if (controlsVisible && !overlayVisible) {
                setOverlayVisible(true);
                return;
            }
            toggleEditMode(false);
        }, 240);
    };

    const handleTapTempo = (nextBpm: number) => {
        setBpm(Math.max(20, nextBpm));
    };

    const adjustBpm = (delta: number) => {
        setBpm((current) => Math.max(20, current + delta));
    };

    const handleSelectLoopLength = (beats: number) => {
        if (Platform.OS !== "web") {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        const beatDuration = 60000 / Math.max(1, bpm);
        const loopDuration = beatDuration * beats;
        const safeDuration = durationMillis ? Math.min(loopDuration, durationMillis) : loopDuration;
        const adjustedBeats = safeDuration / beatDuration;
        const basePosition = Number.isFinite(positionMillis) && positionMillis > 0 ? positionMillis : loopStartMillis;
        const nextStart = snapLoopStartToBeat(basePosition, safeDuration);
        setLoopLengthBeats(adjustedBeats);
        setLoopStartMillis(nextStart);
    };

    const handleSetPhase = () => {
        setPhaseMillis(positionMillis);
    };

    const handleAutoDetectBpm = () => {
        if (isProRequired("bpm_auto_detect") && !isPro) {
            void trackEvent('bpm_auto_detect_attempted', { videoId: videoItem?.id ?? null });
            setPaywallVisible(true);
            return;
        }
        Alert.alert('Coming soon', 'BPM auto-detect is coming in a future update.');
    };

    const handleSaveBookmark = () => {
        if (isProRequired("bookmark_create") && !isPro) {
            void trackEvent('bookmark_create_attempted', { videoId: videoItem?.id ?? null });
            setPaywallVisible(true);
            return;
        }
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
        void trackEvent('bookmark_created', { videoId: videoItem?.id ?? null });
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
    const showLoopUi = controlsVisible && !isLandscape;
    const bookmarkTileSize = Math.min(140, Math.max(96, windowWidth / 3));

    return (
        <View style={styles.container}>
            <StatusBar hidden={isLandscape} />
            <Stack.Screen options={{ headerShown: false }} />

            {/* TOP: Video Area (Expand in Landscape) */}
            <View style={[styles.videoArea, isLandscape ? styles.videoAreaLandscape : {}]}>
                <Pressable
                    style={styles.videoWrapper}
                    onPress={handleVideoSurfacePress}
                    onLayout={(event) => {
                        videoLayoutRef.current = {
                            width: event.nativeEvent.layout.width,
                            height: event.nativeEvent.layout.height,
                        };
                    }}
                >
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
                        <Animated.View
                            style={[styles.overlay, { opacity: overlayOpacity }]}
                            pointerEvents={overlayVisible ? "box-none" : "none"}
                        >
                            <LinearGradient
                                colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.7)']}
                                style={styles.overlayGradient}
                            >
                                {/* Top Row: Back */}
                                <View style={styles.topControlRow}>
                                    <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                                        <MaterialCommunityIcons name="chevron-down" size={32} color="white" />
                                    </Pressable>
                                    <View style={styles.iconBtn} />
                                </View>

                                {/* Middle Row: Play/Pause */}
                                <View
                                    style={styles.middleControlRow}
                                    onLayout={(event) => {
                                        const { y, height } = event.nativeEvent.layout;
                                        playControlCenterYRef.current = y + height / 2;
                                    }}
                                >
                                    <Pressable onPress={togglePlay} style={styles.bigPlayBtn}>
                                        <MaterialCommunityIcons name={isPlaying ? "pause-circle" : "play-circle"} size={isLandscape ? 60 : 72} color="white" />
                                    </Pressable>
                                </View>

                                {/* Bottom Row: Seek & Tools */}
                                <View style={styles.bottomControlContainer}>
                                    <View style={styles.timeRow}>
                                        <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
                                        <View style={styles.sliderHitArea}>
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
                                        </View>
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

                                        {/* Loop */}
                                        <Pressable style={styles.toolItem} onPress={() => setLoopEnabled(!loopEnabled)}>
                                            <MaterialCommunityIcons
                                                name={loopEnabled ? "repeat" : "repeat-off"}
                                                size={24}
                                                color={loopEnabled ? "#FF0000" : "white"}
                                            />
                                            <Text style={styles.toolText}>Loop</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    )}

                    {skipFeedback && (
                        <View
                            pointerEvents="none"
                            style={[
                                styles.skipFeedback,
                                {
                                    left: skipFeedback.x,
                                    top: skipFeedback.y,
                                },
                            ]}
                        >
                            <Animated.View
                                style={[
                                    styles.skipRipple,
                                    {
                                        opacity: skipFeedbackAnim.interpolate({
                                            inputRange: [0, 0.6, 1],
                                            outputRange: [0.7, 0.4, 0],
                                        }),
                                        transform: [
                                            {
                                                scale: skipFeedbackAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0.35, 1.15],
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            />
                            <Animated.Text
                                style={[
                                    styles.skipLabel,
                                    {
                                        opacity: skipFeedbackAnim.interpolate({
                                            inputRange: [0, 0.2, 1],
                                            outputRange: [0, 1, 0],
                                        }),
                                    },
                                ]}
                            >
                                {skipFeedback.label}
                            </Animated.Text>
                        </View>
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
                        {showLoopUi && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.loopHeaderControls}>
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
                                        <Pressable style={styles.autoDetectButton} onPress={handleAutoDetectBpm}>
                                            <MaterialCommunityIcons name="waveform" size={16} color="#111" />
                                            <Text style={styles.autoDetectText}>Auto Detect (Pro)</Text>
                                        </Pressable>
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
                                                    {formatLoopLengthLabel(beats)}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <View style={styles.timelineSection}>
                                    <View style={styles.timelineHeader}>
                                        <Text style={styles.timelineValue}>
                                            {formatTime(loopStartMillis)} - {formatTime(loopEndMillis)}
                                        </Text>
                                    </View>
                                    <View
                                        style={styles.timelineTrack}
                                        onLayout={(event) => setTimelineWidth(event.nativeEvent.layout.width)}
                                    >
                                        <View style={styles.timelineBase} />
                                        <View style={styles.timelineFrames}>
                                            {timelineThumbs.length > 0 ? (
                                                timelineThumbs.map((uri, index) => (
                                                    <Image
                                                        key={`${uri}-${index}`}
                                                        source={{ uri }}
                                                        style={styles.timelineFrame}
                                                    />
                                                ))
                                            ) : (
                                                <View style={styles.timelineFramesFallback} />
                                            )}
                                        </View>
                                        <View
                                            style={[
                                                styles.playheadScrubArea,
                                                DEBUG_TIMELINE_TOUCH && styles.playheadScrubAreaDebug,
                                                debugTouchActive.playhead && styles.playheadScrubAreaActive,
                                            ]}
                                            {...playheadPanResponder.panHandlers}
                                        />
                                        <View
                                            style={[
                                                styles.loopRangeHitArea,
                                                DEBUG_TIMELINE_TOUCH && styles.loopRangeHitAreaDebug,
                                                debugTouchActive.range && styles.loopRangeHitAreaDebugActive,
                                                {
                                                    left: loopRangeTouchLeft,
                                                    width: loopRangeTouchWidth,
                                                },
                                            ]}
                                            {...loopRangePanResponder.panHandlers}
                                        />
                                        <View
                                            style={[
                                                styles.loopRange,
                                                activeLoopDrag && styles.loopRangeActive,
                                                DEBUG_TIMELINE_TOUCH && styles.loopRangeDebug,
                                                debugTouchActive.range && styles.loopRangeDebugActive,
                                                !loopEnabled && styles.loopRangeDisabled,
                                                {
                                                    left: loopStartLeft,
                                                    width: loopRangeWidth,
                                                },
                                            ]}
                                            pointerEvents="none"
                                        />
                                        <View
                                            style={[
                                                styles.loopHandle,
                                                styles.loopHandleLeft,
                                                activeLoopDrag === "start" && styles.loopHandleActive,
                                                DEBUG_TIMELINE_TOUCH && styles.loopHandleDebug,
                                                debugTouchActive.start && styles.loopHandleDebugActive,
                                                !loopEnabled && styles.loopHandleDisabled,
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
                                                DEBUG_TIMELINE_TOUCH && styles.loopHandleDebug,
                                                debugTouchActive.end && styles.loopHandleDebugActive,
                                                !loopEnabled && styles.loopHandleDisabled,
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
                        )}

                        <View style={styles.section}>
                            <View style={styles.sectionDivider} />
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.bookmarkRow}
                            >
                                <LibraryTile
                                    width={bookmarkTileSize}
                                    thumbnailUri={videoItem.thumbnailUri}
                                    showVideoBadge={false}
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
                                        thumbnailUri={bookmarkThumbs[bookmark.id] || videoItem.thumbnailUri}
                                        showVideoBadge={false}
                                        onPress={() => applyBookmark(bookmark)}
                                    >
                                        <View style={styles.bookmarkOverlay}>
                                            <Text style={styles.bookmarkOverlayTitle}>
                                                {formatLoopLengthLabel(bookmark.loopLengthBeats)}
                                            </Text>
                                        </View>
                                    </LibraryTile>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionDivider} />
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
            <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
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
        overflow: 'hidden',
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
    skipFeedback: {
        position: 'absolute',
        width: 120,
        height: 120,
        marginLeft: -60,
        marginTop: -60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipRipple: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.85)',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    skipLabel: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
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
        width: '100%',
        height: 20,
    },
    sliderHitArea: {
        flex: 1,
        marginHorizontal: 10,
        paddingVertical: 8,
        justifyContent: 'center',
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
        justifyContent: 'flex-end',
        gap: 12,
    },
    loopHeaderControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
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
    autoDetectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
    },
    autoDetectText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#111',
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
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    timelineValue: {
        color: '#666',
        fontSize: 12,
    },
    sectionDivider: {
        height: 0.5,
        backgroundColor: '#333',
        opacity: 0.5,
    },
    timelineTrack: {
        width: '100%',
        height: 64,
        borderRadius: 14,
        backgroundColor: '#f6f6f6',
        justifyContent: 'center',
        overflow: 'visible',
    },
    timelineBase: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#fafafa',
    },
    timelineFrames: {
        position: 'absolute',
        top: 8,
        bottom: 8,
        left: 0,
        right: 0,
        borderRadius: 10,
        overflow: 'hidden',
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
    },
    timelineFrame: {
        flex: 1,
        height: '100%',
        resizeMode: 'cover',
    },
    timelineFramesFallback: {
        flex: 1,
        backgroundColor: '#222',
    },
    playheadScrubArea: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1,
    },
    playheadScrubAreaDebug: {
        borderWidth: 1,
        borderColor: 'rgba(255,59,48,0.45)',
        backgroundColor: 'rgba(255,59,48,0.08)',
    },
    playheadScrubAreaActive: {
        borderColor: 'rgba(255,59,48,0.9)',
        backgroundColor: 'rgba(255,59,48,0.18)',
    },
    loopRange: {
        position: 'absolute',
        top: 8,
        bottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#f5c842',
        backgroundColor: 'rgba(245,200,66,0.18)',
        zIndex: 2,
    },
    loopRangeHitArea: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        zIndex: 3,
        backgroundColor: 'transparent',
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
    loopRangeDebug: {
        borderColor: 'rgba(0,180,255,0.55)',
        backgroundColor: 'rgba(0,180,255,0.08)',
    },
    loopRangeDebugActive: {
        borderColor: 'rgba(0,180,255,0.95)',
        backgroundColor: 'rgba(0,180,255,0.18)',
    },
    loopRangeHitAreaDebug: {
        backgroundColor: 'rgba(0,180,255,0.08)',
    },
    loopRangeHitAreaDebugActive: {
        backgroundColor: 'rgba(0,180,255,0.18)',
    },
    loopRangeDisabled: {
        opacity: 0.5,
    },
    loopHandle: {
        position: 'absolute',
        top: 6,
        width: 24,
        height: 52,
        borderRadius: 8,
        backgroundColor: '#f5c842',
        borderWidth: 1,
        borderColor: '#d8a700',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4,
    },
    loopHandleDebug: {
        borderColor: '#00b4ff',
    },
    loopHandleDebugActive: {
        borderColor: '#0077a6',
        backgroundColor: '#ffd769',
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
    loopHandleDisabled: {
        opacity: 0.6,
    },
    loopHandleGrip: {
        width: 2,
        height: 18,
        borderRadius: 1,
        backgroundColor: '#7a5b00',
    },
    playhead: {
        position: 'absolute',
        top: 8,
        bottom: 8,
        width: 2,
        backgroundColor: '#ff3b30',
        zIndex: 3,
    },
});
