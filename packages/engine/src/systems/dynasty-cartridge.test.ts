import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCartridge,
  CARTRIDGE_VERSION,
  generateFileName,
  parseCartridge,
  shouldPromptBackup,
} from './dynasty-cartridge';

describe('dynasty cartridge', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a plain JSON v1 envelope and preserves the provided metadata', () => {
    const built = buildCartridge(
      { version: 36, userTeamId: 'chi' },
      { teamName: 'Chicago Bears', season: 2026, week: 5 },
    );

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.envelope.cartridgeVersion).toBe(CARTRIDGE_VERSION);
    expect(built.envelope.meta).toEqual({ teamName: 'Chicago Bears', season: 2026, week: 5 });
    expect(built.envelope.save).toEqual({ version: 36, userTeamId: 'chi' });
    expect(built.sizeBytes).toBe(built.json.length);
    expect(JSON.parse(built.json)).toEqual(built.envelope);
  });

  it('strips ephemeral broadcast payloads from exported scheduled and playoff results without mutating the source save', () => {
    const sourceSave = {
      version: 36,
      schedule: [{
        week: 9,
        games: [{
          result: {
            id: 'game-1',
            broadcast: { highlights: [{ commentary: 'Do not export.' }] },
          },
        }],
      }],
      playoffBracket: {
        matchups: [{
          result: {
            id: 'playoff-game-1',
            broadcast: { highlights: [{ commentary: 'Also do not export.' }] },
          },
        }],
      },
    };

    const built = buildCartridge(sourceSave);

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const exportedSave = built.envelope.save as typeof sourceSave;
    expect(exportedSave.schedule[0]!.games[0]!.result.broadcast).toBeUndefined();
    expect(exportedSave.playoffBracket.matchups[0]!.result.broadcast).toBeUndefined();
    expect(sourceSave.schedule[0]!.games[0]!.result.broadcast).toEqual({
      highlights: [{ commentary: 'Do not export.' }],
    });
    expect(sourceSave.playoffBracket.matchups[0]!.result.broadcast).toEqual({
      highlights: [{ commentary: 'Also do not export.' }],
    });
  });

  it('parses current envelopes and legacy save wrappers but rejects raw game-state JSON', () => {
    const current = buildCartridge({ version: 36, userTeamId: 'chi' }, { teamName: 'Chicago' });
    expect(current.ok).toBe(true);
    if (!current.ok) return;

    expect(parseCartridge(current.json)).toEqual({
      ok: true,
      save: { version: 36, userTeamId: 'chi' },
      meta: { teamName: 'Chicago' },
      version: CARTRIDGE_VERSION,
    });
    expect(parseCartridge(JSON.stringify({ save: { version: 12 }, meta: { teamName: 'Legacy' } }))).toEqual({
      ok: true,
      save: { version: 12 },
      meta: { teamName: 'Legacy' },
      version: 'legacy',
    });
    expect(parseCartridge(JSON.stringify({ version: 36, userTeamId: 'chi' }))).toEqual({
      ok: false,
      error: 'Could not decode cartridge. Check that you pasted the full string.',
    });
  });

  it('generates sanitized filenames with season and week metadata fallbacks', () => {
    expect(generateFileName({ teamName: 'New York / AFC #1', season: 3, week: 12 }))
      .toBe('NewYorkAFC1-S3-W12.mfd');
    expect(generateFileName({})).toBe('Dynasty-S?-W?.mfd');
  });

  it('keeps the legacy wall-clock backup prompt helper deterministic under a fixed clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T18:00:00.000Z'));

    expect(shouldPromptBackup(0, 0)).toBe(false);
    expect(shouldPromptBackup(0, 1)).toBe(true);
    expect(shouldPromptBackup(Date.now() - 31 * 60 * 1000, 1)).toBe(true);
    expect(shouldPromptBackup(Date.now() - 29 * 60 * 1000, 1)).toBe(false);
  });
});
