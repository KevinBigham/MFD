import type { PrngFn } from '../rng';
import type { GameResult, WeatherCondition } from '../types';

export type NamedGameArchetype =
  | 'yard_miracle'
  | 'dagger'
  | 'comeback'
  | 'collapse'
  | 'heartbreaker'
  | 'ghost_game'
  | 'statement'
  | 'gauntlet_game'
  | 'snow_bowl'
  | 'shootout'
  | 'coin_flip'
  | 'rout';

export interface NamedGameEvent {
  name: string;
  archetype: NamedGameArchetype;
  gameId: string;
  year: number;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  winnerTeamId: string | null;
  homeScore: number;
  awayScore: number;
  reason: string;
}

export interface NamedGameContext {
  weather?: WeatherCondition | null;
  isPlayoff?: boolean;
  isRivalry?: boolean;
  primetime?: boolean;
  homeRank?: number | null;
  awayRank?: number | null;
  homeLeadStartQ4?: number;
  homeLargestLeadQ4?: number;
  winningPlayYards?: number | null;
  winningPlayClutch?: boolean;
  winningPlayType?: 'offense' | 'defense' | 'field_goal' | null;
  homeInjuries?: number;
  awayInjuries?: number;
}

const RANKED_RIVAL_CUTOFF = 12;

export const NAMED_GAME_PRIORITY: NamedGameArchetype[] = [
  'yard_miracle',
  'dagger',
  'comeback',
  'collapse',
  'heartbreaker',
  'ghost_game',
  'statement',
  'gauntlet_game',
  'snow_bowl',
  'shootout',
  'coin_flip',
  'rout',
];

function winnerTeamId(result: GameResult): string | null {
  if (result.homeScore === result.awayScore) return null;
  return result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
}

function loserTeamId(result: GameResult): string | null {
  const winner = winnerTeamId(result);
  if (!winner) return null;
  return winner === result.homeTeamId ? result.awayTeamId : result.homeTeamId;
}

function margin(result: GameResult): number {
  return Math.abs(result.homeScore - result.awayScore);
}

function totalPoints(result: GameResult): number {
  return result.homeScore + result.awayScore;
}

function didRoadTeamWin(result: GameResult): boolean {
  return winnerTeamId(result) === result.awayTeamId;
}

function opponentRankForWinner(result: GameResult, context: NamedGameContext): number | null {
  const winner = winnerTeamId(result);
  if (!winner) return null;
  return winner === result.homeTeamId ? (context.awayRank ?? null) : (context.homeRank ?? null);
}

function q4LeadForTeam(teamId: string, result: GameResult, context: NamedGameContext): number {
  const homeLead = context.homeLeadStartQ4 ?? 0;
  return teamId === result.homeTeamId ? homeLead : -homeLead;
}

function largestQ4LeadForTeam(teamId: string, result: GameResult, context: NamedGameContext): number {
  const homeLead = context.homeLargestLeadQ4 ?? context.homeLeadStartQ4 ?? 0;
  return teamId === result.homeTeamId ? homeLead : -homeLead;
}

function buildEvent(result: GameResult, archetype: NamedGameArchetype, name: string, reason: string): NamedGameEvent {
  return {
    name,
    archetype,
    gameId: result.id,
    year: result.year,
    week: result.week,
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    winnerTeamId: winnerTeamId(result),
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    reason,
  };
}

function detectYardMiracle(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  if (!context.winningPlayClutch || (context.winningPlayYards ?? 0) < 50 || margin(result) > 8) return null;
  return buildEvent(
    result,
    'yard_miracle',
    `The ${context.winningPlayYards}-Yard Miracle`,
    `The game swung on a clutch ${context.winningPlayYards}-yard scoring play.`,
  );
}

function detectDagger(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  if (!context.winningPlayClutch || context.winningPlayType !== 'defense' || margin(result) < 7) return null;
  return buildEvent(result, 'dagger', 'The Dagger', 'A late defensive score sealed the result.');
}

function detectComeback(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  const winner = winnerTeamId(result);
  if (!winner) return null;
  if (q4LeadForTeam(winner, result, context) > -14) return null;
  return buildEvent(result, 'comeback', 'The Comeback', 'Won after trailing by 14+ entering the fourth quarter.');
}

