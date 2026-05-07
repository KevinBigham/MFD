# Chip Coverage Audit - 2026-05-07

Branch target: `codex/chip-full-wire`, created from `codex/chip-art-shell-polish-v3` at `6340bbd`.

Scope guard: this audit covers the clean recovery clone at `/Users/tkevinbigham/Documents/GitHub/MFD-clean-chip-recovery`. The messy checkout at `/Users/tkevinbigham/Documents/GitHub/MFD/` was not modified. No save schema, `SAVE_VERSION`, deterministic engine behavior, RNG, or deploy surface changes are recommended here.

## Summary

Chip is present in the cold open, the post-setup dock, weekly guidance, high-stakes pose events, game recap, halftime, press conference, era transition, and trophy room empty state. Coverage is broad, but the current 17-pose atlas forces several moments into generic `think`, `concern`, `mic-check`, `celebrate`, or `idle`.

The best incremental path is to keep the v3 rig as the only art source, add a focused pose batch, then wire the new poses into the existing route-beat, eventBridge/useChipEvents, and direct feature-component surfaces where the new pose clearly reads better.

## Surface Inventory

| Surface | Files | Current state | Recommendation |
| --- | --- | --- | --- |
| Cold-open onboarding host | `apps/web/src/features/companion/ChipHost.tsx`, `apps/web/src/features/franchise-setup/FranchiseSetupWizard.tsx`, `apps/web/src/features/companion/dialogue/onboarding.ts` | Wired. Uses `wave`, `point-left`, `talk`, `think`, `concern`, `point-right`, `mic-check`, `celebrate`, `idle`. | Keep the cold-open structure. Swap only the generic `talk`/`think`/`idle` beats where new admin or proud poses land harder. |
| Onboarding reveal frames | `apps/web/src/features/companion/onboardingReveal.ts` | Wired. Uses `wave`, `mic-check`, and `idle` during entry/reveal. | Keep as-is unless the new final pose batch includes a clean `coffee-sip`/`proud` replacement for the final quiet state. |
| Post-setup dock portrait | `apps/web/src/features/companion/ChipDock.tsx` | Wired. Portrait resolves store pose, route beat pose, or live beat pose. Collapsed sanity uses `idle`. | Keep architecture. Extend route-beat pose mapping so route guidance can use specific new poses without bypassing the dock. |
| Dock pending-decision beat | `apps/web/src/features/companion/ChipDock.tsx` | Wired. `createPendingDecisionsBeat` uses route pose `thinking`, which resolves to `think`. | Change to a more urgent admin pose after the atlas lands, likely `reviewing-tablet` or `note-taking`. |
| Dock Where Am I summary | `apps/web/src/features/companion/whereAmI.ts`, `apps/web/src/features/companion/ChipDock.tsx` | Wired. Uses route pose `thinking`. | Keep as `think` or move to `reviewing-tablet` if the generated tablet pose is visually clean. |
| Weekly rollover dialogue bridge | `apps/web/src/features/companion/eventBridge.ts`, `apps/web/src/features/companion/useChipEvents.ts` | Wired for week rollover. `gameComplete` and `seasonEnd` remain intentionally deferred comments. | Keep week rollover. Do not invent broad season-end dialogue trees in this slice; document season-end as partial unless a narrow route/direct pose change covers it. |
| High-stakes pose reactions | `apps/web/src/features/companion/PoseEventEmitter.tsx`, `apps/web/src/features/companion/eventBridge.ts` | Wired for touchdowns, first launch, cap overrun, big loss, playoff upset, trade rumor, user HOF retirement, decision locked in. | Replace generic outcomes with richer poses: touchdown/rally `rallying`, cap warning `head-in-hands` or `warning`, trade rumor `on-phone`, HOF retirement `head-in-hands`, decision lock `fist-bump` or `proud`. |
| Weekly dialogue catalogue | `apps/web/src/features/companion/dialogue/weekly.ts`, `apps/web/src/features/companion/weeklyGuidance.ts` | Wired. Many variants collapse into `celebrate`, `concern`, or `mic-check`. | Swap clean wins/championship to `proud`, playoffs to `rallying`, blowout/dark moments to `head-in-hands` or `frustrated`, preseason/midseason to `coffee-sip` or `reviewing-tablet`. |
| Monday Briefing dialogue surfaces | `apps/web/src/features/monday-briefing/MondayBriefing.tsx` | Wired through active dialogue entry. | No component change needed; it inherits the weekly dialogue pose improvements. |
| Route coaching: Monday Briefing | `apps/web/src/features/route-coaching/routeBeatRegistry.ts` | Wired. Uses generic `point-side`/`thinking`. | Consider `reviewing-tablet` for triage and `calling-play` for top action. |
| Route coaching: roster/depth/game-plan/week-advance | `apps/web/src/features/route-coaching/routeBeatRegistry.ts` | Wired. Uses generic `point-side`/`thinking`. | Keep roster/depth mostly generic. Use `calling-play` for game plan and `reviewing-tablet`/`time-out` for week advance where decisions are pending. |
| Route coaching: inbox/staff/cap lab | `apps/web/src/features/route-coaching/routeBeatRegistry.ts` | Wired. Cap lab uses `point-down`; inbox/staff use generic thinking/pointing. | Use `note-taking` for inbox, `reviewing-tablet` for staff, and `skeptical`/`reviewing-tablet` for cap lab. |
| Route coaching: draft/trade/scouting | `apps/web/src/features/route-coaching/routeBeatRegistry.ts` | Wired. Draft and trade have route beats; scouting has one `idle` beat. | Use `pointing-at-tape` for scouting, `calling-play` or `football-in-hand` for draft, and `on-phone` for trade center. |
| Route coaching: standings/power/news/records/settings | `apps/web/src/features/route-coaching/routeBeatRegistry.ts` | Wired in v3. Uses `thinking`, `point-side`, `idle`, `cheer`, and `point-down`. | Upgrade to `reviewing-tablet`, `skeptical`, `proud`, and `coffee-sip` where appropriate. |
| Training Camp route | `apps/web/src/app/App.tsx`, `apps/web/src/features/training-camp/TrainingCamp.tsx`, `apps/web/src/features/route-coaching/useActiveRouteBeats.ts` | Unwired at route-beat level. The nav has `/training-camp`, but `resolveRouteKey` has no training-camp key. | Add a route-beat entry with `whistle-blow`/`coaching-crouch`. This is small and fits existing infrastructure. |
| Trade Deadline route | `apps/web/src/app/App.tsx`, `apps/web/src/app/store/game-store.ts`, route coaching files | Partially wired. The store navigates to `/trade-deadline`, but route coaching maps only `/trades` to trade center. | Add a route-beat entry for `/trade-deadline` using `on-phone` and `reviewing-tablet`. Do not touch deadline engine behavior. |
| Expansion Draft route | `apps/web/src/app/App.tsx`, route coaching files | Unwired at route-beat level. `/expansion-draft` has no route key. | Add a route-beat entry using `reviewing-tablet` and `note-taking`. Keep copy narrow; no new dialogue tree. |
| Halftime decision modal | `apps/web/src/features/game-day/HalftimeDecision.tsx` | Wired. Uses `mic-check`, `point-left`, `point-right`, `concern`, `thumbs-up`. | Replace the neutral host/choice previews with `time-out`, `calling-play`, `coaching-crouch`, and `frustrated` where the choice demands intensity. |
| Game recap Chip reaction | `apps/web/src/features/game-day/RecapChipReaction.tsx` | Wired. Uses `celebrate`, `thumbs-up`, `surprised`, `excited`, `concern`, `sad`, `disappointed`, `think`. | Upgrade blowout/comeback wins to `rallying`/`proud`, close wins to `fist-bump`, choke/blowout losses to `facepalm`/`head-in-hands`, unknown to `reviewing-tablet`. |
| Press conference modal | `apps/web/src/features/game-day/PressConferenceModal.tsx` | Wired. Uses `concern`, `think`, `thumbs-up`. | Use `skeptical` for high ambition, `reviewing-tablet` for measured review, `coffee-sip` for low-key tone, and `fist-bump` when locked in. |
| Dynasty era transition reveal | `apps/web/src/features/dynasty-era/EraTransitionReveal.tsx` | Wired. Uses `celebrate` or `concern`. | Use `proud`/`rallying` for positive eras and `head-in-hands`/`frustrated` for fall/rebuild. Keep function local. |
| Trophy Room empty state | `apps/web/src/features/franchise/TrophyRoom.tsx` | Wired direct as `idle`. | Optional. `tired` or `coffee-sip` could give the empty case more personality, but it is not a priority. |
| Achievement unlock toast | `apps/web/src/features/legacy/AchievementGallery.tsx` | Unwired. Toast has badges/copy but no Chip. | Add compact Chip treatment with `proud` or `fist-bump`. This is a contained feature-component wire-up. |
| Existing 17 art assets | `apps/web/public/assets/chip/**`, `packages/design-system/components/Chip/Chip.tsx` | Wired and should remain unchanged. | Do not rename or intentionally regenerate existing PNGs. Extend the generator so it can skip existing outputs while still generating new files and contact sheets. |

