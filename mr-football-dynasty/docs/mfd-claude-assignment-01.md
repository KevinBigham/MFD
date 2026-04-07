# Mr. Football Dynasty — Claude Assignment 01

## Role
You own the **gameplay / systems / data** lane.

Your mission is to make the football runtime emit structured truth and turn that truth into the first wave of player-facing meaning.

Stay in lane.

---

## Current Lane Authority
You own:
- `src/systems/*`
- `src/data/*`
- gameplay-focused tests
- gameplay fixtures for contract validation

You do **not** own:
- launcher shell architecture
- runtime diagnostics UI
- scripts / workflow infra unless explicitly coordinated
- broad docs lane except minimal gameplay-facing notes if absolutely necessary

---

## Primary Goal
Implement the gameplay-side half of the canonical event spine.

This means:
1. emit deterministic event envelopes for core football moments
2. create first-pass memory reducers and read models
3. feed weekly hooks and postgame teach-back from football truth

---

## Non-Goals
Do **not**:
- attempt a full gameplay rewrite
- retune every subsystem in the repo
- wander into launcher UX work
- add narrative flavor text untethered from structured events
- explode schema scope beyond what phase 1 needs

---

## Deliverables

## 1. Event Emission in Gameplay Lane
Implement canonical event emission for v0 using the shared contract.

Minimum required event coverage:
- `game_start`
- `drive_start`
- `play_call`
- `trench_resolution`
- `pressure_resolution` (or reduced placeholder if not yet separable)
- `play_result`
- `turnover`
- `penalty`
- `injury`
- `score`
- `halftime_adjustment`
- `drive_end`
- `game_end`

Requirements:
- deterministic order
- seed-safe
- schema-versioned
- serializable
- no UI-only prose in core event payloads

## 2. First Memory Reducers
Create reducers that consume events and update long-tail football meaning.

v1 reducer targets:
- QB trust
- rookie confidence
- rivalry heat
- owner/media pressure hooks
- locker-room credit / blame

Keep these reducers small, explicit, and testable.

## 3. Weekly Hook Read Model
Generate these four outputs from recent event history + team context:
- Football Mission
- Human Tension
- Mystery
- Legacy Thread

Rules:
- every string must be traceable to recent football truth
- no generic filler like “prepare for the big game”
- each hook should feel season-specific

## 4. Postgame Autopsy Read Model
Generate:
- exactly 3 top reasons the game tilted
- one thing the player got right
- one thing the player misread
- one next clue for the following week

Rules:
- explanations must be plain-language football
- each reason must reference actual event evidence or derived trend logic
- no fake omniscience

## 5. Golden Fixtures
Produce contract fixtures for representative scenarios.

Required fixture themes:
- clean-pocket passing win
- pressure collapse loss
- weather grind game
- turnover avalanche
- late comeback
- rivalry game
- rookie meltdown / rookie bounce-back

## 6. Statistical Behavior Tests
Add a focused behavior test suite.

At minimum verify:
- more pressure reduces offensive efficiency
- elite trench advantage improves short-yardage success
- bad weather hurts kicking / ball security
- aggressive late-game posture increases variance
- rookie/QB stress tags rise under repeated quick pressure

This is not full tuning. It is sanity protection.

---

## Acceptance Criteria
You are done when all of the following are true:

1. gameplay runtime can emit deterministic v0 event envelopes
2. the first memory reducers update from real event history
3. weekly hook read model outputs all 4 cards from football truth
4. postgame autopsy produces readable teach-back output
5. golden fixtures exist for core scenarios
6. behavior tests pass
7. lane boundaries are respected
8. these commands pass:
   - `npm run test`
   - `npm run verify:lane:claude`
   - any agreed contract-fixture verification flow coordinated with Codex

---

## File Strategy
Prefer:
- new modules under `src/systems/*`
- clear pure functions
- deterministic reducers
- fixture-first testing
- structured tags over giant prose blobs

Avoid:
- monolithic god-files
- direct UI coupling
- vague “story” outputs that cannot be traced to events
- in-place rewrites unless clearly the simplest safe move

---

## Suggested Branch / Commit Plan
Branch suggestion:
- `claude/game-event-spine-v1`

Suggested commit sequence:
1. schema-aligned event types / helpers
2. emission points in gameplay flow
3. reducers for memory deltas
4. weekly hook read model
5. postgame autopsy read model
6. fixtures
7. behavior tests / cleanup

---

## Coordination With Codex
Give Codex:
- exact envelope examples
- supported event names and enum values
- read-model output shape for weekly hooks and autopsy
- fixture files or fixture generation notes

Do **not** ask Codex to build gameplay reducers for you.

---

## Final Handoff Requirements
At the end, provide:
- list of files changed
- exact event types implemented
- which events are full fidelity vs temporary reduced fidelity
- fixture list
- behavior tests added
- any schema decisions Codex must mirror
