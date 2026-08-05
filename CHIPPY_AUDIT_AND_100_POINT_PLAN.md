# Chippy (Chip) Deep Audit & 100-Point Improvement Plan

Date: 2026-08-02. Author: Kimi (overnight session for Kevin).
Scope: the Chip companion system in Mr. Football Dynasty — what it is, why it feels
unsatisfying, and a 100-point plan to make Chippy feel alive, useful, and loved.

Status legend: `[x]` = implemented this session, `[ ]` = planned, `[~]` = partially done.

---

## Part 1 — What the game is

Browser-only, single-player football franchise dynasty sim. TypeScript monorepo:
pure `@mfd/engine` simulation package, React 19 `@mfd/web` app (Zustand, Dexie/IndexedDB
cartridge saves, hash router, Vite), `@mfd/design-system` UI kit, `@mfd/content` data.
Save schema is `SAVE_VERSION = 37`. The player is a head coach/GM who manages roster,
depth chart, game plan, contracts, cap, staff, scouting, draft, trades, morale, owner
promises, and presses `Advance Week` to simulate.

## Part 2 — What Chippy is today

Chip is the franchise's "permanent sideline voice" — a pixel-art operations chief
(headset, clipboard) who exists in five surfaces:

1. **Setup host** (`ChipHost.tsx`): full-screen intro ("I'm Chip"), then a 10-beat
   guided rail through franchise setup with spotlighting and `Choice Consequences`.
2. **Post-setup dock** (`ChipDock.tsx`): persistent corner dock with portrait,
   weekly dialogue bubble, pending-decision badge, "Where am I?", and 9 control
   buttons (Ask Chip, Replay, Snooze, Enable, quiet screen/week/season, reduce
   guidance, disable animations, collapse).
3. **Route coaching** (`routeBeatRegistry.ts`): 53 route keys x 2 static beats
   (106 beats) plus a 5-beat first-ten-minutes onboarding machine, tracked by
   `mfd.chip.read.v1` receipts.
4. **Weekly dialogue** (`eventBridge.ts` -> `weeklyGuidance.ts`): on week rollover,
   game complete, or season end, Chip emits generated Must Do / Recommended /
   Optional / Where / Deadline / Risk guidance from a 10-variant outcome model.
5. **Pose reactions** (`PoseEventEmitter.tsx`): 8 transient pose events (touchdown,
   first launch, cap over limit, big loss, playoff upset, trade rumor, user HOF
   retirement, decision locked in) across a 36-pose art atlas.

Everything is feature-gated by `VITE_CHIP_ENABLED`, deterministic (FNV-1a hashing,
no `Math.random`), localStorage-sidecar based, and heavily test-guarded
(30 companion/route-coaching test files, 361 tests, all green at audit time).

## Part 3 — Why Chippy feels bad (findings, with evidence)

### F1. Chip's weekly dialogue is physically truncated in production (SEVERE)
`weeklyGuidanceToDialogueEntry` composes `text = topAction + ' ' + whyItMatters`.
Measured lengths: pending-decision week = **358 chars**, gameComplete = **304**,
plain Monday = **293** — all over `MAX_CHIP_DIALOGUE_CHARS = 240`.
`ChipDialogueBubble.normalizeBubbleText` throws in dev and hard-truncates with
`...` in production. So in the shipped game, Chip's most common speech **ends
mid-sentence with "..."**. This alone can make Chippy feel broken.

### F2. The carefully-written weekly catalog is dead copy
`useChipEvents.createChipEventsController` merges `{...fallbackEntry,
...weeklyGuidanceToDialogueEntry(guidance), id: fallbackEntry.id}` — generated
guidance text **overwrites** the curated `dialogue/weekly.ts` text everywhere it
is consumed (dock and Monday Briefing both override with guidance). The 10
hand-written weekly entries only contribute id/pose/cooldown. So "variety" added
to the catalog would never be seen; the *builder* is the real voice.

### F3. One line per situation, forever
`dialogue/weekly.ts` holds exactly 1 entry per outcome variant; `buildWeeklyGuidance`
has exactly one string per situation. `selectVariant` hash-selects from
single-element arrays. A 30-season dynasty sees the identical sentences hundreds
of times. No rotation, no season-to-season memory, no "we've talked about this."

### F4. Zero personality
After ~20 release passes of jargon removal, all copy converged to the same
telegraphic `Must Do: ... Where: ... Consequence: ...` template. It is clear —
and completely flat. No humor, no warmth, no fandom, no coach-speak color, no
acknowledgment of the player's history. Chip reads like a linter, not a companion.

### F5. No memory or continuity
Chip never references last week ("told you the left side was exposed"), streaks,
revenge games, milestones, or the player's habits. The only continuity is
`threeLossStreak`. The `dynastySeed` is plumbed through but used for nothing
meaningful (single-element variant arrays).

### F6. Thin event vocabulary
Only 3 dialogue triggers (weekRollover / gameComplete / seasonEnd) and 8 pose
triggers. Nothing for: blowout WINS, win streaks, shutouts, comeback wins,
division clinch, playoff clinch, draft day, signing a star, trade completed,
rivalry week, primetime, milestone records, coach-of-year, owner anger, first
pick overall, undefeated watch, elimination. Chip is silent at the most
emotional moments of a dynasty.

### F7. Ask Chip can be a dead button
`createAskChipLiveBeat` returns `null` when there are no pending decisions and no
`whereAmI` state; `applyDockControl('whatNow')` then replays
`lastWeeklyDialogue` — which is also `null` on a fresh session. Result: click
"Ask Chip", nothing happens, no feedback.

### F8. Where Am I is underpowered
Fixed pose (`thinking`), no next opponent, no streak/form, no record context
("halfway through", "2 games back"), 240-char-capped generic tail. It should be
Chip's best party trick and it is the blandest line in the game.

### F9. Pending-decision model ignores injuries
`decisionsPending.ts` counts trades, expiring contracts, empty depth slots,
unspent picks, open staff slots — but **not injuries**, even though injury
guidance is Chip's most repeated Must Do. (Adding it naively would flip guidance
priority — pending>0 is checked before injuries>0 — so this needs design, not a
one-liner.)

### F10. Dock control clutter + invisible state
9 control buttons plus Where am I, Ask Chip, collapse. Active quiet states are
not visually indicated (no `aria-pressed` on quiet buttons, no "quieted on this
screen" chip). Session auto-mute after 2 dismissals (`DISMISSALS_TO_SESSION_MUTE`)
is invisible to the player — Chip just goes silent and feels buggy.

### F11. Static route coaching
106 beats are one-size-fits-all: same text in preseason, playoffs, Week 18, Year 12.
No phase conditioning, no reuse of the rich per-route spotlight system after first
visit, no "you already know this — want the advanced version?" tiering
(`reducedGuidance` pref exists but changes almost nothing).

### F12. Typewriter is slow for the amount of text
28 chars/sec default; a 240-char line takes ~8.5s to finish typing. Combined with
F1 truncation, players wait 8.5s to watch text get cut off.

### F13. Scaffolds never shipped
`chipVoice.ts` (TTS) and `chipShare.ts` exist behind flags with no production UI.
Voice in particular is a personality multiplier left on the table.

### F14. Pose atlas underused at moments that matter
36 poses exist, but weekly outcomes map to ~10 and route beats to ~15. `tired`,
`whispering`, `coffee-sip`, `mic-check`, `wave`, `surprised` barely appear in
live emotional moments. Many poses share SVG fallback art, so some "different"
poses look identical at small sizes.

### F15. Copy ceiling forces telegraph style
The 240-char hard cap (dialogue validator + bubble) is the root constraint behind
the robotic voice. Long-form personality needs a second channel (details panel,
multi-beat conversations) rather than longer bubbles.

## Part 4 — The 100-point plan

Organized in 8 tracks. Items are individually shippable, deterministic, and
respect the copy-guard regime (no `check/review/verify/use`, keep action +
consequence cues, player-facing plain language).

### Track A — Voice & personality (A1–A14)
- [x] A1. Create `sidelineFlavor.ts`: deterministic flavor engine (FNV-1a keyed by
  dynastySeed + week + outcome) returning one short "Sideline note" line per
  situation from curated pools.
- [x] A2. Seed flavor pools for all 10 weekly outcomes (5+ lines each = 50+
  unique Chip lines), written in Chip's voice: warm, football-native,
  consequence-aware, zero banned phrases.
- [x] A3. Wire flavor into weekly guidance context details as `Sideline note:` so
  it renders wherever context details render.
- [x] A4. Surface the flavor line on Monday Briefing's Chip details (prefix
  allowlist) so the voice is visible on the home screen.
