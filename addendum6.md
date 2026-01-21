# SPEC.md
# Dance Deck — BPM Auto Detect Repo (Addendum 6 Only)

## 0. Scope and Intent (READ FIRST)
This repository is dedicated to implementing **Addendum 6: BPM Auto Detect (On-device estimation from local video + Beat Map) v1**.

- **All other features described in the original Dance Deck specification are already implemented and are OUT OF SCOPE for this repo.**
- Your job is to implement **only** Addendum 6 and integrate it into the existing codebase **without breaking any existing behavior**.

### Non-Goals (Hard Constraints)
- Do **not** redesign UI/UX beyond what Addendum 6 explicitly requires.
- Do **not** refactor unrelated modules “for cleanliness”.
- Do **not** change existing data models in a breaking way.
- Do **not** change existing loop/phase/manual BPM behavior except where Addendum 6 explicitly adds behavior (Beat Map snap when available).
- Do **not** introduce any cloud processing. Analysis must be fully on-device.

---

## 1. Definition of Done (Acceptance Criteria)
Your implementation is considered complete only if:

1) **Auto Detect BPM** works for imported local videos on-device:
   - Produces `estimatedBpm`, `confidence`, and a `beatTimesSec[]` Beat Map (at least for an analyzed segment).
   - Stores results per video and reuses them (cache).

2) **Non-regression**:
   - Manual BPM (Tap Tempo and ± adjustments) continues to work exactly as before.
   - Phase (“This is 1”) continues to work exactly as before.
   - Loop range editing and snapping continues to work exactly as before when **no Beat Map** exists.

3) **Beat-Head Snap upgrade (only when Beat Map exists)**:
   - When Beat Map exists, loop movement/adjustment snaps to Beat Heads.
   - Beat-count-based loop lengths always preserve exact beat counts:
     - With Beat Map: `end = beats[startIndex + beatsPerLoop]`
     - Without Beat Map: unchanged legacy behavior.

4) **Tempo Family normalization**:
   - Minimize double/half mis-detection by applying the tempo-band prior:
     - Primary: 80–130
     - Secondary: 60–80
     - Tertiary: 130–160
     - Rare: 160–200
   - UI provides one-tap toggle for “½ / ×2” (final safety valve).

5) **Failure fallback**:
   - If analysis fails (no audio, low confidence, timeout), the app cleanly falls back:
     - Guides user to Tap Tempo (Free)
     - Preserves “This is 1” correction
   - No crashes, no broken UI.

6) **Quality gates**:
   - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.

---

## 2. Integration Guidance (How to avoid breaking existing code)
### 2.1 “Do not guess” rule
Before implementing, locate the existing integration points in code:
- Where per-video metadata is stored (BPM, phase, loop ranges).
- Where snapping/grid logic is implemented.
- Where loop window drag and handle adjustments are processed.
- Where the Video Detail UI actions are defined.

If any of these are unclear, first create a small “discovery” change:
- Add comments / minimal documentation (or a tiny internal doc) identifying the integration points.
- Do not change behavior in this discovery step.

### 2.2 Single-writer policy (for orchestration)
If you are running multiple workers:
- Only the Integrator worker updates global work logs and run artifacts.
- Implementation workers must focus only on scoped code changes.

---

## 3. Data Contract (Must be backward compatible)
Add the following fields to the per-video persisted metadata in a backward-compatible way:

