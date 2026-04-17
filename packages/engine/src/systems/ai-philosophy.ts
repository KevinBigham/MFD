import { applyGmStrategy } from './gm-strategies';
import { recordNewsItem } from './league-news';
import type { FranchiseHistoryEntry, GameState, NewsItem, Team, TeamPhilosophy } from '../types';

interface CapStatus {
  capSpace: number;
  deadCap: number;
  capUsed: number;
}

function winPct(entry: Pick<FranchiseHistoryEntry, 'wins' | 'losses' | 'ties'>): number {
  const totalGames = entry.wins + entry.losses + entry.ties;
  if (totalGames <= 0) return 0;
  return (entry.wins + entry.ties * 0.5) / totalGames;
}

function isPlayoffAppearance(playoffFinish: string): boolean {
  return playoffFinish !== 'missed_playoffs' && playoffFinish !== 'regular_season';
}

function averageRosterAge(team: Team): number {
  if (team.roster.length === 0) return 26;
  return team.roster.reduce((sum, player) => sum + player.age, 0) / team.roster.length;
}

function recentRecordsForTeam(game: GameState, teamId: string, currentYear: number): FranchiseHistoryEntry[] {
  return game.franchiseHistory
    .filter((entry) => entry.teamId === teamId && entry.year <= currentYear)
    .sort((a, b) => a.year - b.year)
    .slice(-3);
}

function philosophyBody(team: Team, next: TeamPhilosophy): string {
  switch (next) {
    case 'fire_sale':
      return `${team.city} is shopping veteran contracts and clearing cap space after a sharp drop-off.`;
    case 'rebuild':
      return `${team.city} is prioritizing youth, future picks, and long-run flexibility over short-term patch jobs.`;
    case 'contend':
      return `${team.city} is leaning into win-now moves and tightening the roster around proven veterans.`;
    case 'maintain':
    default:
      return `${team.city} is holding a balanced roster posture and avoiding a hard swing in either direction.`;
  }
}

function gmStrategyForPhilosophy(philosophy: TeamPhilosophy): Team['gmStrategy'] {
  switch (philosophy) {
    case 'rebuild':
    case 'fire_sale':
      return 'rebuild';
    case 'contend':
      return 'contend';
    case 'maintain':
    default:
      return 'neutral';
  }
}

export function derivePhilosophy(
  team: Team,
  recentRecords: FranchiseHistoryEntry[],
  capStatus: CapStatus,
  rosterAvgAge: number,
): TeamPhilosophy {
  const ordered = [...recentRecords].sort((a, b) => a.year - b.year);
  const latest = ordered.at(-1) ?? null;
  const previous = ordered.at(-2) ?? null;
  const recentTwo = ordered.slice(-2);
  const recentThree = ordered.slice(-3);

  const capStressed = capStatus.deadCap >= 24 || capStatus.capSpace <= -5 || capStatus.capUsed >= 235;
  const winDrop = latest && previous ? previous.wins - latest.wins : 0;

  if (
    latest &&
    previous &&
    capStressed &&
    winDrop >= 3
  ) {
    return 'fire_sale';
  }

  if (
    recentTwo.length === 2 &&
    recentTwo.every((entry) => winPct(entry) >= 0.625 && isPlayoffAppearance(entry.playoffFinish))
  ) {
    return 'contend';
  }

  if (
    recentThree.length === 3 &&
    recentThree.every((entry) => winPct(entry) < 0.5) &&
    (rosterAvgAge <= 27 || capStatus.capSpace >= 12)
  ) {
    return 'rebuild';
  }

  return 'maintain';
}

export function applyTeamPhilosophies(game: GameState, currentYear: number): NewsItem[] {
  const headlines: NewsItem[] = [];

  for (const team of Object.values(game.teams).sort((a, b) => a.id.localeCompare(b.id))) {
    if (team.isUser) continue;

    const recentRecords = recentRecordsForTeam(game, team.id, currentYear);
    const next = derivePhilosophy(team, recentRecords, {
      capSpace: team.capSpace,
      deadCap: team.deadCap,
      capUsed: team.capUsed,
    }, averageRosterAge(team));
    const previous = team.philosophy ?? 'maintain';

    team.philosophy = next;
    if (next !== 'maintain') {
      applyGmStrategy(team, gmStrategyForPhilosophy(next));
    }

    if (previous === next) continue;

    const news = recordNewsItem(game, {
      id: `team-philosophy-${team.id}-${currentYear}`,
      year: currentYear,
      week: game.week,
      type: 'trade',
      headline: `${team.abbr} SIGNAL ${next.replaceAll('_', ' ').toUpperCase()}`,
      body: philosophyBody(team, next),
      teamIds: [team.id],
      playerIds: [],
      importance: next === 'fire_sale' || next === 'contend' ? 'breaking' : 'major',
    });
    headlines.push(news);
  }

  return headlines;
}
