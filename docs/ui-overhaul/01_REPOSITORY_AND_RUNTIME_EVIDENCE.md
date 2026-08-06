# 01 — Repository and Runtime Evidence

## Scope and evidence rules

This audit distinguishes:

- **Observed source fact:** directly counted or located in the supplied working tree.
- **Observed runtime fact:** measured from the supplied repository’s existing built output.
- **Expert interpretation:** a diagnosis based on those observations.
- **Recommendation:** the selected future-state decision.

No production source file was edited. Audit files are confined to `docs/ui-overhaul/`.

## Repository identity

| Field | Value |
|---|---|
| Product | Mr. Football Dynasty |
| Commit | 7577176aa4ae4cbcbbf092fde29347c8d4c610d6 |
| Branch | main |
| Dirty before audit | False |
| Archive | MFD-main(4).zip |
| Audit date | 2026-08-05 |
| Node | v22.16.0 |
| pnpm available | False |

The commit matches the expected audit target. The current tree is therefore the source of truth for architecture and route coverage.

## Architecture map


```text
MFD repository
├── apps/web
│   ├── src/app
│   │   ├── App.tsx ................ root composition, shell, route mounting, global effects/overlays
│   │   ├── app-shell.css .......... global chrome, viewport clearance, phone overrides
│   │   ├── MobileBottomTabBar.tsx . 4 primary actions + More drawer
│   │   ├── currentAppRoute.ts ..... current route interpretation
│   │   ├── navBadges.ts ........... navigation status badges
│   │   └── store/
│   │       ├── game-store.ts ...... simulation-mutating actions (protected)
│   │       ├── selectors.ts ....... preferred derivation boundary
│   │       ├── persistence.ts ..... save/persistence contract (protected)
│   │       └── ui-store.ts ........ UI-only preferences/migration flag candidate
│   ├── src/features ............... route/screen implementations
│   └── public/screenshots/v1 ...... historical screenshots
├── packages/engine
│   ├── src/config/route-registry.ts canonical 79-route registry
│   ├── src/config/navigation.ts ... room / Nerd grouping
│   ├── src/systems ................ deterministic simulation (protected)
│   ├── src/rng .................... seeded RNG (protected)
│   └── src/save ................... schema/migrations/export (protected)
├── packages/design-system
│   ├── components ................. shared primitives
│   └── tokens/index.css ........... current tokens and global responsive overrides
└── scripts
    ├── release-gate.mjs
    ├── check-bundle-size.sh
    └── smoke-test-built-page.sh
```


## Source inventory

| Measure | Count / value |
|---|---|
| Canonical routes | 79 |
| Current room distribution | briefing: 4, football_ops: 30, game_week: 9, league: 13, legacy: 23 |
| Alternate Nerd groups | core: 4, team: 12, money: 4, acquire: 12, dynasty: 20, gameday: 9, league: 13, meta: 5 |
| `App.tsx` lines | 2,229 |
| `MondayBriefing.tsx` lines | 1,987 |
| Web TS/TSX files | 525 |
| Total TSX files scanned | 402 |
| Direct `style={{...}}` blocks | 4,110 |
| Broad style-prop occurrences | 4,519 |
| TSX files containing inline styles | 199 |
| Pixel typography references | 80 |
| Uppercase-transform references | 52 |

### Largest UI files

