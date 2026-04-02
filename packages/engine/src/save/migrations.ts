/**
 * MFD Save Migration Pipeline
 *
 * Version-keyed transforms that upgrade old saves to the current schema.
 * Each migration takes a save at version N and returns version N+1.
 */

import { createEmptyRecordBook } from '../systems/records';

type MigrationFn = (state: Record<string, unknown>) => Record<string, unknown>;

const migrations: Map<number, MigrationFn> = new Map();

function rivalryId(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join('::');
}

function deriveLeagueRivalries(state: Record<string, unknown>): Array<Record<string, unknown>> {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  const byId = new Map<string, Record<string, unknown>>();

  const upsert = (teamA: string, teamB: string, intensity: number): void => {
    if (!teams[teamA] || !teams[teamB]) return;
    const id = rivalryId(teamA, teamB);
    const existing = byId.get(id);
    const firstTeam = teams[teamA]!;
    const secondTeam = teams[teamB]!;
    const isDivision = firstTeam['division'] === secondTeam['division'];
    const nextIntensity = Math.max(isDivision ? 40 : 10, Math.round(intensity));

    if (existing) {
      existing['intensity'] = Math.max(Number(existing['intensity'] ?? 0), nextIntensity);
      existing['isDivision'] = Boolean(existing['isDivision']) || isDivision;
      return;
    }

    byId.set(id, {
      id,
      teamA: [teamA, teamB].sort()[0],
      teamB: [teamA, teamB].sort()[1],
      intensity: nextIntensity,
      isDivision,
      history: [],
      lastMetYear: null,
      lastMetWeek: null,
    });
  };

  for (const [teamId, team] of Object.entries(teams)) {
    const rivalries = Array.isArray(team['rivalries']) ? team['rivalries'] as Array<Record<string, unknown>> : [];
    for (const rivalry of rivalries) {
      const opponentId = typeof rivalry['teamId'] === 'string' ? rivalry['teamId'] : null;
      const heat = Number(rivalry['heat'] ?? 0);
      if (!opponentId || heat <= 0) continue;
      upsert(teamId, opponentId, heat);
    }

    const rivals = (team['rivals'] as Record<string, Record<string, unknown>> | undefined) ?? {};
    for (const [opponentId, rival] of Object.entries(rivals)) {
      const heat = Number(rival['heat'] ?? 0);
      if (heat <= 0) continue;
      upsert(teamId, opponentId, heat * 8);
    }
  }

  return [...byId.values()];
}

/** Register a migration from version N to N+1. */
export function registerMigration(fromVersion: number, fn: MigrationFn): void {
  migrations.set(fromVersion, fn);
}

/** Run all necessary migrations to bring a save up to the target version. */
export function migrate(
  state: Record<string, unknown>,
  targetVersion: number,
): Record<string, unknown> {
  let current = state;
  let version = (current['version'] as number) ?? 0;

  while (version < targetVersion) {
    const fn = migrations.get(version);
    if (!fn) {
      throw new Error(
        `No migration found for version ${version}. ` +
        `Cannot upgrade to version ${targetVersion}.`,
      );
    }
    current = fn(current);
    version++;
    current['version'] = version;
  }

  return current;
}

/** Get the list of registered migration versions. */
export function getRegisteredVersions(): number[] {
  return Array.from(migrations.keys()).sort((a, b) => a - b);
}

registerMigration(1, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};

  for (const team of Object.values(teams)) {
    const wins = Number(team['wins'] ?? 0);
    const losses = Number(team['losses'] ?? 0);
    const ties = Number(team['ties'] ?? 0);
    team['seasonStats'] = team['seasonStats'] ?? {
      gamesPlayed: wins + losses + ties,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      turnoversLost: 0,
      turnoversForced: 0,
      sacksFor: 0,
      sacksAgainst: 0,
    };
  }

  return {
    ...state,
    teams,
    weekSummaries: Array.isArray(state['weekSummaries']) ? state['weekSummaries'] : [],
    playoffBracket: state['playoffBracket'] ?? null,
  };
});

registerMigration(2, (state) => ({
  ...state,
  offseasonState: state['offseasonState'] ?? null,
}));

registerMigration(3, (state) => ({
  ...state,
  narrativeState: {
    activeArcs: Array.isArray((state['narrativeState'] as Record<string, unknown> | undefined)?.['activeArcs'])
      ? (state['narrativeState'] as Record<string, unknown>)['activeArcs']
      : [],
    hooks: Array.isArray((state['narrativeState'] as Record<string, unknown> | undefined)?.['hooks'])
      ? (state['narrativeState'] as Record<string, unknown>)['hooks']
      : [],
    recentHeadlines: Array.isArray((state['narrativeState'] as Record<string, unknown> | undefined)?.['recentHeadlines'])
      ? (state['narrativeState'] as Record<string, unknown>)['recentHeadlines']
      : [],
  },
  gameDayState: {
    recentPackages: [],
    latestPackageId: null,
  },
}));

registerMigration(4, (state) => ({
  ...state,
  franchiseHistory: Array.isArray(state['franchiseHistory']) ? state['franchiseHistory'] : [],
  playerArchive: Array.isArray(state['playerArchive']) ? state['playerArchive'] : [],
}));

registerMigration(5, (state) => {
  const teams = (state['teams'] as Record<string, Record<string, unknown>> | undefined) ?? {};

  for (const team of Object.values(teams)) {
    team['mentoringPairs'] = Array.isArray(team['mentoringPairs']) ? team['mentoringPairs'] : [];
  }

  return {
    ...state,
    teams,
    records: createEmptyRecordBook(),
    awardsHistory: Array.isArray(state['awardsHistory']) ? state['awardsHistory'] : [],
    hallOfFame: Array.isArray(state['hallOfFame']) ? state['hallOfFame'] : [],
    powerRankings: Array.isArray(state['powerRankings']) ? state['powerRankings'] : [],
  };
});

registerMigration(6, (state) => ({
  ...state,
  offFieldEvents: Array.isArray(state['offFieldEvents']) ? state['offFieldEvents'] : [],
  recentPressConferences: Array.isArray(state['recentPressConferences']) ? state['recentPressConferences'] : [],
  coachingHistory: Array.isArray(state['coachingHistory']) ? state['coachingHistory'] : [],
  leagueRivalries: Array.isArray(state['leagueRivalries']) ? state['leagueRivalries'] : deriveLeagueRivalries(state),
  activeEffects: Array.isArray(state['activeEffects']) ? state['activeEffects'] : [],
}));
