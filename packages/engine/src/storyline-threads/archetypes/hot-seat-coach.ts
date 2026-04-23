import type { GameState } from '../../types';
import type { StorylineSeedCandidate, StorylineThread } from '../types';

const BEATS = [
  'reported pressure',
  'GM meeting',
  'bye-week ultimatum',
  'win-or-fired game',
  'fired OR extension',
] as const;

function clampHeat(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function nextHint(beatIndex: number): string | null {
  const nextBeat = BEATS[Math.min(beatIndex + 1, BEATS.length - 1)];
  return nextBeat ? `Next beat: ${nextBeat}.` : null;
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

export function seedHotSeatCoachThreads(state: GameState, _weekNumber: number): StorylineSeedCandidate[] {
  return Object.values(state.teams)
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((team) => {
      const coach = team.coachingStaff?.hc;
      if (!coach || coach.tenure < 3 || team.streak > -3) return [];
      const coachName = `${coach.firstName} ${coach.lastName}`;

      return [{
        key: `hot-seat-coach|${state.year}|${team.id}|${coach.id}`,
        title: `${coachName} is on the hot seat`,
        summary: `${coachName} has dropped ${Math.abs(team.streak)} straight and the pressure around ${team.city} is now public.`,
        teamIds: [team.id],
        playerIds: [],
        heat: clampHeat(55 + Math.abs(team.streak) * 10),
        nextBeatHint: nextHint(0),
        metadata: {
          teamId: team.id,
          coachId: coach.id,
          coachName,
        },
      }];
    });
}

export function evolveHotSeatCoachThread(thread: StorylineThread, state: GameState, weekNumber: number): StorylineThread {
  const team = state.teams[thread.teamIds[0] ?? ''];
  const coachName = String(thread.metadata['coachName'] ?? thread.title);
  const nextIndex = Math.min(thread.beatIndex + 1, BEATS.length - 1);
  const label = BEATS[nextIndex] ?? BEATS.at(-1)!;
  const summary = nextIndex === 1
    ? `${coachName} is meeting with the front office while ${team?.city ?? 'the club'} tries to stop the slide.`
    : nextIndex === 2
      ? `${coachName} is staring at a make-or-break stretch with patience running thin.`
      : nextIndex === 3
        ? `${coachName} is coaching a clear win-or-fired game with every postgame answer under a microscope.`
        : `${coachName}'s future is finally reaching a decision point.`;

  const heat = clampHeat((team?.streak ?? 0) <= -1 ? thread.heat + 8 : thread.heat - 6);
  return {
    ...appendBeat(thread, label, summary, state.year, weekNumber),
    beatIndex: nextIndex,
    heat,
    nextBeatHint: nextHint(nextIndex),
  };
}

export function closeHotSeatCoachThread(thread: StorylineThread, state: GameState): StorylineThread {
  if (thread.status === 'closed') return thread;
  const team = state.teams[thread.teamIds[0] ?? ''];
  const coachId = String(thread.metadata['coachId'] ?? '');
  const currentCoach = team?.coachingStaff?.hc;
  let label: string | null = null;
  let summary: string | null = null;

  if (!currentCoach || currentCoach.id !== coachId) {
    label = 'fired OR extension';
    summary = `${String(thread.metadata['coachName'] ?? 'The coach')} is out, and the hot-seat saga is over.`;
  } else if ((team?.wins ?? 0) > (team?.losses ?? 0) && (team?.streak ?? 0) >= 2) {
    label = 'fired OR extension';
    summary = `${String(thread.metadata['coachName'] ?? 'The coach')} stabilized the season long enough to earn an extension narrative.`;
  } else if (state.phase !== 'regular_season') {
    label = 'season closes without a verdict';
    summary = `${String(thread.metadata['coachName'] ?? 'The coach')} survived the season, but the story closed without a public verdict.`;
  }

  if (!label || !summary) return thread;

  const closed = appendBeat(thread, label, summary, state.year, state.week);
  return {
    ...closed,
    status: 'closed',
    closeReason: summary,
    nextBeatHint: null,
    heat: label === 'fired OR extension' ? clampHeat(closed.heat + 5) : clampHeat(closed.heat - 20),
  };
}
