import { getTeamContent } from '../content-loader';
import type {
  FranchiseHistoryEntry,
  GameState,
  SeasonPhase,
  StatLeaderEntry,
  Team,
} from '../types';
import type { BreakoutCandidate } from './development-insights';
import { identifyBreakoutCandidates } from './development-insights';
import { getStatLeaderboard } from './stat-central';

export type SeasonRecapPlayoffResult =
  | 'missed'
  | 'wild-card-loss'
  | 'division-loss'
  | 'conf-loss'
  | 'championship-loss'
  | 'champion';

export interface SeasonRecapLeader {
  playerId: string;
  playerName: string;
  pos: StatLeaderEntry['pos'];
  value: number;
  gamesPlayed: number;
  perGame: number;
}

export interface SeasonRecap {
  teamId: string;
  teamName: string;
  teamCity: string;
  teamAbbr: string;
  seasonYear: number;
  record: string;
  wins: number;
  losses: number;
  ties: number;
  division: string;
  conference: Team['conference'];
  divisionFinish: number;
  conferenceFinish: number;
  playoffResult: SeasonRecapPlayoffResult;
  teamAwards: string[];
  topPerformers: {
    passingLeader: SeasonRecapLeader | null;
    rushingLeader: SeasonRecapLeader | null;
  };
  seasonStory: string;
  teamMotto: string | null;
  breakoutCandidates: BreakoutCandidate[];
}

const COMPLETED_SEASON_PHASES = new Set<SeasonPhase>([
  'offseason',
  'free_agency',
  'draft',
  'post_draft',
  'training_camp',
  'preseason',
]);

const PLAYOFF_RESULT_MAP: Record<string, SeasonRecapPlayoffResult> = {
  missed: 'missed',
  missed_playoffs: 'missed',
  regular_season: 'missed',
  playoff_team: 'wild-card-loss',
  wild_card: 'wild-card-loss',
  wild_card_exit: 'wild-card-loss',
  divisional: 'division-loss',
  divisional_exit: 'division-loss',
  conference: 'conf-loss',
  conference_final_exit: 'conf-loss',
  super_bowl_runner_up: 'championship-loss',
  champion: 'champion',
};

function completedSeasonYear(game: GameState): number | null {
  if (!COMPLETED_SEASON_PHASES.has(game.phase)) return null;
  return game.year - 1;
}

function winPct(entry: FranchiseHistoryEntry): number {
  const games = entry.wins + entry.losses + entry.ties;
  if (games === 0) return 0;
  return (entry.wins + entry.ties * 0.5) / games;
}

function sortHistoryEntries(left: FranchiseHistoryEntry, right: FranchiseHistoryEntry): number {
  return winPct(right) - winPct(left)
    || right.pointDifferential - left.pointDifferential
    || left.teamId.localeCompare(right.teamId);
}

function activeArcSentence(game: GameState, teamId: string, seasonYear: number): string | null {
  const activeArc = (game.storyArcs ?? [])
    .filter((arc) => arc.teamId === teamId)
    .find((arc) => arc.stageHistory.some((beat) => beat.year === seasonYear));
  if (!activeArc) return null;

  if (activeArc.type === 'rebuild' && activeArc.currentStage === 'breakthrough') {
    return 'You exited your rebuild one year ahead of schedule.';
  }
  if (activeArc.type === 'contender_window' && activeArc.currentStage === 'window_extended') {
    return 'Your contention window widened instead of closing.';
  }
  if (activeArc.type === 'contender_window' && activeArc.currentStage === 'window_narrowed') {
    return 'Your contention window narrowed under cap pressure.';
  }
  if (activeArc.type === 'dynasty_run' && activeArc.currentStage === 'dynasty_breakthrough') {
    return 'The season hardened into the kind of run people call a dynasty.';
  }

  return activeArc.stageHistory.find((beat) => beat.year === seasonYear)?.narrativeText ?? null;
}

function defaultSeasonStory(playoffResult: SeasonRecapPlayoffResult): string {
  switch (playoffResult) {
    case 'champion':
      return 'You finished the year on top of the league.';
    case 'championship-loss':
      return 'You were one game short of finishing the job.';
    case 'conf-loss':
      return 'The season ended one step short of the championship game.';
    case 'division-loss':
      return 'The playoff push held, but the divisional round ended the run.';
    case 'wild-card-loss':
      return 'You reached January, but the postseason stay was brief.';
    case 'missed':
    default:
      return 'The year set a baseline, but the postseason stayed out of reach.';
  }
}

function deriveSeasonStory(
  game: GameState,
  history: FranchiseHistoryEntry,
  playoffResult: SeasonRecapPlayoffResult,
): string {
  return activeArcSentence(game, history.teamId, history.year)
    ?? history.majorEvents[0]
    ?? defaultSeasonStory(playoffResult);
}

