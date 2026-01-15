# AGENTS.md — Repository Automation Policy (Dance Deck)

This repository is designed for **Codex CLI long-runs**.

- **WHAT to build:** `SPEC.md` (single source of truth)
- **HOW to operate:** this file (`AGENTS.md`)
- **WORK QUEUE:** `.github/codex/TODO.md` (or `TODO.md` if that is the canonical path in this repo)

Human involvement should be limited to **spec decisions** and **device/external verification**.

---

## Quickstart (telegraph)

### RUN START
1. Read: `SPEC.md`, `.github/codex/TODO.md`, recent `.github/codex/runs/**`
2. Create a fresh branch (`feat/...` or `fix/...`)
3. Pick the next **highest-priority actionable** queue item (P0 > P1 > P2)

### LOOP (repeat)
1. Implement the smallest safe slice for the chosen item
2. Run **Quick Gate** (see “Gates”)
3. Commit (do **not** push unless in “RUN END”)
4. Update `.github/codex/TODO.md` + run logs
5. Continue with the next item

### RUN END (only when done)
1. Run **Full Gate**
2. Push branch
3. Open PR with a tight summary + SPEC/TODO references
4. Enable auto-merge **only if eligible** (see “Auto-merge policy”)

---

## 1) Purpose & Operating Model

This repo assumes **Codex CLI is the only executor** for:
- implementation
- dependency install
- tests/build
- CI / AutoFix workflow creation & maintenance

Humans must **not** manually run `pnpm install` as part of the normal flow.
Humans may provide device logs / screenshots when requested.

---

## 2) Single Source of Truth

- **WHAT:** `SPEC.md`
- **HOW:** `AGENTS.md`
- **QUEUE:** `.github/codex/TODO.md`

If a requested change is not clearly supported by `SPEC.md`, do **one** of:
- adjust implementation to match SPEC
- or open a separate PR that updates SPEC (do not “silently” expand scope)

---

## 3) Skills (separate, opt-in)

Skills are stored separately and must follow the best-practice convention.

### Where
- Preferred: `skills/<skill-name>.md`
- Fallback: `SKILLS.md` (if the repo uses a single file)

### When to use skills
- **Do not use skills automatically**.
- Use a skill only when:
  1) the human explicitly says “use skill: <name>”, **or**
  2) a queue item is genuinely underspecified and proceeding would likely cause wrong work.

### How to use skills without blocking long-runs
If (2) happens:
1. Invoke the `ask-questions-if-underspecified` skill to produce the **minimum** clarifying question set.
2. Write those questions into `.github/codex/TODO.md` under the item as `HUMAN-VERIFY`.
3. Mark the item `HUMAN-BLOCKED`.
4. Immediately continue with the next actionable item (do not stop the run).

---

## 4) Long-Run Protocol (convergence-first)

### 4.1 Work selection
- Always select the **highest-priority actionable** item from the queue.
- Prefer “finish-to-DONE” over starting many PARTIAL items.

### 4.2 Minimum forward motion
- A “run” must complete **at least 3 loops** (commits) before stopping,
  unless the queue has **no actionable items** (only `HUMAN-BLOCKED`).

### 4.3 No “diminishing returns” exits
Stopping because “diminishing returns” is **not allowed**.
Only stop when the queue is non-actionable or a hard external dependency blocks further work.

### 4.4 Branch hygiene during long-runs
- Keep committing to the same long-run branch.
- Avoid rewriting history (no force-push).

---

## 5) Branch Strategy (Codex must follow)

Create a new branch for every run.

Naming:
- `feat/<short-desc>`
- `fix/<short-desc>`
- `chore/<short-desc>`

All changes land in `main` via PR.

---

## 6) Dependencies, Tests, Builds

### 6.1 Standard commands (package.json canonical)
- install: `pnpm install`
- lint: `pnpm lint`
- typecheck: `pnpm typecheck`
- test: `pnpm test`
- build: `pnpm build`

### 6.2 Gates (tiered)

#### Quick Gate (every loop)
Run:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

#### Full Gate (milestones)
Run:
- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build` (when applicable)

**Full Gate is mandatory**:
- before pushing a branch
- before opening/updating the PR for merge readiness
- after changing `package.json` / `pnpm-lock.yaml`
- after changes that affect native modules / Expo config / build tooling
- when Quick Gate fails repeatedly and the root cause may be stale deps

### 6.3 Self-healing loop
If any gate fails:
1. Fix the smallest plausible root cause.
2. Re-run the **same gate**.
3. Escalate per “Repair & Escalation”.

---

## 7) CI Policy (Codex-generated)

### 7.1 Purpose
CI exists primarily to drive **Codex AutoFix** and protect `main`.

### 7.2 Minimum CI requirements
On PR / feature branch push:
- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build` (when required for release confidence)

