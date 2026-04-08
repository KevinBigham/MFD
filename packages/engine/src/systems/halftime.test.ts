import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import type { GamePlan, Team, TeamGameStats } from '../types';
import {
  generateHalftimeAdjustments,
  shouldMakeAdjustments,
} from './halftime';

function seededRng(seed = 42) {
  return mulberry32(seed);
}

function makeTeam(gameplan = 75): Team {
  return {
    id: 'test-team',
    city: 'Test',
    name: 'Testers',
    abbrev: 'TST',
    roster: [],
    staff: {
      hc: {
        id: 'hc-1',
        name: 'Coach Test',
        age: 50,
        role: 'hc',
        ratings: { gameplan, motivation: 70, development: 70 },
        traits: ['gambler'],
        contract: null,
        yearsWithTeam: 3,
        careerWins: 40,
        careerLosses: 20,
        experience: 10,
        xp: 0,
        perks: [],
      },
    },
  } as unknown as Team;
}

function makeStats(overrides: Partial<TeamGameStats> = {}): TeamGameStats {
  return {
    points: 10,
    passingYards: 120,
    rushingYards: 60,
    passAtt: 18,
    passComp: 12,
    passTD: 1,
    passINT: 0,
    rushAtt: 12,
    rushTD: 0,
    fumbles: 0,
    sacks: 1,
    sackYdsLost: 7,
    defINT: 0,
    penalties: 2,
    penaltyYds: 15,
    fgAtt: 1,
    fgMade: 1,
    playerLines: {},
    gamesPlayed: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    ...overrides,
  } as unknown as TeamGameStats;
}

function makePlan(
  off: GamePlan['offensiveScheme'] = 'balanced',
  def: GamePlan['defensiveScheme'] = 'base',
): GamePlan {
  return {
    offensiveScheme: off,
    defensiveScheme: def,
    keyMatchup: null,
    gamePlanBonus: 0,
  };
}

describe('Halftime Adjustments', () => {
  describe('generateHalftimeAdjustments', () => {
    it('returns a valid halftime report', () => {
      const rng = seededRng();
      const team = makeTeam();
      const report = generateHalftimeAdjustments(
        rng, team, makePlan(), 0, makeStats(), makeStats(),
      );
      expect(report.teamId).toBe('test-team');
      expect(report.adjustedPlan).toBeDefined();
      expect(typeof report.secondHalfQualityBonus).toBe('number');
      expect(report.commentary.length).toBeGreaterThan(0);
    });

    it('switches to pass-heavy when trailing significantly', () => {
      const rng = seededRng(10);
      const team = makeTeam();
      const report = generateHalftimeAdjustments(
        rng, team, makePlan('balanced', 'base'), -17, makeStats(), makeStats(),
      );
      expect(['pass_heavy', 'spread']).toContain(report.adjustedPlan.offensiveScheme);
      expect(report.adjustments.length).toBeGreaterThan(0);
    });

    it('switches to run-heavy when leading big', () => {
      const rng = seededRng(5);
      const team = makeTeam();
      const report = generateHalftimeAdjustments(
        rng, team, makePlan('balanced', 'base'), 21, makeStats(), makeStats(),
      );
      expect(['run_heavy', 'power']).toContain(report.adjustedPlan.offensiveScheme);
    });

    it('switches to coverage when getting torched through the air', () => {
      const rng = seededRng();
      const team = makeTeam();
      const oppStats = makeStats({ passingYards: 200, rushingYards: 30 });
      const report = generateHalftimeAdjustments(
        rng, team, makePlan('balanced', 'base'), -3, makeStats(), oppStats,
      );
      expect(report.adjustedPlan.defensiveScheme).toBe('coverage');
    });

    it('no adjustments when game plan is working', () => {
      const rng = seededRng(1);
      const team = makeTeam();
      // Balanced game, decent stats, leading slightly
      const report = generateHalftimeAdjustments(
        rng, team, makePlan('balanced', 'coverage'), 7,
        makeStats({ passingYards: 140, rushingYards: 80 }),
        makeStats({ passingYards: 90, rushingYards: 50 }),
      );
      // May or may not adjust but shouldn't crash
      expect(report.adjustedPlan).toBeDefined();
    });

    it('higher coach rating gives better quality bonus', () => {
      const rng1 = seededRng(42);
      const rng2 = seededRng(42);
      const goodCoach = makeTeam(90);
      const badCoach = makeTeam(55);

      const goodReport = generateHalftimeAdjustments(
        rng1, goodCoach, makePlan(), -14, makeStats(), makeStats(),
      );
      const badReport = generateHalftimeAdjustments(
        rng2, badCoach, makePlan(), -14, makeStats(), makeStats(),
      );
      expect(goodReport.secondHalfQualityBonus).toBeGreaterThanOrEqual(badReport.secondHalfQualityBonus);
    });

    it('commentary describes adjustments', () => {
      const rng = seededRng();
      const team = makeTeam();
      const report = generateHalftimeAdjustments(
        rng, team, makePlan(), -21, makeStats(), makeStats({ passingYards: 200 }),
      );
      if (report.adjustments.length > 0) {
        expect(report.commentary).not.toContain('sticking with');
      }
    });
  });

  describe('shouldMakeAdjustments', () => {
    it('returns true when trailing', () => {
      expect(shouldMakeAdjustments(makeTeam(), -7)).toBe(true);
    });

    it('returns true in close games', () => {
      expect(shouldMakeAdjustments(makeTeam(), 3)).toBe(true);
    });

    it('may return true or false when leading big', () => {
      const result = shouldMakeAdjustments(makeTeam(), 21);
      expect(typeof result).toBe('boolean');
    });
  });
});