## Recommended Pose Batch

Primary set: `rallying`, `coaching-crouch`, `calling-play`, `time-out`, `whistle-blow`, `coffee-sip`, `on-phone`, `reviewing-tablet`, `head-in-hands`, `fist-bump`, `note-taking`, `laughing`, `skeptical`, `proud`, `facepalm`, `frustrated`, `tired`, `football-in-hand`, `pointing-at-tape`.

Drop rule: if the v3 procedural rig cannot render one of these without changing Chip's face, outfit, headset, scale, or line weight, drop that pose and document it in this audit before moving on. Do not create a second art pipeline.

## Wire-Up Target List

Ship in this branch if the pose batch renders cleanly:

1. Add route-beat coverage for `/training-camp`, `/trade-deadline`, and `/expansion-draft`.
2. Upgrade route-beat pose mapping to support specific semantic poses while keeping the dock contract intact.
3. Upgrade eventBridge pose reactions for touchdown/rally, trade rumor, HOF retirement, decision lock-in, cap pressure, and big losses.
4. Upgrade weekly dialogue/weekly guidance pose selections.
5. Upgrade direct game-day surfaces: halftime, recap, press conference.
6. Add compact Chip support to the achievement unlock toast.
7. Optionally upgrade era transition and trophy room empty state if the new poses read clearly in the existing layout.

Still defer unless Kevin explicitly expands scope:

- Open-ended season-end dialogue trees: existing `eventBridge` comments identify the missing catalog, but this needs more than a line or two of authoring.
- Engine-side event spine changes: current high-stakes pose reactions are intentionally web-side and additive.
- Save/import/export or schema changes: not needed for this visual/wiring slice.