```ts
bpmAuto?: {
  bpm: number;
  confidence: number;
  tempoFamilyCandidates?: number[];
  beatTimesSec?: number[]; // Beat Map (beat heads)
  analyzedAt: string; // ISO
  version: "1";
};

bpmSource?: "manual" | "auto";
Rules:

Existing stored data must still load correctly.

If bpmSource="auto", UI must allow user override (Tap Tempo / ±).

When manual edits occur, you may switch to bpmSource="manual" (recommended) or keep "auto"—but behavior must be consistent.

4. UI/UX Requirements (Only what Addendum 6 requires)
4.1 Entry point
On Video Detail screen (edit mode), add “Auto Detect BPM” button.

4.2 Pro gating
This repo may not implement monetization gating itself.

However, the button must be designed so it can be gated externally:

If Pro gating exists in this codebase, respect it.

If not, implement the feature without gating, but keep the UI/action isolated so gating can be inserted later.

4.3 During analysis
Async processing, no UI blocking.

Progress indicator (spinner + “Detecting…”).

Cancel is allowed.

Do not update BPM/Beat Map until final result is ready.

4.4 Results
Show estimated BPM.

Provide one-tap “½ / ×2” switching UI.

If confidence is low, emphasize “Adjust with Tap Tempo”.

4.5 Failure fallback
Show failure message and guide to Tap Tempo.

Preserve existing “This is 1” phase correction flow.

5. Addendum 6: BPM Auto Detect (On-device estimation from local video + Beat Map) v1
Implement the following specification exactly. Do not extend scope beyond this.

5.1 Purpose (Why)
Analyze audio from imported local videos on-device and estimate BPM automatically.

Retain beat positions (Beat Map) internally, enabling loop window movement and range adjustments to snap to Beat Heads.

Minimize double/half tempo mis-detection and prefer tempos that are easy to count for street dancers.

5.2 Terminology
Beat Map: beats[] = [t0, t1, t2, ...] in seconds

Beat Head: each ti in Beat Map

Tempo Family: BPM, BPM*2, BPM/2

Confidence: 0.0–1.0

5.3 Scope
In scope:

Local videos managed by the app (file/URI)

iOS/Android (Expo + EAS Dev Client)

Out of scope (v1):

Cloud analysis (upload)

Tempo map (variable BPM within a track)

Guaranteed automatic “bar 1” detection (use existing “This is 1” to correct)

5.4 UI/UX
Entry:

“Auto Detect BPM” button on Video Detail (edit mode).

During analysis:

Async + progress + cancel.

Playback controls may remain usable; do not update BPM/Beat Map until finalized.

On success:

Obtain estimatedBpm, confidence, beatTimesSec[] (Beat Map).

Update per-video BPM + Beat Map.

Use Beat Map for loop snapping.

UI presentation:

Show BPM (e.g., “BPM 124”)

One-tap switch “½ / ×2”

If low confidence: emphasize “Adjust with Tap Tempo”

On failure:

Fallback to Tap Tempo, and remind user of “This is 1” for phase correction.

Do not break existing manual BPM / loop behavior.

5.5 Beat-Head Snap (Most Important)
Where snapping applies:

Dragging loop window center (move with fixed length)

Left/right loop handles (adjust start/end)

Loop Length buttons should also lock to Beat Heads when possible

Snap behavior:

Snap tCandidate to nearest tBeat.

If |tCandidate - tBeat| <= snapThresholdSec, always snap (magnet).

Otherwise follow smoothly; on release, snap to nearest Beat Head.

Optional haptics on crossing beats.

Priority:

If Beat Map exists: snap using Beat Map and compute end by Beat Map indices.

If Beat Map does not exist: preserve existing BPM+phase uniform-grid snapping.

Loop length guarantee:

Beat-count loops must always preserve the exact beat count.

With Beat Map: end = beats[startIndex + beatsPerLoop]

Without Beat Map: legacy end = start + beatsPerLoop * (60/BPM)

5.6 Minimize double/half tempo mistakes (Street-dance prior)
Raw BPM may be double/half.

Use a combined score:

(A) Beat alignment score (onsets align to Beat Heads)

(B) Tempo-band prior

Prior order:

Primary: 80–130

Secondary: 60–80

Tertiary: 130–160

Rare: 160–200 (only if score clearly best)

UI must provide “½ / ×2” toggle.

5.7 Analysis Pipeline (v1 minimum)
Preprocessing:

Extract audio from video to analysis-friendly format:

mono

fixed sample rate (e.g., 22050Hz or 44100Hz)

PCM (e.g., WAV)

Analyze first N seconds (e.g., 60–90s) for speed.

If confidence is low, optionally analyze additional segments.

Output:

estimatedBpm, confidence, beatTimesSec[]

Beat Map may be uniform from BPM, but if possible, micro-adjust near onsets.

Caching:

Do not re-run analysis for the same video.

Persist results per video and reuse on next session.

Delete cache when the video is deleted.

5.8 Verification
Unit:

Tempo normalization works as specified.

Snapping with/without Beat Map preserves exact beat counts.

Integration:

Success → loop movement snaps to Beat Heads.

Failure → clean fallback to Tap Tempo without breaking Free core behavior.
