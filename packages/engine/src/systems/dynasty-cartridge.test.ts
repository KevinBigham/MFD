import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCartridge,
  CARTRIDGE_VERSION,
  generateFileName,
  parseCartridge,
  shouldPromptBackup,
} from './dynasty-cartridge';

function makeSyntheticSave(teamCount = 4, playersPerTeam = 12) {
  const teams: Record<string, { id: string; roster: Array<Record<string, unknown>> }> = {};
  const players: Record<string, Record<string, unknown>> = {};

  for (let teamIndex = 0; teamIndex < teamCount; teamIndex += 1) {
    const teamId = `team-${teamIndex}`;
    const roster: Array<Record<string, unknown>> = [];
    for (let playerIndex = 0; playerIndex < playersPerTeam; playerIndex += 1) {
      const id = `${teamId}-player-${playerIndex}`;
      const player = {
        id,
        name: `Player ${teamIndex}-${playerIndex}`,
        ratings: {
          speed: 80 + (playerIndex % 12),
          awareness: 70 + (playerIndex % 10),
          stamina: 75 + (playerIndex % 8),
        },
        stats: {
          gamesPlayed: playerIndex,
          passYds: playerIndex * 17,
          rushYds: playerIndex * 9,
          recYds: playerIndex * 11,
        },
        notes: `history-${teamIndex}-${playerIndex}-`.repeat(8),
      };
      roster.push(player);
      players[id] = structuredClone(player);
    }
    teams[teamId] = { id: teamId, roster };
  }

  return {
    version: 38,
    year: 2032,
    week: 9,
    teams,
    players,
    schedule: [],
    playoffBracket: null,
  };
}

describe('dynasty cartridge', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a plain JSON current envelope and preserves the provided metadata', () => {
    const built = buildCartridge(
      { version: 38, userTeamId: 'chi' },
      { teamName: 'Chicago Bears', season: 2026, week: 5 },
    );

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.envelope.cartridgeVersion).toBe(CARTRIDGE_VERSION);
    expect(built.envelope.meta).toEqual({ teamName: 'Chicago Bears', season: 2026, week: 5 });
    expect(built.envelope.save).toEqual({ version: 38, userTeamId: 'chi' });
    expect(built.sizeBytes).toBe(built.json.length);
    expect(JSON.parse(built.json)).toEqual(built.envelope);
  });

  it('strips ephemeral broadcast payloads from exported scheduled and playoff results without mutating the source save', () => {
    const sourceSave = {
      version: 38,
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
    const current = buildCartridge({ version: 38, userTeamId: 'chi' }, { teamName: 'Chicago' });
    expect(current.ok).toBe(true);
    if (!current.ok) return;

    expect(parseCartridge(current.json)).toEqual({
      ok: true,
      save: { version: 38, userTeamId: 'chi' },
      meta: { teamName: 'Chicago' },
      version: CARTRIDGE_VERSION,
    });
    expect(parseCartridge(JSON.stringify({ save: { version: 12 }, meta: { teamName: 'Legacy' } }))).toEqual({
      ok: true,
      save: { version: 12 },
      meta: { teamName: 'Legacy' },
      version: 'legacy',
    });
    expect(parseCartridge(JSON.stringify({ version: 38, userTeamId: 'chi' }))).toEqual({
      ok: false,
      error: 'Could not decode cartridge. Check that you pasted the full string.',
    });
  });

  it('reports cartridge size and keeps synthetic multi-season exports below the regression guard', () => {
    const built = buildCartridge(makeSyntheticSave(32, 53), { teamName: 'Guard', season: 12, week: 9 });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.sizeBytes).toBe(built.json.length);
    expect(built.sizeBytes).toBeLessThan(1_000_000);
  });

  it('exports v2 cartridges with rostered player-map stubs and parses them back from rosters', () => {
    const save = makeSyntheticSave(1, 2);
    const built = buildCartridge(save, { teamName: 'Dedupe' });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.envelope.cartridgeVersion).toBe(CARTRIDGE_VERSION);
    expect((built.envelope.save as any).players['team-0-player-0']).toEqual({ $roster: 'team-0' });

    const parsed = parseCartridge(built.json);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const parsedSave = parsed.save as any;
    expect(parsed.version).toBe(CARTRIDGE_VERSION);
    expect(parsedSave.players['team-0-player-0']).toBe(parsedSave.teams['team-0'].roster[0]);
  });

  it('continues to parse v1 cartridges without dedupe rewrites', () => {
    const save = makeSyntheticSave(1, 1);
    const text = JSON.stringify({
      cartridgeVersion: 'mfd-cartridge.v1',
      exportedAt: '2026-07-07T00:00:00.000Z',
      meta: { teamName: 'Legacy' },
      save,
    });

    const parsed = parseCartridge(text);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const parsedSave = parsed.save as any;
    expect(parsed.version).toBe('mfd-cartridge.v1');
    expect(parsedSave.players['team-0-player-0']).toEqual(save.players['team-0-player-0']);
    expect(parsedSave.players['team-0-player-0']).not.toBe(parsedSave.teams['team-0'].roster[0]);
  });

  it('reduces duplicated roster player payloads compared with a v1-style envelope', () => {
    const save = makeSyntheticSave(8, 20);
    const built = buildCartridge(save, { teamName: 'Size Test' });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const v1StyleJson = JSON.stringify({
      ...built.envelope,
      cartridgeVersion: 'mfd-cartridge.v1',
      save,
    });

    expect(built.json.length).toBeLessThan(v1StyleJson.length * 0.7);
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
