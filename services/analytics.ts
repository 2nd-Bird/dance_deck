import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENTS_KEY = 'DANCE_DECK_ANALYTICS_EVENTS';
const MAX_EVENTS = 100;

export type AnalyticsEventName =
  | 'paywall_shown'
  | 'trial_started'
  | 'trial_converted'
  | 'trial_canceled'
  | 'bookmark_create_attempted'
  | 'bookmark_created'
  | 'bpm_auto_detect_attempted';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  timestamp: number;
  payload?: Record<string, unknown>;
}

export const trackEvent = async (name: AnalyticsEventName, payload?: Record<string, unknown>) => {
  const event: AnalyticsEvent = { name, timestamp: Date.now(), payload };
  if (__DEV__) {
    console.log('[Analytics]', JSON.stringify(event));
  }
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    const current: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
    const next = [event, ...current].slice(0, MAX_EVENTS);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Failed to save analytics event', error);
  }
};