function detectCollapse(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  const loser = loserTeamId(result);
  if (!loser) return null;
  if (largestQ4LeadForTeam(loser, result, context) < 14) return null;
  return buildEvent(result, 'collapse', 'The Collapse', 'Lost after leading by 14+ entering the fourth quarter.');
}

function detectHeartbreaker(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  const loser = loserTeamId(result);
  if (!loser || margin(result) > 3) return null;
  if (largestQ4LeadForTeam(loser, result, context) < 10) return null;
  return buildEvent(result, 'heartbreaker', 'The Heartbreaker', 'Lost by a field goal or less after owning a double-digit fourth-quarter lead.');
}

function detectGhostGame(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  if (!didRoadTeamWin(result) || !context.primetime || margin(result) > 7) return null;
  if ((context.homeRank ?? 99) > 5) return null;
  return buildEvent(result, 'ghost_game', 'The Ghost Game', 'Road primetime win by one score or less over a top-five opponent.');
}

function detectStatement(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  if (!context.isRivalry || margin(result) < 21) return null;
  if ((opponentRankForWinner(result, context) ?? 99) > RANKED_RIVAL_CUTOFF) return null;
  return buildEvent(result, 'statement', 'The Statement', 'A ranked rival got run off the field.');
}

function detectGauntletGame(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  const winner = winnerTeamId(result);
  if (!winner) return null;
  const injuries = winner === result.homeTeamId ? (context.homeInjuries ?? 0) : (context.awayInjuries ?? 0);
  if (injuries < 4) return null;
  return buildEvent(result, 'gauntlet_game', 'The Gauntlet Game', `Won despite ${injuries} key injuries.`);
}

function detectSnowBowl(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  if ((context.weather ?? result.weather ?? null) !== 'snow' || totalPoints(result) > 24) return null;
  return buildEvent(result, 'snow_bowl', 'The Snow Bowl', 'Snow and a low-scoring grind turned the game into trench warfare.');
}

function detectShootout(result: GameResult): NamedGameEvent | null {
  if (totalPoints(result) < 70) return null;
  return buildEvent(result, 'shootout', 'The Shootout', 'Both offenses broke the scoreboard.');
}

function detectCoinFlip(result: GameResult, context: NamedGameContext): NamedGameEvent | null {
  if (margin(result) > 8 || !context.winningPlayClutch) return null;
  return buildEvent(result, 'coin_flip', 'The Coin Flip', 'One late score decided a one-possession finish.');
}

function detectRout(result: GameResult): NamedGameEvent | null {
  if (margin(result) < 35) return null;
  return buildEvent(result, 'rout', 'The Rout', 'A 35-point margin turned the game into a runaway.');
}

const DETECTORS: Record<NamedGameArchetype, (result: GameResult, context: NamedGameContext) => NamedGameEvent | null> = {
  yard_miracle: detectYardMiracle,
  dagger: detectDagger,
  comeback: detectComeback,
  collapse: detectCollapse,
  heartbreaker: detectHeartbreaker,
  ghost_game: detectGhostGame,
  statement: detectStatement,
  gauntlet_game: detectGauntletGame,
  snow_bowl: detectSnowBowl,
  shootout: (result) => detectShootout(result),
  coin_flip: detectCoinFlip,
  rout: (result) => detectRout(result),
};

export function detectNamedGame(result: GameResult, context: NamedGameContext = {}): NamedGameEvent | null {
  const enrichedContext: NamedGameContext = {
    weather: context.weather ?? result.weather ?? null,
    ...context,
  };

  for (const archetype of NAMED_GAME_PRIORITY) {
    const candidate = DETECTORS[archetype](result, enrichedContext);
    if (candidate) return candidate;
  }

  return null;
}

export function checkForNamedGame(
  _rng: PrngFn,
  result: GameResult,
  isPlayoff: boolean,
  isRivalry: boolean,
): NamedGameEvent | null {
  return detectNamedGame(result, {
    isPlayoff,
    isRivalry,
    weather: result.weather ?? null,
    primetime: result.primetime ?? false,
  });
}

export function formatNamedGame(game: NamedGameEvent): string {
  return `"${game.name}" — Week ${game.week}, Year ${game.year} (${game.homeScore}-${game.awayScore})`;
}
