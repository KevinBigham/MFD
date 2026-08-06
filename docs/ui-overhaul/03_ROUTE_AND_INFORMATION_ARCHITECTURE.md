# 03 — Route and Information Architecture

## Current IA

The canonical registry contains 79 destinations. The current global grouping is:

| Room | Routes | Representative labels |
|---|---|---|
| briefing | 4 | Briefing, Advance, Inbox, Watch |
| football_ops | 30 | Roster, Depth, Locker, Coach, Tree, Relations, Promises, Camp, Mentors, Develop… |
| game_week | 9 | Plan, Game, Live, Cinema, PbP, Flow, Film, Schedule, SB |
| league | 13 | Stand, Rankings, Pulse, Weather, Digest, News, Social, Commish, CBA, Rules… |
| legacy | 23 | Franchise, Legends, Career, Book, Chronicle, Scrap, Hall, Trophies, Eras, MVPs… |

An alternate Nerd map redistributes the same product into:

| Nerd group | Route count |
|---|---|
| core | 4 |
| team | 12 |
| money | 4 |
| acquire | 12 |
| dynasty | 20 |
| gameday | 9 |
| league | 13 |
| meta | 5 |

Mobile persists Briefing, Roster, Plan, and Advance, then places most remaining destinations in More. This is route reachability without a coherent job model.

## IA decision

Use one player-centered hierarchy:

```text
GLOBAL / PERSISTENT
├── Today
├── Team
├── Game
├── Office
└── League

CONTEXTUAL BUT FIRST-CLASS
├── Dynasty
└── System

LOCAL SURFACES
├── Hub overview
├── Hub tab/section
├── Entity detail
├── Contextual workflow/workbench
├── Drawer/bottom sheet/dialog
├── Event/cinematic state
└── Archive detail
```

The hierarchy is stable across phone, tablet, desktop, season phase, and density preference. Phase changes **priority and entry points**, not the location of a feature.

## Proposed hubs

| Hub | Current routes absorbed | Purpose | Visibility | Sections | Mobile entry |
|---|---|---|---|---|---|
| Today | 4 | Recurring command home | Always | Overview; task ledger; opponent; inbox summary; readiness | Bottom item |
| Team | 13 | Roster and football operations | Always after setup | Overview; Roster; Depth; Development; Staff; Culture | Bottom item |
| Game | 9 | Preparation and game entity center | Always; changes emphasis by phase | Week; Plan; Schedule; Game Center tabs | Bottom item |
| Office | 17 | Finance, ownership, and personnel acquisition | Always; phase-aware | Overview; Finance; Personnel; Operations; Ownership | Bottom item |
| League | 13 | League race, stories, data, governance | Always | Overview; Race; News; Stats; Records; Rules | Bottom item |
| Dynasty | 18 | Long-term franchise story and honors | After first meaningful artifact; always searchable | Story; People; Honors; Seasons; Records; Scenarios | Contextual; desktop rail |
| System | 5 | Trust, recovery, configuration, help | Always | Save & Recovery; Settings; Accessibility; Help; About | System/profile sheet |

### Today

- **Purpose:** make the current week/phase legible and complete the next meaningful decision.
- **First viewport:** franchise/team; season/week/phase; opponent/deadline; record/stakes; required count; single next action; readiness state.
- **Sections:** Must Do, Recommended, Optional; opponent; roster health; inbox summary; league stakes; saved weekly inputs.
- **Contextual actions:** resume task, review consequence, play/sim, advance.
- **Empty state:** “You are ready” with the exact next event and optional deeper work.
- **Badges:** count only unresolved Must Do; warnings are not inflated into blockers.

### Team

- **Purpose:** manage people, roles, development, staff, and culture.
- **Local tabs:** Overview, Roster, Depth, Development, Staff, Culture.
- **Entity model:** Player detail tabs remain consistent regardless of origin; “Return to task” appears when launched from Today/Office/Game.
- **Mobile:** purpose-built rows and sheets; no all-column card conversion.
- **Desktop/tablet:** list-detail and comparison workspaces where width permits.

