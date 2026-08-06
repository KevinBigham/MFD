# UI Overhaul Work-Packet Index

These packets are implementation contracts. Execute them in dependency order and record every packet in `docs/ui-overhaul/implementation/PROGRESS_LEDGER.md`.

| Packet | Phase | Effort | Dependencies | Title |
|---|---:|---:|---|---|
| [WP-00](./WP-00_BASELINE_SAFETY_RAILS_AND_MIGRATION_BOUNDARY.md) | 0 | M | None | Baseline, Safety Rails, and Migration Boundary |
| [WP-01](./WP-01_SEMANTIC_TOKENS_AND_TYPOGRAPHY_FOUNDATION.md) | 1 | M | WP-00 | Semantic Tokens and Typography Foundation |
| [WP-02](./WP-02_ADAPTIVE_VIEWPORT_AND_SCREEN_ARCHETYPE_PRIMITIVES.md) | 1 | L | WP-00, WP-01 | Adaptive Viewport and Screen-Archetype Primitives |
| [WP-03](./WP-03_INTERACTION_FOCUS_DIALOG_AND_ACCESSIBILITY_FOUNDATION.md) | 1 | L | WP-01, WP-02 | Interaction, Focus, Dialog, and Accessibility Foundation |
| [WP-04](./WP-04_ROUTE_SURFACE_METADATA_AND_DEEP_LINK_COMPATIBILITY.md) | 2 | L | WP-00 | Route-Surface Metadata and Deep-Link Compatibility |
| [WP-05](./WP-05_APP_SHELL_DECOMPOSITION_AND_MIGRATION_HOST.md) | 2 | XL | WP-01, WP-02, WP-03, WP-04 | App Shell Decomposition and Migration Host |
| [WP-06](./WP-06_ADAPTIVE_NAVIGATION_WAYFINDING_AND_RETURN_TO_TASK.md) | 2 | L | WP-04, WP-05 | Adaptive Navigation, Wayfinding, and Return-to-Task |
| [WP-07](./WP-07_OVERLAY_AND_NOTIFICATION_ORCHESTRATION.md) | 2 | L | WP-03, WP-05 | Overlay and Notification Orchestration |
| [WP-08](./WP-08_CHIP_PRESENTATION_ADAPTER.md) | 2/3 | L | WP-05, WP-07, WP-09 interface contract | Chip Presentation Adapter |
| [WP-09](./WP-09_CANONICAL_TASK_LEDGER_AND_TODAY_SCREEN.md) | 3 | XL | WP-01–WP-06; defines contract for WP-08 | Canonical Task Ledger and Today Screen |
| [WP-10](./WP-10_READINESS_AND_WEEK_ADVANCE_INTEGRATION.md) | 3 | L | WP-09, WP-03, WP-07 | Readiness and Week-Advance Integration |
| [WP-11](./WP-11_ENTRY_AND_GUIDED_SETUP_REINVENTION.md) | 3 | L | WP-01–WP-06 | Entry and Guided Setup Reinvention |
| [WP-12](./WP-12_TEAM_HUB_AND_MOBILE_NATIVE_ROSTER.md) | 4 | XL | H1, WP-01–WP-06 | Team Hub and Mobile-Native Roster |
| [WP-13](./WP-13_PLAYER_ENTITY_DETAIL_AND_COMPARISON.md) | 4 | L | WP-12, WP-04 | Player Entity Detail and Comparison |
| [WP-14](./WP-14_DEPTH_DEVELOPMENT_STAFF_AND_CULTURE_SURFACES.md) | 4 | XL | WP-12, WP-13 | Depth, Development, Staff, and Culture Surfaces |
| [WP-15](./WP-15_OFFICE_FINANCE_CONTRACTS_OWNERSHIP_AND_OPERATIONS.md) | 6 | XL | H1, WP-01–WP-06 | Office Finance, Contracts, Ownership, and Operations |
| [WP-16](./WP-16_TRADE_DESK_AND_PERSONNEL_WORKBENCH.md) | 6 | XL | WP-12, WP-13, WP-15 | Trade Desk and Personnel Workbench |
| [WP-17](./WP-17_SCOUTING_DRAFT_FREE_AGENCY_WAIVERS_AND_CAMP.md) | 6 | XL | WP-15, WP-16 | Scouting, Draft, Free Agency, Waivers, and Camp |
| [WP-18](./WP-18_GAME_HUB_AND_UNIFIED_GAME_CENTER.md) | 5 | XL | H1, WP-04–WP-07, WP-10 | Game Hub and Unified Game Center |
| [WP-19](./WP-19_LEAGUE_HUB_AND_DENSE_DATA_PATTERNS.md) | 7 | XL | H1, WP-01–WP-06, WP-12 row primitives | League Hub and Dense Data Patterns |
| [WP-20](./WP-20_DYNASTY_AND_LEGACY_STORY_HUB.md) | 7 | XL | WP-07, WP-18, WP-19 | Dynasty and Legacy Story Hub |
| [WP-21](./WP-21_SAVE_RECOVERY_SETTINGS_ACCESSIBILITY_AND_HELP.md) | 8 | XL | H1, WP-03, WP-05, WP-07 | Save, Recovery, Settings, Accessibility, and Help |
| [WP-22](./WP-22_INLINE_STYLE_MIGRATION_AND_LEGACY_SHELL_CLEANUP.md) | 9 | XL | All migrated route clusters; runs incrementally | Inline-Style Migration and Legacy Shell Cleanup |
| [WP-23](./WP-23_QA_ROUTE_COVERAGE_PERFORMANCE_AND_RELEASE_HARDENING.md) | 9 | XL | All packets; infrastructure starts WP-00 | QA, Route Coverage, Performance, and Release Hardening |

## Execution gates

- **H1 — Visual and shell proof:** after WP-00 through WP-11 produce the first complete vertical slice; owner reviews implementation before mass route migration.
- **H2 — Route retirement:** required only before permanently deleting old URLs/components instead of retaining aliases/wrappers.
- **H3 — Release candidate:** owner executes the final playtest in WP-23 after all automated gates pass.

Packets WP-12 through WP-21 can run in dependency-safe clusters after H1. WP-22 runs incrementally after each migrated cluster. WP-23 infrastructure begins in WP-00 and closes the release.
