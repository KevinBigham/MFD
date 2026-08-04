# Chip Event-Spine Bridge — Design Notes

How engine-side events should become Chip moments **without** coupling the
engine to UI. This is the design contract referenced by plan item C14; the
boundary is enforced today by `apps/web/src/app/architecture-boundaries.test.ts`.

## Current state (as shipped)

- `packages/engine/src/events` owns live-game telemetry envelopes
  (`event-types.ts`, `envelope.ts`, `emitter.ts`). It is not a companion API
  and does not write saved `GameState.eventLog`.
- `apps/web/src/features/companion/eventBridge.ts` owns the web companion
  contract: `weekRollover` / `gameComplete` / `seasonEnd` dialogue events plus
  transient pose reactions.
- `useChipEvents.ts` and `PoseEventEmitter.tsx` derive everything Chip needs
  from **saved state snapshots** (`weekSummaries`, `franchiseHistory`,
  schedule results, owner records). Production companion code must not import
  `@mfd/engine/events` — the architecture test guards this.

## Why snapshot derivation won (and stays the default)

1. **Determinism.** Saved state + seed fully determines what Chip says. Live
   envelopes are ephemeral; replaying a save must replay Chip's behavior.
2. **Save compatibility.** Snapshots survive cartridge import/export and
   version migrations for free. Envelope subscriptions do not.
3. **Testability.** Every Chip trigger is a pure function of a snapshot —
   `derivePoseEvents(current, previous)` — which is how the 400+ companion
   tests stay fast and headless.

## Rules for adding a new Chip moment

1. Derive it from saved state (or a browser sidecar) inside
   `PoseEventEmitter` (pose) or `useChipEvents` (dialogue).
2. Give it an explicit, deduped id (`poseEventId` / event ids include
   season + week + detail).
3. Edge-trigger on snapshot transitions (`gameChanged`, `!previous && current`)
   so it fires once per real event, not per render.
4. Register the reaction in `POSE_REACTIONS` with pose, duration, priority.
5. Cover it in `PoseEventEmitter.test.tsx` / `eventBridge.test.ts` (fire once,
   dedupe, mapping list) before shipping.

## If a live envelope bridge is ever needed

Only for moments that genuinely never touch saved state (e.g., mid-game live
play reactions). The bridge must be a **web-side adapter**:

- A new `apps/web/src/features/companion/liveEnvelopeAdapter.ts` subscribes to
  engine envelopes and translates them into `ChipPoseEvent`s.
- The engine stays UI-agnostic: no React imports, no Chip symbols in
  `packages/engine`.
- The adapter maps envelope ids into the same dedupe/id scheme so quiet prefs
  and session mute keep working.
- `architecture-boundaries.test.ts` is updated deliberately in the same PR
  that wires the adapter — never before the design exists.

## Explicitly out of scope

- Engine emitting Chip copy. All words live in the web companion layer.
- Saved `GameState` fields whose only purpose is Chip narration (use browser
  sidecars like the other Chip persistence keys).
