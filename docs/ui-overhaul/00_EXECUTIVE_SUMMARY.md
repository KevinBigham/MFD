# Mr. Football Dynasty — Complete UI/UX Reinvention Audit

## 00 — Executive Summary

### Audit header

| Field | Verified value |
|---|---|
| Product | Mr. Football Dynasty (MFD) |
| Source | MFD-main(4).zip supplied by owner |
| Commit | 7577176aa4ae4cbcbbf092fde29347c8d4c610d6 |
| Branch | main |
| Working tree before audit | Clean |
| Audit date | 2026-08-05 |
| Node | v22.16.0 |
| Package manager | pnpm 9.15.9 project; Corepack could not download pnpm because registry access was unavailable in this container |
| Production source modified | No. All additions are under `docs/ui-overhaul/`. |

## Decision

**The underlying game should not be simplified. The interface should be replaced through a reversible, route-compatible shell migration.**

MFD already has the hard part: a deep deterministic football simulation, a real weekly cadence, multi-season consequences, extensive roster and league systems, local-first persistence, and a distinctive companion. The current experience fails because that depth is surfaced as a largely equal-weight route directory and a collection of stacked mega-pages. The player is asked to understand the product’s implementation map before the game tells them what matters now.

The central diagnosis is:

> **MFD has a strong simulation and a weak attention architecture.** The new UI must manage priority, context, and return paths before it manages decoration.

## Chosen UX north star

> **A phase-aware football front office that always puts the next meaningful decision first, lets experts drill into the full simulation without a second navigation system, and turns each week and season into a coherent story.**

This means the UI answers, on every meaningful surface:

1. Where am I in the season?
2. What needs attention now?
3. What happens if I act—or advance without acting?
4. Where can I go deeper?
5. How do I return to the decision I was making?

## The evidence that makes a shell replacement necessary

| Evidence | Measured result | Meaning |
|---|---|---|
| Canonical destinations | 79 routes | Feature completeness became a navigation burden. |
| Current navigation models | 5 rooms plus 8 alternate Nerd groups | The same product has two overlapping mental maps. |
| Monday Briefing at 390×844 | 11,788 px / 14.0 phone viewports | The home screen cannot perform its primary “what now?” job. |
| Monday Briefing at 667×375 | 8,059 px / 21.5 landscape viewports | Width responsiveness does not solve short-height use. |
| More drawer at 390×844 | 117 controls; 48 above fold; 3 scroll regions | Complexity is hidden, not organized. |
| Roster at 390×844 | 11,802 px; 526 small-text elements; 358 bordered elements | Generic table-to-card conversion destroys scan efficiency. |
| New Game at 390×844 | 5,055 px / 6.0 viewports; 56 controls | The first ten minutes begin with catalog management. |
| Shell concentration | App.tsx: 2,229 lines | Navigation, lifecycle, and overlays have excessive regression coupling. |
| Briefing concentration | MondayBriefing.tsx: 1,987 lines | The most important journey has no bounded screen contract. |
| Style-system debt | 4,110 direct inline-style blocks in 199 TSX files | Responsive hierarchy cannot be changed consistently or safely. |
| Typography signal | 80 pixel-font references | The identity face has expanded into readability-critical roles. |
| Bundle gate | Existing engine chunk: 313 KB gzip / 320 KB ceiling | The migration must avoid framework churn and eager UI weight. |

## Chosen information architecture

The new persistent mobile navigation contains five player jobs—not rooms, implementation groups, or a full sitemap:

| Destination | Question answered | Core contents | Mobile behavior |
|---|---|---|---|
| Today | What matters now? | Week/phase context, canonical task ledger, opponent, inbox summary, readiness and Advance | Persistent bottom item; default landing and return-to-task destination |
| Team | Who do I have and how are we prepared? | Roster, depth, development, staff, culture, commitments, practice squad | Persistent bottom item; local tabs and entity drill-down |
| Game | How do we prepare, play, and understand the result? | Game Plan, schedule, live/sim state, Game Center | Persistent bottom item; phase-aware badge/action |
| Office | How do I build and sustain the franchise? | Contracts/cap, ownership, trades, scouting, draft, free agency, waivers | Persistent bottom item; phase-aware Personnel and Finance sections |
| League | What is happening around us? | Standings, rankings, news, stats, analytics, records, rules | Persistent bottom item; summary-first |
| Dynasty | What have we built? | Story, people, honors, seasons, records, scenarios | Contextual entry, franchise header, search; expanded desktop rail item |
| System | Can I trust, configure, move, or recover this save? | Save/recovery, settings, accessibility, help, about | Profile/team system sheet and search; not routine bottom navigation |

