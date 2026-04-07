import { describe, expect, it } from 'vitest';

import {
  CAP_PROJ_986,
  CEREMONY_986,
  EXPANSION_DRAFT_986,
  GENERATIONAL_986,
  OWNER_MODE_986,
  PLAYER_COMPARE_986,
  POWER_RANKINGS_986,
  PRACTICE_SQUAD_986,
  RIVALRY_TROPHIES_986,
  TIMELINE_986,
} from '../src/systems/game-features.js';

describe('game-features.js', () => {
  it('rivalry trophy generator and power rankings return expected shapes', () => {
    const trophy = RIVALRY_TROPHIES_986.generate(
      { abbr: 'PHI', icon: '🦅' },
      { abbr: 'DAL', icon: '⭐' },
      () => 0
    );
    expect(trophy.name).toBe(RIVALRY_TROPHIES_986.names[0]);
    expect(trophy.team1).toBe('PHI');

    const ranked = POWER_RANKINGS_986.generate(
      [
        { id: 'a', wins: 8, losses: 2, pf: 300, pa: 200, streak: 4, roster: [{ ovr: 80 }] },
        { id: 'b', wins: 2, losses: 8, pf: 180, pa: 300, streak: -3, roster: [{ ovr: 70 }] },
      ],
      10
    );
    expect(ranked).toHaveLength(2);
    expect(ranked[0].rank).toBe(1);
    expect(typeof ranked[0].blurb).toBe('string');
  });

  it('cap projection and owner mode revenue calculations work', () => {
    const team = {
      deadCap: 4,
      fanbase: 70,
      ticketTier986: 2,
      stadiumLevel986: 2,
      roster: [
        { name: 'QB', pos: 'QB', contract: { salary: 30, years: 2 } },
        { name: 'WR', pos: 'WR', contract: { salary: 15, years: 1 } },
      ],
    };
    const proj = CAP_PROJ_986.project(team, 2026, () => 255);
    expect(proj).toHaveLength(3);
    expect(proj[0].space).toBeGreaterThan(0);

    const rev = OWNER_MODE_986.calcRevenue(team, 10);
    expect(rev).toBeGreaterThan(0);
  });

  it('generational, compare, timeline, and ceremony helpers return coherent payloads', () => {
    expect(GENERATIONAL_986.shouldSpawn(2030, () => 0.1)).toBe(true);
    expect(GENERATIONAL_986.shouldSpawn(2030, () => 0.9)).toBe(false);

    const gen = GENERATIONAL_986.create(() => 0);
    expect(gen.isGenerational).toBe(true);
    expect(gen.ovr).toBeGreaterThanOrEqual(78);

    const radar = PLAYER_COMPARE_986.buildRadar(
      { ratings: { speed: 90, strength: 70, catching: 85, awareness: 80, stamina: 88 } },
      { ratings: { speed: 80, strength: 75, catching: 78, awareness: 76, stamina: 81 } }
    );
    expect(radar.categories).toHaveLength(5);
    expect(radar.p1).toHaveLength(5);

    const tl = TIMELINE_986.addEvent([], 2026, 4, 'trade', 'Blockbuster move', '🔁');
    expect(tl).toHaveLength(1);
    expect(tl[0].type).toBe('trade');

    const retire = CEREMONY_986.generateRetirementSpeech(
      { college: 'State U' },
      { city: 'Philly', name: 'Eagles' },
      { seasons: 11, proBowls: 4, passYds: 22000 }
    );
    expect(retire.lines.length).toBeGreaterThan(1);
    expect(retire.isHoFWorthy).toBe(true);
  });

  it('practice squad and expansion draft helpers enforce constraints', () => {
    expect(PRACTICE_SQUAD_986.canAdd({ age: 25, ovr: 67 })).toBe(true);
    expect(PRACTICE_SQUAD_986.canAdd({ age: 28, ovr: 67 })).toBe(false);

    const team = { practiceSquad986: [{ id: 'p1', name: 'Prospect' }], roster: [] };
    expect(PRACTICE_SQUAD_986.promote(team, { id: 'p1', name: 'Prospect' })).toBe(true);
    expect(team.roster).toHaveLength(1);

    expect(EXPANSION_DRAFT_986.shouldTrigger(10, () => 0.1)).toBe(true);
    expect(EXPANSION_DRAFT_986.shouldTrigger(8, () => 0.01)).toBe(false);
  });
});
