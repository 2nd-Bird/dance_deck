# App Privacy Notes (Dance Deck)

## Summary (App Store Privacy)
- Data collected by developer: none.
- Data linked to user: none.
- Tracking: none.
- Third-party SDK: RevenueCat (in-app purchase only).

## Local analytics (on-device only)
- Storage: AsyncStorage, max 100 events, never uploaded.
- Fields: event name, timestamp, optional payload (e.g., videoId).
- Purpose: understand paywall and bookmark flow drop-off during early release.
- Retention: rolling buffer (newest 100), cleared on app uninstall.

## RevenueCat (in-app purchase)
- SDK: react-native-purchases (RevenueCat).
- Uses network to fetch offerings and customer entitlement status.
- App Store privacy disclosure should be completed based on RevenueCat policy.
- No custom user identifiers are sent from the app.

## On-device content (not collected)
- Local videos (file references only).
- Loop bookmarks, BPM, phase, loop start/end.
- Tags and memo text.

## Event names (local-only)
- paywall_shown
- trial_started
- trial_converted
- trial_canceled
- bookmark_create_attempted
- bookmark_created
- bpm_auto_detect_attempted
