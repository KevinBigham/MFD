# WP-23 — QA, Route Coverage, Performance, and Release Hardening

## Packet control

| Field | Value |
|---|---|
| Phase | 9 |
| Relative effort | XL |
| Critical-path status | Critical path |
| Dependencies | All packets; infrastructure starts WP-00 |
| Owner gate | H1/H2/H3 only where listed in dependencies or implementation plan |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

The overhaul cannot be trusted without deterministic route, viewport, journey, accessibility, visual, save, and performance gates.

## Objective

Complete automated/manual matrices, final 79/79 proof, visual baselines, performance/bundle checks, device verification, owner playtest script, and release documentation.

## Scope

- Automate route, viewport, journey, keyboard, accessibility, visual geometry, performance, bundle, save, offline, and GitHub Pages checks.
- Prove all 79 route capabilities and all Critical/Major finding traceability.
- Run long-running dynasty fixtures and migration rollback.
- Produce the owner playtest and final release decision evidence.

## Explicit non-scope

- Do not waive failures with screenshots alone.
- Do not certify release while environment-blocked checks remain unresolved.
- Do not remove legacy rollback until final criteria pass.

## Exact files to add

- `apps/web/e2e/ui-overhaul-journeys.spec.ts`
- `apps/web/e2e/ui-overhaul-viewports.spec.ts`
- `apps/web/e2e/ui-overhaul-a11y.spec.ts`
- `scripts/check-ui-acceptance.mjs`
- `docs/release/MFD_UI_OVERHAUL_PLAYTEST.md`

## Exact files to modify

- `scripts/release-gate.mjs`
- `.github/workflows/*`
- `docs/release/MFD_FINAL_SHIP_DECISION.md`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `UI acceptance gate`
- `route coverage gate`
- `visual geometry gate`

## Proposed component / module structure

- E2E specs use deterministic fixtures and semantic locators.
- `check-ui-acceptance` reads route matrix/thresholds and produces machine-readable results.
- Visual checks combine screenshot review with geometry assertions to reduce brittle pixel-only failures.
- Release gate includes route coverage, UI acceptance, a11y, build/bundle, save fixtures, and rollback proof.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Run every required phone, landscape, tablet, and desktop viewport plus 200% zoom/reduced motion/coarse pointer.
- Use physical-device checks for at least representative iOS Safari and Android Chrome when available.

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

- Everything in 09 QA document, full project checks, long-running save fixtures, GitHub Pages, offline, device matrix.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Execute every matrix in `09_QA_ACCEPTANCE_AND_TRACEABILITY.md`.
- Run owner first-ten-minutes, weekly loop, trade/deadline, game, offseason, dynasty, and save/recovery scripts.
- Switch back to legacy mode and verify rollback.
- Run production build under GitHub Pages base path and offline.
- Record H3 decision with evidence.

## Required before / after screenshots

- Final before/after set for all archetypes.
- Acceptance dashboard/results.
- Physical-device captures.
- Rollback proof.
- Final route coverage.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- Overly brittle visual tests create ignored noise.
- Fixture drift can hide real phase/state bugs.
- Bundle/performance regressions may emerge late if checks are deferred.

## Rollback path

Testing additions do not alter product behavior; release can remain on legacy mode until gates pass.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- test(e2e): add overhaul journey and viewport suites
- test(a11y): add automated UI acceptance matrix
- chore(release): integrate route visual save and performance gates
- docs(release): add owner playtest and ship decision

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

All acceptance thresholds pass; H3 owner script signed; no unaccounted route/feature; rollback mode proven.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
