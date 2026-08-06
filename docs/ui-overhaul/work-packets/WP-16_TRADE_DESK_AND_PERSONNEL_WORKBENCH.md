# WP-16 — Trade Desk and Personnel Workbench

## Packet control

| Field | Value |
|---|---|
| Phase | 6 |
| Relative effort | XL |
| Critical-path status | Non-critical-path after prerequisites |
| Dependencies | WP-12, WP-13, WP-15 |
| Owner gate | None beyond packet dependencies |
| Migration rule | Reversible, compatibility-first, no production route removal |

## User problem solved

Trades, block, deadline, and needs are fragmented and difficult to operate on phone.

## Objective

Build phase-aware Trade Desk with needs context, asset selection, cap/value consequence, preserved draft offer, and accessible staged phone workflow.

## Scope

- Unify Trade Center, Trade Block, Trade Deadline, Team Needs, and trade-related player actions in a Trade Desk.
- Provide staged asset selection, value/cap/roster consequences, validation, offers/counters, and preserved draft.
- Support touch and keyboard without drag dependence.
- Keep Today deadline tasks and return path synchronized.

## Explicit non-scope

- No trade AI, valuation, acceptance, cap, or roster rule change.
- No silent auto-correction of invalid offers.
- No single giant phone workbench.

## Exact files to add

- `apps/web/src/ui/screens/office/personnel/TradeDesk.tsx`
- `apps/web/src/ui/screens/office/personnel/TradeWorkbench.tsx`
- `apps/web/src/ui/screens/office/personnel/TradeMobileFlow.tsx`
- `apps/web/src/ui/screens/office/personnel/trade-presenter.ts`

## Exact files to modify

- `apps/web/src/features/trades/**`
- `apps/web/src/features/team-needs/**`

## Exact files to delete — only after migration proof

- None in this packet.

A glob in this packet identifies a route cluster, not permission for blind bulk editing. Claude must enumerate the concrete touched files in the progress ledger before committing.

## Relevant symbols and contracts

- `TradeDesk`
- `TradeWorkbench`
- `TradeDraft`
- `TradeViewModel`

## Proposed component / module structure

- `TradeDraft` is UI-only and references stable asset IDs.
- `TradeWorkbench` delegates validation/commit to existing actions.
- Phone flow stages partner → needs/context → outgoing → incoming → consequences → review.
- Desktop can use two-sided workbench plus consequence rail.
- All legacy trade paths map to sections/state of the same desk.

## Data and state contracts

- Presentation data is derived through pure selectors/presenters or UI-only adapters.
- Existing authoritative mutation functions remain the only commit boundary.
- No new field enters the save schema unless a separately documented protected-contract exception is approved.
- No UI read, sort, animation, or preview may consume simulation RNG.
- Route/UI preference state must be isolated from deterministic engine state.

## CSS and responsive behavior

- Phone uses stepper/bottom-sheet selectors and sticky review action.
- Tablet uses split selector/detail.
- Desktop uses two-team workbench; keyboard ordering controls remain available.
- Selected assets remain visible in a compact tray.

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

- Empty/invalid/counter/accepted/deadline
- no drag-only
- cap/roster parity
- preserve draft
- old routes
- deterministic outcome/action parity.

Also required:

- Unit tests for pure presenter/adapter logic and each error/state branch introduced.
- Component tests for semantics, keyboard, focus, disabled/loading behavior, and state transitions.
- Route compatibility/coverage tests for every route touched.
- Viewport geometry assertions at the smallest relevant phone, compact-height landscape, tablet, and desktop.
- Existing engine/web/design-system tests plus build, bundle, smoke, and release gates according to the packet’s blast radius.

## Manual test script

- Test empty, invalid, cap-invalid, roster-invalid, AI counter, rejection, acceptance, user cancellation, and deadline closure.
- Preserve draft across player detail and route return.
- Compare exact final mutation and AI outcome with legacy flow.
- Test touch/keyboard only.

## Required before / after screenshots

- Trade Desk overview.
- Phone staged offer.
- Desktop workbench.
- Invalid/counter/accepted states.
- Deadline task entry.

Each screenshot entry must include viewport, state/fixture, route, mode, commit, and the matching geometry measurement. Capture focus, open-sheet/dialog, error, and 200%-zoom states where this packet changes them.

## Performance and bundle checks

- Measure route bundle change and compare against the existing release/bundle gate.
- Avoid mounting hidden heavy legacy and new implementations simultaneously outside controlled migration tests.
- Use memoized selectors/view models only where profiling shows value; do not cache mutable domain objects.
- Large lists must have an explicit DOM/render strategy and a keyboard/focus-safe fallback.

## Risks

- Draft references can stale after roster/phase change.
- Reordered calls can alter AI/RNG consumption.
- Value visualization can imply precision not present in the engine.

## Rollback path

Existing trade actions remain source; new workbench delegates and can be disabled.

Additionally:

- Keep the legacy route/shell/component available until replacement coverage and acceptance gates are green.
- Separate extraction, new implementation, route adoption, and deletion commits so any layer can be reverted independently.
- Never roll back by altering or discarding user saves.

## Suggested atomic commits

- feat(trades): add trade draft presenter and desk
- feat(trades): add accessible responsive workbench
- feat(trades): integrate needs deadline and return flow
- test(trades): prove validation mutation and RNG parity

Each commit must update the progress ledger with checks, screenshots, remaining compatibility behavior, and rollback command/commit.

## Definition of done

Deadline journey completes within Office; all trade/block/needs capabilities accounted for.

The packet is not done when the new UI merely renders. It is done only when feature parity, route compatibility, interaction/accessibility behavior, viewport acceptance, deterministic/save safety, evidence capture, and rollback proof all pass.
