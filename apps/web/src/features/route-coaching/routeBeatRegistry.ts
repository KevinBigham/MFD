export const ROUTE_KEYS = [
  'roster',
  'staff',
  'cap-laboratory',
  'draft-board',
  'trade-center',
  'scouting-board',
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
} as const satisfies Record<RouteKey, readonly RouteBeat[]>;
