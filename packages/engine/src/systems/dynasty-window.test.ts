import { describe, it, expect } from 'vitest';
import type { Player, Team } from '../types';
import {
  calculateDynastyWindow,
  windowPhaseLabel,
  windowPhaseColor,
} from './dynasty-window';

let playerIdCounter = 0;

function makePlayer(ovr: number, age: number, isStarter = true): Player {
  return {
    id: `p-${ovr}-${age}-${playerIdCounter++}`,
    firstName: 'Test',
    lastName: 'Player',
    name: 'Test Player',
    pos: 'QB',
    age,
    ovr,
    pot: ovr + 5,
    ratings: {},
    devTrait: 'normal',
    personality: { workEthic: 5, loyalty: 5, greed: 5, pressure: 5, ambition: 5 },
    traits: [],
    archetype: null,
    contract: { salary: 5_000_000, years: 3, totalValue: 15_000_000 },
    teamId: 'test',
    draftYear: 2020,
    draftRound: 1,
    draftPick: 1,
    college: 'Test U',
    yearsExp: age - 22,
    careerStats: {} as Player['careerStats'],
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 70,
    chemistry: 70,
    systemFit: 70,
    cliqueId: null,
    jerseyNumber: 1,
    endorsements: [],
    isStarter,
    role: null,
    roleWeeks: 0,
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: {} as Player['stats'],
  } as unknown as Player;
}

function makeTeam(players: Player[]): Team {
  return {
    id: 'test-team',
    city: 'Test',
    name: 'Testers',
    abbrev: 'TST',
    roster: players,
    staff: {},
  } as unknown as Team;
}

describe('Dynasty Window', () => {
  describe('calculateDynastyWindow', () => {
    it('elite young roster = peaking', () => {
      const roster = Array.from({ length: 22 }, (_, i) =>
        makePlayer(85 + (i % 5), 25 + (i % 4)),
      );
      const result = calculateDynastyWindow(makeTeam(roster), 2026, 7);
      expect(result.phase).toBe('peaking');
      expect(result.score).toBeGreaterThan(60);
    });

    it('young low-OVR roster = opening or rebuilding', () => {
      const roster = Array.from({ length: 22 }, (_, i) =>
        makePlayer(62 + (i % 3), 22 + (i % 3)),
      );
      const result = calculateDynastyWindow(makeTeam(roster), 2026, 10);
      expect(['opening', 'rebuilding']).toContain(result.phase);
    });

    it('old high-OVR roster = closing', () => {
      const roster = Array.from({ length: 22 }, () =>
        makePlayer(85, 32),
      );
      const result = calculateDynastyWindow(makeTeam(roster), 2026, 5);
      expect(['closing', 'peaking']).toContain(result.phase);
    });

    it('terrible roster = rebuilding', () => {
      const roster = Array.from({ length: 22 }, () =>
        makePlayer(58, 32),
      );
      const result = calculateDynastyWindow(makeTeam(roster), 2026, 3);
      expect(result.phase).toBe('rebuilding');
      expect(result.score).toBeLessThan(30);
    });

    it('returns all factor breakdowns', () => {
      const roster = [makePlayer(80, 26)];
      const result = calculateDynastyWindow(makeTeam(roster), 2026);
      expect(result.factors.rosterStrength).toBeGreaterThanOrEqual(0);
      expect(result.factors.youthFactor).toBeGreaterThanOrEqual(0);
      expect(result.factors.capHealth).toBeGreaterThanOrEqual(0);
      expect(result.factors.draftCapital).toBeGreaterThanOrEqual(0);
    });

    it('more draft picks = better draft capital score', () => {
      const roster = [makePlayer(75, 26)];
      const rich = calculateDynastyWindow(makeTeam(roster), 2026, 12);
      const poor = calculateDynastyWindow(makeTeam(roster), 2026, 3);
      expect(rich.factors.draftCapital).toBeGreaterThan(poor.factors.draftCapital);
    });

    it('has a description for the phase', () => {
      const roster = [makePlayer(80, 26)];
      const result = calculateDynastyWindow(makeTeam(roster), 2026);
      expect(result.description.length).toBeGreaterThan(10);
    });

    it('determines trend correctly', () => {
      const youngGood = Array.from({ length: 10 }, () => makePlayer(82, 24));
      const result = calculateDynastyWindow(makeTeam(youngGood), 2026, 8);
      expect(result.trend).toBe('improving');
    });

    it('handles empty roster', () => {
      const result = calculateDynastyWindow(makeTeam([]), 2026);
      expect(result.phase).toBeTruthy();
      expect(typeof result.score).toBe('number');
    });
  });

  describe('windowPhaseLabel', () => {
    it('returns labels for all phases', () => {
      expect(windowPhaseLabel('opening')).toBe('WINDOW OPENING');
      expect(windowPhaseLabel('peaking')).toBe('WIN NOW');
      expect(windowPhaseLabel('closing')).toBe('WINDOW CLOSING');
      expect(windowPhaseLabel('rebuilding')).toBe('REBUILD');
    });
  });

  describe('windowPhaseColor', () => {
    it('returns colors for all phases', () => {
      expect(windowPhaseColor('opening')).toContain('cyan');
      expect(windowPhaseColor('peaking')).toContain('gold');
      expect(windowPhaseColor('closing')).toContain('red');
      expect(windowPhaseColor('rebuilding')).toBeTruthy();
    });
  });
});
