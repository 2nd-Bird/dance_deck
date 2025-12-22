# Dance Deck

Local-video practice library for dancers with beat-synced loop tooling.

iOS Expo Go manual check: run `pnpm start` and open the Expo Go client on the same network, tap the + button on Home to pick a local video from the media library, confirm the picker log prints asset details in the Metro console, and verify the newly imported tile appears immediately with a thumbnail or placeholder and can be opened from the grid.

Extra iOS Expo Go verification: after returning from the image picker, confirm the Home grid still shows the newly imported tile without leaving the screen or reloading, then reopen the app to verify the tile persists and still renders the thumbnail or placeholder.

Developer log checklist (iOS Expo Go): after importing a video, confirm Metro logs print `[Import] picker asset`, `[Import] video record`, `[Storage] saved videos` with the incremented count, and `[Library] load videos` with the new first item while the Home grid updates in-place.