**GM Mode versus Nerd Mode is retired as a navigation distinction.** Expert depth remains through Compact density, advanced sections, saved views, filters, comparison, and command search. The location of a feature never changes based on expertise.

All 79 current routes are accounted for in `ROUTE_SURFACE_MATRIX.csv`. Existing hash paths remain as aliases, redirects, or compatibility wrappers for at least one full release. No route is physically retired without H2 approval and a 79/79 route contract proof.

## Chosen weekly gameplay loop

```text
TODAY
  Understand week, phase, opponent, and stakes
      ↓
TASK LEDGER
  Must Do → Recommended → Optional
      ↓
CONTEXTUAL WORKFLOW
  Complete depth / game plan / roster / transaction decision
      ↓
RETURN TO TODAY
  Task resolves from the same canonical selector
      ↓
READINESS
  Clear blockers, warnings, consequences, and saved inputs
      ↓
PLAY / SIMULATE / ADVANCE
      ↓
GAME CENTER / CONSEQUENCES
      ↓
NEW TODAY
```

The Advance control remains visible in a sticky action dock, but its label and state change with readiness:

- **Resolve 2 blockers** — blocked; opens the exact task list.
- **Review 1 warning** — allowed only after explicit acknowledgement.
- **Ready to play** — launches game flow.
- **Advance to Week 15** — states irreversible consequences and save behavior.

## Chosen visual direction: Broadcast War Room

**Broadcast War Room** modernizes MFD’s football-broadcast personality without preserving the current pixel-heavy dashboard shell.

- Dark ink/navy neutral surfaces create calm depth.
- Warm gold is reserved for brand and the single primary action.
- Cyan is interactive/informational, not another decorative border color.
- Success, warning, and danger use color plus icon, label, and shape.
- Readable sans handles body and controls; condensed display handles section/event headlines; tabular numeric type handles stats; pixel type appears only in the logo, compact kickers, and rare cinematic moments.
- Plain sections and spacing replace default “box everything” composition.
- Routine management is restrained; game results, draft picks, championships, milestones, and breaking news earn cinematic treatment.

This direction scored highest because it preserves MFD’s identity, improves scan hierarchy, carries low framework risk, and supports dense football data better than either the more textured **Sideline Playbook** or heritage-heavy **Franchise Archive** alternatives.

## Chosen Chip strategy

Chip stays. The permanent space reservation does not.

- **Collapsed:** 44–48 px labeled trigger with pending count.
- **Mobile expanded:** bottom sheet with drag handle, close, focus trap, and safe-area padding.
- **Desktop expanded:** on-demand side panel that overlays or uses an optional split view only when the user opens it.
- **Speech policy:** onboarding, blockers, important consequences, “Where am I?”, and emotionally significant events. Not every route change.
- **Source of truth:** the same Task Ledger, route context, and availability metadata used by Today and readiness.
- **Control:** minimize, mute, reopen, and “do not show this kind again.”
- **Preservation:** existing route beats, event wiring, art, and personality remain behind a `ChipPresentationAdapter`.

## Chosen technical path

Keep React 19, Vite, TanStack Router, Zustand, Dexie, the shared design-system package, hash-routing/GitHub Pages behavior, and local-first persistence. A framework rewrite would add risk without solving the attention problem.

Use a reversible strangler migration:

1. Record baselines and add a UI-only migration boundary.
2. Add semantic tokens, typography, adaptive viewport primitives, and interaction states.
3. Split `App.tsx` into shell, navigation, phase context, overlays, and companion presentation.
4. Add route-surface metadata and compatibility wrappers around existing paths.
5. Prove a complete weekly vertical slice behind the boundary.
6. Migrate route clusters by screen archetype.
7. Remove old UI only after feature coverage, deep-link, save, determinism, viewport, and accessibility gates pass.

Protected by default:

