import { calcPlayerValue } from './trade-value';
import { getAgeCurve } from './player-archetypes';
import { getPlayerAgent } from './player-agents';
import type {
  GameState,
  Player,
  PlayerCareerStatLine,
  PlayerProfile,
  PlayerProjection,
  PlayerSeasonHistoryEntry,
  PlayerValue,
  Position,
} from '../types';

const POSITION_STAT_KEYS: Record<Position, string[]> = {
  QB: ['passYds', 'passTD', 'passINT'],
  RB: ['rushYds', 'rushTD', 'rec'],
  WR: ['rec', 'recYds', 'recTD'],
  TE: ['rec', 'recYds', 'recTD'],
  OL: ['snaps'],
  DL: ['sacks', 'tackles'],
  LB: ['tackles', 'sacks', 'defINT'],
  CB: ['defINT', 'tackles'],
  S: ['defINT', 'tackles'],
  K: ['fgMade', 'fgAtt'],
  P: ['punts'],
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function seasonLabel(game: GameState): number {
  return game.phase === 'offseason' || game.phase === 'free_agency' || game.phase === 'draft' || game.phase === 'post_draft'
    ? game.year - 1
    : game.year;
}

function teamName(game: GameState, teamId: string | null): string {
  if (!teamId) return 'Free Agent';
  const team = game.teams[teamId];
  return team ? `${team.city} ${team.name}` : teamId;
}

function keyStatsFor(player: Player, source: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    POSITION_STAT_KEYS[player.pos].map((key) => [key, Number(source[key] ?? 0)]),
  );
}

function dedupeArc(entries: Array<{ age: number; ovr: number }>): Array<{ age: number; ovr: number }> {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.age}:${entry.ovr}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function synthesizeCareerLine(player: Player, game: GameState): PlayerCareerStatLine {
  const archiveEntry = game.playerArchive.find((entry) => entry.playerId === player.id) ?? null;
  const stats = archiveEntry?.careerStats ?? player.careerStats;
  const gamesPlayed = Number(stats.gp ?? player.stats.gamesPlayed ?? 0);
  return {
    season: archiveEntry?.lastYear ?? seasonLabel(game),
    team: teamName(game, archiveEntry?.teamHistory.at(-1)?.teamId ?? player.teamId),
    gamesPlayed,
    gamesStarted: player.isStarter ? gamesPlayed : Math.round(gamesPlayed * 0.4),
    keyStats: keyStatsFor(player, stats),
  };
}

function synthesizedArc(player: Player, game: GameState): Array<{ age: number; ovr: number }> {
  const archiveEntry = game.playerArchive.find((entry) => entry.playerId === player.id) ?? null;
  const stats = archiveEntry?.careerStats ?? player.careerStats;
  const entries: Array<{ age: number; ovr: number }> = [];
  const previousSeasonOvr = Number(stats.previousSeasonOvr ?? NaN);
  const seasonStartOvr = Number(stats.seasonStartOvr ?? NaN);

  if (Number.isFinite(previousSeasonOvr)) {
    entries.push({ age: Math.max(18, player.age - 1), ovr: previousSeasonOvr });
  }
  if (Number.isFinite(seasonStartOvr)) {
    entries.push({ age: player.age, ovr: seasonStartOvr });
  }
  entries.push({ age: player.age, ovr: player.ovr });
  return dedupeArc(entries);
}

function buildHistoricalLines(player: Player, game: GameState): {
  developmentArc: Array<{ age: number; ovr: number }>;
  careerStats: PlayerCareerStatLine[];
  legacyHistoryPartial: boolean;
} {
  const snapshots = [...(game.playerSeasonHistory[player.id] ?? [])].sort((a, b) => a.season - b.season);
  if (snapshots.length === 0) {
    return {
      developmentArc: synthesizedArc(player, game),
      careerStats: [synthesizeCareerLine(player, game)],
      legacyHistoryPartial: true,
    };
  }

  const developmentArc = dedupeArc([
    ...snapshots.map((entry) => ({ age: entry.age, ovr: entry.ovr })),
    { age: player.age, ovr: player.ovr },
  ]);
  const careerStats = snapshots.map<PlayerCareerStatLine>((entry) => ({
    season: entry.season,
    team: teamName(game, entry.teamId),
    gamesPlayed: entry.gamesPlayed,
    gamesStarted: entry.gamesStarted,
    keyStats: { ...entry.keyStats },
  }));

  return {
    developmentArc,
    careerStats,
    legacyHistoryPartial: false,
  };
}

function mediaPresence(player: Player): PlayerProfile['personalityReport']['mediaPresence'] {
  if (player.traits.includes('media_darling') || player.traits.includes('showtime') || player.personality.pressure >= 8) return 'high';
  if (player.personality.pressure >= 6 || player.traits.includes('stat_padder')) return 'medium';
  return 'low';
}

function lockerRoomImpact(player: Player): PlayerProfile['personalityReport']['lockerRoomImpact'] {
  if (player.traits.some((trait) => ['cancer', 'ego', 'hothead'].includes(trait)) || player.holdout) return 'negative';
  if (player.traits.some((trait) => ['captain', 'vocal_leader', 'mentor'].includes(trait)) || player.personality.loyalty >= 8) return 'positive';
  return 'neutral';
}

function comparableScore(player: Player, candidate: Player): number {
  return Math.abs(candidate.ovr - player.ovr) * 4
    + Math.abs(candidate.age - player.age) * 2
    + Math.abs((candidate.pot ?? candidate.ovr) - (player.pot ?? player.ovr));
}

