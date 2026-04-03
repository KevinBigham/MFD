import type {
  GameState,
  NewsItem,
  PlayoffMatchup,
  PlayoffMomentum,
  PlayoffSeed,
} from '../types';

function getSeed(game: GameState, teamId: string): PlayoffSeed | null {
  const allSeeds = [...(game.playoffBracket?.afc ?? []), ...(game.playoffBracket?.nfc ?? [])];
  return allSeeds.find((seed) => seed.teamId === teamId) ?? null;
}

export function getPlayoffMomentumBonus(momentum: PlayoffMomentum | null | undefined): number {
  if (!momentum) return 0;
  if (momentum.momentum > 85) return 3;
  if (momentum.momentum > 70) return 2;
  if (momentum.momentum < 30) return -1;
  return 0;
}

export function calculatePlayoffMomentum(game: GameState, teamId: string, wonRound = false): PlayoffMomentum {
  const team = game.teams[teamId];
  if (!team) {
    return {
      teamId,
      momentum: 50,
      narrativeTag: null,
      winStreak: 0,
    };
  }
  const seed = getSeed(game, teamId);
  const lastSeason = game.franchiseHistory
    .filter((entry) => entry.teamId === teamId)
    .sort((a, b) => b.year - a.year)[0];

  let momentum = 50;
  momentum += Math.max(-10, Math.min(15, team.streak * 4));
  if (seed && seed.seed >= 6) momentum += 10;
  if (wonRound) momentum += 12;

  let narrativeTag: PlayoffMomentum['narrativeTag'] = null;
  if (lastSeason?.playoffFinish === 'champion') {
    momentum += 8;
    narrativeTag = 'defending_champ';
  } else if (team.streak >= 5) {
    momentum += 6;
    narrativeTag = 'hot_streak';
  }
  if (seed && seed.seed >= 6 && wonRound) {
    narrativeTag = 'cinderella';
  } else if (seed && seed.seed >= 6 && !narrativeTag) {
    narrativeTag = 'underdog';
  }

  const previousFinals = game.franchiseHistory
    .filter((entry) => entry.teamId === teamId && entry.playoffFinish === 'champion')
    .length;
  if (previousFinals >= 2) {
    narrativeTag = 'dynasty';
    momentum += 5;
  }

  return {
    teamId,
    momentum: Math.max(0, Math.min(100, momentum)),
    narrativeTag,
    winStreak: Math.max(0, team.streak),
  };
}

export function generatePlayoffNews(
  game: GameState,
  matchup: PlayoffMatchup,
  result: {
    winnerTeamId: string;
    loserTeamId: string;
    homeScore: number;
    awayScore: number;
    narrativeTag: PlayoffMomentum['narrativeTag'];
  },
): NewsItem {
  const winner = game.teams[result.winnerTeamId];
  const loser = game.teams[result.loserTeamId];
  const roundLabel = matchup.round.replaceAll('_', ' ');

  return {
    id: `playoff-news-${game.year}-${matchup.week}-${matchup.id}`,
    year: game.year,
    week: matchup.week,
    type: 'rivalry',
    headline: `${winner?.city ?? result.winnerTeamId} survives ${roundLabel} drama over ${loser?.city ?? result.loserTeamId}`,
    body: `${winner?.name ?? result.winnerTeamId} pushed through a ${result.narrativeTag ?? 'playoff'} script, beating ${loser?.name ?? result.loserTeamId} ${Math.max(result.homeScore, result.awayScore)}-${Math.min(result.homeScore, result.awayScore)}.`,
    teamIds: [result.winnerTeamId, result.loserTeamId],
    playerIds: [],
    importance: result.narrativeTag === 'cinderella' || result.narrativeTag === 'underdog' ? 'breaking' : 'major',
  };
}
