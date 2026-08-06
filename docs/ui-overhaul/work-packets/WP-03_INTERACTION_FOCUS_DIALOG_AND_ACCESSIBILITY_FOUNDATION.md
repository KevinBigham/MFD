# WP-03 — Interaction, Focus, Dialog, and Accessibility Foundation

## Packet control

| Field | Value |
|---|---|
| Phase | 1 |
| Relative effort | L |
| Critical-path status | Critical path |
| Dependencies | WP-01, WP-02 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

New components would reproduce inconsistent control states, undersized targets, and overlay focus behavior without a shared interaction layer.

## Objective

Implement/upgrade v2 Button, tabs/links, state frame, sheet/dialog, focus ring, reduced motion, live status, and form conventions.

## Scope

- Implement the full interactive state matrix from the visual specification.
- Standardize buttons, links, tabs, segmented controls, state frames, forms, sheets, dialogs, and sticky actions.
- Provide focus trap/restore, escape behavior, background inertness, live status, and reduced-motion behavior.
- Enforce accessible names, descriptions, target geometry, and non-color cues.

## Explicit non-scope

- Do not migrate all legacy components in one sweep.
- Do not alter feature mutations.
- Do not make hover essential.

## Exact files to add

- `packages/design-system/components/MfdButtonV2/MfdButtonV2.tsx`
- `packages/design-system/components/MfdButtonV2/MfdButtonV2.module.css`
- `packages/design-system/components/MfdStateFrame/MfdStateFrame.tsx`
- `packages/design-system/components/MfdBottomSheet/MfdBottomSheet.tsx`
- `packages/design-system/components/MfdLocalNav/MfdLocalNav.tsx`
- `packages/design-system/components/MfdStickyAction/MfdStickyAction.tsx`

## Exact files to modify

- `packages/design-system/components/MfdDialog/MfdDialog.tsx`
- `packages/design-system/components/MfdTooltip/MfdTooltip.tsx`
- `packages/design-system/components/index.ts`
- `apps/web/src/app/a11y.css`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `MfdButtonV2`
- `MfdStateFrame`
- `MfdBottomSheet`
- `MfdLocalNav`
- `MfdStickyAction`

## Proposed component / module structure

- Each v2 component has an accessible primitive, CSS module, tests, and documented variants.
- `MfdStateFrame` owns loading, empty, error, locked, unavailable, and recovery composition.
- `MfdBottomSheet` adapts to a centered/side dialog only when content and viewport justify it.
- Sticky actions expose semantic primary/secondary grouping and measured content clearance.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Core targets are at least 44×44 CSS pixels; primary mobile actions generally target 48px height.
- Sheets use available `dvh`, safe-area padding, and internal scroll only when content exceeds the viewport.
- Tabs switch to scrollable local navigation or a labeled selector without hiding meaning.

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

- Keyboard-only stories
- focus trap/restore
- Escape
- target geometry
- axe
- reduced motion
- 200% zoom
- screen-reader names/states.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Complete component stories with mouse, touch emulation, and keyboard only.
- Open/close every overlay using trigger, Escape, cancel, and confirm.
- Verify focus returns to the invoking element.
- Run 200% zoom and reduced-motion checks.
- Inspect screen-reader names/states with browser accessibility tree.

## Required before / after screenshots

- Interactive-state contact sheet.
- Bottom sheet on 320×568 and 390×844.
- Dialog and focus ring on desktop.
- Loading/empty/error/recovery states.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.
- Foundation code is shared widely; treat every dependency and CSS import as a startup/bundle decision.

## Risks

- A custom dialog can break focus or mobile browser behavior.
- Target padding can inflate dense tables unless row actions are designed intentionally.
- Live regions can become noisy if every autosave/state change announces.

## Rollback path

V2 exports coexist with legacy components; remove imports to roll back.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(design-system): add v2 interaction primitives
- feat(a11y): standardize focus and overlay behavior
- test(a11y): cover keyboard, zoom, motion, and semantics

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

Every interactive state in 06 spec has tests; no core target under 44 px; focus is visible/unobscured.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
