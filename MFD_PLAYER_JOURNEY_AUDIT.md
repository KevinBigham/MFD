# MFD Player Journey Audit

Verdict: YELLOW. The first 10 seasons are plausibly playable for motivated franchise-sim players, especially with Chip and the strengthened local release gate. The journey still risks overwhelming new users, under-explaining CPU intent, and losing long-term memory portability unless sidecars and long-horizon proof are improved.

## Journey Table

| Stage | What is clear | What is confusing | What is exciting | What is boring | Trust risk | Missing emotionally | Next good click | Evidence | Grade |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| New Dynasty | Play Now, save v36, setup guided by Chip | All advanced systems become visible quickly | Team identity, AGM, first choices | Setup can be long | First-ten localStorage outside GameState | Stronger "this is your franchise" ceremony | Finish setup, land on Monday Briefing | `README.md:49-55`, `STATUS.md:24-30`, `App.tsx:167-224` | B |
| Week 1 | Monday Briefing and Chip explain priorities | Too many nav routes and direct-only features | First opponent, roster decisions, game plan | Source panels can feel technical | Progressive unlock metadata not shell-wired | More emotional rivalry/opponent hook | Follow briefing CTA to roster/game plan/depth | `RELEASE_CONVERGENCE.md:18`, `nav-items.test.ts:195-211` | B |
| Regular season | Advance Week, Game Day, standings, news, injuries | Which feeds/actions matter most | Games, records, press, injuries, trade rumors | Repeated read-only panels | Trick plays planning-only; press quote-only | Player relationships and grudges need more visible continuity | Resolve inbox, prep, then advance | `franchise-week.ts:590-696`, `GamePlanSetup.tsx:626-627`, `PressConferenceModal.tsx:101-111` | B |
| Trade deadline | Dedicated route and urgency state | AI reasoning can be opaque | Countdown, ticker, offers | If no offers, can feel passive | G3 smoke leaves OS download assertions out of scope | War-room drama around CPU motives | Review trade block and offers | `RELEASE_CONVERGENCE.md:19`, `trade-deadline.ts` | B |
| Playoffs | Bracket, playoff momentum, Super Bowl route | How prep/playoff lore persists | High-stakes games, named games, parade | Some lore goes to sidecars/direct-only routes | Sidecar export split | Stronger postseason ceremony/history writeback | Game Day, Film Room, Super Bowl | `franchise-week.ts:50-51`, `App.tsx:190`, `DynastyCartridge.tsx:354-358` | B |
| Offseason | Phase engine, re-sign, FA, draft flow | CPU intent and calendar can feel scattered | Roster reshaping | Can become task checklist | Save trust critical around phase transitions | More "state of the league" recap | Start re-sign/free agency | `offseason.ts:1412-1625` | B |
| Free agency | Agent demands, bids, forecasts | CPU bidding motives need more explanation | Bidding wars, holdouts | Repeated offer tuning | Agent state must persist correctly | Agent personalities should feel memorable | Use FA Targets, submit bids | `player-agents.ts:89-247`, `offseason.ts:1338-1377` | B |
| Draft | Board, scouting, war room, trade offers | Draft trade accept state risk | Elite prospects, urgency offers | Waiting/pick flow if offers are sparse | Draft-order desync risk | Prospect stories/bloodlines should pop | Draft or trade down | `draft-war-room.ts:72-94`, `354-378` | C |
| Training camp | Camp phase and results | Long-term effect may be hard to feel | Breakouts, position battles | If results are small | Position coach lifecycle missing | Camp legends and rivalries | Review player development/depth | `franchise-week.ts:644-648`, `CoachingStaff.tsx:540-541` | B/C |
| Preseason | Transition to regular season and owner demands | Difference from camp can be light | Ring ceremonies, lineup setup | Few games/decisions | Depth chart not formation-validated | More rookie/camp closure | Set depth, review schedule | `franchise-week.ts:651-683`, `DepthChart.tsx:85-90` | B |
| Year 2 | Save/migration/continuity start mattering | Sidecars vs `.mfd` not obvious | First draft class develops | Repeating weekly loop | `.mfd` excludes sidecar memory | Stronger year-over-year recap | Season Recap, Legacy, HOF | `DynastyCartridge.tsx:333-358` | B |
| Year 5 | Records, awards, dynastic arcs emerge | Where history lives is split | Homegrown stars, coaching tree, rivalries | Some archive routes are read-only | HOF/scrapbook sidecar stale/missing | Player attachment should be stronger | Franchise, Records, Legacy | `HallOfFameDirectory.tsx:466-487`, `LegacyTimeline.tsx:229` | B/C |
| Year 10 | Fast playtest tier has clean high anomalies | Whether economy remains healthy | Bloodlines, HOF, eras | Too many passive feeds | Shadow 20y truncates around year 10 | League memory should feel authored | Era/HOF/records audit | `RELEASE_CONVERGENCE.md:55`, `_canon/seeds/mfd/README.md:23-29` | C |
| Year 25 | Not proven by current release gate | Can the save survive generations? | Multi-era league mythology | If history routes just display lists | No 25-year quality certificate | Rivalries, records, HOF need canonical archive | Run explicit long-horizon report | `_canon/seeds/mfd/README.md:50-55` | D/C |
| Year 50 | Not proven | Storage size, schema islands, sidecars, history overflow | Ultimate dynasty obsession | Potential fatigue/repetition | No 50-year soak or anomaly budget | Generational storytelling and franchise book | Add 50-year soak before claiming | `schema.ts:2070-2113`, `_canon/seeds/mfd/README.md:23-29` | D |

## Friction Themes

1. Route overload: 50+ primary nav items plus 25 direct-only routes are registered; progressive unlock metadata is intentionally not used by the shell (`App.tsx:167-224`, `nav-items.test.ts:9-35`, `195-211`).
2. Truthful but technical source panels: many screens explain implementation boundaries in player-facing copy. That prevents deception, but can reduce immersion (`TeamNeeds.tsx:153-157`, `CoachingStaff.tsx:540-541`, `DepthChart.tsx:85-90`).
3. Save portability split: `.mfd` and complete sidecar archive are separate, and sidecars carry exactly the memory players care about after multiple seasons (`DynastyCartridge.tsx:354-358`).
4. High-emotion shallow choices: trick plays and press conferences are truthfully labeled but do not yet generate the stakes their fantasy suggests (`GamePlanSetup.tsx:626-627`, `PressConferenceModal.tsx:101-111`).
5. AI trust gap: CPU strategy/philosophy exists, but player-facing "why" is scattered and often read-only (`ai-philosophy.ts:102-138`, `TeamNeeds.tsx:153-157`).

## Journey Recommendations

| Priority | Slice | Why |
| --- | --- | --- |
| 1 | Guided weekly task rail using route unlock metadata | Reduces first-week overload without deleting depth. |
| 2 | One-click combined backup | Protects emotional history and save trust before Year 2+. |
| 3 | Draft trade transaction fix | Draft is a major trust moment. |
| 4 | CPU intent ledger | Makes AI teams feel smarter and gives the player context. |
| 5 | 25/50-year soak | Turns long-run marketing promise into evidence. |
| 6 | Trick-play sim wiring | Converts a high-fantasy choice into real football drama. |
| 7 | Position coach lifecycle | Makes development and staff-building feel owned. |
| 8 | Archive CTAs after major events | Helps players find direct-only memory routes when emotions are highest. |

