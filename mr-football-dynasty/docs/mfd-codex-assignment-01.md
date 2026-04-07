# Mr. Football Dynasty — Codex Assignment 01

## Role
You own the **runtime / launcher / infra / docs** lane.

Your mission is to make the first shared football spine **visible, verifiable, and safe** without rewriting gameplay logic.

Stay in lane.

---

## Current Lane Authority
You own:
- `src/app/*`
- `src/dev/*`
- `src/main.jsx`
- `scripts/*`
- `.github/workflows/*`
- `docs/*`
- related launcher/runtime tests

You do **not** own gameplay logic and simulation tuning inside:
- `src/systems/*`
- `src/data/*`
- gameplay behavior fixtures except where contract infra requires folder plumbing

---

## Primary Goal
Stand up the launcher-side half of the canonical event spine so that MFD can consume structured football truth from the current gameplay runtime.

This is a contract-first bridge job, not a rewrite.

---

## Non-Goals
Do **not**:
- rebalance gameplay
- rewrite the sim engine
- touch extracted gameplay modules unless absolutely required for bridge hookup and clearly documented
- do aesthetic UI wandering
- invent new product pillars

---

## Deliverables

## 1. Docs in Repo
Create or update these docs under `docs/`:
- `mfd-design-constitution.md`
- `mfd-build-order-v1.md`
- `mfd-canonical-game-event-contract-v0.md`
- `mfd-event-bridge-runbook.md`

Use the architect pack as source of truth unless repo reality forces a minor adaptation.

## 2. Event Bridge Receiver
Implement a passive launcher/runtime receiver for gameplay events.

Target surfaces:
- `src/app/play-screen.jsx`
- `src/app/launcher-shell.jsx`
- optionally `src/app/status-screen.jsx` if helpful

Requirements:
- listen for non-blocking `postMessage` traffic from gameplay runtime
- expected message type: `mfd:game-event`
- buffer event envelopes in launcher state
- never block or degrade play if no events arrive
- show clear runtime status: `no feed / connected / malformed / version mismatch`

## 3. Event Inspector / Debug Surface
Build a developer-friendly event stream panel under `src/dev/*` and/or accessible from launcher diagnostics.

Requirements:
- inspect latest N events
- filter by event type and tags
- highlight malformed payloads
- expose schema version and source runtime
- safe to leave enabled in dev and hidden in normal player flow

## 4. Contract Verification Plumbing
Extend current verification so event schema is checked automatically.

Use existing repo patterns first.

Requirements:
- either extend `verify:contracts` or add a sibling verification command that fits current conventions
- add fixtures directory for event envelopes
- emit machine-readable report plus markdown summary
- fail on missing required fields, type drift, bad enum values, or version mismatch
- keep behavior aligned with current contract-gate philosophy

## 5. Save / Import / Export Safety Hook
Ensure the new launcher-side event layer is compatible with save/import/export.

Requirements:
- event log storage must be optional, bounded, and versioned
- corrupted or unknown event payloads must degrade gracefully
- import/export must not trust event objects blindly

## 6. Command Desk Shell
Create a first-pass player-facing shell for the weekly ritual loop.

UI cards:
- Football Mission
- Human Tension
- Mystery
- Legacy Thread

Requirements:
- ship as a shell fed by mock data or bridge data when available
- no fake giant system behind it yet; just make the surface real and ready
- must not block current flow if read-model data does not exist

## 7. Postgame Autopsy Shell
Create the surface for:
- Top 3 Reasons
- Got Right
- Misread
- Next Clue

Same rule: make it real, graceful, and ready for Claude’s read-model data.

---

## Acceptance Criteria
You are done when all of the following are true:

1. launcher can receive and display event feed messages without breaking play
2. malformed messages are visible in diagnostics and safely ignored by player flow
3. command desk shell exists and degrades gracefully with missing data
4. postgame autopsy shell exists and degrades gracefully with missing data
5. contract verification for event schema exists and reports clearly
6. lane boundaries are respected
7. these commands pass:
   - `npm run verify:lane:codex`
   - `npm run verify:contracts` (or approved replacement/extension)
   - `npm run verify:hybrid`
   - `npm run e2e:launcher`

---

## File Strategy
Prefer:
- additive modules
- small targeted edits
- clear adapter boundaries
- isolated tests

Avoid:
- large in-place rewrites
- touching gameplay internals for convenience
- shared-file thrash

---

## Suggested Branch / Commit Plan
Branch suggestion:
- `codex/event-spine-launcher-v1`

Suggested commit sequence:
1. docs only
2. event receiver + state plumbing
3. event inspector
4. command desk shell
5. postgame autopsy shell
6. contract verification
7. save/import safety + cleanup

---

## Coordination With Claude
Ask Claude for only these things:
- the exact event schema payloads
- fixture examples
- the read-model output shape for weekly hooks and autopsy

Do **not** ask Claude to design launcher UI or infra commands.

---

## Final Handoff Requirements
At the end, provide:
- list of files changed
- commands run and outcomes
- any shared-file windows opened
- exact payload examples the launcher now supports
- blockers for Claude, if any