| Path | Lines |
|---|---|
| apps/web/src/app/App.tsx | 2,229 |
| apps/web/src/features/monday-briefing/MondayBriefing.tsx | 1,987 |
| apps/web/src/features/companion/ChipDock.test.tsx | 1,589 |
| apps/web/src/features/franchise-setup/FranchiseSetupWizard.tsx | 1,402 |
| apps/web/src/features/game-day/GameDayRecap.tsx | 1,384 |
| apps/web/src/features/trades/TradeCenter.tsx | 1,210 |
| apps/web/src/features/companion/ChipDock.tsx | 1,177 |
| apps/web/src/features/legacy/LegacyTimeline.tsx | 1,038 |
| apps/web/src/features/free-agency/FreeAgencyHub.tsx | 1,028 |
| apps/web/src/features/coaching/CoachingStaff.tsx | 1,011 |
| apps/web/src/features/roster/RosterManagement.tsx | 946 |
| apps/web/src/app/App.test.tsx | 942 |
| apps/web/src/features/draft/DraftBoard.tsx | 918 |
| apps/web/src/features/companion/PoseEventEmitter.test.tsx | 917 |
| apps/web/src/features/week-advance/WeekAdvance.tsx | 870 |
| apps/web/src/features/player/PlayerProfile.tsx | 866 |
| apps/web/src/features/game-day/GameDayRecap.test.tsx | 847 |
| apps/web/src/features/settings/Settings.tsx | 842 |
| apps/web/src/features/game-plan/GamePlanSetup.tsx | 812 |
| apps/web/src/features/companion/ChipHost.tsx | 797 |

## Source evidence trail

| Evidence ID | File / line | Observed fact | Audit implication |
|---|---|---|---|
| SRC-01 | `packages/engine/src/config/route-registry.ts:31–114` | Canonical route registry contains 79 destinations. | All 79 need future-surface and compatibility decisions. |
| SRC-02 | `route-registry.ts:117–134` | Five rooms and eight Nerd groups coexist. | Expertise is represented as a second IA. |
| SRC-03 | `MobileBottomTabBar.tsx:22–27` | Four primary phone destinations: Briefing, Roster, Plan, Advance. | The navigation models tasks/features inconsistently and requires More for the rest. |
| SRC-04 | `MobileBottomTabBar.tsx:118,167` | Phone navigation labels use 7 px styling. | Primary navigation is below the recommended product readability floor. |
| SRC-05 | `MobileBottomTabBar.tsx:215` | More drawer can occupy 82vh. | An almost-full-screen sitemap is used as navigation. |
| SRC-06 | `App.tsx:318; 600–759` | RootLayout composes shell, global navigation, main content, command UI, tutorial, notifications, ceremonies, news, lore, recap, and save prompts. | Split shell and overlay orchestration before mass visual migration. |
| SRC-07 | `app-shell.css:214–241` | Main content receives 132 px base bottom padding, 320 px with Chip, and 310–370 px desktop right clearance. | Companion visibility permanently reduces the content viewport. |
| SRC-08 | `tokens/index.css:129–131` | 44 px touch minimum exists, but a 198 px mobile Chip-clearance token is also encoded. | Good touch intent is undermined by layout reservation. |
| SRC-09 | `tokens/index.css:165–170` | Comments explicitly require data attributes and `!important` to override inline styles responsively. | Inline styles are an architectural blocker, not merely cleanup debt. |
| SRC-10 | `tokens/index.css:249–324` | Phone tables become vertically stacked cards with 8 px pixel labels. | Generic responsiveness destroys comparison and increases scroll. |

## Verification command ledger

| Command/check | Status | Evidence/limitation |
|---|---|---|
| `git rev-parse HEAD` | Pass | 7577176aa4ae4cbcbbf092fde29347c8d4c610d6 |
| `git status --short` (before audit) | Pass | Clean |
| `git branch --show-current` | Pass | main |
| `node --version` | Pass | v22.16.0 |
| `corepack pnpm --version` | Environment-blocked | Project requires pnpm 9.15.9; Corepack could not reach the npm registry to download it |
| Design-system TypeScript check | Pass | Exit 0; retained log |
| Web TypeScript check | Inconclusive | Timed out in constrained retained pass; no compiler error captured |
| Engine TypeScript check | Pass on rerun | Direct project `tsc --noEmit` completed in 12.34 seconds; original constrained pass is also retained |
| Engine/web/design-system tests | Environment-blocked | Vite/Rollup could not load Linux optional binary from macOS-installed archive node_modules |
| Web build | Environment-blocked | Same missing `@rollup/rollup-linux-x64-gnu` optional dependency |
| `bash scripts/check-bundle-size.sh` | Pass | Existing dist engine chunk 313 KB gzip; 320 KB ceiling |
| `node scripts/release-gate.mjs --list` | Pass | 37 release steps enumerated |
| `node scripts/release-gate.mjs --dry-run` | Pass | Release gate command graph resolves |
| Runtime capture | Pass with limitation | Existing repository `apps/web/dist` served locally; external requests aborted; fallback fonts rendered |

