# Dance Deck SPEC Checklist

Each acceptance criterion (AC) lists current status, evidence, and how to verify.

## Acceptance Criteria

- AC-1 Home screen shows a tile grid of video thumbnails only (no titles/tags/memo).
  - Status: PASS
  - Evidence: `components/VideoGrid.tsx`, `components/VideoTile.tsx`
  - Verify: Launch app, open Home tab, confirm only thumbnail tiles render without text labels.

- AC-2 Tapping a tile navigates to the video detail screen.
  - Status: PASS
  - Evidence: `components/VideoTile.tsx` (Link to `/video/[id]`)
  - Verify: Tap a tile, confirm navigation to detail screen.

- AC-3 Home screen includes tag search UI with AND/OR modes.
  - Status: PASS
  - Evidence: `app/(tabs)/index.tsx`, `services/library.ts`
  - Verify: Enter tags, toggle AND/OR, confirm filtering updates.

- AC-4 Import uses device-local video picker (no URL/SNS ingestion).
  - Status: PASS
  - Evidence: `app/(tabs)/index.tsx` (expo-image-picker)
  - Verify: Tap +, pick a local video.

- AC-5 Imported videos are stored locally or referenced in app-managed paths.
  - Status: PASS
  - Evidence: `services/media.ts` (FileSystem copy to app directories)
  - Verify: Import video, inspect logs or storage; confirm `file://` URI is persisted.

- AC-6 Portrait detail layout: video player, loop bookmarks, tags, memo in vertical stack.
  - Status: PASS
  - Evidence: `app/video/[id].tsx`
  - Verify: Open detail screen in portrait; confirm section ordering.

- AC-7 Landscape detail layout: video fills screen with overlay controls; metadata hidden.
  - Status: PASS
  - Evidence: `app/video/[id].tsx`
  - Verify: Rotate device; confirm video fills and notes area hides.

- AC-8 Playback UI: play/pause, seek bar, speed toggle (0.25/0.5/0.75/1.0), mirror.
  - Status: PASS
  - Evidence: `app/video/[id].tsx`
  - Verify: Use toolbar controls; confirm speed and mirror toggle.

- AC-9 BPM set per video via Tap Tempo and +/- adjustments.
  - Status: PASS
  - Evidence: `components/TapTempoButton.tsx`, `app/video/[id].tsx`
  - Verify: Tap tempo and +/- buttons update BPM.

- AC-10 Phase (beat start) set via "Here is 1" button during playback.
  - Status: PASS
  - Evidence: `app/video/[id].tsx`
  - Verify: Press "Here is 1" while playing; phase updates.

- AC-11 Loop length presets: 4, 8, 16, 32 counts.
  - Status: PASS
  - Evidence: `app/video/[id].tsx`
  - Verify: Tap preset buttons and confirm selection.

- AC-12 Fixed-length loop window UI with draggable window and beat snapping.
  - Status: PASS
  - Evidence: `app/video/[id].tsx` (custom loop track with draggable window + snap)
  - Verify: Drag loop window across track; confirm snapping on release and fixed window size.

- AC-13 Loop playback seeks to loop start when position >= loop end minus epsilon.
  - Status: PASS
  - Evidence: `app/video/[id].tsx` (`LOOP_EPSILON_MS` and seek logic)
  - Verify: Set loop and observe auto-seek at loop end.

- AC-14 Loop bookmarks save BPM/phase/length/start and allow tap-to-apply.
  - Status: PASS
  - Evidence: `app/video/[id].tsx`
  - Verify: Save bookmark tile, tap to apply loop settings.

- AC-15 Loop bookmark tiles use same visual design as home tiles.
  - Status: PASS
  - Evidence: `app/video/[id].tsx` (bookmark tiles share tile border + overlay icon styling)
  - Verify: Compare bookmark tile styling to home tile styling.

- AC-16 Tags are free input with autocomplete suggestions.
  - Status: PASS
  - Evidence: `app/video/[id].tsx`
  - Verify: Type tag and see suggestion pills.

- AC-17 Memo is free text and saved locally.
  - Status: PASS
  - Evidence: `app/video/[id].tsx`, `services/storage.ts`
  - Verify: Edit memo, reopen detail; confirm persistence.

- AC-18 Video metadata (tags/memo/bpm/phase/loops/bookmarks) is stored locally.
  - Status: PASS
  - Evidence: `services/storage.ts`
  - Verify: Update metadata, relaunch app, confirm persisted.

- AC-19 App does not provide SNS/URL import, capture, or cloud sync features in UI.
  - Status: PASS
  - Evidence: No UI or services for SNS/URL/capture in codebase
  - Verify: Review UI; ensure no SNS/URL/capture options exist.
