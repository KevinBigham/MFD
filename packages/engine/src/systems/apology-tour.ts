import type {
  ApologyTourBeatKey,
  ApologyTourThread,
  GameResult,
  GameState,
} from '../types';
import type { NamedGameArchetype } from './named-games';

const APOLOGY_ARCHETYPES = new Set<NamedGameArchetype>(['collapse', 'heartbreaker']);
type ApologyTourArchetype = ApologyTourThread['archetype'];

const BEAT_OFFSETS: ReadonlyArray<[ApologyTourBeatKey, number]> = [
  ['fan_letter', 1],
  ['beat_column', 2],
  ['owner_email', 3],
];

interface SyncApologyTourThreadsParams {
  teamId: string;
  opponentTeamId: string;
  result: GameResult;
  currentYear: number;
  currentWeek: number;
}

function resultInvolvesTeam(result: GameResult, teamId: string): boolean {
  return result.homeTeamId === teamId || result.awayTeamId === teamId;
}

function teamScore(result: GameResult, teamId: string): number | null {
  if (result.homeTeamId === teamId) return result.homeScore;
  if (result.awayTeamId === teamId) return result.awayScore;
  return null;
}

function opponentScore(result: GameResult, teamId: string): number | null {
  if (result.homeTeamId === teamId) return result.awayScore;
  if (result.awayTeamId === teamId) return result.homeScore;
  return null;
}

function didTeamWin(result: GameResult, teamId: string): boolean {
  const own = teamScore(result, teamId);
  const opp = opponentScore(result, teamId);
  return own !== null && opp !== null && own > opp;
}

function didTeamLose(result: GameResult, teamId: string): boolean {
  const own = teamScore(result, teamId);
  const opp = opponentScore(result, teamId);
  return own !== null && opp !== null && own < opp;
}

function isApologyTourArchetype(archetype: NamedGameArchetype): archetype is ApologyTourArchetype {
  return archetype === 'collapse' || archetype === 'heartbreaker';
}

function weekDelta(thread: ApologyTourThread, currentYear: number, currentWeek: number): number {
  return (currentYear - thread.startedYear) * 22 + (currentWeek - thread.startedWeek);
}

function isAfterSourceGame(thread: ApologyTourThread, result: GameResult): boolean {
  if (result.id === thread.gameId) return false;
  if (result.year > thread.startedYear) return true;
  return result.year === thread.startedYear && result.week > thread.startedWeek;
}

function addBeat(thread: ApologyTourThread, beat: ApologyTourBeatKey): void {
  if (!thread.beatsDelivered.includes(beat)) {
    thread.beatsDelivered = [...thread.beatsDelivered, beat];
  }
}

function deliverScheduledBeats(thread: ApologyTourThread, currentYear: number, currentWeek: number): void {
  if (thread.status !== 'active') return;
  const elapsed = weekDelta(thread, currentYear, currentWeek);
  for (const [beat, offset] of BEAT_OFFSETS) {
    if (elapsed >= offset) addBeat(thread, beat);
  }
}

function maybeResolveThread(thread: ApologyTourThread, params: SyncApologyTourThreadsParams): void {
  if (thread.status !== 'active') return;
  if (!thread.beatsDelivered.includes('owner_email')) return;
  if (!resultInvolvesTeam(params.result, thread.teamId)) return;
  if (!isAfterSourceGame(thread, params.result)) return;

  if (didTeamWin(params.result, thread.teamId)) {
    thread.status = 'resolved';
    addBeat(thread, 'resolution');
  } else if (didTeamLose(params.result, thread.teamId)) {
    thread.status = 'escalated';
    addBeat(thread, 'resolution');
  }
}

function shouldStartThread(game: GameState, params: SyncApologyTourThreadsParams): boolean {
  const namedGame = params.result.namedGame;
  if (!namedGame || !APOLOGY_ARCHETYPES.has(namedGame.archetype)) return false;
  if (!resultInvolvesTeam(params.result, params.teamId)) return false;
  if (!didTeamLose(params.result, params.teamId)) return false;
  return !game.apologyTourThreads.some((thread) => thread.gameId === params.result.id);
}

function createThread(params: SyncApologyTourThreadsParams): ApologyTourThread {
  const namedGame = params.result.namedGame;
  if (!namedGame || !isApologyTourArchetype(namedGame.archetype)) {
    throw new Error('Cannot create Apology Tour thread without an eligible named game.');
  }

  return {
    id: `apology-${params.result.year}-${params.result.week}-${params.result.id}`,
    gameId: params.result.id,
    teamId: params.teamId,
    opponentTeamId: params.opponentTeamId,
    namedGameName: namedGame.name,
    archetype: namedGame.archetype,
    startedYear: params.result.year,
    startedWeek: params.result.week,
    status: 'active',
    beatsDelivered: [],
  };
}

export function syncApologyTourThreads(game: GameState, params: SyncApologyTourThreadsParams): ApologyTourThread[] {
  game.apologyTourThreads ??= [];

  for (const thread of game.apologyTourThreads) {
    deliverScheduledBeats(thread, params.currentYear, params.currentWeek);
    maybeResolveThread(thread, params);
  }

  if (shouldStartThread(game, params)) {
    const thread = createThread(params);
    deliverScheduledBeats(thread, params.currentYear, params.currentWeek);
    game.apologyTourThreads = [...game.apologyTourThreads, thread];
  }

  return game.apologyTourThreads;
}