Retained logs are under `evidence/verification/`.

### Environment limitation, stated precisely

The archive includes an installed dependency tree produced on macOS. In this Linux audit container, Rollup attempted to load `@rollup/rollup-linux-x64-gnu`, which was not present. The project pins pnpm 9.15.9, but Corepack could not reach the npm registry to download it. The missing optional binary therefore could not be restored through the lockfile workflow in this environment. Therefore:

- The failure occurred before the product’s Vitest suites or Vite build executed.
- It is **not evidence of a source-code test failure**.
- It is also **not a clean test pass**.
- The existing built output was used only for UI observation and measurement.
- Claude must re-establish a clean lockfile install and run the full baseline in WP-00 before production changes.

The retained bundle check passed against the existing build, with an engine chunk of 313 KB gzip against a 320 KB ceiling. That seven-kilobyte headroom is a material migration constraint.

## Runtime method

- Source: existing `apps/web/dist` shipped in the repository.
- Hosting: local static HTTP server under the existing `/MFD/` base path.
- Browser: managed Chromium/Playwright capture.
- External network: aborted; fallback fonts rendered.
- Save state: deterministic representative existing save (“Lakeview Caps,” regular season Week 14) exposed by the built artifact.
- Mutations: runtime interaction only for navigation/state capture; production source and save schemas unchanged.
- Measurement script: `evidence/scripts/capture_batch.py`.
- Machine-readable results: `BASELINE_MEASUREMENTS.json`.

## Entry-state measurements

| State | Viewport | Document px | Screens | Controls | <44 px | <12 px text | Borders | Scroll regions | Screenshot |
|---|---|---|---|---|---|---|---|---|---|
| cold-open | 390×844 | 844 | 1.0× | 1 | 0 | 1 | 0 | 0 | evidence/runtime/cold-open--phone-390x844.png |
| new-game | 390×844 | 5,055 | 6.0× | 56 | 1 | 86 | 91 | 1 | evidence/runtime/new-game--phone-390x844.png |
| guided-setup | 390×844 | 844 | 1.0× | 2 | 0 | 3 | 3 | 1 | evidence/runtime/guided-setup--phone-390x844.png |
| more-drawer | 390×844 | 11,951 | 14.2× | 117 | 16 | 421 | 230 | 3 | evidence/runtime/more-drawer--phone-390x844.png |

### Entry observations

- **Cold open** is concise and not a root problem.
- **New Game** creates the first severe attention cost: the immediate guided path is visible, but the full page is six phone screens and the Instant option is several thousand pixels down the document.
- **Guided setup intro** demonstrates that a single-screen staged interaction is possible in the existing product.
- **More** confirms that complete reachability alone is insufficient: an 82vh drawer with 117 controls is a hidden sitemap, not a usable information architecture.

## Full Briefing viewport matrix

