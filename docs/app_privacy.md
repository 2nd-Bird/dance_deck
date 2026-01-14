# App Privacy Notes (Dance Deck)

## Local analytics (on-device only)
- Storage: AsyncStorage, max 100 events, never uploaded.
- Fields: event name, timestamp, optional payload (e.g., videoId).
- Purpose: understand paywall and bookmark flow drop-off during early release.

## RevenueCat (in-app purchase)
- SDK: react-native-purchases (RevenueCat).
- Uses network to fetch offerings and customer entitlement status.
- App Store privacy disclosure should be completed based on RevenueCat policy.

## Event names
- paywall_shown
- trial_started
- trial_converted
- trial_canceled
- bookmark_create_attempted
- bookmark_created
- bpm_auto_detect_attempted
