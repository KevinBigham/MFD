import type { Player, ScheduledGame, Team } from '../../types';
import type { GameState } from '../../types';
import type { StorylineSeedCandidate, StorylineThread } from '../types';
import { playerDisplayName } from '../../utils';

const BEATS = [
  'media questions',
  'coach defends starter',
  'backup takes snaps in practice',
  'midweek starter change',
  'permanent switch OR benching',
] as const;

const DEV_BONUS: Record<Player['devTrait'], number> = {
  normal: 0,
  star: 2,
  superstar: 4,
  'x-factor': 6,
};

function clampHeat(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function nextHint(beatIndex: number): string | null {
  const nextBeat = BEATS[Math.min(beatIndex + 1, BEATS.length - 1)];
  return nextBeat ? `Next beat: ${nextBeat}.` : null;
}

function quarterbackRoom(team: Team): Player[] {
  return team.roster
    .filter((player) => player.pos === 'QB')
    .sort((left, right) =>
      Number(right.isStarter) - Number(left.isStarter)
      || right.ovr - left.ovr
      || left.id.localeCompare(right.id));
}

function ceiling(player: Player): number {
  return player.pot + DEV_BONUS[player.devTrait];
}

function getPlayedGames(state: GameState, teamId: string): ScheduledGame[] {
  return state.schedule
    .flatMap((week) => week.games
      .filter((game) => game.result && (game.homeTeamId === teamId || game.awayTeamId === teamId))
      .map((game) => ({ week: week.week, game })))
    .sort((left, right) => left.week - right.week || left.game.homeTeamId.localeCompare(right.game.homeTeamId) || left.game.awayTeamId.localeCompare(right.game.awayTeamId))
    .map(({ game }) => game);
}

function passerRating(att: number, comp: number, yards: number, touchdowns: number, interceptions: number): number {
  if (att <= 0) return 158.3;
  const a = Math.max(0, Math.min(2.375, ((comp / att) - 0.3) * 5));
  const b = Math.max(0, Math.min(2.375, ((yards / att) - 3) * 0.25));
  const c = Math.max(0, Math.min(2.375, (touchdowns / att) * 20));
  const d = Math.max(0, Math.min(2.375, 2.375 - (interceptions / att) * 25));
  return Number((((a + b + c + d) / 6) * 100).toFixed(1));
}

function recentPasserRating(state: GameState, teamId: string, quarterbackId: string, games = 3): number {
  const lines = getPlayedGames(state, teamId)
    .map((game) => {
      const stats = game.result?.stats[teamId];
      return stats?.playerLines.find((line) => line.playerId === quarterbackId && (line.passAtt ?? 0) > 0) ?? null;
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line))
    .slice(-games);

  if (lines.length < games) return 100;

  const attempts = lines.reduce((sum, line) => sum + (line.passAtt ?? 0), 0);
  const completions = lines.reduce((sum, line) => sum + (line.passComp ?? 0), 0);
  const passingYards = lines.reduce((sum, line) => sum + (line.passYds ?? 0), 0);
  const passingTds = lines.reduce((sum, line) => sum + (line.passTD ?? 0), 0);
  const picks = lines.reduce((sum, line) => sum + (line.passINT ?? 0), 0);
  return passerRating(attempts, completions, passingYards, passingTds, picks);
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

export function seedQbControversyThreads(state: GameState, _weekNumber: number): StorylineSeedCandidate[] {
  return Object.values(state.teams)
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((team) => {
      const [starter, backup] = quarterbackRoom(team);
      if (!starter || !backup) return [];
      const starterRating = recentPasserRating(state, team.id, starter.id);
      if (starterRating >= 75 || ceiling(backup) <= ceiling(starter)) return [];

      return [{
        key: `qb-controversy|${state.year}|${team.id}|${starter.id}|${backup.id}`,
        title: `${team.city} has a quarterback controversy`,
        summary: `${playerDisplayName(starter)}'s ${starterRating.toFixed(1)} passer rating over the last three games opened the door for ${playerDisplayName(backup)}.`,
        teamIds: [team.id],
        playerIds: [starter.id, backup.id],
        heat: clampHeat(60 + Math.max(0, 75 - starterRating)),
        nextBeatHint: nextHint(0),
        metadata: {
          teamId: team.id,
          starterId: starter.id,
          starterName: playerDisplayName(starter),
          backupId: backup.id,
          backupName: playerDisplayName(backup),
          backupStartedWeeks: 0,
        },
      }];
    });
}

export function evolveQbControversyThread(thread: StorylineThread, state: GameState, weekNumber: number): StorylineThread {
  const team = state.teams[thread.teamIds[0] ?? ''];
  const [currentStarter] = team ? quarterbackRoom(team) : [];
  const backupId = String(thread.metadata['backupId'] ?? '');
  const originalStarter = String(thread.metadata['starterName'] ?? 'the starter');
  const backupName = String(thread.metadata['backupName'] ?? 'the backup');
  const backupStartedWeeks = currentStarter?.id === backupId
    ? Number(thread.metadata['backupStartedWeeks'] ?? 0) + 1
    : 0;
  const nextIndex = Math.min(thread.beatIndex + 1, BEATS.length - 1);
  const label = BEATS[nextIndex] ?? BEATS.at(-1)!;
  const summary = nextIndex === 1
    ? `${team?.city ?? 'The staff'} is still publicly backing ${originalStarter}, but the questions are getting louder.`
    : nextIndex === 2
      ? `${backupName} is taking more meaningful practice reps while the locker room watches the split.`
      : nextIndex === 3
        ? `${backupName} is now a live option for the next start after the pressure kept building.`
        : `${team?.city ?? 'The team'} finally has to live with a real quarterback decision.`;

  const rating = currentStarter ? recentPasserRating(state, team?.id ?? '', currentStarter.id, 1) : 100;
  const advanced = appendBeat(thread, label, summary, state.year, weekNumber);
  return {
    ...advanced,
    beatIndex: nextIndex,
    heat: clampHeat(currentStarter?.id === backupId ? advanced.heat + 6 : advanced.heat + (rating < 90 ? 5 : -10)),
    nextBeatHint: nextHint(nextIndex),
    metadata: {
      ...advanced.metadata,
      currentStarterId: currentStarter?.id ?? null,
      backupStartedWeeks,
      lastGameRating: rating,
    },
  };
}

export function closeQbControversyThread(thread: StorylineThread, state: GameState): StorylineThread {
  if (thread.status === 'closed') return thread;
  const team = state.teams[thread.teamIds[0] ?? ''];
  const [currentStarter] = team ? quarterbackRoom(team) : [];
  const backupId = String(thread.metadata['backupId'] ?? '');
  const backupName = String(thread.metadata['backupName'] ?? 'the backup');
  const starterName = String(thread.metadata['starterName'] ?? 'the starter');
  const backupStartedWeeks = Number(thread.metadata['backupStartedWeeks'] ?? 0);
  const currentRating = currentStarter ? recentPasserRating(state, team?.id ?? '', currentStarter.id, 1) : 100;
  let label: string | null = null;
  let summary: string | null = null;

  if (backupStartedWeeks >= 2 && currentStarter?.id === backupId) {
    label = 'permanent switch OR benching';
    summary = `${backupName} held the job for two straight weeks, and the controversy resolved into a real switch.`;
  } else if (currentStarter?.id === String(thread.metadata['starterId'] ?? '') && currentRating >= 100) {
    label = 'starter stabilized';
    summary = `${starterName} answered the noise with a 100+ passer-rating game and quieted the debate.`;
  } else if (state.phase !== 'regular_season') {
    label = 'season ended';
    summary = `${team?.city ?? 'The team'} carried the quarterback questions to the season's finish line.`;
  }

  if (!label || !summary) return thread;

  const closed = appendBeat(thread, label, summary, state.year, state.week);
  return {
    ...closed,
    status: 'closed',
    closeReason: summary,
    nextBeatHint: null,
    heat: clampHeat(label === 'starter stabilized' ? closed.heat - 25 : closed.heat),
  };
}