| Label | Viewport | Document px | Screens | Controls | <44 px | <12 px text | Borders | Scroll regions | H overflow |
|---|---|---|---|---|---|---|---|---|---|
| phone-320x568 | 320×568 | 13,224 | 23.3× | 43 | 15 | 270 | 156 | 3 | No |
| phone-360x800 | 360×800 | 12,315 | 15.4× | 43 | 15 | 270 | 156 | 3 | No |
| phone-390x844 | 390×844 | 11,788 | 14.0× | 43 | 15 | 270 | 156 | 2 | No |
| phone-430x932 | 430×932 | 11,429 | 12.3× | 43 | 15 | 270 | 156 | 2 | No |
| landscape-667x375 | 667×375 | 8,059 | 21.5× | 43 | 15 | 270 | 156 | 1 | No |
| landscape-844x390 | 844×390 | 7,449 | 19.1× | 49 | 48 | 278 | 170 | 0 | No |
| landscape-932x430 | 932×430 | 6,855 | 15.9× | 49 | 48 | 278 | 170 | 0 | No |
| tablet-768x1024 | 768×1024 | 7,520 | 7.3× | 54 | 27 | 288 | 176 | 1 | No |
| tablet-1024x768 | 1024×768 | 6,536 | 8.5× | 49 | 48 | 278 | 170 | 0 | No |
| desktop-1280x720 | 1280×720 | 6,706 | 9.3× | 49 | 48 | 278 | 170 | 0 | No |
| desktop-1440x900 | 1440×900 | 6,388 | 7.1× | 49 | 48 | 278 | 170 | 0 | No |
| desktop-1600x1000 | 1600×1000 | 5,902 | 5.9× | 49 | 48 | 278 | 170 | 0 | No |

### Key runtime conclusions

1. **No recorded horizontal overflow** is a strength, but it does not make the screens mobile-native.
2. Briefing remains between 5.9 and 23.3 viewports tall across the required matrix.
3. Landscape phones are worse than portrait because width changes while height-aware composition does not.
4. Phone captures commonly contain three scrolling regions: page/body, shell main, and fixed/drawer/companion regions.
5. At 844×390, 48 of 49 interactive elements were below 44 px.
6. Desktop is also overlong: 1440×900 Briefing remains seven screens tall.
7. The interface’s dominant problem is therefore not a single breakpoint bug. It is the absence of screen budgets, progressive disclosure, and task-centered composition.

## Representative route measurements

The table below includes the 390×844 phone and 1440×900 desktop captures. A document height near the viewport on a route such as Analytics, Franchise, Game Plan, or Standings does **not** prove a short experience: those captures use nested shell/main scrolling, so document geometry alone must be read with `scrollContainers` and screenshots.

| Route | Viewport | Document px | Screens | Controls | <44 px | <12 px text | Borders | Scroll regions |
|---|---|---|---|---|---|---|---|---|
| / | desktop-1440x900 | 6,276 | 7.0× | 49 | 48 | 278 | 170 | 0 |
| / | phone-390x844 | 11,806 | 14.0× | 43 | 15 | 270 | 156 | 2 |
| /analytics | desktop-1440x900 | 916 | 1.0× | 35 | 35 | 64 | 53 | 1 |
| /analytics | phone-390x844 | 860 | 1.0× | 29 | 22 | 56 | 40 | 2 |
| /contracts | desktop-1440x900 | 3,553 | 3.9× | 81 | 69 | 422 | 182 | 1 |
| /contracts | phone-390x844 | 9,700 | 11.5× | 67 | 36 | 394 | 256 | 2 |
| /depth-chart | desktop-1440x900 | 2,257 | 2.5× | 62 | 55 | 168 | 118 | 1 |
| /depth-chart | phone-390x844 | 3,711 | 4.4× | 56 | 38 | 160 | 104 | 2 |
| /dynasty | desktop-1440x900 | 916 | 1.0× | 45 | 45 | 84 | 63 | 1 |
| /dynasty | phone-390x844 | 860 | 1.0× | 39 | 32 | 76 | 50 | 2 |
| /franchise | desktop-1440x900 | 916 | 1.0× | 45 | 45 | 84 | 63 | 1 |
| /franchise | phone-390x844 | 860 | 1.0× | 39 | 32 | 76 | 50 | 2 |
| /game-day | desktop-1440x900 | 1,042 | 1.2× | 32 | 32 | 63 | 55 | 0 |
| /game-day | phone-390x844 | 1,100 | 1.3× | 26 | 19 | 55 | 42 | 2 |
| /game-plan | desktop-1440x900 | 916 | 1.0× | 31 | 31 | 56 | 49 | 0 |
| /game-plan | phone-390x844 | 860 | 1.0× | 25 | 18 | 48 | 36 | 2 |
| /roster | desktop-1440x900 | 2,869 | 3.2× | 117 | 105 | 564 | 230 | 1 |
| /roster | phone-390x844 | 11,802 | 14.0× | 105 | 48 | 526 | 358 | 2 |
| /settings | desktop-1440x900 | 5,452 | 6.1× | 71 | 65 | 269 | 197 | 1 |
| /settings | phone-390x844 | 8,548 | 10.1× | 65 | 35 | 261 | 184 | 2 |
| /standings | desktop-1440x900 | 916 | 1.0× | 35 | 35 | 64 | 53 | 1 |
| /standings | phone-390x844 | 860 | 1.0× | 29 | 22 | 56 | 40 | 2 |
| /trades | desktop-1440x900 | 2,752 | 3.1× | 56 | 56 | 165 | 113 | 1 |
| /trades | phone-390x844 | 4,581 | 5.4× | 50 | 36 | 157 | 100 | 2 |
| /week-advance | desktop-1440x900 | 2,308 | 2.6× | 29 | 29 | 107 | 97 | 0 |
| /week-advance | phone-390x844 | 3,471 | 4.1× | 23 | 13 | 99 | 84 | 2 |

