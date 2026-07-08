export const ROUTE_KEYS = [
  'monday-briefing',
  'roster',
  'depth-chart',
  'locker-room',
  'game-plan',
  'game-day-recap',
  'broadcast-suite',
  'film-room',
  'super-bowl',
  'week-advance',
  'schedule',
  'watch-list',
  'inbox',
  'owner-promises',
  'staff',
  'cap-laboratory',
  'front-office',
  'endorsements',
  'draft-board',
  'draft-recap',
  'trade-center',
  'trade-market-radar',
  'market-planning',
  'roster-churn',
  'scouting-board',
  'standings',
  'analytics-evidence',
  'player-profile',
  'player-timeline',
  'player-development',
  'player-comparison',
  'player-rivalries',
  'power-rankings',
  'league-pulse',
  'league-weather',
  'league-news',
  'newsroom',
  'social-feed',
  'commissioner-governance',
  'cba',
  'league-rules',
  'scenario-constraints',
  'record-book',
  'awards-hub',
  'franchise-legends',
  'season-recap',
  'dynasty-save-load',
  'settings',
  'training-camp',
  'mentors',
  'trade-deadline',
  'relocation',
  'expansion-draft',
] as const;

export type RouteKey = (typeof ROUTE_KEYS)[number];

export const CHIP_ROUTE_POSES = [
  'idle',
  'point-down',
  'point-side',
  'cheer',
  'thinking',
  'reviewing-tablet',
  'calling-play',
  'note-taking',
  'skeptical',
  'on-phone',
  'pointing-at-tape',
  'proud',
  'coffee-sip',
  'whistle-blow',
  'coaching-crouch',
  'time-out',
  'football-in-hand',
] as const;

export type ChipRoutePose = (typeof CHIP_ROUTE_POSES)[number];

export interface RouteBeat {
  id: string;
  pose: ChipRoutePose;
  text: string;
  spotlightTarget: string | null;
}