CI configuration (e.g., `ci.yml`) is generated/maintained by Codex based on `AGENTS.md`.

---

## 8) AutoFix Policy (Codex API / GitHub Actions)

### 8.1 When to rely on AutoFix
- AutoFix is a *second line of defense*.
- Prefer local gates first; use AutoFix for CI-only failures or env differences.

### 8.2 Allowed inputs for AutoFix
- CI logs
- repo files
- `SPEC.md`, `.github/codex/TODO.md`, `.github/codex/runs/**`

### 8.3 Behavior
- AutoFix should produce the smallest patch to restore green CI.
- If AutoFix is repeatedly failing, fall back to the escalation protocol.

---

## 9) PR & Auto-merge Policy

### 9.1 Creating a PR
When opening a PR, include:
- what changed (tight bullets)
- how to verify (tests/build run, plus any manual steps)
- SPEC/TODO references (IDs / sections)

### 9.2 Auto-merge eligibility (ALL required)
Codex may enable auto-merge only if:
- CI is green
- changes are within `SPEC.md` scope
- no new billing/auth/persistent-data-format changes
- not a large refactor (rule of thumb: > 500 LoC net change)
- TODO items touched are marked DONE/PARTIAL with clear verification notes

### 9.3 Repo assumptions
- GitHub “Allow auto-merge” is enabled
- `main` has required CI checks via branch protection

---

## 10) Repair & Escalation

### Phase 1: Direct fix (up to 2 attempts)
- Identify the shortest root cause from logs; patch minimally.

### Phase 2: Boundary re-check (3rd attempt)
- Re-audit seams: UI ↔ logic ↔ storage ↔ config.

### Phase 3: Suspect missing tests (4th+)
- Add/adjust tests to prevent regressions and stabilize behavior.

If blocked by device/external state, create a `HUMAN-VERIFY` entry in TODO and continue.

---

## 11) Debugging & Root Cause Analysis Policy (Expo / React Native)

This section defines a **mandatory protocol** to prevent speculative fixes in Expo / RN runtime issues.

### Core principle
- **Do not guess.**
- If you cannot prove root cause via code or logs, you must not “fix” it.

### Mandatory workflow (when cause is uncertain)

1) **Classify the failure domain (required)**  
Before changing code, classify into one (and list what you ruled out):
- A. Input / Permission / Picker failure
- B. File / URI / Native module incompatibility
- C. Persistence / Storage / Cache / Race condition
- D. Data schema / Type / Key mismatch
- E. UI rendering / FlatList / layout / key / style
- F. UI state / filter / derived state

If evidence is insufficient, you must not proceed.

2) **Add minimal observation logs (no behavior change)**  
Allowed dev-only logs:
- single-line JSON
- counts + representative sample (head/tail)
- at both data-fetch and render sites

Example:
```js
console.log("[HomeRender]", {
  videosCount,
  filteredCount,
  selectedTags,
  mode,
  firstId: videos[0]?.id,
});
Add explicit assertions for “impossible” states
Log [ASSERT] for cases like:

savedCount > 0 but renderedCount == 0

filter disabled but results empty

renderItem never called

Ask the human for Expo Go reproduction + logs
Request:

exact reproduction steps (screen actions)

which log keys to capture

Do not continue implementing fixes until logs are reviewed.

Fix with minimal diff only after root cause is confirmed
After the fix, run:

pnpm lint

pnpm typecheck

pnpm test

Forbidden anti-patterns
repeating the same domain hypothesis without evidence

changing multiple hypotheses at once

“likely/probably” speculative edits

12) Security & Ops
Secrets must live in GitHub Secrets only.

Never commit plaintext keys.

Never print secrets in logs or PR bodies.

13) Tracked Artifacts (must commit if modified)
These files are tracked artifacts and MUST be committed whenever modified:

.github/codex/runs/**

.github/codex/RUNLOG.md

.github/codex/RUNS_INDEX.md

.github/codex/TODO.md

Codex must never stop to ask about changes to these files.
If modified during a loop, include them in the same commit.
