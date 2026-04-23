import type { GameState, Player } from '../../types';
import type { StorylineSeedCandidate, StorylineThread } from '../types';

const BEATS = [
  'rookie of the week',
  'power ranking spotlight',
  'mid-season ROY favorite',
  'closing argument',
] as const;

const THRESHOLD_BY_POSITION: Record<Player['pos'], number> = {
  QB: 110,
  RB: 90,
  WR: 85,
  TE: 75,
  OL: 50,
  DL: 60,
  LB: 60,
  CB: 55,
  S: 55,
  K: 45,
  P: 35,
};

function clampHeat(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function nextHint(beatIndex: number): string | null {
  const nextBeat = BEATS[Math.min(beatIndex + 1, BEATS.length - 1)];
  return nextBeat ? `Next beat: ${nextBeat}.` : null;
}

function seasonScore(player: Player): number {
  return (
    player.stats.passYds / 25
    + player.stats.passTD * 4
    - player.stats.passINT * 3
    + player.stats.rushYds / 10
    + player.stats.rushTD * 6
    + player.stats.recYds / 10
    + player.stats.recTD * 6
    + player.stats.tackles * 0.4
    + player.stats.sacks * 4
    + player.stats.defINT * 5
    + player.stats.fgMade * 3
  );
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

export function seedRookieOfYearThreads(state: GameState, weekNumber: number): StorylineSeedCandidate[] {
  if (weekNumber < 6) return [];

  return Object.values(state.players)
    .filter((player) => player.teamId && (player.yearsExp === 0 || player.draftYear === state.year))
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((player) => {
      const score = seasonScore(player);
      const threshold = THRESHOLD_BY_POSITION[player.pos];
      if (score < threshold) return [];

      return [{
        key: `rookie-of-year-chase|${state.year}|${player.id}`,
        title: `${player.name} has entered the ROY chase`,
        summary: `${player.name} is carrying a Rookie of the Year pace with a ${score.toFixed(1)} impact score through week ${weekNumber}.`,
        teamIds: player.teamId ? [player.teamId] : [],
        playerIds: [player.id],
        heat: clampHeat(45 + (score - threshold) / 3),
        nextBeatHint: nextHint(0),
        metadata: {
          playerId: player.id,
          playerName: player.name,
          score: Number(score.toFixed(1)),
          pos: player.pos,
        },
      }];
    });
}

export function evolveRookieOfYearThread(thread: StorylineThread, state: GameState, weekNumber: number): StorylineThread {
  const player = state.players[thread.playerIds[0] ?? ''];
  const score = player ? seasonScore(player) : Number(thread.metadata['score'] ?? 0);
  const nextIndex = Math.min(thread.beatIndex + 1, BEATS.length - 1);
  const label = BEATS[nextIndex] ?? BEATS.at(-1)!;
  const summary = nextIndex === 1
    ? `${player?.name ?? 'The rookie'} is now showing up in the league-wide power-ranking spotlight.`
    : nextIndex === 2
      ? `${player?.name ?? 'The rookie'} has become a real mid-season favorite in the ROY race.`
      : `${player?.name ?? 'The rookie'} is making a late closing argument with every box score.`;

  const advanced = appendBeat(thread, label, summary, state.year, weekNumber);
  return {
    ...advanced,
    beatIndex: nextIndex,
    heat: clampHeat(advanced.heat + 5),
    nextBeatHint: nextHint(nextIndex),
    metadata: {
      ...advanced.metadata,
      score: Number(score.toFixed(1)),
    },
  };
}

export function closeRookieOfYearThread(thread: StorylineThread, state: GameState): StorylineThread {
  if (thread.status === 'closed' || state.phase === 'regular_season') return thread;
  const playerName = String(thread.metadata['playerName'] ?? 'The rookie');
  const summary = `${playerName}'s Rookie of the Year case is now complete with the regular season in the books.`;
  const latest = thread.beats[thread.beats.length - 1];
  const beats = latest?.label === 'closing argument' && latest.summary === summary
    ? thread.beats
    : [...thread.beats, { label: 'closing argument', summary, year: state.year, weekNumber: state.week }];

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