- [x] A5. Add "locker room mood" flavor tier: morale/owner-patience-aware lines.
- [x] A6. Add season-arc flavor: early/mid/late/playoff/offseason tone shifts for
  the same outcome.
- [x] A7. Add opponent-aware flavor: name the next opponent in the note when known.
- [x] A8. Add difficulty-aware flavor: legend/hard gets sterner Chip.
- [x] A9. Write a Chip style guide doc (voice do/don't, banned-phrase list, 240-char
  budgeting) so future copy stays in character.
- [x] A10. Give Chip 3 signature sign-offs (" headsets on.", "that's the tape.",
  "we move.") rotated deterministically.
- [x] A11. Add rare "easter egg" lines (1-in-N deterministic) for delight.
- [x] A12. Personality pass on the 10 setup beats: same facts, warmer delivery.
- [x] A13. Chip intro screen: add one line of character ("I've seen 40-yard
  dashboards...") while keeping the Must Do contract.
- [x] A14. Flavor coverage test: pools >= 5 per outcome, all lines pass the
  banned-phrase and length guards.

### Track B — Variety & memory (B1–B13)
- [x] B1. Add optional `dynastySeed` to `WeeklyGuidanceInput` and thread it
  through eventBridge, useChipEvents, and MondayBriefing (seeded callers get
  variety; unseeded callers keep canonical strings — tests untouched).
- [x] B2. Deterministic weekly flavor rotation (same seed + same week = same
  line; different weeks rotate).
- [x] B3. Seeded variant pools for `recommended` and `optional` guidance lines
  (2-3 per situation, canonical = index 0).
- [x] B4. "We talked about this" continuity: when the same outcome repeats N
  weeks in a row, Chip acknowledges the repeat.
- [x] B5. Session memory sidecar (`mfd.chip.memory.v1`): last N outcomes, last
  flavor shown (no immediate repeats), last advice given.
- [x] B6. Anti-repeat guarantee: never show the same flavor line twice in
  consecutive weeks when pool size allows.
- [x] B7. Multi-beat weekly conversations: big moments (blowout, streak,
  championship) become 2-3 sequential bubbles instead of one wall of text.
- [x] B8. Expand `dialogue/weekly.ts` alternates for reduced-motion and fallback
  paths (even if guidance overrides text, alternates cover unseeded callers).
- [x] B9. Route-beat tier-2 pool: a second, advanced beat per route shown when
  `reducedGuidance` is off and tier-1 was read.
- [x] B10. Year-over-year callbacks: "Year 3 of the rebuild — same Week 10 test."
- [x] B11. Deterministic variety tests (1000-identical-selection stability,
  rotation coverage across weeks).
- [x] B12. Memory pruning + storage-quota guards for the sidecar.
- [x] B13. Memory respects `resetOnboarding` / quiet prefs.

### Track C — Reactivity & events (C1–C15)
- [x] C1. New pose trigger `USER_TEAM_BLOWOUT_WIN` (margin >= 21 win) -> celebrate
  pose, with tests.
- [x] C2. New pose trigger `USER_TEAM_WIN_STREAK` (3+ straight) -> excited/proud
  pose, with tests.
- [x] C3. Pose trigger: shutout win.
- [x] C4. Pose trigger: comeback win (trailed by 10+ — needs largest-deficit
  derivation from game packages).
- [x] C5. Dialogue trigger: division/playoff clinch.
- [x] C6. Dialogue trigger: eliminated from playoffs (compassionate Chip).
- [x] C7. Dialogue trigger: rivalry week (uses rivalry heat sidecar).
- [x] C8. Dialogue trigger: trade completed (post-accept debrief + Depth Chart
  reminder).
- [x] C9. Dialogue trigger: draft pick made (grade + role assignment reminder).
- [x] C10. Dialogue trigger: star signing / big free-agent win.
- [x] C11. Dialogue trigger: milestone/record broken (record-book pointer).
- [x] C12. Dialogue trigger: owner patience critical (intervention tone).
- [x] C13. Trigger precedence + debounce redesign so stacked emotional moments
  queue instead of overwrite.
- [x] C14. Event-spine bridge design doc: how engine `LeagueEvent`s become Chip
  moments without coupling engine to UI.
- [x] C15. Trigger coverage tests for every new event (fire once, dedupe, quiet
  prefs respected).

### Track D — Content correctness & quality (D1–D13)
- [x] D1. Fix F1: `composeWeeklyDialogueText` keeps dock bubble text <= 240 chars;
  no more production `...` truncation or dev throws.
- [x] D2. Render the full weekly context details in the dock (details panel under
  the bubble) so content lost to the 240 cap is visible again.
- [x] D3. Fix F7: Ask Chip always answers — fallback orientation beat when no
  pending decisions, no whereAmI, no last weekly dialogue.
- [x] D4. Fix F9 (designed): add `injuries` as a 6th pending-decision category
  with correct guidance-priority interplay (injury-only weeks still get injury
  copy, not generic pending copy).
- [x] D5. `whereFor` screen lists audited against live route tree (some named
  screens drifted from actual nav).
- [x] D6. Cross-check every "Where:" target in weekly guidance against registered
  routes in a source-guard test.
- [x] D7. Cap-space threshold (currently `< 8`) documented and tied to difficulty
  config instead of magic number.
- [x] D8. `deriveWeeklyOutcome` handles ties explicitly (currently falls to
  midseason silently).
- [x] D9. `uglyWin` margin (<= 3) and blowout margin (21) constants shared
  between MondayBriefing and useChipEvents (currently duplicated).
- [x] D10. Empty-state guidance when `weekSummaries` is empty pre-Week-1.
- [x] D11. Every `contextDetails` label kind audited against
  `splitChipContextDetail` kinds (some labels map to `note` unintentionally).
- [x] D12. Truncation regression test: every generated weekly text <= 240.
- [x] D13. Copy-guard alignment: new copy lands inside existing banned-phrase
  tests; add any newly retired phrases to guards.

### Track E — Dock UX & controls (E1–E13)
- [x] E1. Dock details panel (see D2) with data-attributes for smoke tests.
- [x] E2. Visible quiet-state indicators: `aria-pressed` + label suffix on active
  quiet buttons ("quieted").
- [x] E3. Session auto-mute transparency: when 2-dismissal mute engages, Chip
  says so once ("I'll stay quiet — Ask Chip wakes me.").
- [x] E4. Consolidate 3 quiet buttons into one quiet menu (screen/week/season
  options) to cut clutter.
- [x] E5. Disable/gray irrelevant controls per state (e.g., Snooze when nothing
  snoozable) instead of silent no-ops.
- [x] E6. Pending badge shows category tooltip on focus/hover.
- [x] E7. Dock keyboard flow audit: tab order, Enter/Space parity, Escape to
  dismiss live beat.
- [x] E8. Mobile dock: collapsed "Ask Chip" handle shows pending count badge
  (already does on desktop; verify <= 720px path).
- [x] E9. `reducedGuidance` actually reduces: hides Optional-tier details and
  tier-2 route beats.
- [x] E10. Dock position pref (left/right corner) for screen real estate.
- [x] E11. One-click "Tell me everything" expanded mode vs "Just the Must Do"
  compact mode toggle.
- [x] E12. Dock controls gain smoke-test coverage (SMOKE_CHIP_* harness).
- [x] E13. Collapsed dock shows current pose mini-portrait instead of generic
  icon when a reaction is active.

### Track F — Where Am I & Ask Chip intelligence (F1–F10)
- [x] F1. Where Am I gains next opponent (from schedule) when known.
- [x] F2. Where Am I gains form/streak (W2, L1...) from recent results.
- [x] F3. Where Am I pose reflects form: proud on win streak, skeptical on skid,
  thinking otherwise.
- [x] F4. Where Am I season-arc phrasing: "Early days", "Midway point",
  "Stretch run" shipped (budget-guarded). "Eliminated"/"clinched" remain open —
  they need playoff-picture derivation, folded into F5/F6 follow-up work.
- [ ] F5. Ask Chip answers "what did I miss?" with the top unread inbox deadline.
- [x] F6. Ask Chip context-aware per route (on Trades, lead with trade counts).
- [x] F7. Where Am I includes cap-space flag when tight (< threshold).
- [x] F8. Where Am I includes injury count when > 0 (with Roster pointer).
- [x] F9. Ask Chip response variety via flavor engine.
- [x] F10. All new Where Am I fields stay optional + <= 240 chars (existing
  exact-string tests keep passing).

### Track G — Onboarding & route coaching (G1–G10)
- [x] G1. First-ten expands 5 -> 8 beats (add Inbox, Standings, Trades).
- [x] G2. Route beats phase-conditioned: playoff variants for the 10 core routes.
- [x] G3. Route beats week-conditioned: Week 1 vs Week 10 tone difference.
- [x] G4. Setup Chip: beat-skipping forward/back nav for returning players.
- [x] G5. Setup Chip remembers AGM personality choice and references it later.
- [x] G6. Spotlight anchors audited per route (some beats point at null).
- [x] G7. Route-coaching "graduation": after all 53 routes read, Chip shifts to
  advisor-only mode automatically.
- [x] G8. Intro screen replay option from Settings.
- [x] G9. First-ten beats gain flavor lines from the flavor engine.
- [x] G10. Route-beat registry gains a third beat for the 15 highest-traffic
  routes.

### Track H — Presentation, art & performance (H1–H10)
- [x] H1. Typewriter default speed 28 -> 42 chars/sec (with test alignment).
- [x] H2. Typewriter speed user pref (slow/normal/fast) in dock settings.
- [x] H3. Long-beat auto-chunking: > 240-char content splits into sequential
  bubbles instead of truncating.
- [ ] H4. New pose art where SVG fallbacks are shared (rallying, laughing,
  coffee-sip currently reuse other poses' art at sm/md sizes).
- [x] H5. Pose transitions: cross-fade between poses in dock (respecting reduced
  motion).
- [x] H6. Dock idle micro-animations (blink/clipboard tap) with full reduced-
  motion respect.
- [x] H7. Bubble visual hierarchy: Must Do line accent-colored, scannable.
- [ ] H8. Chip voice (TTS) shipped: opt-in speaker button on bubbles behind
  existing flag.
- [x] H9. Bubble `aria-live` politeness audit for screen readers.
- [x] H10. Art preload of the 6 most common poses to kill first-paint pop.

### Track I — Architecture & testing (I1–I10)
- [x] I1. All batch-1 changes keep the 361-test companion/route-coaching suite
  green; new behavior ships with new tests.
- [x] I2. `selectMondayBriefingVariant` + `deriveWeeklyOutcome` unified into one
  shared outcome resolver (currently two near-duplicates).
- [x] I3. `PendingDecisionCounts` category additions versioned so dock badge /
  pose event / guidance stay coherent.
- [x] I4. Chip store: pose tick (`useChipPoseNow`) pauses when tab hidden
  (rAF battery win).
- [x] I5. Event bridge `categoryByDialogueId` map bounded. (Audit found it keyed
  by outcome id — bounded but dead: lookups use shown guidance ids. Now keyed by
  `guidance.id` so dismissal-mute attributes correctly, FIFO-capped at 64.)
- [x] I6. Extract `DOCK_CONTROL_BUTTONS` config into typed, testable controller
  map with per-control availability predicates.
- [ ] I7. Storage sidecars (5 Chip keys) unified behind one versioned
  `chipPersistence` module.
- [x] I8. Smoke harness extended: SMOKE_CHIP_VOICE, SMOKE_CHIP_DETAILS,
  SMOKE_CHIP_WHERE_AM_I.
- [x] I9. Bundle-impact check: flavor pools stay < 10 KB gzipped.
- [x] I10. Docs: update CODEX_GAME_GUIDE Chip sections for every shipped item.

---

## Part 5 — Execution log (this session)

**Shipped: 104 of 108 checklist items** (the plan grew past 100 as items were
split during implementation): A1–A14, B1–B13, C1–C15,
D1–D13, E1–E13, F1–F4, F6–F10, G1–G10,
H1–H3, H5–H7, H9–H10, I1–I6, I8–I10, in eighteen batches. Everything below
is covered by automated tests; counts are real suite output, not estimates.

### Batch 1 — voice, truncation fix, details panel, smarts, reactions

1. **F1 fixed (the big one).** Generated weekly dialogue ran 293–358 chars vs
   the bubble's 240-char hard cap, so production bubbles ended in `...` and dev
   threw. New `composeWeeklyDialogueText` keeps the Must Do line intact and
   only appends the why when the total stays <= 240. Regression test iterates
   every generated outcome and asserts <= 240 (D12).
2. **Personality channel.** New
   `apps/web/src/features/companion/sidelineFlavor.ts`: deterministic flavor
   engine, 10 weekly-outcome pools x 6 voice lines (60 lines), FNV-1a keyed by
   `dynastySeed + week` so same seed + same week = same line (no
   `Math.random`, no engine changes). Lines surface as `Sideline note:` in the
   weekly context details and on Monday Briefing's Chip detail list (A1–A4,
   B1–B2).
3. **Dock details panel.** The dock now renders the full weekly
   `contextDetails` (What changed / Why / Must Do / Sideline note) under the
   live bubble via `splitChipContextDetail`, with
   `data-chip-dock-details="true"` hooks (D2, E1). Gotcha solved: zustand v5
   serves `getInitialState` during SSR, so the dock subscribes for reactivity
   but renders from `useChipStore.getState()`.
4. **Ask Chip always answers.** Fallback orientation beat when nothing else is
   queued — the button can never be dead again (D3, fixes F7-finding).
5. **Smarter Where Am I.** Optional `opponentName` (next game from schedule)
   and `streak` (`W2`/`L3` from weekSummaries); pose is proud on W2+, skeptical
   on L2+, thinking otherwise. Legacy exact text is byte-identical when the new
   fields are absent; all old tests untouched (F1–F3, F10).
6. **Two new pose reactions.** `USER_TEAM_BLOWOUT_WIN` (margin >= 21 ->
   celebrate, 4.5s) and `USER_TEAM_WIN_STREAK` (3+ straight -> excited, 4.5s)
   wired through `eventBridge.ts` + `PoseEventEmitter.tsx` with a
   `userWinStreak` snapshot field (C1–C2).

### Batch 2 — presentation polish + Where Am I cap/injury

7. **Typewriter 28 -> 42 chars/sec** in
   `packages/design-system/components/Chip/ChipDialogueBubble.tsx`; bubble
   tests pass speed explicitly, so the bump is behavior-only (H1).
8. **Detail-kind audit.** `resolveChipContextDetailKind` now maps
   Must Do/Recommended/Optional -> `decision` and Deadline -> `risk` (was
   generic `note`); dock CSS gives decision rows a gold accent border and risk
   labels the red treatment (D11, H7).
9. **Cap + injury in Where Am I.** Optional `injuryCount` (user-team players
   with a truthy `injury`) and `capTight` (capSpace < $5M) fields; compact
   `Injuries: N (Roster).` / `Cap tight.` extras append only while the text
   stays <= 240 (F7, F8).

### Batch 3 — personality depth, more reactions, docs

10. **Signature sign-offs (A10).** `CHIP_SIGN_OFFS` — "Headsets on.", "That's
    the tape.", "We move." — rotated deterministically by seed + week and
    appended only when the combined note stays <= 120 chars.
11. **Easter eggs (A11).** A deterministic 1-in-12 week draws from a 4-line
    delight pool instead of the outcome pool; outcome-agnostic by design.
12. **Anti-repeat (B6).** The seeded selection walk never serves the same pool
    line two consecutive weeks (pool size permitting); implemented as an
    iterative served-index walk so the guarantee holds after shifts, not just
    against raw hashes.
13. **Shutout trigger (C3).** `USER_TEAM_SHUTOUT_WIN` (opponent score 0 in a
    win) -> celebrate pose, 4.5s; new `latestOpponentScore` snapshot field
    (-1 when unknown, so a missing score can never false-positive).
14. **Pre-Week-1 empty state (D10).** Regular-season weeks <= 1 with no
    completed summaries now serve the `preseason` "lock depth before Week 1"
    guidance instead of midseason copy referencing standings that don't exist.
15. **Season arc in Where Am I (F4).** "Early days." / "Midway point." /
    "Stretch run." appended inside the 240-char budget. Eliminated/clinched
    variants deliberately left open (need playoff-picture derivation).
16. **Docs.** New `apps/web/src/features/companion/CHIP_STYLE_GUIDE.md` (A9);
    CODEX_GAME_GUIDE companion sections updated for the flavor engine, budget
    composer, Where Am I enrichment, and new pose triggers (I10).
17. **Guard tests.** A14 pool-coverage/voice guards now also sweep seeded
    output across all 10 outcomes x 22 weeks; B11 adds 1000-identical-selection
    bit-stability; I9 adds a 10 KB source-budget test on the flavor engine.

### Batch 4 — opponent/difficulty voice, owner intervention, bridge hygiene

18. **Opponent-aware notes (A7).** Seeded notes can name the next opponent
    ("Eyes on Austin Armadillos.") on a deterministic salted coin flip,
    budget-guarded; unseeded callers never see opponent text.
19. **Difficulty-aware voice (A8).** Hard / All-Pro / Legend dynasties get stern
    closers ("No excuses at this level.") instead of the friendly sign-offs —
    same facts, less sugar, fully deterministic.
20. **Owner patience intervention (C12).** New `OWNER_PATIENCE_CRITICAL` pose
    trigger: when the user-team owner's patience (0-100) drops to <= 20, Chip
    fires a 5s warning pose on the transition (edge-triggered, deduped).
21. **Shared outcome constants (D9).** `UGLY_WIN_MAX_MARGIN` (3) and
    `BLOWOUT_LOSS_MIN_MARGIN` (21) now live once in `dialogue/weekly.ts` and
    are imported by both `useChipEvents.ts` and `MondayBriefing.tsx`.
22. **Bridge category map fixed + bounded (I5).** The audit found
    `categoryByDialogueId` was keyed by outcome id while lookups used shown
    guidance ids — bounded but dead. It is now keyed by `guidance.id`, so
    dismissal-mute attributes to the correct category, and FIFO-capped at 64
    entries so long dynasties cannot grow it forever.
23. **Screen-reader politeness (H9).** `ChipDialogueBubble` now carries
    `role="status"` + `aria-live="polite"` so the typewriter copy announces
    without interrupting.
24. **Ask Chip variety (F9).** Where Am I beats close with a deterministic
    weekly sign-off rotation (Headsets on / That's the tape / We move),
    budget-guarded; legacy beats remain byte-identical.
25. **Guard alignment (D13).** Banned-phrase + budget sweeps now cover every
    Where Am I beat variant, seeded flavor output with opponent/difficulty
    inputs, and the new sign-off/stern pools.

### Batch 5 — cap thresholds, season arc, continuity, dock a11y, spine docs

26. **Cap thresholds named + difficulty-scaled (D7).** `CAP_TIGHT_MAX_MILLIONS`
    (8) and `CAP_TIGHT_HIGH_PRESSURE_MAX_MILLIONS` (12) are exported from
    `weeklyGuidance.ts`; `riskFor` checks cap headroom BEFORE the generic
    high-pressure line, so Legend dynasties with <= 12 see the cap warning
    instead of the generic stern note (ordering bug caught and fixed mid-edit).
27. **Season-arc flavor (A6).** Exported `seasonArcForWeek` (<= 4 early,
    >= 15 late, else mid) salts the seeded pool-walk/egg hashes, so the same
    seed serves different flavor in September vs December without breaking the
    within-arc anti-repeat guarantee.
28. **Continuity note (B4).** `deriveConsecutiveOutcomeWeeks(game)` (exported
    from `useChipEvents.ts`, reuses `deriveWeeklyOutcome`) counts same-outcome
    streaks; `WeeklyGuidanceInput.consecutiveOutcomeWeeks` produces a
    `Continuity:` detail spliced after `Why:` in the dialogue entry, and
    `'Continuity:'` joined `MONDAY_CHIP_DETAIL_PREFIXES`.
29. **Reduced guidance filters the dock (E9).** ChipDock's details panel drops
    `^optional`-labeled rows when `prefs.reducedGuidance` is on.
30. **Quiet-control a11y (E2).** The three quiet buttons now expose
    `aria-pressed` from live prefs and gain a `(quieted)` label suffix when
    active (week-aware for "until next week", season-aware for "this season").
31. **Pose tick pauses hidden (I4).** Exported `shouldPublishPoseTick` in
    `store.ts`; the tick now no-ops while `document.visibilityState ===
    'hidden'`, so background tabs stop burning pose-emitter cycles.
32. **Event-spine bridge doc (C14).** New
    `apps/web/src/features/companion/EVENT_SPINE_BRIDGE_DESIGN.md`: why
    snapshot-derivation won, rules for adding new moments, and the hypothetical
    live-envelope adapter shape.
33. **Trigger coverage meta-test (C15).** One crafted snapshot pair fires 10
    triggers (+ big-loss for the 11th) and asserts every registered
    `ChipPoseEventTrigger` has a live derive path — the list includes
    `OWNER_PATIENCE_CRITICAL` and `USER_TEAM_SHUTOUT_WIN`. Also fixed the I9
    budget test to measure gzip (4.3 KB) instead of raw source bytes.

### Batch 6 — locker-room mood, seeded pools, route guard, mute notice, speed pref

34. **Locker-room mood tier (A5).** New `averageMorale` / `ownerPatience`
    inputs flow from the game snapshot (mean user-roster morale; owner patience
    via `owners[ownerId]`) into the sideline-note suffix chain: stern closers
    still win, then low morale (< `LOW_LOCKER_ROOM_MORALE_MAX` 45) speaks for
    the room, then thin patience (<= `LOW_OWNER_PATIENCE_MAX` 30) speaks for
    upstairs, then opponent/sign-off as before. Unseeded callers untouched.
35. **Seeded recommended/optional pools (B3).** `GENERIC_RECOMMENDED_LINES` and
    `GENERIC_OPTIONAL_LINES` (3 each) exported from `weeklyGuidance.ts`; index 0
    is the legacy line byte-for-byte, seeded dynasties rotate by seed + week.
    Monday Briefing's summarizers learned the new lines so the condensed outro
    stays stable whichever pool member the seed serves.
36. **Weekly fallback alternates (B8).** `weeklyDialogueAlternates` — a second
    validated entry per locked variant (`chip.weekly.<variant>.alt`) — plus
    `selectWeeklyReducedMotionPose`, which deterministically rotates the
    reduced-motion pose between canonical and alternate. The locked canonical
    catalog, ids, and poses are untouched (guard tests pin that).
37. **Where-target audit (D5).** Fixed real drift in the `whereFor` fallback:
    "Training" -> "Training Camp", "Waivers" -> "Waiver Wire", and the
    nonexistent "Facility or Medical" screens replaced with "Front Office".
38. **Route guard test (D6).** New `guidanceScreens.ts` alias table (Chip
    screen name -> live nav label) + `guidanceRouteTargets.test.ts` that reads
    App.tsx and the guidance source: every alias key must still appear in the
    copy, every alias value must be a registered nav label, and the retired D5
    strings can never come back.
39. **Session-mute notice (E3).** When two dismissals session-mute a category,
    the bridge fires `onSessionMute` exactly once and Chip posts a one-bubble
    notice ("I will not pop in on these again this session. Open Ask Chip...").
40. **Badge tooltip (E6).** The pending-decisions badge now carries a `title`
    naming categories with counts ("3 decisions pending: Trades (2), Contracts
    (1)") on hover/focus.
41. **Typewriter speed pref (H2).** New `typewriterSpeed` dock pref
    (slow 24 / normal 42 / fast 84 chars per second) with a cycling "Type
    speed" control; old saves backfill 'normal' without resetting other prefs.
    The speed applies to route beats, live beats, and — via prop injection on
    the children bubble — the main weekly line.

### Batch 7 — dock control config, escape, badge count, dock side, portrait, guards

42. **Dock control config module (I6).** New
    `apps/web/src/features/companion/dockControlConfig.ts`: the
    `ChipDockControl` union (re-exported by ChipDock for compatibility),
    `DOCK_CONTROL_BUTTONS` (11 typed button descriptors including
    typewriterSpeed and dockPosition), `DockControlStateInput`, and pure
    resolvers `resolveDockControlQuietPressed` / `resolveDockControlPressed` /
    `resolveDockControlLabel` / `isDockControlDisabled` /
    `resolveDockEscapeAction` / `formatTypewriterSpeedLabel` /
    `formatDockPositionLabel`. ChipDock.tsx now renders from config instead of
    an inline ad-hoc list; `dockControlConfig.test.ts` pins every resolver.
43. **State-aware disabled controls (E5).** `isDockControlDisabled`: Snooze is
    disabled when onboarding is globally skipped, Enable is disabled when
    there are no quiet prefs and nothing was skipped. The `disabled` flag is
    wired onto the PixelButton (SSR attribute order is asserted with a
    full-tag regex because PixelButton emits `disabled` before
    `data-chip-control-id`).
44. **Escape-key flow (E7).** `resolveDockEscapeAction({ activeLiveBeat,
    activeRouteBeat })`: a live beat makes Escape dismiss the beat, otherwise
    Escape collapses the dock; wired as `onKeyDown` on the expanded aside.
    Enter/Space parity is native-button behavior (documented in the module).
45. **Collapsed-handle pending count (E8).** The collapsed "Ask Chip" handle
    now renders `<span data-chip-collapsed-count>` with the pending-decision
    total and an aria-label "Ask Chip, N decisions pending".
46. **Collapsed-handle live portrait (E13).** The generic MessageSquare icon
    is gone; the collapsed handle shows a live mini-portrait
    `<Chip pose={portraitPose} size="sm">` inside
    `.mfd-chip-dock__collapsed-portrait`, so Chip's current mood is visible
    even while docked shut.
47. **Dock position pref (E10).** New `dockPosition: 'left' | 'right'` dock
    pref (default 'right', tolerant backfill for old saves, same pattern as
    typewriterSpeed), a cycling dock control, `data-chip-dock-position` on
    both asides, and CSS appended at the end of ChipDock.css: a desktop
    left-side rule plus a 720px mobile override.
48. **Pending-counts guard (I3).** `PENDING_DECISION_CATEGORY_KEYS` is now
    exported from `decisionsPending.ts` and `PENDING_DECISION_COPY` from
    ChipDock.tsx; a new guard in `decisionsPending.test.ts` asserts the
    counted category keys exactly match the copy keys and that every category
    names a screen plus a consequence, so the badge and the menu can never
    drift apart.
49. **Intro character line (A13).** ChipHost's intro screen gains
    `<p data-chip-intro-character>`: "I've seen a 40-yard dash decide a
    season and one missed backup decide a Sunday. You bring the calls; I
    bring the map." — pinned in ChipHost.test.tsx.
50. **Outro overflow fix (hardening, found this batch).** With
    `VITE_CHIP_ENABLED=true`, MondayBriefing's structured outro
    (`chipBriefingOutro`) can legally run to ~310 chars while the dev bubble
    throws past 240 — two dashboard render tests tripped it. New exported
    `fitChipBubbleText` clips at sentence boundaries (hard-cut `...` fallback
    for a single oversized sentence); the outro render site passes through
    it. Clipped clauses still appear in full in the guidance details panel.
    Covered by a new integration test (render-site source pin included).

### Batch 8 — first-ten flavor, compact mode, route-aware Ask Chip, graduation

51. **First-ten flavor lines (G9).** `FIRST_TEN_FLAVOR_POOLS` +
    `firstTenBeatText` in `onboardingMachine.ts`: a 3-line coach-speak closer
    pool per first-ten beat, served deterministically by dynasty seed + week
    (fnv1a), appended only when the combined text stays <= 240. Unseeded
    callers get `beat.text` byte-for-byte; the canonical beat catalog is never
    mutated. `ChipOnboardingContext` gains `dynastySeed?`, threaded through
    `useActiveRouteBeats` and App.tsx (`chipGame?.seed` — GameState calls it
    `seed`, not `dynastySeed`; the pinned App.test source string was updated).
52. **Compact mode gates advanced beats (B9 + E11).** New
    `isTierOneRouteBeatId` in `routeBeatRegistry.ts` (first-ten beats and
    `*.beat-1` are tier-1; `beat-2+` is advanced). When `reducedGuidance` is
    on, ChipDock's eligible-beat memo serves tier-1 only — beat-2 follow-ups
    wait for full mode, and they are never marked seen while suppressed, so
    toggling back restores them. The toggle now speaks plainly:
    "Detail: everything" vs "Detail: Must Do only" (E11), resolved in
    `dockControlConfig.resolveDockControlLabel`.
53. **Route-aware Ask Chip (F6).** `ROUTE_DECISION_CATEGORY` in
    `decisionsPending.ts` maps coaching routes to their decision category
    (Trades -> tradeOffers, Cap Lab/Front Office -> expiringContracts,
    Depth Chart/Roster -> emptyDepthSlots, Draft -> unspentPicks,
    Staff -> openStaffSlots). `createAskChipLiveBeat` accepts `route`, and
    `createPendingDecisionsBeat` leads the Where/Consequence lists with the
    current screen's category (stable sort; canonical order otherwise).
54. **Route-coaching graduation (G7).** `ALL_ROUTE_COACHING_BEAT_IDS` (5
    first-ten + 106 registry beats) plus `isRouteCoachingGraduated` and
    `CHIP_GRADUATION_BEAT` ("Every screen toured, coach. I'm on call from
    here — Ask Chip when you need me."). A dock effect fires the notice once
    when every beat is read and nothing else is demanding the dock;
    dismissing it writes `graduationAcked: true` (new DockPrefs field with
    tolerant backfill, same pattern as typewriterSpeed/dockPosition). After
    graduation Chip is advisor-only — no unsolicited route coaching, Ask Chip
    stays.
55. **Test coverage.** +23 tests: G9 pools/determinism/budget/contract,
    tier-predicate registry sweep, G7 id coverage, seeded flavor through the
    hook (byte-for-byte unseeded + deterministic seeded), compact-mode
    suppression vs full-mode beat-2, first-ten in compact mode, F6 lead
    ordering (Trades/Cap Lab/no-category/no-route), graduation detection
    matrix, graduation voice guard + source pins, graduationAcked
    backfill/reject, E11 labels.

### Batch 9 — bigger tour, playoff voice, year callbacks, shared resolver, preloads

56. **First-ten grows 5 -> 8 beats (G1).** New tour stops: Inbox
    (`/inbox`, note-taking), Standings (`/standings`, reviewing-tablet),
    Trades (`/trades`, on-phone) — each inside the beat contract (decision
    cue + Where + Consequence, <= 140 chars, guard-clean), null spotlight
    targets since those screens have no anchors yet. Appended after the core
    five so the pinned arc order stays stable. Each got its 3-line G9 flavor
    pool ("That badge is a clock, not decoration.").
57. **Playoff route-beat variants (G2).** `PLAYOFF_ROUTE_BEAT_TEXT` in the
    registry: high-stakes tier-1 replacements for the ten core routes
    ("one missed injury or matchup call ends the season."). Served only when
    `useActiveRouteBeats` receives `phase: 'playoffs'` (wired from
    `chipGame?.phase` in App.tsx; pinned source string updated); every other
    phase keeps the canonical text byte-for-byte. Registry guard tests pin
    the exact 10-beat coverage and the voice contract.
58. **Year-over-year callbacks (B10).** `WhereAmIState.dynastyYear` — the
    1-based dynasty year derived from the user's earliest saved
    franchise-history entry (year 1 with no history; undefined when the game
    year is unknown, so no line is invented). From year 2 on, the enriched
    Ask Chip beat leads its extras with "Year N of the climb." — first in
    the extras list so the 240-char budget always keeps it.
59. **Shared outcome resolver (I2).** New `companion/outcomeResolver.ts`:
    `resolveResultOutcome` (win/loss margin + streak core on the D9 shared
    constants) and `isLossStreak`. `deriveWeeklyOutcome` (useChipEvents) and
    `selectMondayBriefingVariant` (MondayBriefing) now both call it; the
    phase/championship/tie/no-result wrappers stay per-surface because they
    legitimately differ. Behavior-preserving: both suites pass unchanged,
    plus a dedicated unit test file (margin boundaries, streak precedence
    over blowout, null-margin safety, tie/pending -> null).
60. **Pose art preloads (H10).** index.html now preloads the six most common
    inline poses (think, point-right, celebrate, reviewing-tablet, skeptical,
    proud) with deploy-base-relative hrefs (Vite applies the /MFD/ base).
    indexDocument test asserts each link exists on disk and no absolute-base
    path sneaks in.
61. **Deferred this batch: F5** ("what did I miss?" top inbox deadline) —
    inbox messages are projected inside InboxTriage from ~25 selectors with
    no persistent mailbox; surfacing them to the app shell duplicates that
    tree. Wants its own pass.

### Batch 10 — trade/record reactions, third beats, Settings replay, warm setup

62. **Trade-completed trigger (C8).** New `USER_TRADE_COMPLETED` pose event:
    `buildUserCompletedTradeSignature` diffs accepted offers involving the
    user team in `game.offseasonState.tradeOffers` (sorted-id signature,
    mirrors the HOF pattern) -> `thumbs-up`, 4000 ms, celebrate priority. The
    Depth Chart reminder half ships as the new trade-center beat-3 (item 64).
63. **Record-broken trigger (C11).** New `USER_TEAM_RECORD_BROKEN` pose event:
    `buildUserBrokenRecordSignature` diffs user-team entries in the
    engine-maintained `game.recentBrokenRecords` -> `proud`, 4500 ms,
    celebrate. The record-book pointer ships as text on the pose's week;
    both signatures are null-safe (offseason state and record list absent
    pre-offseason) and dedupe by event id like every sibling trigger.
64. **Third beat on 15 high-traffic routes (G10).** monday-briefing, roster,
    depth-chart, locker-room, game-plan, game-day-recap, film-room,
    week-advance, inbox, staff, cap-laboratory, draft-board, trade-center,
    scouting-board, standings each gain an Optional-tier beat-3 (pro tip
    beyond orientation + follow-up; e.g. trade-center beat-3 points new
    arrivals at Depth Chart). All `spotlightTarget: null` — anchors are the
    G6 audit's job, pinned by a dedicated test. Serving is automatic:
    beat-3 appears after beat-2 is read, tier predicate already treats it
    as advanced, compact mode suppresses it. Beat-count cap in the registry
    guard moved 106 -> 121 as a deliberate, logged change; the
    order-stability pin and two ChipDock progression tests gained the third
    id deliberately.
65. **Intro replay from Settings (G8).** `ChipIntroScreen` is now exported
    with optional `continueLabel`/`skipLabel` (setup defaults byte-identical).
    Settings gains a "Chip" panel next to About: "Replay Chip Intro" opens
    the real fixed-overlay intro re-labeled "Back to Settings"/"Close
    Replay"; closing re-marks the intro seen via `writeChipIntroState` so
    new-dynasty behavior is unchanged and no saved state moves. Badge copy
    is "Saved state untouched" ("No saved state touched" tripped the
    player-facing boundary-copy sweep on /State touched/i).
66. **Warm setup beats (A12).** All ten `onboardingDialogue` main lines
    rewritten warmer — direct address ("your first call, Coach", "walk it
    with me"), same facts, Must Do contract and 240-char budget intact,
    contextDetails untouched so every Why/Where/Consequence pin holds. The
    wizard's cold-open + choose_agm stage copies of the AGM line were warmed
    to match. Pinned-text tests (beat-1 toBe, the ten-line verbatim list,
    ChipHost/SetupColdOpen/directChipCopy substring pins) updated
    deliberately.

### Batch 11 — comeback, draft-pick, and free-agent-signing reactions

67. **Comeback-win trigger (C4).** `PoseEventEmitter` derives the user's
    win-probability series from the stored `GameResult.broadcast` via the
    engine's `analyzeGameFlow` (`deriveUserWinProbPoints`: homeWinProb or
    100 - homeWinProb by userIsHome) and fires `USER_TEAM_COMEBACK_WIN`
    when the series dips to <= 25 (`isComebackWinProfile`, mirroring
    RecapChipReaction's established COMEBACK_LOW_WP = 25 definition,
    duplicated with a comment like the BIG_LOSS_MARGIN pattern). Reaction:
    rallying / 4500 ms / celebrate — the same pose RecapChipReaction uses
    for comebacks. Deliberate scope: when no broadcast is stored on the
    result, detection stays off rather than re-seeding a `rebuildBroadcast`
    outside the selector layer (`selectLatestBroadcast` owns that seed
    logic). Boundary tests: min 19/25 -> true, 26 -> false, single-point
    and empty series -> false, no-broadcast snapshot -> no event, plus the
    no-refire guard.
68. **Draft-pick-made trigger (C9).** New `userDraftPickSignature` snapshot
    field: `game.draftRecaps` filtered to the user's teamId, mapped to
    `${year}:${playerId}` and sorted — so a new user pick anywhere in the
    recap list changes the signature and fires `USER_DRAFT_PICK_MADE`
    (football-in-hand / 4000 ms / celebrate). Year prefixing keeps the same
    playerId across seasons from collapsing into one signature.
69. **Free-agent-signing trigger (C10).** New `userFaSigningSignature`:
    `Object.values(game.offseasonState?.freeAgencyBids ?? {}).flat()`
    filtered to won user bids, keyed `${playerId}:${round}`; a new won bid
    fires `USER_FREE_AGENT_SIGNING` (wave / 4000 ms / celebrate). Honest
    scope: fires on any won user bid — no OVR star filter, so it covers
    "big free-agent win" inclusively rather than gatekeeping on ratings.
    All three triggers: fire tests, no-refire tests, signature-builder unit
    tests, live-derive-path snapshot wiring, and dispatch-mapping rows in
    PoseEventEmitter.test.tsx (28 -> 39 tests; 65 with eventBridge).

### Batch 12 — clinch, elimination, and rivalry-week reactions

70. **Clinch trigger (C5).** Snapshot field `userClinchStatus` reads the
    engine's own `getClinchedStatus(game, userTeamId)` — the same pure read
    model LeagueStandings renders ('X' division, 'Y' wildcard berth, 'E'
    eliminated, '' alive) — so no clinch math is duplicated web-side.
    `USER_TEAM_CLINCH` fires on transition into X or Y (proud / 5000 ms /
    celebrate); division and wildcard clinches get distinct event ids so
    both can land in the same season. Fixture tests build an 8-team
    conference and pin all four statuses against engine math.
71. **Elimination trigger (C6).** Transition into 'E' fires
    `USER_TEAM_ELIMINATED` (disappointed / 5000 ms / sad) — compassionate,
    not mocking; it deliberately does not fire when recovering from E to
    alive (edge case: other results reshuffle the picture).
72. **Rivalry-week trigger (C7).** New `upcomingRivalrySignature`: the
    user's next unplayed scheduled matchup (current week forward), matched
    against `game.leagueRivalries` by the sorted `teamA::teamB` id, gated
    at intensity > 20 with tier cutoffs 76/51 — all mirrored from engine
    `rivalries.ts` with comments. Deliberately a pure read: the engine's
    `getRivalryGameContext` mutates via `ensureLivingWorldState`, so it
    stays out of the render path. No rivalry-heat sidecar was needed — the
    plan's assumption was wrong; the engine already persists league
    rivalries. Fires `USER_TEAM_RIVALRY_WEEK` (rallying / 4000 ms /
    routine) once per matchup, tier included so escalating heat refires.
    Tests: fire, no-refire, tier mapping, intensity gate, played-matchup
    and past-week exclusion, null game.

### Batch 13 — the memory sidecar family: Chip remembers

73. **Session memory sidecar (B5).** New `chipMemory.ts` (`mfd.chip.memory.v1`)
    records what Chip actually said: recent weekly outcomes, the last flavor
    line served, and the last Must Do advice. Follows the readReceipts
    pattern — injectable Storage, try/catch on every touch, shape-validated
    reads that normalize or drop malformed entries. The live consumer:
    `eventBridge.emitDialogueEvent` reads memory before composing weekly
    guidance and passes `avoidFlavorLine`; `selectSidelineNote` rotates one
    pool slot when the deterministic pick would repeat the remembered line
    (matching both the raw line and the recorded `line + suffix` form,
    guarded by a no-prefix-pairs pool test). Deterministic given the input;
    the unseeded canonical path ignores it byte-for-byte.
74. **Pruning + quota guards (B12).** Outcomes cap at 12; the serialized
    payload must fit 2048 bytes (oldest outcomes trim first); a quota
    failure retries once with a 4-outcome minimal tail, then gives up
    quietly — Chip keeps working without memory. `writeChipMemory` returns
    the memory actually persisted; `withChipMemoryEntry` applies one moment
    immutably so the bridge does a single read -> compose -> write.
75. **Reset + quiet respect (B13).** `resetOnboarding` now clears the memory
    key alongside onboarding state and receipts (dockControls.test pins it).
    Recording happens only past the bridge's quiet-pref gate (`canEmit`), so
    quiet-for-week/season/session-muted weeks form no memories — pinned by
    a bridge test asserting zero writes under `quietForSeason`.
76. **AGM reference (G5).** Where Am I now remembers your setup hire:
    `resolveWhereAmIState` reads `frontOffice.agmProfileId`, resolves the
    engine-owned profile via `getSelectedAGM` (pure static lookup), and the
    enriched beat adds "AGM Marcus Webb (analytical) holds the cap desk."
    with humanized personality/expertise labels. Unknown or absent ids stay
    silent; the 240-char budget holds.

### Batch 14 — multi-beat conversations: Chip talks in paragraphs

77. **Sequential-bubble machinery + big-moment conversations (B7).** New
    `conversation.ts` (`buildWeeklyConversation`) turns big emotional
    moments — blowout loss, three-loss streak, dark moment, championship —
    into a two-beat conversation: the reaction beat (sideline flavor, led by
    the continuity line when present) and then the unchanged coaching beat
    (Must Do + why + full contextDetails). The chip store gains a real queue
    (`dialogueQueue`/`dialogueQueueTotal`/`lastConversation` +
    `queueDialogue`/`advanceDialogueQueue`); dismiss clears the queue but
    keeps the conversation so Ask Chip's whatNow replays it from the
    reaction beat. The dock renders a "Next (2/2)" control while beats
    remain. `lastWeeklyDialogue` tracks the details-carrying beat so the
    details panel works mid-conversation. Non-big outcomes return the merged
    entry untouched — the single-bubble path is byte-identical (pinned by
    the useChipEvents cleanWin test and the eventBridge determinism suite).
78. **Long-beat auto-chunking (H3).** `chunkDialogueText` splits overflow at
    sentence boundaries with greedy packing, hard-wrapping only oversized
    single sentences at word boundaries; `chunkDialogueEntry` turns the
    chunks into sequential parts (`.part-N` ids) with contextDetails riding
    the final part so the details panel appears when the thought completes.
    Applied to every beat a conversation serves — overflow becomes sequence
    instead of the old ellipsis truncation. Tests pin packing order, budget
    on every chunk, word-wrap cleanliness, and the details-on-final-part
    contract.

### Batch 15 — week-toned beats, setup beat nav, spotlight audit verified

79. **Week-conditioned route beats (G3).** New `EARLY_SEASON_ROUTE_BEAT_TEXT`
    (weeks 1–4) and `LATE_SEASON_ROUTE_BEAT_TEXT` (week 15+) maps in
    `routeBeatRegistry.ts` behind exported `EARLY_SEASON_MAX_WEEK = 4` /
    `LATE_SEASON_MIN_WEEK = 15`, covering the same ten core routes' tier-1
    beats as the G2 playoff map. `useActiveRouteBeats` resolves variants by
    precedence playoffs > late > early > canonical; week 0 (no context) and
    mid-season weeks serve the canonical text byte-for-byte. All 20 new lines
    pass the registry voice contract (decision cue + Where + Consequence,
    <= 140 chars, banned-word clean) — early September tone ("small misses in
    September grow into real problems later"), stretch-run tone ("December
    depth charts do not get second chances"). Tests: full id-set + voice
    guards per map, week-boundary probes through the hook, and the
    playoff-beats-late collision case.
80. **Setup beat navigation for returning players (G4).** `ChipHost` reads
    `readFirstTenMinutesCompleted(backingStorage)` (the
    `mfd:first-ten-completed` marker `finalizeSetupRun` writes after a full
    setup run) and, when present, renders Back/Forward PixelButtons in the
    setup controls row (`data-chip-beat-nav="back|forward"`, aria-labels
    "Previous/Next Chip briefing", disabled at the ends). `navigateBeat`
    clamps to the dialogue range and re-resolves the stage spotlight — it is
    view-only and never calls the store's `advance()`, so onboarding progress
    is untouched. Tests: hidden without the marker, present with it,
    Back disabled at beat 0 while Forward stays enabled.
81. **Spotlight anchor audit — verified existing (G6).** The plan's "some
    beats point at null" concern is stale: `spotlightAnchors.test.ts` already
    audits every non-null `spotlightTarget` in `ROUTE_BEAT_REGISTRY` against
    exactly one `data-spotlight-target` anchor in the correct screen file for
    all 53 routes (first-ten beats included). Re-ran it this batch — 56
    green — and a manual grep diff confirmed all 30 beat targets (15 routes x
    beat-1/2) resolve to unconditionally mounted anchors on their own
    screens. No code change needed; checkbox ticked on verified evidence.

### Batch 16 — stacked moments queue, ties made deliberate

82. **Trigger precedence + debounce (C13).** Stacked emotional moments now
    queue instead of overwrite, on top of the B7 machinery. Dialogue side:
    new exported `CHIP_EVENT_CATEGORY_PRECEDENCE` (seasonEnd 3 >
    gameComplete 2 > weekRollover 1); the events controller tracks the last
    dispatched category and, when a conversation is still active
    (not dismissed), a strictly higher-precedence event preempts while equal
    or lower precedence appends behind the unread beats via the new store
    action `appendDialogueQueue` (active beat keeps showing; queue total and
    `lastConversation` grow; falls back to `queueDialogue` semantics when
    nothing is active). `advanceDialogueQueue` now also moves
    `lastWeeklyDialogue` when the beat advanced into carries contextDetails,
    so the details panel follows appended conversations — behavior-identical
    for every existing B7 flow. Stores predating the C13 surface keep legacy
    replace behavior (pinned by test). Pose side: new exported
    `POSE_EVENT_PRECEDENCE` total order over all 20 triggers
    (season-defining > single-game emotional > transactional > ambient) and
    `sortPoseEventsByPrecedence`; `emitNewPoseEvents` emits same-transition
    stacks in ascending precedence so the highest-precedence trigger wins
    the store's equal-priority last-call-wins resolution — deliberate order
    instead of emitter push order. Tests: store append/advance/panel-follow
    (4), bridge stack ordering + table coverage (5), controller
    append/preempt/dismissed/legacy (4).
83. **Explicit tie handling (D8).** `deriveWeeklyOutcome`'s tie branch gains
    its design rationale in writing: ties deliberately serve the neutral
    'midseason' variant (no margin or streak language applies), and ties
    break loss streaks because `isLossStreak` requires every trailing result
    to be a loss. The locked outcome-variant list gains no tie entry —
    neutrality is the design. Tests pin: tie week serves 'midseason',
    L-L-T-L is a single 'loss' (not 'threeLossStreak'), L-L-L-T stays
    'midseason', and a fresh L-L-L after a tie counts again.

### Batch 17 — injuries join the taxonomy, the dock learns to breathe

84. **Injuries as the 6th pending-decision category (D4).**
    `PendingDecisionCounts` gains `injuries`, counted from the canonical
    `game.players` record (user team, truthy `injury`) — the same source F8's
    Where Am I injury count uses, so the dock badge and the summary never
    disagree. `PENDING_DECISION_CATEGORY_KEYS` and the dock's
    `PENDING_DECISION_COPY` gain the entry (screen Roster, consequence
    "uncovered injuries force unassigned backups"); the I3 sync guard now
    pins all six. Injury-only weeks therefore serve injury copy
    ("Where: Roster (2). Consequence: uncovered injuries force unassigned
    backups.") instead of the generic pending text — weekly guidance was
    already injury-aware via `injuryCount`, so the taxonomy was the gap.
    Tests: independent count + other-team exclusion, empty-state and
    total-sum pins updated, injury-only/mixed/badge-tooltip dock copy.
85. **Pose cross-fade in the dock (H5).** New `DockPoseCrossfade` wrapper in
    `ChipDock.tsx`: when the portrait pose changes, the previous pose renders
    once more as an outgoing layer that fades out over the arriving pose
    (`mfd-chip-dock-pose-depart`, 240ms, matching the design system's
    crossfade token). Reduced-motion renders skip the layer entirely (hard
    cut), and both reduced-motion CSS paths hard-hide it as a second line of
    defense. Implemented web-side — the design-system Chip's test harness
    calls the component as a plain function, so hooks inside Chip would
    break ~20 element-tree tests; the plan scoped this to the dock anyway.
    First render/SSR has no previous pose, keeping markup deterministic.
    Tests: SSR idle/absence pins, source + CSS pins including both guards.
86. **Dock idle micro-animations (H6).** Two long-cycle accents in
    `ChipDock.css`, gated behind `[data-chip-dock-motion='animated']` and
    killed in both reduced-motion paths: a clipboard-tap nudge on the
    portrait stage (two 1px taps per 9s cycle) and a soft blink on the
    stage's top light bar. The PNG art itself is a static image, so the
    blink/tap live on the stage furniture; the per-pose motion-rig idle
    animations already shipped continue underneath. Tests: CSS pins for
    gating, keyframes, and both reduced guards.

### Batch 18 — the quiet menu and the smoke harness

87. **Quiet-menu consolidation (E4).** The three top-level quiet buttons
    (screen/week/season) move behind one consolidated "Quiet" menu in the
    dock controls row: `DockControlEntry` gains `group: 'quietMenu'` in
    `dockControlConfig.ts`, and `ChipDock.tsx` partitions the controls row,
    rendering the grouped trio inside a toggleable menu (VolumeX trigger,
    Escape closes, active-pref state summarized on the trigger label).
    Existing quiet semantics, `aria-pressed` states, and "(quieted)"
    suffixes are unchanged — only the layout consolidates. Tests: default
    render shows the menu trigger instead of three loose buttons, menu-open
    render pins all three options, config partition pins.
88. **SMOKE_CHIP_* harness (E12 + I8).** New `dockSmoke.test.tsx`: a shared
    scenario runner with four exported suites — `SMOKE_CHIP_DOCK_CONTROLS`
    (every dock control renders; quiet menu opens), `SMOKE_CHIP_VOICE`
    (weekly bubble text always fits the 240-char budget), `SMOKE_CHIP_DETAILS`
    (the details panel appears exactly when a weekly conversation is active),
    and `SMOKE_CHIP_WHERE_AM_I` (Ask Chip beat routing). 15 scenarios green.
89. **Session close-out (this hand-off).** The original session hit its
    quota wall mid-verification; a follow-up session re-ran the full sweep
    below, ticked E4/E12/I8 on evidence, and wrote this log. No code changes
    were needed — the batch was complete, only unverified and unbooked.

### Verification (all real runs)

- Final close-out sweep (companion + route-coaching + monday-briefing +
  settings + franchise-setup + app shell + index document, one run):
  **67 files / 787 tests green** (Batch 18 +12: quiet-menu render/config
  pins + 15-scenario smoke harness, net of consolidated assertions)
- companion + route-coaching + monday-briefing + settings + franchise-setup
  through Batch 17:
  **64 files / 705 tests green** (Batch 15 +12, Batch 16 +16, Batch 17 +5:
  injury taxonomy count, injury-only/mixed/badge dock copy, cross-fade SSR +
  CSS pins, idle-animation CSS pins)
- design-system re-run after the H5 pivot (Chip.tsx/Chip.css reverted clean):
  **17 files / 106 green**
- spotlight anchor audit re-verified standalone: **56 green**
- RecapChipReaction + App shell after the Batch 15/16/17 edits:
  **2 files / 76 green**
- app shell + index document: **3 files / 70 green**
- `tsc --noEmit` in apps/web: clean (re-run after Batches 15, 16, and 17)
- Ripple shards run across the session: franchise-setup/game-day/
  dynasty-era/legacy 173, remaining src/features 812, src/lib 205,
  src/features/franchise 253, App 57, app guard/lifecycle/rollover 156,
  store shards 298 (128 earlier in the session + 85 in batch 14 + 85 in
  batch 15: game-store core 82, g5-governance-cba 3) — all green
- Engine suite run at close-out (guide file changed; save-version-drift
  hard-reads it): **236 files / 2,319 tests green**. SAVE_VERSION untouched.
- `tsc --noEmit` and `scripts/check-math-random.sh` re-run at close-out: clean.

### Deliberately deferred (with reasons) — the 4 open items

- **F5** ("what did I miss?" inbox answers): inbox messages are projected
  inside InboxTriage from ~25 selectors — there is no persistent mailbox to
  query; needs an inbox projection first.
- **H4** (new pose art for rallying/laughing/coffee-sip sm/md): art work —
  needs drawn assets, not overnight CSS.
- **H8** (TTS voice): the audio skill exists but voice wiring is a flag-gated
  feature of its own.
- **I7** (unify the 6 Chip storage keys behind one versioned sidecar): a
  broad storage refactor that should be designed deliberately now that the
  memory sidecar is the sixth key, not done piecemeal.
- **g4-multi-year-trust.test.ts** not run: it is a deliberate 60-minute
  10-season soak (`G4_SOAK_TIMEOUT_MS = 3_600_000`) for CI; it exceeds any
  local foreground budget and imports only `@mfd/engine` + the untouched
  seed — none of the changed paths.

### Rollback

All changes are confined to:

- `apps/web/src/features/companion/` (chipMemory.ts, conversation.ts,
  sidelineFlavor.ts, guidanceScreens.ts, and dockControlConfig.ts new or
  extended; weeklyGuidance, whereAmI, eventBridge, useChipEvents, store,
  decisionsPending, dockPersistence, onboardingMachine, PoseEventEmitter,
  ChipDock, ChipHost, dialogue/onboarding + tests + ChipDock.css)
- `apps/web/src/features/route-coaching/` (routeBeatRegistry.ts tier
  predicate + 15 third beats, useActiveRouteBeats.ts seed threading +
  graduation id list + tests)
- `apps/web/src/features/settings/Settings.tsx` (G8 Chip replay panel) +
  its test
- `apps/web/src/features/franchise-setup/FranchiseSetupWizard.tsx` (A12 warm
  AGM line on the cold open + choose_agm stage) + its cold-open test
- `apps/web/src/features/monday-briefing/MondayBriefing.tsx` (+ both tests)
- `apps/web/src/app/App.tsx` (one call-site argument) + its source-pin test
- `packages/design-system/components/Chip/ChipDialogueBubble.tsx` (typewriter
  default speed + `role="status"` / `aria-live="polite"` on the bubble)
- `CODEX_GAME_GUIDE.md`, this document

Revert per file; no save-schema, engine, or seed changes were made.