### Game

- **Purpose:** maintain one opponent/game context from preparation through consequences.
- **Local tabs:** Week, Plan, Schedule, Game Center.
- **Game Center:** Overview, Broadcast, Plays, Flow, Film, Box Score, Consequences.
- **Event behavior:** live/cinematic state may temporarily occupy the full viewport, then returns to the persistent game entity.

### Office

- **Purpose:** build and sustain the franchise through finance, personnel, operations, and ownership.
- **Local tabs:** Overview, Finance, Personnel, Operations, Ownership.
- **Phase behavior:** Personnel locally foregrounds Trade Desk, Scouting/Draft, Free Agency, Waivers, or Camp based on lifecycle.
- **Workbench behavior:** selected players/picks/offers remain visible; staged decisions preserve draft/trade/form state.

### League

- **Purpose:** answer league-wide questions without forcing feed taxonomy knowledge.
- **Local tabs:** Overview, Race, News, Stats, Records, Rules.
- **Context:** team/player/game cards link directly into relevant details and preserve origin.

### Dynasty

- **Purpose:** turn long-term simulation output into an emotionally coherent franchise story.
- **Local tabs:** Story, People, Honors, Seasons, Records, Scenarios.
- **Discovery:** franchise header, search, milestone/event cards, season recap, and desktop rail; not routine phone bottom navigation.

### System

- **Purpose:** preserve trust and control.
- **Sections:** Save & Recovery, Settings, Accessibility, Help, About.
- **Access:** team/profile system sheet, command search, keyboard shortcut, and explicit save-health status.

## Persistent navigation

### Phone

Five labeled bottom destinations:

```text
[ Today ] [ Team ] [ Game ] [ Office ] [ League ]
```

Rules:

- labels are always visible;
- each target is at least 48 px high including spacing;
- a badge appears only for unresolved required work or a genuinely new item;
- the active item has shape, text, and color cues;
- the bar includes safe-area padding and never overlaps the sticky action dock;
- Dynasty/System are not buried in an “everything else” drawer: the franchise header opens a small identity/system sheet; legacy moments link to Dynasty; both are searchable.

### Tablet

Use a navigation rail at medium widths. Landscape tablets can use hub rail + list/detail. Portrait tablets use rail + single content column. Local tabs can become a vertical secondary rail when six or more sections exist.

### Desktop

Use a left rail/sidebar with the five core hubs plus Dynasty. System sits at the bottom with save health. The center column is the current screen. A right contextual pane is optional for Task Ledger detail, comparison, or Chip—but never permanently reserved when closed.

## Current-to-future route coverage

`ROUTE_SURFACE_MATRIX.csv` is authoritative for all 79 routes and contains current labels/groups/unlocks, user job, urgency, current entry/return behavior, target hub, canonical future path, target surface, placement, compatibility, feature-loss risk, and acceptance test.

### Today (4 current routes)

| Current path | Current label | Future canonical path | Surface | Placement |
|---|---|---|---|---|
| / | Monday Briefing | /today | phase-aware hub | Today overview |
| /week-advance | Advance Week | /today?panel=readiness | drawer or bottom sheet | sticky gated Advance control |
| /inbox | Inbox | /today/inbox | hub tab or section | Today > Inbox |
| /watch-list | Watch List | /today/watchlist | hub tab or section | Today > Watchlist |

### Team (13 current routes)

