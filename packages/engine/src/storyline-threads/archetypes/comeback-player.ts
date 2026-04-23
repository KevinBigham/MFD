import type { GameState, Player } from '../../types';
import type { StorylineSeedCandidate, StorylineThread } from '../types';

const BEATS = [
  'first game back',
  'midseason resurgence',
  'statement performance',
] as const;

function clampHeat(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function nextHint(beatIndex: number): string | null {
  const nextBeat = BEATS[Math.min(beatIndex + 1, BEATS.length - 1)];
  return nextBeat ? `Next beat: ${nextBeat}.` : null;
}

function averageGamesPerSeason(player: Player): number {
  return (player.careerStats.gp ?? 0) / Math.max(1, player.careerStats.seasons);
}

function comebackEligible(player: Player): boolean {
  const baseline = Number(player.careerStats.previousSeasonOvr ?? NaN);
  const seasonStart = Number(player.careerStats.seasonStartOvr ?? NaN);
  if (!Number.isFinite(baseline) || !Number.isFinite(seasonStart)) return false;

  const current = Math.max(player.ovr, seasonStart);
  const missedExtendedTime = averageGamesPerSeason(player) <= 12
    || player.injury?.severityTier === 'season_ending'
    || player.traits.includes('comeback_kid');

  return player.yearsExp >= 2 && missedExtendedTime && current >= baseline;
}

function appendBeat(thread: StorylineThread, label: string, summary: string, year: number, weekNumber: number): StorylineThread {
  const latest = thread.beats[thread.beats.length - 1];
  const beats = latest?.label === label && latest.summary === summary
    ? thread.beats
    : [...thread.beats, { label, summary, year, weekNumber }];
  return {
    ...thread,
    beats,
    summary,
    updatedYear: year,
    updatedWeek: weekNumber,
    weeksActive: Math.max(1, year === thread.startYear ? weekNumber - thread.startWeek + 1 : thread.weeksActive + 1),
  };
}

export function seedComebackPlayerThreads(state: GameState, _weekNumber: number): StorylineSeedCandidate[] {
  return Object.values(state.players)
    .filter((player) => player.teamId && comebackEligible(player))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((player) => ({
      key: `comeback-player|${state.year}|${player.id}`,
      title: `${player.name} is writing a comeback season`,
      summary: `${player.name} is matching or beating the pre-injury baseline and forcing a comeback narrative.`,
      teamIds: player.teamId ? [player.teamId] : [],
      playerIds: [player.id],
      heat: clampHeat(50 + Math.max(0, player.ovr - Number(player.careerStats.previousSeasonOvr ?? player.ovr)) * 5),
      nextBeatHint: nextHint(0),
      metadata: {
        playerId: player.id,
        playerName: player.name,
        baselineOvr: Number(player.careerStats.previousSeasonOvr ?? player.ovr),
      },
    }));
}

export function evolveComebackPlayerThread(thread: StorylineThread, state: GameState, weekNumber: number): StorylineThread {
  const player = state.players[thread.playerIds[0] ?? ''];
  const nextIndex = Math.min(thread.beatIndex + 1, BEATS.length - 1);
  const label = BEATS[nextIndex] ?? BEATS.at(-1)!;
  const summary = nextIndex === 1
    ? `${player?.name ?? 'The veteran'} is turning the comeback from a nice note into a midseason resurgence.`
    : `${player?.name ?? 'The veteran'} just delivered the statement performance that locks the comeback into focus.`;

  const advanced = appendBeat(thread, label, summary, state.year, weekNumber);
  return {
    ...advanced,
    beatIndex: nextIndex,
    heat: clampHeat(advanced.heat + 7),
    nextBeatHint: nextHint(nextIndex),
  };
}

export function closeComebackPlayerThread(thread: StorylineThread, state: GameState): StorylineThread {
  if (thread.status === 'closed' || state.phase === 'regular_season') return thread;
  const playerName = String(thread.metadata['playerName'] ?? 'The player');
  const summary = `${playerName}'s comeback chapter closes with the regular season complete.`;
  const latest = thread.beats[thread.beats.length - 1];
  const beats = latest?.label === 'statement performance' && latest.summary === summary
    ? thread.beats
    : [...thread.beats, { label: 'statement performance', summary, year: state.year, weekNumber: state.week }];

  return {
    ...thread,
    beats,
    summary,
    updatedYear: state.year,
    updatedWeek: state.week,
    status: 'closed',
    closeReason: summary,
    nextBeatHint: null,
    heat: clampHeat(thread.heat - 10),
  };
}