- `packages/engine/src/systems/**`
- RNG and deterministic ordering
- save schemas, migrations, slots, autosaves, exports, and sidecars
- game outcome logic and league content generation
- domain types
- store actions that mutate simulation state
- persistence and backup contracts

Presentation needs are solved through selectors, presenters/view models, route metadata, adapters, UI-only state, and new design-system components.

## First implementation vertical slice

```text
Continue / New Dynasty
    → Setup completion
    → Today / Monday Briefing
    → Open required depth or Game Plan task
    → Make and save the decision
    → Return to Today with the task resolved
    → Review readiness and consequences
    → Advance / play
```

This slice is intentionally not a title-screen makeover. It proves the new shell through the most repeated and highest-risk gameplay loop.

## Critical path

```text
WP-00 Baseline & migration boundary
  → WP-01 Tokens & typography
  → WP-02 Adaptive viewport primitives
  → WP-03 Interaction/accessibility foundation
  → WP-04 Route surface metadata & compatibility
  → WP-05 App shell decomposition
  → WP-06 Adaptive navigation
  → WP-07 Overlay manager
  → WP-08 Chip adapter
  → WP-09 Today + canonical Task Ledger
  → WP-10 Readiness/Advance integration
  → H1 owner review of the implemented vertical slice
```

After H1, Team, Game, Office, League, Dynasty, and System clusters can migrate in controlled parallel streams using the same archetypes.

## Audit totals

| Measure | Result |
|---|---|
| Findings | 34 total: 6 Critical, 15 Major, 9 Moderate, 4 Minor |
| Routes accounted for | 79 / 79 |
| Required viewport sizes captured | 12 Briefing sizes plus representative route/state captures |
| Visual evidence | 40 current-runtime screenshots + 14 prototype-state screenshots + 4 annotated comparison images |
| Implementation work packets | 24 |
| Human gates | 3: vertical-slice proof, optional route retirement, final owner playtest |

## Measurable finish line

The overhaul is not complete until:

- Today’s first viewport shows team, season, week/phase, opponent/stakes, required-task count, and the best next action.
- The default 390×844 Today experience is at most 2.5 viewports before optional expansion, down from 14.0.
- A required weekly task is one interaction from Today.
- Any current capability is reachable within three intentional interactions and has a documented canonical surface.
- No all-destinations drawer is needed for normal play.
- No unintended horizontal overflow appears at 320 px.
- Every archetype has one primary scroll region and deliberate local scrollers only.
- Routine phone targets are at least 44×44 px, with 48 px as the design target.
- Body text is at least 16 px on phones; essential labels are at least 12 px.
- The game reflows at 320 CSS px and remains usable at 200% zoom.
- Chip does not permanently consume the viewport.
- Existing engine, save, build, bundle, smoke, and release contracts pass on a correctly provisioned environment.
- 79/79 capabilities pass route compatibility tests.

## Risks that deserve discipline

1. **Feature loss through consolidation.** Mitigated by `ROUTE_SURFACE_MATRIX.csv`, per-route contract tests, and H2.
2. **UI work changing simulation behavior.** Mitigated by protected layers, presenter-only derivation, deterministic fixtures, and no save-schema requirement.
3. **A giant rewrite.** Mitigated by the migration flag, route compatibility, archetype packets, and atomic commits.
4. **Design inconsistency during coexistence.** Mitigated by a new-shell boundary and clear rules against partially restyling old screens.
5. **Bundle pressure.** Existing engine chunk is already 313 KB gzip against a 320 KB gate; avoid framework, icon-pack, font, and animation bloat.
6. **Mistaking visual approval for flow proof.** H1 is judged by a completed weekly task loop across phone and desktop—not a static screenshot.

## Human gates

- **H1 — Shell and weekly-loop proof:** owner plays the vertical slice on phone and desktop before mass migration.
- **H2 — Route-retirement approval:** required only for permanent removal of an old URL or duplicate surface; aliases do not require a stall.
- **H3 — Release candidate:** owner runs the supplied first-ten-minutes, regular-week, offseason, save/recovery, and returning-user scripts.

## Exact next step

Give Claude Opus 5 this repository and instruct it to read `docs/ui-overhaul/10_CLAUDE_OPUS_5_MASTER_PROMPT.md`, then execute **WP-00 only through its gate before writing production UI code**.