export const ROUTE_BEAT_REGISTRY = {
  'monday-briefing': [
    {
      id: 'chip.route.monday-briefing.beat-1',
      pose: 'reviewing-tablet',
      text: 'Must Do: open Action Center. Where: Monday Briefing. Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep.',
      spotlightTarget: 'chip.route.monday-briefing.beat-1',
    },
    {
      id: 'chip.route.monday-briefing.beat-2',
      pose: 'calling-play',
      text: 'Recommended: after Action Center, open Depth Chart or Game Plan. Where: team screens. Consequence: saved lineup and calls lock.',
      spotlightTarget: 'chip.route.monday-briefing.beat-2',
    },
  ],
  roster: [
    {
      id: 'chip.route.roster.beat-1',
      pose: 'point-side',
      text: 'Recommended: decide starter, backup, trade, or cut. Where: highlighted player. Consequence: extra names do not fix the role.',
      spotlightTarget: 'chip.route.roster.beat-1',
    },
    {
      id: 'chip.route.roster.beat-2',
      pose: 'thinking',
      text: 'Recommended: open Roster for injury and backup health. Where: Roster, then Depth Chart. Consequence: uncovered injuries force signings.',
      spotlightTarget: 'chip.route.roster.beat-2',
    },
  ],
  'depth-chart': [
    {
      id: 'chip.route.depth-chart.beat-1',
      pose: 'point-side',
      text: 'Must Do: save starters and first backups. Where: Depth Chart. Consequence: roster list alone does not decide who plays.',
      spotlightTarget: 'chip.route.depth-chart.beat-1',
    },
    {
      id: 'chip.route.depth-chart.beat-2',
      pose: 'thinking',
      text: 'Recommended: set injured starters and backups. Where: Depth Chart. Consequence: missed order sends an unassigned backup into calls.',
      spotlightTarget: 'chip.route.depth-chart.beat-2',
    },
  ],
  'locker-room': [
    {
      id: 'chip.route.locker-room.beat-1',
      pose: 'skeptical',
      text: "Recommended: open morale and captains. Where: Locker Room. Consequence: meetings or rallies spend this week's morale action.",
      spotlightTarget: null,
    },
    {
      id: 'chip.route.locker-room.beat-2',
      pose: 'note-taking',
      text: 'Optional: pick meetings, rallies, or captains. Where: Locker Room. Consequence: morale changes lock for the week.',
      spotlightTarget: null,
    },
  ],
  'game-plan': [
    {
      id: 'chip.route.game-plan.beat-1',
      pose: 'calling-play',
      text: 'Recommended: set offense, protection, and coverage after injuries. Where: Game Plan. Consequence: hurt starters need safer calls.',
      spotlightTarget: 'chip.route.game-plan.beat-1',
    },
    {
      id: 'chip.route.game-plan.beat-2',
      pose: 'reviewing-tablet',
      text: 'Recommended: name opponent strengths and injuries. Where: Game Plan. Consequence: missed protection or coverage repeats next game.',
      spotlightTarget: 'chip.route.game-plan.beat-2',
    },
  ],
  'game-day-recap': [
    {
      id: 'chip.route.game-day-recap.beat-1',
      pose: 'football-in-hand',
      text: 'Must Do: open score, injuries, weather, and press. Where: Game Day. Consequence: without them, Game Plan misses injuries or weather.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.game-day-recap.beat-2',
      pose: 'reviewing-tablet',
      text: 'Recommended: answer press, then fix injuries or play-call misses. Where: Roster, Game Plan. Consequence: misses repeat next week.',
      spotlightTarget: null,
    },
  ],
  'broadcast-suite': [
    {
      id: 'chip.route.broadcast-suite.beat-1',
      pose: 'reviewing-tablet',
      text: 'Optional: open Broadcast after games. Where: Broadcast. Consequence: score, injury, and turnover notes explain what must change.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.broadcast-suite.beat-2',
      pose: 'pointing-at-tape',
      text: 'Optional: name the drive, turnover, or missed stop. Where: Broadcast. Consequence: this explains results; it does not rerun them.',
      spotlightTarget: null,
    },
  ],
  'film-room': [
    {
      id: 'chip.route.film-room.beat-1',
      pose: 'pointing-at-tape',
      text: 'Recommended: name protection, coverage, run-defense, and play-call misses. Where: Film Room. Consequence: fix Game Plan or Depth Chart.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.film-room.beat-2',
      pose: 'reviewing-tablet',
      text: 'Recommended: fix each protection, coverage, or call miss. Where: Game Plan or Depth Chart. Consequence: Advance Week locks the plan.',
      spotlightTarget: null,
    },
  ],
  'super-bowl': [
    {
      id: 'chip.route.super-bowl.beat-1',
      pose: 'proud',
      text: 'Optional: open Super Bowl after playoff games finish. It records the champion; if games remain, Advance Week must resolve them first.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.super-bowl.beat-2',
      pose: 'football-in-hand',
      text: 'Optional: open champion history here. For moves, go to Roster, Contracts, Depth Chart, or Game Plan; this screen cannot fix them.',
      spotlightTarget: null,
    },
  ],
  'week-advance': [
    {
      id: 'chip.route.week-advance.beat-1',
      pose: 'reviewing-tablet',
      text: 'Must Do: run Advance Week last. Where: Advance screen. Consequence: standings, injuries, morale, deadlines, and opponent prep become final.',
      spotlightTarget: 'chip.route.week-advance.beat-1',
    },
    {
      id: 'chip.route.week-advance.beat-2',
      pose: 'time-out',
      text: 'Must Do: fix injuries, save starters, and answer offers first. Where: team screens. Consequence: lineup and morale lock.',
      spotlightTarget: 'chip.route.week-advance.beat-2',
    },
  ],
  schedule: [
    {
      id: 'chip.route.schedule.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: open Schedule before Advance Week. Where: Schedule. Consequence: byes, travel, weather, and flex games change rest or calls.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.schedule.beat-2',
      pose: 'thinking',
      text: 'Recommended: set rest and weather. Where: Schedule, Game Plan. Consequence: missed rest creates starter fatigue; weather shrinks calls.',
      spotlightTarget: null,
    },
  ],
  'watch-list': [
    {
      id: 'chip.route.watch-list.beat-1',
      pose: 'note-taking',
      text: 'Optional: pin possible targets here. Injuries still need Roster, Free Agency, Waivers, Trades, or Depth Chart before Advance Week.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.watch-list.beat-2',
      pose: 'reviewing-tablet',
      text: 'Optional: pin targets here. To act, go to Free Agency, Waivers, Trades, or Depth Chart before bids, claims, or roles close.',
      spotlightTarget: null,
    },
  ],
  inbox: [
    {
      id: 'chip.route.inbox.beat-1',
      pose: 'note-taking',
      text: 'Must Do: answer deadlines before Advance Week. Where: Inbox. Consequence: offers, promises, votes, and owner requests expire.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.inbox.beat-2',
      pose: 'thinking',
      text: 'Recommended: after Inbox, fix injuries or matchup calls. Where: Roster or Game Plan. Consequence: missed fixes lock at Advance Week.',
      spotlightTarget: null,
    },
  ],
  'owner-promises': [
    {
      id: 'chip.route.owner-promises.beat-1',
      pose: 'skeptical',
      text: 'Recommended: add promises after mandates. Where: Owner. Consequence: conflicting promises cut owner patience after losses.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.owner-promises.beat-2',
      pose: 'reviewing-tablet',
      text: 'Recommended: open active promises before adding another. Where: Owner. Consequence: missed commitments cut owner patience.',
      spotlightTarget: null,
    },
  ],
  staff: [
    {
      id: 'chip.route.staff.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: choose QB, line, coverage, and defender calls. Where: Staff. Consequence: overmatched calls waste prep.',
      spotlightTarget: 'chip.route.staff.beat-1',
    },
    {
      id: 'chip.route.staff.beat-2',
      pose: 'thinking',
      text: 'Must Do: fill coordinator jobs before Advance Week. Where: Staff. Consequence: open slots weaken prep and player growth.',
      spotlightTarget: 'chip.route.staff.beat-2',
    },
  ],
  'cap-laboratory': [
    {
      id: 'chip.route.cap-laboratory.beat-1',
      pose: 'skeptical',
      text: 'Recommended: preview restructures, void years, and backloads. Where: Cap Lab. Consequence: stacks create dead money or block extensions.',
      spotlightTarget: 'chip.route.cap-laboratory.beat-1',
    },
    {
      id: 'chip.route.cap-laboratory.beat-2',
      pose: 'reviewing-tablet',
      text: "Recommended: preview next year's cap before cuts. Where: Cap Lab. Consequence: dead money is cap space already spent.",
      spotlightTarget: 'chip.route.cap-laboratory.beat-2',
    },
  ],
  'front-office': [
    {
      id: 'chip.route.front-office.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: preview role, cap hit, and dead money. Where: Front Office. Consequence: needed cuts or restructures block fixes.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.front-office.beat-2',
      pose: 'note-taking',
      text: 'Must Do: preview contracts before Apply or Cut. Where: Front Office. Consequence: locked moves create dead money or release players.',
      spotlightTarget: null,
    },
  ],
  endorsements: [
    {
      id: 'chip.route.endorsements.beat-1',
      pose: 'on-phone',
      text: 'Optional: open sponsor offers before Accept. Where: Endorsements. Consequence: unmet requirements lose revenue or lock a goal.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.endorsements.beat-2',
      pose: 'note-taking',
      text: 'Recommended: name payout, player, and goal before Accept or Decline. Where: Endorsements. Consequence: unmet goals miss revenue.',
      spotlightTarget: null,
    },
  ],
  'draft-board': [
    {
      id: 'chip.route.draft-board.beat-1',
      pose: 'football-in-hand',
      text: 'Recommended: name starter or backup job, player role, and pick cost. Where: Draft Board. Consequence: picks miss the open job.',
      spotlightTarget: 'chip.route.draft-board.beat-1',
    },
    {
      id: 'chip.route.draft-board.beat-2',
      pose: 'calling-play',
      text: 'Recommended: mark targets before draft starts. Where: Draft Board. Consequence: draft clock forces reaches or extra-pick trades.',
      spotlightTarget: 'chip.route.draft-board.beat-2',
    },
  ],
  'draft-recap': [
    {
      id: 'chip.route.draft-recap.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: set roles for reaches and steals. Where: Draft Recap. Consequence: missed development wastes cheap contract years.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.draft-recap.beat-2',
      pose: 'note-taking',
      text: 'Recommended: open past classes before changing scouts. Where: Draft Recap. Consequence: no-pick classes cannot judge scouts.',
      spotlightTarget: null,
    },
  ],
  'trade-center': [
    {
      id: 'chip.route.trade-center.beat-1',
      pose: 'on-phone',
      text: 'Recommended: choose starter or backup job before calls. Where: Trades. Consequence: untargeted offers overpay for unused roles.',
      spotlightTarget: 'chip.route.trade-center.beat-1',
    },
    {
      id: 'chip.route.trade-center.beat-2',
      pose: 'reviewing-tablet',
      text: 'Must Do: preview cap, depth, and picks before accept or counter. Where: Trades. Consequence: pending offers expire.',
      spotlightTarget: 'chip.route.trade-center.beat-2',
    },
  ],
  'trade-market-radar': [
    {
      id: 'chip.route.trade-market-radar.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: choose seller, target role, and max price. Where: Trade Block. Consequence: early spending misses the open job.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.trade-market-radar.beat-2',
      pose: 'on-phone',
      text: 'Recommended: treat Trade Block as target list. Where: Trade Block, then Trades. Consequence: prices rise before offers are made.',
      spotlightTarget: null,
    },
  ],
  'market-planning': [
    {
      id: 'chip.route.market-planning.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: name roster job first. Where: Free Agency/Waivers/Practice Squad/Trades. Consequence: roleless moves spend cap or picks.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.market-planning.beat-2',
      pose: 'on-phone',
      text: 'Recommended: sign, bid, claim, or trade after role and cap limit. Where: FA/Waivers/Practice Squad/Trades. Consequence: job stays open.',
      spotlightTarget: null,
    },
  ],
  'roster-churn': [
    {
      id: 'chip.route.roster-churn.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: open Waivers before adding injury depth. Where: Waivers. Consequence: illegal claims fail or burn active spots.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.roster-churn.beat-2',
      pose: 'thinking',
      text: 'Must Do: open action row before claims, releases, or elevations. Where: Waivers or Practice Squad. Consequence: needed depth is lost.',
      spotlightTarget: null,
    },
  ],
  'scouting-board': [
    {
      id: 'chip.route.scouting-board.beat-1',
      pose: 'pointing-at-tape',
      text: 'Recommended: name starter role, medical limit, and coachability. Where: Scouting. Consequence: unknowns force reaches or overpays.',
      spotlightTarget: 'chip.route.scouting-board.beat-1',
    },
    {
      id: 'chip.route.scouting-board.beat-2',
      pose: 'note-taking',
      text: 'Recommended: add role, medical-limit, and coachability answers. Where: Scouting. Consequence: mismatches waste scout work.',
      spotlightTarget: 'chip.route.scouting-board.beat-2',
    },
  ],
  standings: [
    {
      id: 'chip.route.standings.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: open Standings before buy, sell, or hold. Where: Standings. Consequence: rushed deadline moves cost picks or playoffs.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.standings.beat-2',
      pose: 'skeptical',
      text: 'Recommended: decide deadline posture from record, division, and schedule. Where: Standings. Consequence: skipping them costs picks.',
      spotlightTarget: null,
    },
  ],
  'analytics-evidence': [
    {
      id: 'chip.route.analytics-evidence.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: open Analytics with Stat Central before benching starters; one odd box score benches a needed role player.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.analytics-evidence.beat-2',
      pose: 'thinking',
      text: 'Recommended: name repeated stat failures before changing starters; one odd box score benches a needed role player.',
      spotlightTarget: null,
    },
  ],
  'player-profile': [
    {
      id: 'chip.route.player-profile.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: open Player Profile before cuts, trades, or extensions; missed injury, role, or cost turns into dead money or lost depth.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.player-profile.beat-2',
      pose: 'point-side',
      text: 'Recommended: choose Contracts, Trades, or Depth Chart after injury, role, and cost notes; this profile changes nothing.',
      spotlightTarget: null,
    },
  ],
  'player-timeline': [
    {
      id: 'chip.route.player-timeline.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: open Timeline before extensions, trades, or role changes; repeated injuries make guaranteed money harder to justify.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.player-timeline.beat-2',
      pose: 'point-side',
      text: 'Optional: open Timeline before deals. Go to Player Profile, Contracts, or Depth Chart; history cannot change snaps or contracts.',
      spotlightTarget: null,
    },
  ],
  'player-development': [
    {
      id: 'chip.route.player-development.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: name age, development path, and assigned role before camp, mentor, or role changes; roleless reps waste growth weeks.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.player-development.beat-2',
      pose: 'thinking',
      text: 'Recommended: open Roster or Depth Chart after this page; development notes do not grow the player until you assign reps, camp, or mentors.',
      spotlightTarget: null,
    },
  ],
  'player-comparison': [
    {
      id: 'chip.route.player-comparison.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: name traits, production, cap hit, and assigned role before starter or extension calls; missed cap cost overpays.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.player-comparison.beat-2',
      pose: 'thinking',
      text: 'Recommended: choose starters from traits, production, cap hit, and stats; missed cap cost overpays or leaves a role uncovered.',
      spotlightTarget: null,
    },
  ],
  'player-rivalries': [
    {
      id: 'chip.route.player-rivalries.beat-1',
      pose: 'skeptical',
      text: 'Recommended: open rivalry history before rivalry games. Set Game Plan counters or Advance Week sends an unprotected matchup into the game.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.player-rivalries.beat-2',
      pose: 'reviewing-tablet',
      text: 'Recommended: set Game Plan from rivalry history before kickoff; missed rivalry notes leave an unprotected matchup exposed.',
      spotlightTarget: null,
    },
  ],
  'power-rankings': [
    {
      id: 'chip.route.power-rankings.beat-1',
      pose: 'skeptical',
      text: 'Optional: open public ranking after roster and Game Plan. Standings set playoffs; moves for rank alone cost picks or starters.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.power-rankings.beat-2',
      pose: 'reviewing-tablet',
      text: 'Recommended: name injuries, point margin, and schedule when record and public rank disagree; trades spend picks or cap.',
      spotlightTarget: null,
    },
  ],
  'league-pulse': [
    {
      id: 'chip.route.league-pulse.beat-1',
      pose: 'reviewing-tablet',
      text: 'Optional: after Roster and Game Plan are set, open League Pulse; rival injuries and standings deficits set buy, sell, or hold timing.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.league-pulse.beat-2',
      pose: 'reviewing-tablet',
      text: 'Optional: open league news before bids or Game Plan; missed trade, rival, or injury alerts leave a bid late or matchup exposed.',
      spotlightTarget: null,
    },
  ],
  'league-weather': [
    {
      id: 'chip.route.league-weather.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: open League Weather before pass depth and kick choices; wind and rain cause missed deep throws and failed long kicks.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.league-weather.beat-2',
      pose: 'thinking',
      text: 'Recommended: set run or short-pass calls before Advance Week when wind or rain hits; deep throws and long kicks lose value.',
      spotlightTarget: null,
    },
  ],
  'league-news': [
    {
      id: 'chip.route.league-news.beat-1',
      pose: 'reviewing-tablet',
      text: 'Optional: open News for injuries, trades, records, and rule changes; missed alerts leave bids, claims, or Game Plan late.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.league-news.beat-2',
      pose: 'note-taking',
      text: 'Optional: filter News before spending assets; missed injury, trade, rule, or record alerts spend before a job changes.',
      spotlightTarget: null,
    },
  ],
  newsroom: [
    {
      id: 'chip.route.newsroom.beat-1',
      pose: 'reviewing-tablet',
      text: 'Optional: after moves, open Newsroom reaction. Open Roster, Contracts, Cap Lab, Game Plan, or Locker Room before Advance Week.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.newsroom.beat-2',
      pose: 'thinking',
      text: 'Optional: open Newsroom after weekly moves for owner or fan reaction; fix roster, cap, or plan on those screens.',
      spotlightTarget: null,
    },
  ],
  'social-feed': [
    {
      id: 'chip.route.social-feed.beat-1',
      pose: 'coffee-sip',
      text: 'Optional: open MFSN after roster and Game Plan. If posts name injuries or morale drops, open Roster, Locker Room, or Medical.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.social-feed.beat-2',
      pose: 'thinking',
      text: 'Optional: after Roster and Game Plan, open MFSN fan reaction; injury or missed-call posts point back to those screens.',
      spotlightTarget: null,
    },
  ],
  'commissioner-governance': [
    {
      id: 'chip.route.commissioner-governance.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: choose the discipline, relocation, or rule petition before voting closes; missed petition leaves that ruling unchanged.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.commissioner-governance.beat-2',
      pose: 'note-taking',
      text: 'Recommended: open CBA for cap/labor votes and Commissioner for petitions; the other screen misses that deadline.',
      spotlightTarget: null,
    },
  ],
  cba: [
    {
      id: 'chip.route.cba.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: vote accept, reject, or abstain before the CBA deadline; delays stall cap, roster, or labor-rule changes.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.cba.beat-2',
      pose: 'skeptical',
      text: 'Recommended: open Commissioner for discipline, relocation, or petitions; CBA history does not create rulings or meet petition deadlines.',
      spotlightTarget: null,
    },
  ],
  'league-rules': [
    {
      id: 'chip.route.league-rules.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: open active cap, roster, trade, waiver, and practice-squad rules before moves; old rule numbers make claims or cuts illegal.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.league-rules.beat-2',
      pose: 'note-taking',
      text: 'Optional: open rule history after active rules are handled; cap, labor, or deadline changes need CBA or Commissioner.',
      spotlightTarget: null,
    },
  ],
  'scenario-constraints': [
    {
      id: 'chip.route.scenario-constraints.beat-1',
      pose: 'skeptical',
      text: 'Must Do: open active scenario rules before trades, free agency, waivers, or draft picks; disabled actions will not complete.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.scenario-constraints.beat-2',
      pose: 'note-taking',
      text: 'Must Do: open challenge badges before starting. Starting replaces the active dynasty, so export first for rollback.',
      spotlightTarget: null,
    },
  ],
  'record-book': [
    {
      id: 'chip.route.record-book.beat-1',
      pose: 'proud',
      text: 'Optional: open Records after roster, cap, depth, and Game Plan choices are saved; stats help price roles, deals, and trades.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.record-book.beat-2',
      pose: 'reviewing-tablet',
      text: 'Optional: open Records before role, deal, or trade choices; production sets price, but injuries, cap, depth, and calls need other screens.',
      spotlightTarget: null,
    },
  ],
  'awards-hub': [
    {
      id: 'chip.route.awards-hub.beat-1',
      pose: 'proud',
      text: 'Optional: open award race before role changes. Awards reflect season play; manual picks do not change standings, morale, or growth.',
      spotlightTarget: 'chip.route.awards-hub.beat-1',
    },
    {
      id: 'chip.route.awards-hub.beat-2',
      pose: 'reviewing-tablet',
      text: 'Optional: open past winners before extensions or role changes; awards support contract roles, not lineup, cap, or depth fixes.',
      spotlightTarget: 'chip.route.awards-hub.beat-2',
    },
  ],
  'franchise-legends': [
    {
      id: 'chip.route.franchise-legends.beat-1',
      pose: 'proud',
      text: "Optional: open Franchise Legends after injury, cap, depth, and Game Plan choices are saved; Hall goals do not repair this week's roster.",
      spotlightTarget: null,
    },
    {
      id: 'chip.route.franchise-legends.beat-2',
      pose: 'reviewing-tablet',
      text: 'Optional: open Legends after roster, cap, and Game Plan decisions; Hall goals do not change lineup, cap, or records.',
      spotlightTarget: null,
    },
  ],
  'season-recap': [
    {
      id: 'chip.route.season-recap.beat-1',
      pose: 'proud',
      text: 'Must Do: open Season Recap before the first bid. Name contracts, staff vacancies, and cap space; a rushed bid misses an extension.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.season-recap.beat-2',
      pose: 'reviewing-tablet',
      text: 'Optional: download/copy after recap. For offseason fixes, go to Contracts, Free Agency, Coaching, or Roster; sharing will not change them.',
      spotlightTarget: null,
    },
  ],
  'dynasty-save-load': [
    {
      id: 'chip.route.dynasty-save-load.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: export before a major trade, offseason, or import test. Without a backup, a failed import overwrites progress.',
      spotlightTarget: 'chip.route.dynasty-save-load.beat-1',
    },
    {
      id: 'chip.route.dynasty-save-load.beat-2',
      pose: 'reviewing-tablet',
      text: 'Recommended: make a local slot before replacing the current dynasty. Validate the file first or an old save takes over.',
      spotlightTarget: 'chip.route.dynasty-save-load.beat-2',
    },
  ],
  settings: [
    {
      id: 'chip.route.settings.beat-1',
      pose: 'reviewing-tablet',
      text: 'Recommended: set difficulty, autosave, halftime choices, and game pace before Advance Week; saved results are not rewritten.',
      spotlightTarget: 'chip.route.settings.beat-1',
    },
    {
      id: 'chip.route.settings.beat-2',
      pose: 'thinking',
      text: 'Recommended: set facility and medical choices before Advance Week; missed upgrades delay player growth or injury recovery.',
      spotlightTarget: 'chip.route.settings.beat-2',
    },
  ],
  'training-camp': [
    {
      id: 'chip.route.training-camp.beat-1',
      pose: 'whistle-blow',
      text: "Must Do: set open camp drills before Advance Week; missed camp actions lose this week's growth chance.",
      spotlightTarget: 'chip.route.training-camp.beat-1',
    },
    {
      id: 'chip.route.training-camp.beat-2',
      pose: 'coaching-crouch',
      text: 'Recommended: set training after facility, medical, mentor, and camp results; overloads or idle weeks cost growth or create injuries.',
      spotlightTarget: 'chip.route.training-camp.beat-2',
    },
  ],
  mentors: [
    {
      id: 'chip.route.mentors.beat-1',
      pose: 'proud',
      text: 'Recommended: choose mentor position, budget, and affected players before hiring; unmatched position spends budget without growth.',
      spotlightTarget: 'chip.route.mentors.beat-1',
    },
    {
      id: 'chip.route.mentors.beat-2',
      pose: 'note-taking',
      text: 'Must Do: preview players and budget before Hire or Release; unplanned moves cut a mentor assigned to a player or fund an unused position.',
      spotlightTarget: 'chip.route.mentors.beat-2',
    },
  ],
  'trade-deadline': [
    {
      id: 'chip.route.trade-deadline.beat-1',
      pose: 'on-phone',
      text: 'Must Do: decide buy, sell, or hold at the deadline before offers expire or get more expensive.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.trade-deadline.beat-2',
      pose: 'reviewing-tablet',
      text: 'Must Do: preview cap hit, depth loss, and pick cost before offers expire; waiting turns a fair deal into lost depth or extra picks.',
      spotlightTarget: null,
    },
  ],
  relocation: [
    {
      id: 'chip.route.relocation.beat-1',
      pose: 'reviewing-tablet',
      text: 'Must Do: preview eligibility, cost, market, and fan support before Move Franchise; relocation rewrites city, budget, and fan base.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.relocation.beat-2',
      pose: 'skeptical',
      text: 'Must Do: press Move Franchise after cost, support, and destination match your plan; it rewrites city, budget, and fan base.',
      spotlightTarget: null,
    },
  ],
  'expansion-draft': [
    {
      id: 'chip.route.expansion-draft.beat-1',
      pose: 'reviewing-tablet',
      text: 'Must Do: protect core starters before adding a luxury player; every unprotected backup is available to be taken.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.expansion-draft.beat-2',
      pose: 'note-taking',
      text: 'Must Do: protect the players you cannot replace before locking the list; every unprotected player is available to be taken.',
      spotlightTarget: null,
    },
  ],
} as const satisfies Record<RouteKey, readonly RouteBeat[]>;
