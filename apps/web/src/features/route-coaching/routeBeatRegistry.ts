export const ROUTE_KEYS = [
  'monday-briefing',
  'roster',
  'depth-chart',
  'game-plan',
  'week-advance',
  'inbox',
  'staff',
  'cap-laboratory',
  'draft-board',
  'trade-center',
  'scouting-board',
  'standings',
  'power-rankings',
  'league-pulse',
  'record-book',
  'settings-save-load',
  'training-camp',
  'trade-deadline',
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
      text: 'Start here every week. The briefing tells you what changed and which decision needs your desk first.',
      spotlightTarget: 'chip.route.monday-briefing.beat-1',
    },
    {
      id: 'chip.route.monday-briefing.beat-2',
      pose: 'calling-play',
      text: 'If nothing is urgent, use the briefing to choose roster, plan, or advance. Do not wander the building.',
      spotlightTarget: 'chip.route.monday-briefing.beat-2',
    },
  ],
  roster: [
    {
      id: 'chip.route.roster.beat-1',
      pose: 'point-side',
      text: 'Start with the highlighted player. Decide who earns snaps before you chase new names.',
      spotlightTarget: 'chip.route.roster.beat-1',
    },
    {
      id: 'chip.route.roster.beat-2',
      pose: 'thinking',
      text: 'Use contract and morale clues together. Cheap depth matters when injuries start stacking.',
      spotlightTarget: 'chip.route.roster.beat-2',
    },
  ],
  'depth-chart': [
    {
      id: 'chip.route.depth-chart.beat-1',
      pose: 'point-side',
      text: 'This is the real Sunday lineup. Check starters and first backups before you trust the roster screen.',
      spotlightTarget: 'chip.route.depth-chart.beat-1',
    },
    {
      id: 'chip.route.depth-chart.beat-2',
      pose: 'thinking',
      text: 'Injuries make backup order matter. Fix the thin room before the game plan asks too much of it.',
      spotlightTarget: 'chip.route.depth-chart.beat-2',
    },
  ],
  'game-plan': [
    {
      id: 'chip.route.game-plan.beat-1',
      pose: 'calling-play',
      text: 'Set a plan your roster can execute. A perfect counter is useless if your players cannot carry it.',
      spotlightTarget: 'chip.route.game-plan.beat-1',
    },
    {
      id: 'chip.route.game-plan.beat-2',
      pose: 'reviewing-tablet',
      text: 'Use opponent shape and injury context together. The weekly bet should have a football reason.',
      spotlightTarget: 'chip.route.game-plan.beat-2',
    },
  ],
  'week-advance': [
    {
      id: 'chip.route.week-advance.beat-1',
      pose: 'reviewing-tablet',
      text: 'This screen turns choices into consequences. Read the checklist before you advance.',
      spotlightTarget: 'chip.route.week-advance.beat-1',
    },
    {
      id: 'chip.route.week-advance.beat-2',
      pose: 'time-out',
      text: 'Red items are not flavor. Fix them or accept the risk before the league moves forward.',
      spotlightTarget: 'chip.route.week-advance.beat-2',
    },
  ],
  inbox: [
    {
      id: 'chip.route.inbox.beat-1',
      pose: 'note-taking',
      text: 'Treat Inbox like the owner decision desk. Clear yes, no, or later prompts before the week moves.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.inbox.beat-2',
      pose: 'thinking',
      text: 'If the board is quiet, that is permission to get back to roster, plan, and advance.',
      spotlightTarget: null,
    },
  ],
  staff: [
    {
      id: 'chip.route.staff.beat-1',
      pose: 'reviewing-tablet',
      text: 'Check your coordinator fit first. Scheme drift costs you more than a small ratings gap.',
      spotlightTarget: 'chip.route.staff.beat-1',
    },
    {
      id: 'chip.route.staff.beat-2',
      pose: 'thinking',
      text: 'Open staff slots are decisions, not decoration. Fill the room before the next week turns.',
      spotlightTarget: 'chip.route.staff.beat-2',
    },
  ],
  'cap-laboratory': [
    {
      id: 'chip.route.cap-laboratory.beat-1',
      pose: 'skeptical',
      text: 'Build the move in the sandbox first. The real ledger should never be your scratch pad.',
      spotlightTarget: 'chip.route.cap-laboratory.beat-1',
    },
    {
      id: 'chip.route.cap-laboratory.beat-2',
      pose: 'reviewing-tablet',
      text: 'Watch dead money and future cap together. Winning this year still has a bill next spring.',
      spotlightTarget: 'chip.route.cap-laboratory.beat-2',
    },
  ],
  'draft-board': [
    {
      id: 'chip.route.draft-board.beat-1',
      pose: 'football-in-hand',
      text: 'Sort the board before you trade up. Need, grade, and pick cost all have to agree.',
      spotlightTarget: 'chip.route.draft-board.beat-1',
    },
    {
      id: 'chip.route.draft-board.beat-2',
      pose: 'calling-play',
      text: 'Save your favorite targets now. Draft night rewards a board you already trust.',
      spotlightTarget: 'chip.route.draft-board.beat-2',
    },
  ],
  'trade-center': [
    {
      id: 'chip.route.trade-center.beat-1',
      pose: 'on-phone',
      text: 'Start with your side of the offer. If you do not know the pain point, the market will price it for you.',
      spotlightTarget: 'chip.route.trade-center.beat-1',
    },
    {
      id: 'chip.route.trade-center.beat-2',
      pose: 'reviewing-tablet',
      text: 'Pending offers need a yes or no. Silence burns leverage after the league moves on.',
      spotlightTarget: 'chip.route.trade-center.beat-2',
    },
  ],
  'scouting-board': [
    {
      id: 'chip.route.scouting-board.beat-1',
      pose: 'pointing-at-tape',
      text: 'Spend scouting actions where uncertainty is highest. Do not pay to confirm what you already know.',
      spotlightTarget: 'chip.route.scouting-board.beat-1',
    },
    {
      id: 'chip.route.scouting-board.beat-2',
      pose: 'note-taking',
      text: 'Watchlist the player before the grade moves. A marked board is easier to defend later.',
      spotlightTarget: 'chip.route.scouting-board.beat-2',
    },
  ],
  standings: [
    {
      id: 'chip.route.standings.beat-1',
      pose: 'reviewing-tablet',
      text: 'Use standings after a result, not before Week 1. Division math changes buy, sell, or hold.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.standings.beat-2',
      pose: 'skeptical',
      text: 'Near the deadline, one game back and buried at 2-6 are different jobs.',
      spotlightTarget: null,
    },
  ],
  'power-rankings': [
    {
      id: 'chip.route.power-rankings.beat-1',
      pose: 'skeptical',
      text: 'Rankings are league temperature, not marching orders. Read reputation after weekly work is clean.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.power-rankings.beat-2',
      pose: 'reviewing-tablet',
      text: 'If record and ranking disagree, check injuries, point margin, and schedule before reacting.',
      spotlightTarget: null,
    },
  ],
  'league-pulse': [
    {
      id: 'chip.route.league-pulse.beat-1',
      pose: 'coffee-sip',
      text: 'League Pulse is outside noise with football value. Read it after your own fires are contained.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.league-pulse.beat-2',
      pose: 'reviewing-tablet',
      text: 'News can flag market windows, rival pressure, and injury runs without becoming your weekly checklist.',
      spotlightTarget: null,
    },
  ],
  'record-book': [
    {
      id: 'chip.route.record-book.beat-1',
      pose: 'proud',
      text: 'Records and legacy systems are season memory. Visit them once the save has history worth protecting.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.record-book.beat-2',
      pose: 'reviewing-tablet',
      text: "Use legacy context for long-term decisions, not as a distraction from this week's lineup.",
      spotlightTarget: null,
    },
  ],
  'settings-save-load': [
    {
      id: 'chip.route.settings-save-load.beat-1',
      pose: 'coffee-sip',
      text: 'Save/Load is franchise insurance. Export a cartridge before big experiments or machine changes.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.settings-save-load.beat-2',
      pose: 'reviewing-tablet',
      text: 'Settings tunes pace, audio, and Chip guidance without changing the football engine.',
      spotlightTarget: null,
    },
  ],
  'training-camp': [
    {
      id: 'chip.route.training-camp.beat-1',
      pose: 'whistle-blow',
      text: 'Training camp is reps with a bill. Start with the position group that can actually change this week.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.training-camp.beat-2',
      pose: 'coaching-crouch',
      text: 'Use drills to solve one weakness. A little progress beats a scrapbook of almost-fixes.',
      spotlightTarget: null,
    },
  ],
  'trade-deadline': [
    {
      id: 'chip.route.trade-deadline.beat-1',
      pose: 'on-phone',
      text: 'Deadline desk is live. Prices move while you stare at them, so pick buy, sell, or hold.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.trade-deadline.beat-2',
      pose: 'reviewing-tablet',
      text: 'Pending offers need math before emotion. Check cap, depth, and pick value before the clock runs out.',
      spotlightTarget: null,
    },
  ],
  'expansion-draft': [
    {
      id: 'chip.route.expansion-draft.beat-1',
      pose: 'reviewing-tablet',
      text: 'Expansion draft is roster triage under lights. Protect the spine before chasing a luxury piece.',
      spotlightTarget: null,
    },
    {
      id: 'chip.route.expansion-draft.beat-2',
      pose: 'note-taking',
      text: 'Write the loss you can live with. The board will take somebody; make it the right somebody.',
      spotlightTarget: null,
    },
  ],
} as const satisfies Record<RouteKey, readonly RouteBeat[]>;
