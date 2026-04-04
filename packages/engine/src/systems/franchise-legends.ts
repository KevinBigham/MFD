import type {
  AllDecadeTeam,
  AllDecadeTeamEntry,
  AwardsHistoryEntry,
  FranchiseHistoryEntry,
  FranchiseLegend,
  GameState,
  HallOfFameEntry,
  Player,
  PlayerArchiveEntry,
  Position,
  RecordBook,
  RecordEntry,
} from '../types';

const STARTER_REQUIREMENTS: Array<[Position, number]> = [
  ['QB', 1],
  ['RB', 1],
  ['WR', 3],
  ['TE', 1],
  ['OL', 5],
  ['DL', 4],
  ['LB', 3],
  ['CB', 2],
  ['S', 2],
];

function allRecordEntries(records: RecordBook): RecordEntry[] {
  return Object.values(records)
    .flatMap((bucket) => Object.values(bucket))
    .flat() as RecordEntry[];
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function awardCountsForPlayer(playerId: string, awardsHistory: AwardsHistoryEntry[]) {
  let mvps = 0;
  let allPros = 0;
  let proBowls = 0;

  for (const season of awardsHistory) {
    for (const award of season.awards) {
      if (award.winnerId !== playerId) continue;
      if (award.awardId === 'mvp') mvps += 1;
      if (award.awardId.includes('all_pro')) allPros += 1;
      if (award.awardId === 'pro_bowl') proBowls += 1;
    }
  }

  return { mvps, allPros, proBowls };
}

function recordCountForPlayer(records: RecordBook, playerId: string, teamId: string): number {
  return allRecordEntries(records)
    .filter((entry) => entry.playerId === playerId && entry.teamId === teamId).length;
}

function tenureWithTeam(entry: PlayerArchiveEntry, teamId: string): number {
  return entry.teamHistory
    .filter((stint) => stint.teamId === teamId)
    .reduce((total, stint) => total + (stint.lastYear - stint.firstYear + 1), 0);
}

function championshipCountForPlayer(entry: PlayerArchiveEntry, teamId: string, history: FranchiseHistoryEntry[]): number {
  return history.filter((season) =>
    season.teamId === teamId
    && season.playoffFinish === 'champion'
    && entry.teamHistory.some((stint) => stint.teamId === teamId && season.year >= stint.firstYear && season.year <= stint.lastYear)).length;
}

function playerPosition(entry: PlayerArchiveEntry): Position {
  return entry.positions[0] ?? 'WR';
}

function overlapsDecade(entry: PlayerArchiveEntry, teamId: string, startYear: number, endYear: number): boolean {
  return entry.teamHistory.some((stint) =>
    stint.teamId === teamId
    && stint.firstYear <= endYear
    && stint.lastYear >= startYear);
}

function seasonsInDecade(entry: PlayerArchiveEntry, teamId: string, startYear: number, endYear: number): number {
  return entry.teamHistory
    .filter((stint) => stint.teamId === teamId)
    .reduce((total, stint) => total + Math.max(0, Math.min(stint.lastYear, endYear) - Math.max(stint.firstYear, startYear) + 1), 0);
}

function decadeRange(game: GameState): { startYear: number; endYear: number } {
  if (game.year % 10 === 0) {
    return { startYear: game.year - 10, endYear: game.year - 1 };
  }

  const startYear = Math.floor(game.year / 10) * 10;
  return { startYear, endYear: startYear + 9 };
}

function buildCandidateEntries(game: GameState, teamId: string, startYear: number, endYear: number): AllDecadeTeamEntry[] {
  const archiveEntries = game.playerArchive
    .filter((entry) => overlapsDecade(entry, teamId, startYear, endYear))
    .map((entry) => {
      const awards = awardCountsForPlayer(entry.playerId, game.awardsHistory);
      const championships = championshipCountForPlayer(entry, teamId, game.franchiseHistory);
      const seasons = seasonsInDecade(entry, teamId, startYear, endYear);
      const score = entry.peakOvr * 0.3 + seasons * 6.5 + (awards.mvps * 12 + awards.allPros * 4 + awards.proBowls * 2) + championships * 10;
      return {
        playerId: entry.playerId,
        playerName: entry.name,
        pos: playerPosition(entry),
        peakOvr: entry.peakOvr,
        seasonsWithTeam: seasons,
        highlights: generateLegendHighlights({
          playerId: entry.playerId,
          playerName: entry.name,
          pos: playerPosition(entry),
          legacyScore: score,
          tenureYears: tenureWithTeam(entry, teamId),
          peakOvr: entry.peakOvr,
          championships,
          mvps: awards.mvps,
          allPros: awards.allPros,
          proBowls: awards.proBowls,
          hallOfFame: game.hallOfFame.some((hof) => hof.playerId === entry.playerId),
          careerHighlights: [],
        }, game.records).slice(0, 3),
      } satisfies AllDecadeTeamEntry & { score?: number };
    });

  return archiveEntries
    .map((entry) => ({ ...entry, score: entry.peakOvr + entry.seasonsWithTeam * 5 + entry.highlights.length * 3 }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.peakOvr - a.peakOvr || a.playerId.localeCompare(b.playerId))
    .map(({ score: _score, ...entry }) => entry);
}

function decadeHeadline(history: FranchiseHistoryEntry[]): string {
  const titles = history.filter((entry) => entry.playoffFinish === 'champion').length;
  const winningSeasons = history.filter((entry) => entry.wins > entry.losses).length;
  if (titles >= 2) return 'The Dynasty Era';
  if (titles === 1) return 'The Championship Window';
  if (winningSeasons >= 5) return 'The Golden Age';
  return 'The Rebuilding Decade';
}

function eligibleRosterPlayers(game: GameState, teamId: string, startYear: number, endYear: number): PlayerArchiveEntry[] {
  const rosterPlayers = (Object.values(game.teams).find((team) => team.id === teamId)?.roster ?? [])
    .filter((player) => player.teamId === teamId)
    .map((player) => {
      const archive = game.playerArchive.find((entry) => entry.playerId === player.id);
      return archive ?? {
        playerId: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        name: player.name,
        positions: [player.pos],
        peakOvr: player.ovr,
        peakYear: game.year,
        firstYear: game.year,
        lastYear: game.year,
        retirementYear: null,
        teamHistory: [{ teamId, firstYear: game.year, lastYear: game.year }],
        careerStats: { ...player.careerStats },
      };
    })
    .filter((entry) => overlapsDecade(entry, teamId, startYear, endYear));

  const byId = new Map<string, PlayerArchiveEntry>();
  for (const entry of [...game.playerArchive.filter((candidate) => overlapsDecade(candidate, teamId, startYear, endYear)), ...rosterPlayers]) {
    byId.set(entry.playerId, entry);
  }
  return [...byId.values()];
}

export function shouldGenerateAllDecadeTeam(gameState: GameState): boolean {
  if (gameState.year % 10 !== 0) return false;
  const startYear = gameState.year - 10;
  const endYear = gameState.year - 1;
  return !gameState.allDecadeTeams.some((entry) => entry.startYear === startYear && entry.endYear === endYear);
}

export function calculateLegacyScore(
  player: PlayerArchiveEntry,
  teamId: string,
  awards: AwardsHistoryEntry[],
  hallOfFame: HallOfFameEntry[],
  records: RecordBook,
): number {
  const tenureYears = tenureWithTeam(player, teamId);
  const awardCounts = awardCountsForPlayer(player.playerId, awards);
  const hallEntry = hallOfFame.find((entry) => entry.playerId === player.playerId);
  const championships = hallEntry?.awards.championships ?? 0;
  const recordScore = Math.min(10, recordCountForPlayer(records, player.playerId, teamId) * 2.5);
  const hofScore = hallEntry ? 10 : 0;

  const total = (
    Math.min(20, tenureYears * 2.5) +
    (player.peakOvr / 99) * 20 +
    Math.min(20, championships * 10) +
    Math.min(20, awardCounts.mvps * 10 + awardCounts.allPros * 3 + awardCounts.proBowls * 1.5) +
    recordScore +
    hofScore
  );

  return Math.round(total * 100) / 100;
}

export function getFranchiseLegends(gameState: GameState, teamId: string, limit = 25): FranchiseLegend[] {
  return eligibleRosterPlayers(gameState, teamId, 1900, gameState.year + 5)
    .map((entry) => {
      const awards = awardCountsForPlayer(entry.playerId, gameState.awardsHistory);
      const hallEntry = gameState.hallOfFame.find((hof) => hof.playerId === entry.playerId);
      const championships = hallEntry?.awards.championships ?? championshipCountForPlayer(entry, teamId, gameState.franchiseHistory);
      return {
        playerId: entry.playerId,
        playerName: entry.name,
        pos: playerPosition(entry),
        legacyScore: calculateLegacyScore(entry, teamId, gameState.awardsHistory, gameState.hallOfFame, gameState.records),
        tenureYears: tenureWithTeam(entry, teamId),
        peakOvr: entry.peakOvr,
        championships,
        mvps: awards.mvps,
        allPros: awards.allPros,
        proBowls: awards.proBowls,
        hallOfFame: Boolean(hallEntry),
        careerHighlights: [],
      } satisfies FranchiseLegend;
    })
    .sort((a, b) => b.legacyScore - a.legacyScore || b.peakOvr - a.peakOvr || a.playerName.localeCompare(b.playerName))
    .slice(0, limit)
    .map((legend) => ({
      ...legend,
      careerHighlights: generateLegendHighlights(legend, gameState.records),
    }));
}

export function generateLegendHighlights(legend: FranchiseLegend, records: RecordBook): string[] {
  const highlights: string[] = [];
  if (legend.mvps > 0) highlights.push(`${legend.mvps}x League MVP`);
  if (legend.allPros > 0) highlights.push(`${legend.allPros}x All-Pro`);
  if (legend.proBowls > 0) highlights.push(`${legend.proBowls}x Pro Bowl`);
  if (legend.championships > 0) highlights.push(`${legend.championships}x Champion`);
  if (legend.hallOfFame) highlights.push('Hall of Fame inductee');

  const recordEntries = allRecordEntries(records)
    .filter((entry) => entry.playerId === legend.playerId)
    .sort((a, b) => b.value - a.value);
  const topRecord = recordEntries[0];
  if (topRecord) {
    highlights.push(`Franchise all-time ${topRecord.stat} leader (${formatNumber(topRecord.value)})`);
  }

  if (highlights.length === 0) {
    highlights.push(`Peak OVR ${legend.peakOvr} across ${legend.tenureYears} seasons`);
  }

  return highlights;
}

export function generateAllDecadeTeam(gameState: GameState, teamId: string): AllDecadeTeam {
  const { startYear, endYear } = decadeRange(gameState);
  const history = gameState.franchiseHistory.filter((entry) => entry.teamId === teamId && entry.year >= startYear && entry.year <= endYear);
  const candidates = buildCandidateEntries(gameState, teamId, startYear, endYear);
  const selected = new Set<string>();
  const roster: AllDecadeTeamEntry[] = [];

  for (const [pos, count] of STARTER_REQUIREMENTS) {
    const matches = candidates.filter((entry) => entry.pos === pos && !selected.has(entry.playerId)).slice(0, count);
    for (const match of matches) {
      selected.add(match.playerId);
      roster.push(match);
    }
  }

  const honorableMentions = candidates
    .filter((entry) => !selected.has(entry.playerId))
    .slice(0, 11);
  roster.push(...honorableMentions);

  return {
    id: `all-decade-${teamId}-${startYear}`,
    decade: `${startYear}-${endYear}`,
    startYear,
    endYear,
    teamId,
    roster,
    headline: decadeHeadline(history),
  };
}

export function getDecadeNarrative(allDecadeTeam: AllDecadeTeam, franchiseHistory: FranchiseHistoryEntry[]): string {
  const history = franchiseHistory
    .filter((entry) => entry.year >= allDecadeTeam.startYear && entry.year <= allDecadeTeam.endYear)
    .sort((a, b) => a.year - b.year);
  const titleYears = history.filter((entry) => entry.playoffFinish === 'champion').map((entry) => entry.year);
  const starNames = allDecadeTeam.roster.slice(0, 2).map((entry) => entry.playerName.split(' ')[0]);

  if (titleYears.length > 0) {
    return `The ${allDecadeTeam.decade} era was driven by ${starNames.join(' and ')}. Championship seasons arrived in ${titleYears.join(', ')} and defined ${allDecadeTeam.headline.toLowerCase()}.`;
  }

  return `The ${allDecadeTeam.decade} decade centered on ${starNames.join(' and ')} as the franchise searched for its next title window. ${allDecadeTeam.headline} captured the feel of the era.`;
}