### High-impact route examples

- **Roster phone:** 11,802 px / 14.0 viewports; 105 controls; 526 small-text elements; 358 bordered elements.
- **Contracts phone:** 9,700 px / 11.5 viewports.
- **Settings phone:** 8,548 px / 10.1 viewports.
- **Trades phone:** 4,581 px / 5.4 viewports.
- **Week Advance phone:** 3,471 px / 4.1 viewports even though it should be a confidence checkpoint.
- **Briefing desktop:** 6,276 px / 7.0 viewports at 1440×900.

## Screenshot index

- `evidence/runtime/analytics--desktop-1440x900.png`
- `evidence/runtime/analytics--phone-390x844.png`
- `evidence/runtime/briefing--desktop-1280x720.png`
- `evidence/runtime/briefing--desktop-1440x900.png`
- `evidence/runtime/briefing--desktop-1600x1000.png`
- `evidence/runtime/briefing--landscape-667x375.png`
- `evidence/runtime/briefing--landscape-844x390.png`
- `evidence/runtime/briefing--landscape-932x430.png`
- `evidence/runtime/briefing--phone-320x568.png`
- `evidence/runtime/briefing--phone-360x800.png`
- `evidence/runtime/briefing--phone-390x844.png`
- `evidence/runtime/briefing--phone-430x932.png`
- `evidence/runtime/briefing--tablet-1024x768.png`
- `evidence/runtime/briefing--tablet-768x1024.png`
- `evidence/runtime/cold-open--phone-390x844.png`
- `evidence/runtime/contracts--desktop-1440x900.png`
- `evidence/runtime/contracts--phone-390x844.png`
- `evidence/runtime/depth-chart--desktop-1440x900.png`
- `evidence/runtime/depth-chart--phone-390x844.png`
- `evidence/runtime/franchise--desktop-1440x900.png`
- `evidence/runtime/franchise--phone-390x844.png`
- `evidence/runtime/game-day--desktop-1440x900.png`
- `evidence/runtime/game-day--phone-390x844.png`
- `evidence/runtime/game-plan--desktop-1440x900.png`
- `evidence/runtime/game-plan--phone-390x844.png`
- `evidence/runtime/guided-setup--phone-390x844.png`
- `evidence/runtime/more-drawer--phone-390x844.png`
- `evidence/runtime/new-game--phone-390x844.png`
- `evidence/runtime/roster--desktop-1440x900.png`
- `evidence/runtime/roster--phone-390x844.png`
- `evidence/runtime/save-load--desktop-1440x900.png`
- `evidence/runtime/save-load--phone-390x844.png`
- `evidence/runtime/settings--desktop-1440x900.png`
- `evidence/runtime/settings--phone-390x844.png`
- `evidence/runtime/standings--desktop-1440x900.png`
- `evidence/runtime/standings--phone-390x844.png`
- `evidence/runtime/trades--desktop-1440x900.png`
- `evidence/runtime/trades--phone-390x844.png`
- `evidence/runtime/week-advance--desktop-1440x900.png`
- `evidence/runtime/week-advance--phone-390x844.png`

