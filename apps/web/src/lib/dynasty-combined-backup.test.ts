import { describe, expect, it } from 'vitest';
import {
  buildCartridge,
  parseCartridge,
  RIVALRIES_SCHEMA_VERSION,
} from '@mfd/engine';
import {
  DYNASTY_COMBINED_BACKUP_KIND,
  exportDynastyCombinedBackupJson,
  parseDynastyCombinedBackupJson,
} from './dynasty-combined-backup';
import type { DynastySidecarArchivePayload } from './dynasty-sidecar-archive';

function makeCartridgeJson(): string {
  const cartridge = buildCartridge(
    { version: 36, teams: {}, players: {}, marker: 'combined-backup-test' },
    { teamName: 'Chicago Bears', season: 2026, week: 5 },
  );

  if (!cartridge.ok) throw new Error(cartridge.error);
  return cartridge.json;
}

function makeSidecarPayload(): DynastySidecarArchivePayload {
  return {
    schemaVersion: 1,
    sidecars: {
      hallOfFame: {
        schemaVersion: 1,
        dynastiesById: {
          'dynasty-a': {
            dynastyId: 'dynasty-a',
            teamId: 'team-1',
            teamCity: 'Chicago',
            teamName: 'Bears',
            teamAbbr: 'CHI',
            startYear: 2026,
            lastSyncedYear: 2030,
            entries: [],
          },
        },
      },
      scrapbook: {
        schemaVersion: 2,
        entriesByDynastyId: {},
        pendingPlayoffLoreByDynastyId: {},
      },
      rookieOfYear: {
        schemaVersion: 1,
        byDynastyId: {},
      },
      rosterContinuity: {
        schemaVersion: 1,
        byDynastyId: {},
      },
      careerMeta: {
        schemaVersion: 1,
        dynasties: [],
        careerTotals: {
          dynasties: 0,
          seasonsCoached: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          championships: 0,
          playoffAppearances: 0,
          breakoutsDeveloped: 0,
          coachesDeveloped: 0,
          hallOfFamersDeveloped: 0,
        },
      },
      rivalries: {
        schemaVersion: RIVALRIES_SCHEMA_VERSION,
        generatedAt: 0,
        teams: {},
      },
    },
  };
}

describe('dynasty-combined-backup', () => {
  it('exports a versioned package with a valid .mfd cartridge and sidecar payload', () => {
    const json = exportDynastyCombinedBackupJson(
      makeCartridgeJson(),
      makeSidecarPayload(),
      new Date('2026-06-23T12:00:00.000Z'),
    );
    const envelope = JSON.parse(json) as Record<string, unknown>;
    const parsed = parseDynastyCombinedBackupJson(json);

    expect(envelope.kind).toBe(DYNASTY_COMBINED_BACKUP_KIND);
    expect(envelope.exportedAt).toBe('2026-06-23T12:00:00.000Z');
    expect(parsed).toMatchObject({
      ok: true,
      summary: {
        dynasties: 1,
        hallOfFameInductees: 0,
        rivalryTeams: 0,
        rivalryRecords: 0,
      },
    });

    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parseCartridge(parsed.cartridgeText).ok).toBe(true);
  });

  it('keeps normal .mfd cartridge text out of the combined-backup import path', () => {
    const cartridgeJson = makeCartridgeJson();

    expect(parseCartridge(cartridgeJson).ok).toBe(true);
    expect(parseDynastyCombinedBackupJson(cartridgeJson)).toEqual({
      ok: false,
      reason: 'Import is not a valid combined dynasty backup.',
    });
  });

  it('rejects combined backups with invalid cartridge payloads', () => {
    const json = JSON.stringify({
      kind: DYNASTY_COMBINED_BACKUP_KIND,
      schemaVersion: 1,
      exportedAt: '2026-06-23T12:00:00.000Z',
      cartridge: { nope: true },
      sidecars: makeSidecarPayload(),
    });

    expect(parseDynastyCombinedBackupJson(json)).toEqual({
      ok: false,
      reason: 'Combined backup .mfd cartridge is not valid.',
    });
  });

  it('rejects combined backups with invalid sidecar payloads', () => {
    const payload = makeSidecarPayload();
    payload.sidecars.rookieOfYear.byDynastyId['dynasty-a'] = [{
      playerId: 'p1',
      playerName: 'Bad Position',
      teamId: 'team-1',
      teamAbbr: 'CHI',
      position: 'BAD' as never,
      compositeScore: 10,
      headline: 'Invalid position should fail.',
      highlights: [],
      season: 2026,
    }];
    const json = exportDynastyCombinedBackupJson(makeCartridgeJson(), makeSidecarPayload());
    const envelope = JSON.parse(json) as Record<string, unknown>;
    envelope.sidecars = payload;

    expect(parseDynastyCombinedBackupJson(JSON.stringify(envelope))).toEqual({
      ok: false,
      reason: 'Combined backup sidecar archive is not valid.',
    });
  });
});
