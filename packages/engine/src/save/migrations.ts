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
