import { describe, expect, it } from 'vitest';
import { buildCartridge, CARTRIDGE_VERSION, parseCartridge } from './dynasty-cartridge';

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
    version: 37,
    year: 2032,
    week: 9,
    teams,
    players,
    schedule: [],
    playoffBracket: null,
  };
}

describe('dynasty cartridge', () => {
  it('reports cartridge size and keeps synthetic multi-season exports below the regression guard', () => {
    const built = buildCartridge(makeSyntheticSave(32, 53), { teamName: 'Guard', season: 12, week: 9 });

    if (!built.ok) throw new Error(built.error);
    expect(built.sizeBytes).toBe(built.json.length);
    expect(built.sizeBytes).toBeLessThan(1_000_000);
  });

  it('exports v2 cartridges with rostered player-map stubs and parses them back from rosters', () => {
    const save = makeSyntheticSave(1, 2);
    const built = buildCartridge(save, { teamName: 'Dedupe' });

    if (!built.ok) throw new Error(built.error);
    expect(built.envelope.cartridgeVersion).toBe(CARTRIDGE_VERSION);
    expect((built.envelope.save as any).players['team-0-player-0']).toEqual({ $roster: 'team-0' });

    const parsed = parseCartridge(built.json);

    if (!parsed.ok) throw new Error(parsed.error);
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

    if (!parsed.ok) throw new Error(parsed.error);
    const parsedSave = parsed.save as any;
    expect(parsed.version).toBe('mfd-cartridge.v1');
    expect(parsedSave.players['team-0-player-0']).toEqual(save.players['team-0-player-0']);
    expect(parsedSave.players['team-0-player-0']).not.toBe(parsedSave.teams['team-0'].roster[0]);
  });

  it('reduces duplicated roster player payloads compared with a v1-style envelope', () => {
    const save = makeSyntheticSave(8, 20);
    const built = buildCartridge(save, { teamName: 'Size Test' });

    if (!built.ok) throw new Error(built.error);
    const v1StyleJson = JSON.stringify({
      ...built.envelope,
      cartridgeVersion: 'mfd-cartridge.v1',
      save,
    });

    expect(built.json.length).toBeLessThan(v1StyleJson.length * 0.7);
  });
});
