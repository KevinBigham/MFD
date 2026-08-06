# WP-17 — Scouting, Draft, Free Agency, Waivers, and Camp

## Packet control

| Field | Value |
|---|---|
| Phase | 6 |
| Relative effort | XL |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | WP-15, WP-16 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

The offseason is a sequence of independent global destinations rather than one lifecycle.

## Objective

Create phase-aware Personnel lifecycle with scouting/draft/FA/waiver/camp workbenches and event transitions while preserving every existing rule/action.

## Scope

- Create one phase-aware Personnel lifecycle spanning needs/scouting, draft setup/live draft/recap, free agency/targets, waivers, practice squad, and training camp.
- Reuse market/player row and comparison patterns.
- Make phase transitions and required decisions explicit.
- Preserve every existing rule, action, and historical recap.

## Explicit non-scope

- No draft/FA/waiver AI or RNG changes.
- No merged mutation that alters event order.
- No permanent display of inactive phase tools in primary navigation.

## Exact files to add

- `apps/web/src/ui/screens/office/personnel/PersonnelLifecycle.tsx`
- `apps/web/src/ui/screens/office/personnel/DraftWorkbench.tsx`
- `apps/web/src/ui/screens/office/personnel/FreeAgencyWorkbench.tsx`
- `apps/web/src/ui/screens/office/personnel/MarketRow.tsx`

## Exact files to modify

- `apps/web/src/features/scouting/**`
- `apps/web/src/features/draft/**`
- `apps/web/src/features/free-agency/**`
- `apps/web/src/features/waiver-wire/**`
- `apps/web/src/features/training-camp/**`
- `apps/web/src/features/practice-squad/**`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `PersonnelLifecycle`
- `DraftWorkbench`
- `FreeAgencyWorkbench`
- `PersonnelPhaseViewModel`

## Proposed component / module structure

- `PersonnelLifecycle` selects phase section from authoritative lifecycle state.
- Workbenches use pure presenters and existing mutations at commit boundaries.
- Draft uses stable on-clock context, board, offers, selection, and recap tabs/states.
- FA/waiver/camp use common market row/entity/action contracts.
- Historical recap remains durable and deep-linkable.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone shows phase context and one bounded decision at a time.
- Draft board/market lists use priority rows, filters, compare tray, and detail sheet/page.
- Tablet/desktop support multi-pane board/workbench.
- Live/on-clock action remains visible without covering content.

The shared rules in `05_SCREEN_BLUEPRINTS.md` and `06_DESIGN_SYSTEM_AND_VISUAL_SPEC.md` remain authoritative. Screen-specific CSS must use semantic tokens, one primary scroll owner, safe-area-aware sticky actions, and explicit compact-height behavior.

## Touch behavior

- Essential actions must be completable with touch only and must not depend on hover, right-click, or drag.
- Core interactive targets must meet the selected 44 CSS-pixel minimum; primary phone actions should normally be 48 pixels high.
- Bottom navigation, sheets, and sticky actions must avoid system-gesture and safe-area conflicts.
- Taps that commit a destructive, irreversible, or phase-changing action require clear scope and confirmation appropriate to the risk.
- Pressed/loading/disabled feedback must prevent accidental double activation.

## Keyboard behavior

- Use semantic DOM and natural tab order before adding custom key handling.
- Focus-visible must remain obvious against every surface and team-color state.
- Dialogs/sheets trap focus only while modal and restore it to the invoking control.
- Escape cancels/dismisses when safe; Enter/Space activate according to native semantics.
- Route changes place focus at the screen heading, requested entity, or restored origin target intentionally.
- Existing global shortcuts must be audited for conflicts and documented rather than silently changed.

## Accessibility requirements

- Meet the contrast, target-size, zoom, reduced-motion, focus, heading, landmark, error, and non-color requirements in the QA matrix.
- Every icon action has a visible label or accessible name; primary navigation retains visible text labels.
- Dynamic task/save/overlay status uses restrained live-region behavior.
- Tables, charts, comparison grids, and visual state indicators have semantic or textual equivalents.
- At 200% zoom, the complete packet journey remains operable without two-dimensional page scrolling.

## Loading, empty, locked, and error behavior

- Loading preserves the screen frame and current context; it does not replace the whole app shell.
- Empty states explain why the surface is empty and offer the most relevant safe next action.
- Errors identify what failed, what was not changed, and a retry/recovery path.
- Locked/unavailable states explain lifecycle timing and preserve a path back to the originating task.

## Route and deep-link implications

- Use the route-surface map and compatibility resolver from WP-04.
- Preserve existing deep links until the route matrix and owner gate permit retirement.
- Preserve entity IDs, query/filter state, navigation origin, scroll anchor, and focus target when valid.
- Browser back/forward must behave predictably and must not repeat mutations.

## Save, determinism, and protected-layer implications

- No save-schema version change is expected.
- UI-only preferences use the existing UI preference boundary and must fail safely.
- Before/after deterministic fixture state must match legacy behavior for every committed game action.
- Import/export/autosave behavior is out of scope unless explicitly named in this packet.

Protected by default: `packages/engine/src/systems/`, RNG/determinism, save schemas/migrations, core domain types, game outcome logic, state-mutation actions, persistence serialization, and backup formats. If a protected change appears necessary, stop this packet and document the exact requirement, why an adapter is insufficient, determinism/save impact, tests, and rollback before proceeding.

## Automated tests

- All lifecycle phases
- on-clock/trade offer/pick/recap
- FA offer outcomes
- waiver/camp
- route aliases
- save/determinism parity.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Run every offseason phase and transition.
- Test draft board, on-clock, trade offer, pick, AI picks, recap, FA offers/outcomes, waivers, practice squad, camp cuts/decisions.
- Compare seeds/state with legacy.
- Reload/deep-link during each phase.

## Required before / after screenshots

- Personnel lifecycle overview.
- Draft phone/desktop.
- FA market.
- Waiver/camp decision.
- Phase transition/event.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- Live draft timing/order is highly sensitive to UI call order.
- Phase-aware hiding can make historical/current tools hard to find.
- Large prospect markets can create DOM/performance issues.

## Rollback path

Phase sections can fall back route-by-route to legacy components.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(personnel): add lifecycle shell and phase presenter
- feat(draft): add draft workbench and recap
- feat(free-agency): add responsive market workflow
- feat(personnel): migrate waivers practice squad and camp
- test(personnel): verify lifecycle RNG and action parity

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

Offseason can be completed as one coherent workflow; every matrix row green.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