## Historical screenshots

The repository’s `apps/web/public/screenshots/v1/` images were treated as historical evidence only. Current runtime captures under `docs/ui-overhaul/evidence/runtime/` are the audit baseline.

## Baseline limitations

1. Fresh install/build/tests could not be completed in this container because the archive dependency tree lacked the Linux Rollup optional binary and pnpm was unavailable.
2. Runtime captures used the existing build; source changes after that build, if any, would not appear. The working tree was clean and commit-matched, which lowers but does not eliminate this risk.
3. External font requests were blocked, so typography measurements reflect fallback rendering. This usefully tests resilience but is not a final brand-font visual baseline.
4. The audit captured representative routes and all required Briefing sizes, not every route in every state. Route coverage is completed through source inventory and the route-surface matrix; implementation must add deterministic fixture visual coverage.
5. Screen-reader output was not exhaustively traversed; DOM geometry, focusable controls, landmarks, and source semantics informed the accessibility diagnosis. WP-03 and WP-23 require formal automated/manual coverage.
6. Performance timings were not treated as authoritative because the environment and existing built artifact are not a clean release build from this operating system.

## Reproduction commands


```bash
# From the repository root, on a correctly provisioned machine:
corepack enable
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm --filter @mfd/engine test
pnpm --filter @mfd/web test
pnpm --filter @mfd/web build
bash scripts/check-bundle-size.sh
bash scripts/smoke-test-built-page.sh
node scripts/release-gate.mjs

# Audit evidence scripts (read-only against product source):
python docs/ui-overhaul/evidence/scripts/build_route_matrix.py
python docs/ui-overhaul/evidence/scripts/capture_batch.py
```


## Evidence integrity

- `SOURCE_METRICS.json` records source counts.
- `route-surface-matrix.json` mirrors the 79-route CSV in machine-readable form.
- `BASELINE_MEASUREMENTS.json` contains states, viewport matrix, route matrix, and capture metadata.
- Each screenshot filename encodes route/state and viewport.
- Verification logs retain the actual command outcome rather than translating environment blocks into false product failures.


## Prototype and annotated visual evidence

The standalone prototype under `prototypes/` was validated as an offline document and captured in a temporary local browser session. It does not import production code or connect to the engine, store, saves, persistence, or RNG.

| Prototype evidence | Phone 390×844 | Desktop 1440×900 |
|---|---:|---:|
| Body horizontal overflow | No | No |
| Page scroll owners | One primary `.page-scroll` | One primary `.page-scroll` |
| Visible screen instances | One | One |
| Persistent job destinations | Five | Five in the shared model |
| Initial Today scroll height | 1,584 px / 1.88 viewports | 1,152 px / 1.28 viewports |
| Permanent Chip content clearance | None | None |

Prototype captures cover initial Today, selected depth decision, selected Game Plan, ready Today, readiness dialog, Chip panel, and advanced/result states at both viewports. They are under `evidence/prototype/`.

Annotated current-state evidence is under `evidence/annotated/`:

- `briefing-phone-annotated.png`
- `more-drawer-phone-annotated.png`
- `roster-phone-annotated.png`
- `current-vs-proposed-phone.png`

Route and flow diagrams are under `evidence/maps/`:

- `current-ia.svg`
- `proposed-ia.svg`
- `weekly-loop.svg`
