import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface TapTempoButtonProps {
    onSetLoop: (bpm: number, lengthInBeats: number) => void;
}

export default function TapTempoButton({ onSetLoop }: TapTempoButtonProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [taps, setTaps] = useState<number[]>([]);
    const [bpm, setBpm] = useState<number | null>(null);

    const handleTap = () => {
        const now = Date.now();
        const newTaps = [...taps, now].filter(t => now - t < 3000); // Keep last 3 seconds
        setTaps(newTaps);

        if (newTaps.length > 1) {
            const intervals = [];
            for (let i = 1; i < newTaps.length; i++) {
                intervals.push(newTaps[i] - newTaps[i - 1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const calculatedBpm = Math.round(60000 / avgInterval);
            setBpm(calculatedBpm);
        }
    };

    const reset = () => {
        setTaps([]);
        setBpm(null);
    };

    const applyLoop = (counts: number) => {
        if (bpm) {
            onSetLoop(bpm, counts);
            setModalVisible(false);
            reset();
        }
    };

    return (
        <>
            <Pressable style={styles.triggerBtn} onPress={() => setModalVisible(true)}>
                <MaterialCommunityIcons name="metronome" size={24} color="white" />
                <Text style={styles.triggerText}>Smart Loop</Text>
            </Pressable>

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.title}>Tap Tempo Loop</Text>

                        <View style={styles.bpmDisplay}>
                            <Text style={styles.bpmText}>{bpm ? `${bpm} BPM` : "TAP!"}</Text>
                        </View>

                        <Pressable style={styles.tapButton} onPress={handleTap}>
                            <Text style={styles.tapButtonText}>TAP TO THE BEAT</Text>
                        </Pressable>

                        {bpm && (
                            <View style={styles.optionsGrid}>
                                {[4, 8, 16, 32].map(count => (
                                    <Pressable key={count} style={styles.optionBtn} onPress={() => applyLoop(count)}>
                                        <Text style={styles.optionText}>{count} Counts</Text>
                                        <Text style={styles.subText}>{count / 4} Bar</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    triggerBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
    },
    triggerText: {
        color: 'white',
        fontSize: 10,
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#222',
        borderRadius: 16,
        padding: 20,
        width: '80%',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    bpmDisplay: {
        marginBottom: 20,
    },
    bpmText: {
        color: '#007AFF',
        fontSize: 48,
        fontWeight: 'bold',
    },
    tapButton: {
        backgroundColor: '#333',
        width: '100%',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#444',
    },
    tapButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        marginBottom: 20,
    },
    optionBtn: {
        backgroundColor: '#444',
        padding: 10,
        borderRadius: 8,
        width: '45%',
        alignItems: 'center',
    },
    optionText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    subText: {
        color: '#bbb',
        fontSize: 10,
    },
    closeBtn: {
        padding: 10,
    },
    closeText: {
        color: '#888',
    },
});
