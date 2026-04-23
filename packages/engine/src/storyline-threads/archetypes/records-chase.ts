import type { GameState } from '../../types';
import type { RecordChase } from '../../types';
import type { StorylineSeedCandidate, StorylineThread } from '../types';

const BEATS = [
  'record projected',
  'gaining ground',
  'one game away',
  'record night',
] as const;

function clampHeat(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function nextHint(beatIndex: number): string | null {
  const nextBeat = BEATS[Math.min(beatIndex + 1, BEATS.length - 1)];
  return nextBeat ? `Next beat: ${nextBeat}.` : null;
}

function chaseKey(chase: RecordChase): string {
  return `${chase.playerId}|${chase.stat}|${chase.category}|${chase.teamId}`;
}

function matchingChase(state: GameState, thread: StorylineThread): RecordChase | undefined {
  return (state.activeRecordChases ?? []).find((chase) =>
    chase.playerId === thread.playerIds[0]
    && chase.stat === thread.metadata['stat']
    && chase.category === thread.metadata['category']);
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

export function seedRecordsChaseThreads(state: GameState, _weekNumber: number): StorylineSeedCandidate[] {
  return (state.activeRecordChases ?? [])
    .filter((chase) => ['franchise', 'singleSeason', 'career'].includes(chase.category) && chase.projected >= chase.recordValue)
    .sort((left, right) => chaseKey(left).localeCompare(chaseKey(right)))
    .map((chase) => ({
      key: `records-chase|${state.year}|${chaseKey(chase)}`,
      title: `${chase.playerName} is on record watch`,
      summary: `${chase.playerName} is pacing toward the ${chase.stat} record with ${chase.projected.toFixed(1)} projected against ${chase.recordValue}.`,
      teamIds: [chase.teamId],
      playerIds: [chase.playerId],
      heat: clampHeat(50 + (chase.currentValue / Math.max(1, chase.recordValue)) * 40),
      nextBeatHint: nextHint(0),
      metadata: {
        teamId: chase.teamId,
        playerName: chase.playerName,
        stat: chase.stat,
        category: chase.category,
        recordValue: chase.recordValue,
      },
    }));
}

export function evolveRecordsChaseThread(thread: StorylineThread, state: GameState, weekNumber: number): StorylineThread {
  const chase = matchingChase(state, thread);
  const playerName = String(thread.metadata['playerName'] ?? 'The player');
  const nextIndex = Math.min(thread.beatIndex + 1, BEATS.length - 1);
  const label = BEATS[nextIndex] ?? BEATS.at(-1)!;
  const gap = chase ? Math.max(0, chase.recordValue - chase.currentValue) : Number(thread.metadata['recordValue'] ?? 0);
  const summary = nextIndex === 1
    ? `${playerName} keeps closing the gap in the ${String(thread.metadata['stat'] ?? 'record')} chase.`
    : nextIndex === 2
      ? `${playerName} is now one big game from the record if the pace holds.`
      : `${playerName} is now threatening a record night.`;

  const advanced = appendBeat(thread, label, summary, state.year, weekNumber);
  return {
    ...advanced,
    beatIndex: nextIndex,
    heat: clampHeat(advanced.heat + (gap <= 1 ? 12 : 6)),
    nextBeatHint: nextHint(nextIndex),
  };
}

export function closeRecordsChaseThread(thread: StorylineThread, state: GameState): StorylineThread {
  if (thread.status === 'closed') return thread;
  const playerId = thread.playerIds[0];
  const stat = String(thread.metadata['stat'] ?? '');
  const broken = (state.recentBrokenRecords ?? []).some((record) => record.playerId === playerId && record.stat === stat);
  const chase = matchingChase(state, thread);
  let label: string | null = null;
  let summary: string | null = null;

  if (broken) {
    label = 'record night';
    summary = `${String(thread.metadata['playerName'] ?? 'The player')} finished the chase and broke the ${stat} record.`;
  } else if (!chase) {
    label = 'mathematically eliminated';
    summary = `${String(thread.metadata['playerName'] ?? 'The player')} fell off the required pace and the record chase is over.`;
  } else if (state.phase !== 'regular_season') {
    label = 'season ended';
    summary = `${String(thread.metadata['playerName'] ?? 'The player')} ran out of regular-season runway before the ${stat} record fell.`;
  }

  if (!label || !summary) return thread;

  const closed = appendBeat(thread, label, summary, state.year, state.week);
  return {
    ...closed,
    status: 'closed',
    closeReason: summary,
    nextBeatHint: null,
    heat: clampHeat(label === 'record night' ? closed.heat + 5 : closed.heat - 15),
  };
}