| Current path | Current label | Future canonical path | Surface | Placement |
|---|---|---|---|---|
| /roster | Roster | /team/roster | collection/list with filters | Team default |
| /depth-chart | Depth Chart | /team/depth | hub tab or section | Team > Depth |
| /locker-room | Locker Room | /team/culture | hub tab or section | Team > Culture |
| /coaching | Coaching | /team/staff | phase-aware hub | Team > Staff |
| /coaching/tree | Coaching Tree | /team/staff/tree | hub tab or section | Team > Staff > Tree |
| /coaching/relationships | Staff Relationships | /team/staff/relationships | hub tab or section | Team > Staff > Relationships |
| /handshakes | Handshakes | /team/commitments | hub tab or section | Team > Culture > Commitments |
| /training-camp | Training Camp | /team/camp | contextual workflow | phase takeover + Team tab |
| /mentors | Alumni Mentors | /team/development/mentors | hub tab or section | Team > Development > Mentors |
| /player-development | Player Development | /team/development | phase-aware hub | Team > Development |
| /compare | Player Compare | /team/compare | comparison workbench | contextual entity action |
| /rivalries | Player Rivalries | /team/culture/rivalries | hub tab or section | Team > Culture > Rivalries |
| /practice-squad | Practice Squad | /team/roster/practice-squad | hub tab or section | Team > Roster > Practice Squad |

### Game (9 current routes)

| Current path | Current label | Future canonical path | Surface | Placement |
|---|---|---|---|---|
| /game-plan | Game Plan | /game/plan | hub tab or section | Game > Plan + Today task |
| /game-day | Game Day | /game/current | event-driven presentation | Game Center overview |
| /broadcast | Broadcast | /game/current/broadcast | hub tab or section | Game Center > Broadcast |
| /presentation | Presentation | /game/current/presentation | hub tab or section | Game Center > Presentation |
| /play-by-play | Play-by-Play | /game/current/play-by-play | hub tab or section | Game Center > Play-by-Play |
| /game-flow | Game Flow | /game/current/flow | hub tab or section | Game Center > Flow |
| /film-room | Film Room | /game/current/film | hub tab or section | Game Center > Film |
| /schedule | Schedule | /game/schedule | hub tab or section | Game > Schedule |
| /super-bowl | Super Bowl | /game/super-bowl | event-driven presentation | championship takeover + archive |

### Office (17 current routes)

| Current path | Current label | Future canonical path | Surface | Placement |
|---|---|---|---|---|
| /contracts | Contracts | /office/finance/contracts | hub tab or section | Office > Finance > Contracts |
| /cap-lab | Cap Lab | /office/finance/cap-lab | comparison/transaction workbench | Office > Finance > Cap Lab |
| /front-office | Front Office | /office/operations | phase-aware hub | Office > Operations |
| /endorsements | Endorsements | /office/operations/endorsements | hub tab or section | Office > Operations > Endorsements |
| /trades | Trades | /office/personnel/trades | comparison/transaction workbench | Office > Personnel > Trades |
| /trade-block | Trade Block | /office/personnel/trade-market | hub tab or section | Office > Personnel > Market |
| /trade-deadline | Trade Deadline | /office/personnel/deadline | contextual workflow | deadline phase takeover + Today task |
| /team-needs | Team Needs | /office/personnel/needs | hub tab or section | Office > Personnel > Needs |
| /scouting | Scouting | /office/personnel/scouting | phase-aware hub | Office > Personnel > Scouting |
| /draft | Draft | /office/personnel/draft | decision workflow or wizard | draft phase takeover + Office tab |
| /draft-recap | Draft Recap | /office/personnel/draft/recap | event-driven presentation | draft completion + archive |
| /expansion-draft | Expansion Draft | /office/personnel/expansion-draft | decision workflow or wizard | event-driven Office workflow |
| /free-agency | Free Agency | /office/personnel/free-agency | comparison/transaction workbench | free-agency takeover + Office tab |
| /fa-targets | FA Targets | /office/personnel/free-agency/targets | hub tab or section | Free Agency > Targets |
| /waivers | Waiver Wire | /office/personnel/waivers | hub tab or section | Office > Personnel > Waivers |
| /owner | Owner Suite | /office/ownership | hub tab or section | Office > Ownership |
| /relocate | Relocation | /office/ownership/relocation | decision workflow or wizard | Office > Ownership > Relocation |

### League (13 current routes)

