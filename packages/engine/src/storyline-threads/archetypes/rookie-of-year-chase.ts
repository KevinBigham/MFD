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
  const stats = player.stats;
  return (
    Number(stats?.passYds ?? 0) / 25
    + Number(stats?.passTD ?? 0) * 4
    - Number(stats?.passINT ?? 0) * 3
    + Number(stats?.rushYds ?? 0) / 10
    + Number(stats?.rushTD ?? 0) * 6
    + Number(stats?.recYds ?? 0) / 10
    + Number(stats?.recTD ?? 0) * 6
    + Number(stats?.tackles ?? 0) * 0.4
    + Number(stats?.sacks ?? 0) * 4
    + Number(stats?.defINT ?? 0) * 5
    + Number(stats?.fgMade ?? 0) * 3
  );
}

function mentoringPairFor(state: GameState, playerId: string) {
  return Object.values(state.teams)
    .flatMap((team) => team.mentoringPairs ?? [])
    .find((pair) => pair.menteeId === playerId) ?? null;
}

function mentorLead(mentorName: string | null): string {
  return mentorName ? `With ${mentorName}'s guidance, ` : '';
}

function playerDisplayName(player: Player | undefined): string {
  if (!player) return 'The rookie';
  const savedName = player.name?.trim();
  if (savedName) return savedName;
  return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id;
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
      const mentoringPair = mentoringPairFor(state, player.id);
      const lead = mentorLead(mentoringPair?.mentorName ?? null);
      const playerName = playerDisplayName(player);

      return [{
        key: `rookie-of-year-chase|${state.year}|${player.id}`,
        title: `${playerName} has entered the ROY chase`,
        summary: `${lead}${playerName} is carrying a Rookie of the Year pace with a ${score.toFixed(1)} impact score through week ${weekNumber}.`,
        teamIds: player.teamId ? [player.teamId] : [],
        playerIds: [player.id],
        heat: clampHeat(45 + (score - threshold) / 3),
        nextBeatHint: nextHint(0),
        metadata: {
          playerId: player.id,
          playerName,
          score: Number(score.toFixed(1)),
          pos: player.pos,
          mentorId: mentoringPair?.mentorId ?? null,
          mentorName: mentoringPair?.mentorName ?? null,
          mentorBonus: mentoringPair?.bonus ?? null,
        },
      }];
    });
}

export function evolveRookieOfYearThread(thread: StorylineThread, state: GameState, weekNumber: number): StorylineThread {
  const player = state.players[thread.playerIds[0] ?? ''];
  const score = player ? seasonScore(player) : Number(thread.metadata['score'] ?? 0);
  const playerName = player
    ? playerDisplayName(player)
    : String(thread.metadata['playerName'] ?? 'The rookie');
  const mentorName = typeof thread.metadata['mentorName'] === 'string'
    ? thread.metadata['mentorName']
    : null;
  const nextIndex = Math.min(thread.beatIndex + 1, BEATS.length - 1);
  const label = BEATS[nextIndex] ?? BEATS.at(-1)!;
  const summary = nextIndex === 1
    ? `${mentorLead(mentorName)}${playerName} is now showing up in the league-wide power-ranking spotlight.`
    : nextIndex === 2
      ? `${playerName} is stepping out of ${mentorName ? `${mentorName}'s shadow` : 'the prospect label'} as a real mid-season ROY favorite.`
      : `${playerName} is turning ${mentorName ? `${mentorName}'s veteran lessons` : 'a breakout season'} into a late closing argument.`;

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
  const mentorName = typeof thread.metadata['mentorName'] === 'string'
    ? thread.metadata['mentorName']
    : null;
  const mentorLine = mentorName ? ` The season began under ${mentorName}'s wing and ended with a legacy case of its own.` : '';
  const summary = `${playerName}'s Rookie of the Year case is now complete with the regular season in the books.${mentorLine}`;
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
