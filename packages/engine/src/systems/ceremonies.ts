import { uid } from '../rng';
import type { Ceremony, CeremonyHighlight, GameState, HallOfFameEntry, PlayoffMatchup, Team } from '../types';

function teamLabel(team: Team | null | undefined): string {
  return team ? `${team.city} ${team.name}` : 'Unknown Team';
}

function scoreString(matchup: PlayoffMatchup): string {
  if (!matchup.result) return 'TBD';
  return `${matchup.result.homeScore}-${matchup.result.awayScore}`;
}

export function recordCeremony(game: GameState, ceremony: Ceremony): Ceremony {
  game.ceremonies ??= [];
  game.ceremonies = [...game.ceremonies, ceremony].slice(-20);
  return ceremony;
}

export function generateChampionshipCeremony(game: GameState, championTeamId: string): Ceremony {
  const champion = game.teams[championTeamId] ?? null;
  const path = (game.playoffBracket?.matchups ?? [])
    .filter((matchup) => matchup.winnerTeamId === championTeamId && matchup.result)
    .sort((a, b) => a.week - b.week)
    .map((matchup) => {
      const opponentId = matchup.homeTeamId === championTeamId ? matchup.awayTeamId : matchup.homeTeamId;
      const opponent = game.teams[opponentId];
      return `${matchup.round.replaceAll('_', ' ')} vs ${teamLabel(opponent)} (${scoreString(matchup)})`;
    });
  const finalMatchup = [...(game.playoffBracket?.matchups ?? [])]
    .filter((matchup) => matchup.round === 'super_bowl' && matchup.winnerTeamId === championTeamId)
    .sort((a, b) => b.week - a.week)[0] ?? null;
  const mvp = finalMatchup?.result?.mvpPlayerId ?? null;

  return {
    id: `ceremony-${uid()}`,
    type: 'championship',
    year: game.year,
    headline: `${teamLabel(champion)} championship ceremony`,
    description: finalMatchup?.result
      ? `${teamLabel(champion)} finished the run with a ${scoreString(finalMatchup)} title game win. Confetti fell while the broadcast framed the path through January.`
      : `${teamLabel(champion)} closed the season with a title and a confetti-soaked podium moment.`,
    highlights: [
      {
        label: 'Season Record',
        value: champion ? `${champion.wins}-${champion.losses}${champion.ties ? `-${champion.ties}` : ''}` : 'Unknown',
        playerIds: [],
      },
      {
        label: 'Playoff Path',
        value: path.join(' -> '),
        playerIds: [],
      },
      {
        label: 'Super Bowl MVP',
        value: mvp ? game.players[mvp]?.name ?? mvp : 'Team effort',
        playerIds: mvp ? [mvp] : [],
      },
    ],
    mvp,
  };
}

export function generateAwardsNight(game: GameState): Ceremony {
  const entry = game.awardsHistory.at(-1);
  const highlights: CeremonyHighlight[] = (entry?.awards ?? [])
    .filter((award) => ['mvp', 'opoy', 'dpoy', 'oroy', 'droy', 'comeback_player', 'coach_of_year'].includes(award.awardId))
    .map((award) => ({
      label: award.label,
      value: `${award.winnerName} (${award.winnerTeam})`,
      playerIds: award.winnerId ? [award.winnerId] : [],
    }));

  return {
    id: `ceremony-${uid()}`,
    type: 'awards_night',
    year: entry?.year ?? game.year,
    headline: entry?.ceremony.headline ?? `${game.year} Awards Night`,
    description: entry?.ceremony.intro ?? 'The season closes with a broadcast spotlight on the league’s defining performances.',
    highlights,
    mvp: entry?.awards.find((award) => award.awardId === 'mvp')?.winnerId ?? null,
  };
}

function hallOfFameHighlightValue(entry: HallOfFameEntry): string {
  const headline = entry.epilogue?.headline.trim();
  const story = entry.epilogue?.story.trim();
  if (headline && story) return `${headline}: ${story}`;
  return entry.highlights.join(' // ');
}

export function generateHOFInduction(game: GameState, inductees: HallOfFameEntry[]): Ceremony {
  return {
    id: `ceremony-${uid()}`,
    type: 'hall_of_fame_induction',
    year: inductees[0]?.inductionYear ?? game.year,
    headline: `${inductees.length} player(s) enter the Hall of Fame`,
    description: 'The Hall of Fame class steps into football immortality with a retrospective broadcast package.',
    highlights: inductees.map((entry) => ({
      label: entry.name,
      value: hallOfFameHighlightValue(entry),
      playerIds: [entry.playerId],
    })),
    mvp: null,
  };
}

export function generateRingCeremony(game: GameState, teamId: string): Ceremony | null {
  if (game.week !== 1 || game.phase !== 'regular_season') return null;
  const defendingChamp = game.franchiseHistory.find((entry) => entry.year === game.year - 1 && entry.teamId === teamId && entry.playoffFinish === 'champion');
  if (!defendingChamp) return null;

  const team = game.teams[teamId] ?? null;
  return {
    id: `ceremony-${uid()}`,
    type: 'ring_ceremony',
    year: game.year,
    headline: `${teamLabel(team)} Ring Ceremony`,
    description: `${teamLabel(team)} opens the season by honoring last year’s title run before kickoff.`,
    highlights: [
      {
        label: 'Defending Title',
        value: defendingChamp.record,
        playerIds: [],
      },
    ],
    mvp: null,
  };
}