| Current path | Current label | Future canonical path | Surface | Placement |
|---|---|---|---|---|
| /standings | Standings | /league/standings | hub tab or section | League default |
| /power-rankings | Power Rankings | /league/rankings | hub tab or section | League > Rankings |
| /league-pulse | League Pulse | /league/pulse | timeline/news/history view | League > Pulse |
| /league/weather | Weather | /league/weather | hub tab or section | League > Context > Weather |
| /newsroom | Newsroom | /league/news | timeline/news/history view | League > News |
| /news | News | /league/news/all | hub tab or section | League > News > All |
| /social | MFSN | /league/news/mfsn | hub tab or section | League > News > MFSN |
| /commissioner | Commissioner | /league/governance/commissioner | hub tab or section | League > Governance |
| /cba | CBA Negotiation | /league/governance/cba | decision workflow or wizard | event-driven governance workflow |
| /league-rules | League Rules | /league/governance/rules | hub tab or section | League > Governance > Rules |
| /analytics | Analytics | /league/analytics | data dashboard and analytics view | League > Analytics |
| /records | Record Book | /league/history/records | archive/history detail | League > History > Records |
| /stat-central | Stat Central | /league/stats | collection/list with filters | League > Stats |

### Dynasty (18 current routes)

| Current path | Current label | Future canonical path | Surface | Placement |
|---|---|---|---|---|
| /franchise | Franchise | /dynasty/overview | phase-aware hub | Dynasty overview |
| /legends | Legends | /dynasty/legends | archive/history detail | Dynasty > Legends |
| /franchise/career | GM Career | /dynasty/career | data dashboard and analytics view | Dynasty > Career |
| /franchise/book | Franchise Book | /dynasty/book | archive/history detail | Dynasty > Archive > Book |
| /franchise/chronicle | Chronicle | /dynasty/chronicle | timeline/news/history view | Dynasty > Archive > Chronicle |
| /franchise/scrapbook | Scrapbook | /dynasty/scrapbook | archive/history detail | Dynasty > Archive > Scrapbook |
| /franchise/hall | Hall of Fame | /dynasty/hall-of-fame | archive/history detail | Dynasty > Honors > Hall of Fame |
| /franchise/trophy-room | Trophy Room | /dynasty/trophies | archive/history detail | Dynasty > Honors > Trophies |
| /franchise/eras | Era Hall | /dynasty/eras | timeline/news/history view | Dynasty > History > Eras |
| /franchise/mvps | MVP Plaques | /dynasty/honors/mvps | archive/history detail | Dynasty > Honors > MVPs |
| /franchise/playoff-lore | Playoff Lore | /dynasty/history/playoffs | archive/history detail | Dynasty > History > Playoffs |
| /franchise/achievements | Achievements | /dynasty/achievements | data dashboard and analytics view | Dynasty > Achievements |
| /legacy | Legacy | /dynasty/legacy | hub tab or section | Dynasty > Legacy |
| /legacy/named-games | Named Games | /dynasty/history/named-games | archive/history detail | Dynasty > History > Named Games |
| /legacy/bloodlines | Bloodlines | /dynasty/history/bloodlines | archive/history detail | Dynasty > History > Bloodlines |
| /awards | Awards Hub | /dynasty/honors/awards | archive/history detail | Dynasty > Honors > Awards |
| /season/recap | Season Recap | /dynasty/seasons/current/recap | event-driven presentation | season-completion event + archive |
| /scenarios | Scenarios | /scenarios | collection/list with filters | Title screen + Dynasty > Challenges |

### System (5 current routes)

| Current path | Current label | Future canonical path | Surface | Placement |
|---|---|---|---|---|
| /about | About | /system/about | system/settings utility | System sheet > About |
| /credits | Credits | /system/credits | system/settings utility | System sheet > Credits |
| /faq | FAQ | /help | system/settings utility | Help search + System sheet |
| /dynasty | Save/Load | /system/saves | settings and trust-critical utility | System sheet > Saves |
| /settings | Settings | /system/settings | settings and trust-critical utility | System sheet > Settings |

## Surface taxonomy

