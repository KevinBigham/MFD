/**
 * MFD Save Migration Pipeline
 *
 * Version-keyed transforms that upgrade old saves to the current schema.
 * Each migration takes a save at version N and returns version N+1.
 */

type MigrationFn = (state: Record<string, unknown>) => Record<string, unknown>;

const migrations: Map<number, MigrationFn> = new Map();

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