function normalizePlayoffResult(playoffFinish: string): SeasonRecapPlayoffResult {
  return PLAYOFF_RESULT_MAP[playoffFinish] ?? 'missed';
}

function deriveFinishes(
  game: GameState,
  team: Team,
  seasonYear: number,
): { divisionFinish: number; conferenceFinish: number } {
  const seasonEntries = game.franchiseHistory.filter((entry) => entry.year === seasonYear);
  const divisionEntries = seasonEntries
    .filter((entry) => game.teams[entry.teamId]?.division === team.division)
    .sort(sortHistoryEntries);
  const conferenceEntries = seasonEntries
    .filter((entry) => game.teams[entry.teamId]?.conference === team.conference)
    .sort(sortHistoryEntries);

  return {
    divisionFinish: Math.max(1, divisionEntries.findIndex((entry) => entry.teamId === team.id) + 1),
    conferenceFinish: Math.max(1, conferenceEntries.findIndex((entry) => entry.teamId === team.id) + 1),
  };
}

function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of labels) {
    if (seen.has(label)) continue;
    seen.add(label);
    unique.push(label);
  }
  return unique;
}

function getTeamAwards(
  game: GameState,
  teamId: string,
  seasonYear: number,
  history: FranchiseHistoryEntry,
): string[] {
  const labels = game.awardsHistory
    .filter((entry) => entry.year === seasonYear)
    .flatMap((entry) =>
      entry.awards
        .filter((award) => award.winnerTeamId === teamId)
        .map((award) => award.label));

  return dedupeLabels([...labels, ...history.awardsWon]);
}

function fallbackLeader(
  team: Team,
  stat: string,
  pos: StatLeaderEntry['pos'],
): SeasonRecapLeader | null {
  const candidate = [...team.roster]
    .filter((player) => player.pos === pos)
    .sort((left, right) =>
      Number(right.stats[stat] ?? 0) - Number(left.stats[stat] ?? 0)
      || Number(right.stats.gamesPlayed ?? 0) - Number(left.stats.gamesPlayed ?? 0)
      || left.name.localeCompare(right.name))[0];

  if (!candidate) return null;

  const value = Number(candidate.stats[stat] ?? 0);
  if (value <= 0) return null;

  const gamesPlayed = Number(candidate.stats.gamesPlayed ?? 0);
  return {
    playerId: candidate.id,
    playerName: candidate.name,
    pos: candidate.pos,
    value,
    gamesPlayed,
    perGame: gamesPlayed > 0 ? Math.round((value / gamesPlayed) * 10) / 10 : 0,
  };
}

function pickLeader(
  game: GameState,
  team: Team,
  seasonYear: number,
  stat: string,
  pos: StatLeaderEntry['pos'],
): SeasonRecapLeader | null {
  const leader = getStatLeaderboard(game, stat, seasonYear, pos)
    .find((entry) => entry.teamId === team.id);

  if (!leader) return fallbackLeader(team, stat, pos);

  return {
    playerId: leader.playerId,
    playerName: leader.playerName,
    pos: leader.pos,
    value: leader.value,
    gamesPlayed: leader.gamesPlayed,
    perGame: leader.perGame,
  };
}

export function buildSeasonRecap(
  game: GameState,
  teamId: string,
): SeasonRecap | null {
  const seasonYear = completedSeasonYear(game);
  if (seasonYear === null) return null;

  const team = game.teams[teamId];
  if (!team) return null;

  const history = game.franchiseHistory.find((entry) => entry.teamId === teamId && entry.year === seasonYear);
  if (!history) return null;

  const playoffResult = normalizePlayoffResult(history.playoffFinish);
  const finishes = deriveFinishes(game, team, seasonYear);
  const teamContent = getTeamContent(teamId);

  return {
    teamId: team.id,
    teamName: team.name,
    teamCity: team.city,
    teamAbbr: team.abbr,
    seasonYear,
    record: history.record,
    wins: history.wins,
    losses: history.losses,
    ties: history.ties,
    division: team.division,
    conference: team.conference,
    divisionFinish: finishes.divisionFinish,
    conferenceFinish: finishes.conferenceFinish,
    playoffResult,
    teamAwards: getTeamAwards(game, teamId, seasonYear, history),
    topPerformers: {
      passingLeader: pickLeader(game, team, seasonYear, 'passYds', 'QB'),
      rushingLeader: pickLeader(game, team, seasonYear, 'rushYds', 'RB'),
    },
    seasonStory: deriveSeasonStory(game, history, playoffResult),
    teamMotto: teamContent?.motto ?? null,
    breakoutCandidates: identifyBreakoutCandidates(game, teamId),
  };
}
