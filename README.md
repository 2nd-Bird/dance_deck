# Dance Deck

Local-video practice library for dancers with beat-synced loop tooling.

iOS Expo Go manual check: run `pnpm start` and open the Expo Go client on the same network, tap the + button on Home to pick a local video from the media library, confirm the picker log prints asset details in the Metro console, and verify the newly imported tile appears immediately with a thumbnail or placeholder and can be opened from the grid.

Extra iOS Expo Go verification: after returning from the image picker, confirm the Home grid still shows the newly imported tile without leaving the screen or reloading, then reopen the app to verify the tile persists and still renders the thumbnail or placeholder.

Developer log checklist (iOS Expo Go): after importing a video, confirm Metro logs print `[Import] picker asset`, `[Import] video record`, `[Storage] saved videos` with the incremented count, and `[Library] load videos` with the new first item while the Home grid updates in-place.

iOS Expo Go regression check: start on Home, import a video, and confirm the grid updates immediately even if the picker temporarily blurs the screen; no manual refresh or navigation away should be required.

iOS Expo Go manual check (filter sync): import a video with the search box empty, confirm the new tile appears immediately, then enter and clear a tag query to verify the grid stays in sync without needing a reload.

iOS Expo Go repro steps (Home render triage):
1) Run `pnpm start` and open the app in Expo Go on iOS.
2) Open the Home tab, keep the search box empty, and keep the mode on AND.
3) Open the Metro console logs.
4) Tap the + button, import a local video, and stay on the Home screen.
5) Capture one `[HomeRender]` line, `[Library][loadData][start]/[end]`, and `[Home][FlatList][viewable]` in order; note any `[ASSERT]`.