export function buildPlayerSeasonHistoryEntry(player: Player, season: number): PlayerSeasonHistoryEntry {
  const gamesPlayed = Number(player.stats.gamesPlayed ?? 0);
  return {
    playerId: player.id,
    season,
    age: player.age,
    ovr: player.ovr,
    teamId: player.teamId,
    gamesPlayed,
    gamesStarted: player.isStarter ? gamesPlayed : Math.round(gamesPlayed * 0.4),
    keyStats: keyStatsFor(player, player.stats),
  };
}

export function archivePlayerSeasonHistory(game: GameState, season: number): void {
  for (const player of Object.values(game.players)) {
    game.playerSeasonHistory[player.id] ??= [];
    if (game.playerSeasonHistory[player.id]!.some((entry) => entry.season === season)) {
      continue;
    }
    game.playerSeasonHistory[player.id]!.push(buildPlayerSeasonHistoryEntry(player, season));
    game.playerSeasonHistory[player.id]!.sort((a, b) => a.season - b.season);
  }
}

export function buildPlayerProfile(player: Player, game: GameState): PlayerProfile {
  const historical = buildHistoricalLines(player, game);
  const agent = getPlayerAgent(game, player.id);
  const mentoringPairs = Object.values(game.teams)
    .flatMap((team) => team.mentoringPairs)
    .filter((pair) => pair.mentorId === player.id || pair.menteeId === player.id);

  return {
    player,
    contractDetails: {
      yearByYear: (player.contract?.yearlyBreakdown ?? []).map((entry) => ({
        year: entry.year,
        baseSalary: entry.baseSalary,
        capHit: entry.capHit,
        deadCap: entry.deadCap,
      })),
      totalValue: player.contract?.totalValue ?? 0,
      guaranteedRemaining: player.contract?.guaranteed ?? 0,
    },
    developmentArc: historical.developmentArc.map((entry) => ({ age: entry.age, ovr: entry.ovr })),
    careerStats: historical.careerStats,
    personalityReport: {
      traits: [...player.traits],
      agentStyle: agent?.style.replaceAll('_', ' ') ?? 'unassigned',
      mediaPresence: mediaPresence(player),
      lockerRoomImpact: lockerRoomImpact(player),
    },
    awardsWon: game.awardsHistory.flatMap((entry) =>
      entry.awards
        .filter((award) => award.winnerId === player.id)
        .map((award) => `${entry.year} ${award.label}`)),
    mentorHistory: mentoringPairs.map((pair) => ({
      mentorName: pair.mentorName,
      bonus: pair.bonus,
    })),
    injuryHistory: player.injury ? [{
      type: player.injury.type,
      weeksOut: player.injury.gamesOut,
      season: seasonLabel(game),
    }] : [],
    legacyHistoryPartial: historical.legacyHistoryPartial,
  };
}

export function getPlayerValue(player: Player, game: GameState): PlayerValue {
  const acquiringTeam = game.teams[player.teamId ?? Object.keys(game.teams)[0]!] ?? Object.values(game.teams)[0]!;
  const tradeValue = round(calcPlayerValue(game, player, acquiringTeam));
  const positionMultiplier: Record<Position, number> = {
    QB: 1.35,
    RB: 0.9,
    WR: 1.05,
    TE: 0.95,
    OL: 1.1,
    DL: 1.05,
    LB: 1,
    CB: 1.05,
    S: 0.95,
    K: 0.5,
    P: 0.45,
  };
  const ageMultiplier = player.age <= 25 ? 1.1 : player.age <= 29 ? 1 : player.age <= 32 ? 0.9 : 0.75;
  const marketValue = round(Math.max(1, (player.ovr - 55) * 0.35 * positionMultiplier[player.pos] * ageMultiplier));
  const annualCommitment = round((player.contract?.baseSalary ?? 0) + (player.contract?.prorated ?? 0));

  return {
    tradeValue,
    marketValue,
    surplus: round(marketValue - annualCommitment),
  };
}

export function getPlayerComparables(player: Player, allPlayers: Player[]): Player[] {
  return allPlayers
    .filter((candidate) => candidate.id !== player.id && candidate.pos === player.pos)
    .sort((a, b) => comparableScore(player, a) - comparableScore(player, b) || a.id.localeCompare(b.id))
    .slice(0, 5);
}

export function getPlayerProjection(player: Player): PlayerProjection {
  const curve = getAgeCurve(player.pos, player.archetype?.archetype ?? null);
  const upside = Math.max(0, player.pot - player.ovr);
  const beforePrime = player.age < curve.prime[0];
  const afterPrime = player.age > curve.prime[1];
  const growth = beforePrime
    ? Math.max(1, Math.round(upside * 0.45))
    : afterPrime
      ? -Math.max(1, Math.round((player.age - curve.prime[1]) * 0.9))
      : Math.max(0, Math.round(upside * 0.15));

  const nextYearOvr = clamp(Math.round(player.ovr + growth), 40, 99);
  const peakAge = afterPrime ? player.age : Math.max(player.age, curve.prime[0]);
  const peakOvr = clamp(Math.max(nextYearOvr, Math.round(player.ovr + Math.max(0, upside * 0.7))), 40, 99);

  return {
    nextYearOvr,
    peakOvr,
    peakAge,
    retirementAge: Math.max(peakAge + 1, curve.cliff + (player.pos === 'QB' ? 5 : 3)),
  };
}