| Surface type | Use | Not appropriate for |
|---|---|---|
| Global destination | One of the five recurring jobs; Dynasty/System contextual first-class entries | Every feature or archive type |
| Phase-aware hub | Summary and local navigation for a job/lifecycle | Long single-purpose forms |
| Hub tab/section | Stable local subdivision inside a hub | Independent global navigation |
| Entity detail | Player, team, game, coach, transaction, legacy object keyed by ID | General feature directories |
| Contextual workflow | Multi-step decision preserving origin and progress | Passive reference data |
| Workbench | Comparison/transaction with selected entities and staged actions | Phone-first simple read views |
| Drawer/bottom sheet | Short contextual choice/help/Chip/filter detail | Full route sitemap or long primary content |
| Dialog | Confirmation or focused irreversible decision | Complex navigation or multi-page content |
| Event presentation | Live game, draft pick, ceremony, milestone | Routine management |
| Archive detail | Permanent historical artifact with stable deep link | Current weekly task |
| System utility | Save, recovery, settings, accessibility, help | Football management content |
| Compatibility route | Old path resolving to canonical surface and preserving parameters | New navigation labels |

## Overlap resolution

| Current overlap | Canonical future answer | Resolution |
|---|---|---|
| Briefing / Action Center / Inbox / Chip / badges / Advance | Today Task Ledger | One derived task contract; Inbox owns messages, Chip explains, badges summarize, Advance consumes readiness. |
| Franchise / Legacy / Book / Chronicle / Scrapbook | Dynasty | Story, People, Honors, Seasons, Records; old routes deep-link to section/detail. |
| News / Newsroom / Social / Pulse | League → News | One feed taxonomy with source/type filters; contextual cards deep-link. |
| Contracts / Cap Lab / Front Office | Office → Finance | Finance overview, contracts collection, cap scenarios/workbench. |
| Game Day / Broadcast / Presentation / PBP / Flow / Film | Game Center | One game ID, local tabs, shared score/context, event state. |
| Trades / Block / Deadline / Needs | Office → Personnel → Trade Desk | One workbench with needs context, offers, block, deadline state. |
| Scouting / Draft / Recap / FA / Targets / Waivers / Practice Squad | Office → Personnel | Phase-aware sequence and local sections. |

## Route compatibility policy

1. Existing hash paths continue resolving for at least one full release after their new surfaces ship.
2. A compatibility wrapper resolves old path parameters to canonical hub/tab/entity state.
3. The URL may remain old during migration if changing it creates needless risk; canonical-path metadata drives new links.
4. Unlock rules are read from existing game state/route metadata, not reimplemented in UI strings.
5. A route contract test covers: old path, availability, destination, entity ID/parameters, focus target, back/return, and no feature loss.
6. An old route can be permanently retired only after:
   - its matrix row is green;
   - all entry points link to the new canonical surface;
   - saved/bookmarked URL behavior is documented;
   - H2 approval is recorded.

## Back and return-to-task model

Every contextual navigation can carry:

```ts
type NavigationOrigin = {
  route: AppRoute;
  hub: HubId;
  localSection?: string;
  taskId?: string;
  entityRef?: EntityRef;
  filterKey?: string;
  scrollKey?: string;
};
```

Priority:

1. If `taskId` exists, show **Return to task** and return to Today with focus on that task.
2. Else return to the originating collection with tab/filter/selection/scroll restored.
3. Else browser/route Back.
4. A hub label always returns to its overview without destroying form state unless the user confirms abandonment.

## Entity navigation model

| Entity | Canonical shape | Local navigation | Context preservation |
|---|---|---|---|
| Player | `/team/players/:playerId` | Overview, Role, Development, Contract, History | Origin task/list/filter/comparison slot |
| Team | `/league/teams/:teamId` or owned-team Team hub | Overview, Roster, Schedule, Stats, History | League race/news/game origin |
| Game | `/game-center/:gameId` | Overview, Broadcast, Plays, Flow, Film, Box, Consequences | Schedule/Today/season origin |
| Transaction | `/office/personnel/transactions/:id` | Proposal, Assets, Cap, Rationale, Outcome | Trade/FA/waiver workbench state |
| Coach/staff | `/team/staff/:staffId` | Overview, Role, Scheme, Contract, History | Staff collection/task origin |
| Legacy artifact | `/dynasty/artifacts/:artifactId` | Story, evidence, related people/games/seasons | Milestone/event/season origin |

