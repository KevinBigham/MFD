export const ROUTE_KEYS = [
  'briefing',
  'roster',
  'depth-chart',
  'staff',
  'game-plan',
  'week-advance',
  'inbox',
  'contracts',
  'cap-laboratory',
  'trade-center',
  'draft-board',
  'scouting-board',
  'league-pulse',
  'standings',
  'film-room',
  'settings',
] as const;

export type RouteKey = (typeof ROUTE_KEYS)[number];

export const CHIP_ROUTE_POSES = [
  'idle',
  'point-down',
  'point-side',
  'cheer',
  'thinking',
] as const;

export type ChipRoutePose = (typeof CHIP_ROUTE_POSES)[number];

export interface RouteBeat {
  id: string;
  pose: ChipRoutePose;
  text: string;
  spotlightTarget: string | null;
}

export const ROUTE_BEAT_REGISTRY = {
  briefing: [
    {
      id: 'chip.route.briefing.beat-1',
      pose: 'point-side',
      text: 'Start here each week. The briefing tells you what changed, what can hurt you, and which decision is most urgent.',
      spotlightTarget: 'chip.route.briefing.beat-1',
    },
    {
      id: 'chip.route.briefing.beat-2',
      pose: 'thinking',
      text: 'Do not chase every tab at once. Read the board, pick the top problem, then move to roster, plan, or inbox.',
      spotlightTarget: 'chip.route.briefing.beat-2',
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
      pose: 'point-down',
      text: 'Depth chart is Sunday reality. Starters matter, but the first backup decides the week when injuries hit.',
      spotlightTarget: 'chip.route.depth-chart.beat-1',
    },
    {
      id: 'chip.route.depth-chart.beat-2',
      pose: 'thinking',
      text: 'If a starter is hurt, fix the snaps before you fix the scheme. The plan only works with the bodies available.',
      spotlightTarget: 'chip.route.depth-chart.beat-2',
    },
  ],
  staff: [
    {
      id: 'chip.route.staff.beat-1',
      pose: 'point-side',
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
  'game-plan': [
    {
      id: 'chip.route.game-plan.beat-1',
      pose: 'point-side',
      text: 'A game plan is a bet. Attack their weakness, but make sure your roster can survive the tradeoff.',
      spotlightTarget: 'chip.route.game-plan.beat-1',
    },
    {
      id: 'chip.route.game-plan.beat-2',
      pose: 'thinking',
      text: 'If the matchup looks close, do not overcorrect. Clean rules beat a clever plan your roster cannot execute.',
      spotlightTarget: 'chip.route.game-plan.beat-2',
    },
  ],
  'week-advance': [
    {
      id: 'chip.route.week-advance.beat-1',
      pose: 'point-down',
      text: 'Before you advance, check three doors: depth chart, game plan, and urgent inbox. Clean those, then let it breathe.',
      spotlightTarget: 'chip.route.week-advance.beat-1',
    },
    {
      id: 'chip.route.week-advance.beat-2',
      pose: 'idle',
      text: 'Advance is where guesses become evidence. After the sim, read what changed before making the next move.',
      spotlightTarget: 'chip.route.week-advance.beat-2',
    },
  ],
  inbox: [
    {
      id: 'chip.route.inbox.beat-1',
      pose: 'point-side',
      text: 'Inbox items are not flavor when they are urgent. Handle the decision that can change morale, cap, or owner trust.',
      spotlightTarget: 'chip.route.inbox.beat-1',
    },
    {
      id: 'chip.route.inbox.beat-2',
      pose: 'thinking',
      text: 'If it can wait, let it wait. If it changes the room this week, answer before the advance button does it for you.',
      spotlightTarget: 'chip.route.inbox.beat-2',
    },
  ],
  contracts: [
    {
      id: 'chip.route.contracts.beat-1',
      pose: 'point-side',
      text: 'Contracts are roster decisions with a calendar attached. Look at cap hit, dead money, and the year the bill lands.',
      spotlightTarget: 'chip.route.contracts.beat-1',
    },
    {
      id: 'chip.route.contracts.beat-2',
      pose: 'thinking',
      text: 'Restructure creates room today by borrowing from tomorrow. Smart if your window is real, dangerous if it is imagined.',
      spotlightTarget: 'chip.route.contracts.beat-2',
    },
  ],
  'cap-laboratory': [
    {
      id: 'chip.route.cap-laboratory.beat-1',
      pose: 'point-down',
      text: 'Build the move in the sandbox first. The real ledger should never be your scratch pad.',
      spotlightTarget: 'chip.route.cap-laboratory.beat-1',
    },
    {
      id: 'chip.route.cap-laboratory.beat-2',
      pose: 'thinking',
      text: 'Watch dead money and future cap together. Winning this year still has a bill next spring.',
      spotlightTarget: 'chip.route.cap-laboratory.beat-2',
    },
  ],
  'trade-center': [
    {
      id: 'chip.route.trade-center.beat-1',
      pose: 'point-side',
      text: 'Start with your side of the offer. If you do not know the pain point, the market will price it for you.',
      spotlightTarget: 'chip.route.trade-center.beat-1',
    },
    {
      id: 'chip.route.trade-center.beat-2',
      pose: 'thinking',
      text: 'Pending offers need a yes or no. Silence burns leverage after the league moves on.',
      spotlightTarget: 'chip.route.trade-center.beat-2',
    },
  ],
  'draft-board': [
    {
      id: 'chip.route.draft-board.beat-1',
      pose: 'point-side',
      text: 'Sort the board before you trade up. Need, grade, and pick cost all have to agree.',
      spotlightTarget: 'chip.route.draft-board.beat-1',
    },
    {
      id: 'chip.route.draft-board.beat-2',
      pose: 'cheer',
      text: 'Save your favorite targets now. Draft night rewards a board you already trust.',
      spotlightTarget: 'chip.route.draft-board.beat-2',
    },
  ],
  'scouting-board': [
    {
      id: 'chip.route.scouting-board.beat-1',
      pose: 'point-down',
      text: 'Spend scouting actions where uncertainty is highest. Do not pay to confirm what you already know.',
      spotlightTarget: 'chip.route.scouting-board.beat-1',
    },
    {
      id: 'chip.route.scouting-board.beat-2',
      pose: 'idle',
      text: 'Watchlist the player before the grade moves. A marked board is easier to defend later.',
      spotlightTarget: 'chip.route.scouting-board.beat-2',
    },
  ],
  'league-pulse': [
    {
      id: 'chip.route.league-pulse.beat-1',
      pose: 'idle',
      text: 'League pulse shows the weather around your decisions. Rivals, noise, and momentum explain why the room feels different.',
      spotlightTarget: 'chip.route.league-pulse.beat-1',
    },
    {
      id: 'chip.route.league-pulse.beat-2',
      pose: 'thinking',
      text: 'Use league news after results, not before every click. It is context for the next smart football decision.',
      spotlightTarget: 'chip.route.league-pulse.beat-2',
    },
  ],
  standings: [
    {
      id: 'chip.route.standings.beat-1',
      pose: 'point-side',
      text: 'Standings turn a loss into math. Check division rank, tiebreakers, and whether patience is still affordable.',
      spotlightTarget: 'chip.route.standings.beat-1',
    },
    {
      id: 'chip.route.standings.beat-2',
      pose: 'thinking',
      text: 'A 2-4 team with health is different from a 2-4 team with cap trouble. Read the table with the roster beside it.',
      spotlightTarget: 'chip.route.standings.beat-2',
    },
  ],
  'film-room': [
    {
      id: 'chip.route.film-room.beat-1',
      pose: 'point-down',
      text: 'Film room is where the scoreboard becomes coaching. Find whether the loss came from plan, personnel, or variance.',
      spotlightTarget: 'chip.route.film-room.beat-1',
    },
    {
      id: 'chip.route.film-room.beat-2',
      pose: 'idle',
      text: 'Do not rewrite the franchise after one ugly tape. Fix the repeatable problem first.',
      spotlightTarget: 'chip.route.film-room.beat-2',
    },
  ],
  settings: [
    {
      id: 'chip.route.settings.beat-1',
      pose: 'point-side',
      text: 'Settings is where you control guidance, sound, and save habits. Long dynasties deserve clean backups.',
      spotlightTarget: 'chip.route.settings.beat-1',
    },
    {
      id: 'chip.route.settings.beat-2',
      pose: 'idle',
      text: 'If Chip gets loud, reduce guidance or snooze him. The goal is a cleaner week, not another task.',
      spotlightTarget: 'chip.route.settings.beat-2',
    },
  ],
} as const satisfies Record<RouteKey, readonly RouteBeat[]>;
