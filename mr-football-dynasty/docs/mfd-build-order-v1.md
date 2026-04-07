# Mr. Football Dynasty — Round 5 Build Order

## Final Thesis
The next step is **not** “more features.”
The next step is **convergence**.

MFD already has broad content, systems, docs, lane ownership, and a playable hybrid route. What it needs now is a single spine that turns football events into player meaning.

That spine is:
- a canonical event contract
- a deterministic event stream
- derived read models for weekly hooks, postgame teach-back, and long-term memory
- non-invasive launcher/runtime consumers

Build that first, and everything else gets easier.

---

## Build Order

## Phase 0 — Product Freeze
### Outcome
Lock the game’s identity so all later work converges.

### Deliverables
- Design Constitution
- Build Order
- Canonical Event Contract v0

### Done When
- both agents are using the same definitions for football truth, retention, rituals, and anti-goals

---

## Phase 1 — The Event Spine
### Goal
Make gameplay produce one authoritative structured event stream.

### Why first
Without this, MFSN, recaps, rivalry logic, dynasty history, and weekly guidance remain disconnected flavor islands.

### Deliverables
- event schema v0
- event emission from gameplay runtime for core game moments
- launcher/event inspector consumer
- contract fixtures
- save/import compatibility rules
- deterministic test coverage

### Definition of Done
- a full game produces structured events in deterministic order
- launcher can view those events without blocking play
- contract verification passes
- lane verification passes

---

## Phase 2 — The Weekly Ritual Shell
### Goal
Turn “advance week” into a compelling return loop.

### Player-facing outputs
- Football Mission
- Human Tension
- Mystery
- Legacy Thread

### Deliverables
- weekly hook generator
- command desk UI shell
- event-to-hook read model
- graceful fallback when data is partial

### Definition of Done
- within 30 seconds of opening a save, the user understands what matters now

---

## Phase 3 — Postgame Teach-Back
### Goal
Make every game teach.

### Player-facing outputs
- Top 3 reasons the game tilted
- One thing the player got right
- One thing the player misread
- One clue for next week

### Deliverables
- postgame autopsy read model
- recap text templates fed by structured football events
- tests for common scenarios: pressure loss, weather game, turnover swing, red-zone failure, comeback

### Definition of Done
- every game result produces a readable plain-language explanation grounded in real game events

---

## Phase 4 — Memory and Meaning
### Goal
Make the universe remember.

### Deliverables
- confidence, trust, rivalry heat, owner patience, and locker-room memory reducers
- first-pass legacy ledger updates
- story tags derived from football truth

### Definition of Done
- recent events alter future story hooks and decision context

---

## Phase 5 — Deeper Engine Extraction
### Goal
Replace temporary hybrid internals behind the stable event contract.

### Deliverables
- progressively move gameplay truth behind the shared contract
- keep launcher/runtime consumers unchanged
- add statistical behavior testing

### Definition of Done
- deeper extraction happens without breaking saved games or player-facing recap/weekly surfaces

---

## What Gets Deferred
These are good ideas. They are just not first.

- giant offseason expansion beyond identity-bet core
- full play-call micromanagement mode
- deep mod workshop systems
- fancy presentation polish that does not improve meaning
- major UI restyles disconnected from weekly ritual clarity
- broad historical mode import complexity
- multiplayer anything

---

## The First Sprint
If only one sprint happens next, it should ship this bundle:

1. Canonical game event contract v0
2. Event emission for core game states
3. Event inspector / event feed in launcher
4. Command Desk shell
5. Postgame Autopsy shell
6. Contract fixtures + deterministic tests

That sprint will create the bridge between football truth and player meaning.

---

## Prioritization Rules
When deciding between two possible tasks, prefer the task that:
1. increases consequence density
2. improves clarity or teach-back
3. creates reusable structure for future systems
4. reduces lane conflict
5. can be verified automatically

Do not prioritize a task merely because it looks impressive in a screenshot.

---

## Success Markers for This Build Order
By the end of the first major push, we should be able to say:
- the sim emits structured football truth
- the launcher can read that truth
- the player understands what matters this week
- postgame teaches instead of shrugging
- future systems can build on one stable spine