## Notification-to-destination map

| Notification type | Default treatment | Canonical destination |
|---|---|---|
| Must-do blocker | Today task row + badge; Chip may explain once | Exact contextual workflow |
| Recommended decision | Today recommended section; no interrupt | Exact hub/workflow |
| Inbox message | Notification center/inbox; summary on Today | Message detail with related entity/action |
| Breaking league news | Non-blocking banner/card unless game-critical | League → News item |
| Achievement/record | Toast then durable event card | Dynasty artifact / League record |
| Ceremony/season transition | Exclusive cinematic overlay; resumable | Dynasty/Today transition summary |
| Save/storage warning | Persistent system status, escalates only when risky | System → Save & Recovery |
| Error/recovery | Inline state first; blocking dialog only if action cannot continue | Relevant recovery state |

## Search / command taxonomy

Search is organized by **actions and entities**, not route labels alone:

- Go to hub/section.
- Find player/team/game/coach/transaction/legacy artifact.
- Resume active task.
- Run safe utility: save, export, settings, accessibility.
- Explain concept/help.
- Recent and favorites.

Results show category, destination context, availability, and shortcut. Locked results explain the condition; they do not silently disappear. Search must never be required for the weekly loop.

## Weekly state map

```text
[NEW WEEK / PHASE]
        ↓
Today derives context + Task Ledger
        ↓
Must Do? ── yes ──→ contextual workflow ──→ completion selector updates
   │                                      │
   no                                     └── Return to task
   ↓
Recommended warnings / optional work
   ↓
Readiness summary
   ├── blocked → exact unresolved tasks
   ├── warning → explicit acknowledgement + consequence
   └── ready → play/sim/advance
                   ↓
             Game Center / event result
                   ↓
           consequence + save confirmation
                   ↓
              Next Today state
```

## Phase-aware map

| Phase | Today emphasis | Game | Team | Office | League/Dynasty moment |
|---|---|---|---|---|---|
| Preseason / camp | Cuts, depth, camp battles, readiness | Exhibitions / plan | Roster bubble, development | Waivers, cap, staff | Preview and season expectations |
| Regular season | Opponent, injuries, must-do tasks, standings stakes | Plan → Game Center | Depth/health/development | Trades/scouting/finance signals | Race/news; records when broken |
| Trade deadline | Deadline countdown and roster need | Upcoming opponent remains visible | Depth/health impact | Personnel workbench becomes primary local section | League movement/news |
| Playoffs | Opponent, stakes, elimination consequence | Plan and cinematic Game Center | Availability/depth | Emergency roster/finance only | Bracket/race; named game/lore triggers |
| Season recap | Consequences, awards, owner result | Season game archive | Development/retirement changes | Contract/offseason bridge | Awards, records, new Story artifact |
| Free agency | Needs, cap, target decisions | Future schedule de-emphasized | Roster holes | FA board/targets primary | League movement |
| Draft | Board readiness, clock, needs | Draft event presentation | Roster fit | Draft workbench primary | Draft news; pick legacy events |
| Offseason governance | Staff, contracts, rules, ownership | Future opponent context | Development/staff | Finance/ownership/governance | Rule/CBA changes and era history |

## Feature-loss control

- `ROUTE_SURFACE_MATRIX.csv`: 79/79 rows.
- Every row has a `feature_loss_risk` and `required_acceptance_test`.
- High-risk rows retain compatibility wrappers until manual and automated coverage prove every action/state.
- Route cluster packets include before/after screenshots and a capability checklist.
- The final release gate compares current registry paths to the matrix and new route-surface map; unmatched paths fail.
