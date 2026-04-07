import { describe, expect, it } from 'vitest';

import { MIN_SALARY } from '../src/config/cap-math.js';
import {
  backloadContract973,
  calcCapHit,
  calcContractScore994,
  calcDeadCap994,
  calcDeadMoney,
  calcFourthDownEV995,
  extendAndRestructure973,
  makeContract,
  restructureContract,
} from '../src/systems/contracts.js';

function mkPlayer(age, contract) {
  return { age, contract };
}

describe('contracts.js', () => {
  describe('makeContract', () => {
    it('builds v35 contract shape with rounded prorated and cap hit', () => {
      const c = makeContract(15, 4, 12, 30);
      expect(c).toMatchObject({
        baseSalary: 15,
        years: 4,
        signingBonus: 12,
        prorated: 3,
        guaranteed: 30,
        restructured: false,
        originalYears: 4,
        salary: 18,
      });
    });

    it('enforces minimum salary floor', () => {
      const c = makeContract(0, 2, 0, 0);
      expect(c.baseSalary).toBe(MIN_SALARY);
      expect(c.salary).toBe(MIN_SALARY);
    });

    it('enforces minimum contract length of 1 year', () => {
      const c = makeContract(5, 0, 10, 0);
      expect(c.years).toBe(1);
      expect(c.prorated).toBe(10);
    });

    it('uses defaults when params are missing', () => {
      const c = makeContract(undefined, undefined, undefined, undefined);
      expect(c.baseSalary).toBe(MIN_SALARY);
      expect(c.years).toBe(1);
      expect(c.signingBonus).toBe(0);
      expect(c.guaranteed).toBe(0);
    });
  });

  describe('calcCapHit', () => {
    it('returns 0 for null contracts', () => {
      expect(calcCapHit(null)).toBe(0);
    });

    it('computes baseSalary + prorated for v35 contracts', () => {
      const c = makeContract(10, 4, 8, 20);
      expect(calcCapHit(c)).toBe(12);
    });

    it('falls back to legacy salary property', () => {
      expect(calcCapHit({ salary: 9.4 })).toBe(9.4);
    });
  });

  describe('calcDeadMoney', () => {
    it('returns 0 for missing contract or prorated', () => {
      expect(calcDeadMoney(null)).toBe(0);
      expect(calcDeadMoney({ years: 4 })).toBe(0);
    });

    it('returns prorated * years for valid contracts', () => {
      const c = makeContract(10, 4, 8, 20);
      expect(calcDeadMoney(c)).toBe(8);
    });
  });

  describe('restructureContract', () => {
    it('fails when contract is not v35-shaped', () => {
      const result = restructureContract({ age: 27, contract: { salary: 10 } });
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('v35');
    });

    it('fails for 1-year contracts', () => {
      const p = mkPlayer(28, makeContract(8, 1, 2, 2));
      const result = restructureContract(p);
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('1 year or less');
    });

    it('fails if already restructured', () => {
      const c = makeContract(10, 4, 4, 8);
      c.restructured = true;
      const result = restructureContract(mkPlayer(30, c));
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('Already restructured');
    });

    it('fails when base salary is too low to restructure', () => {
      const p = mkPlayer(30, makeContract(2, 4, 1, 1));
      const result = restructureContract(p);
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('Base salary too low');
    });

    it('applies expected restructure math for a normal contract', () => {
      const p = mkPlayer(30, makeContract(10, 4, 4, 8));
      const result = restructureContract(p);

      expect(result).toMatchObject({
        ok: true,
        savings: 6.6,
        addedPro: 2.2,
        years: 4,
        newHit: 4.4,
      });

      expect(p.contract).toMatchObject({
        baseSalary: 1.2,
        signingBonus: 12.8,
        prorated: 3.2,
        restructured: true,
        salary: 4.4,
      });
    });

    it('caps bonus spread years at 5', () => {
      const p = mkPlayer(26, makeContract(20, 8, 0, 0));
      const result = restructureContract(p);
      expect(result.ok).toBe(true);
      expect(result.years).toBe(5);
    });
  });

  describe('backloadContract973', () => {
    it('fails when contract is not v35-shaped', () => {
      const result = backloadContract973({ age: 27, contract: { salary: 10 } }, 2);
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('v35');
    });

    it('fails for 1-year contracts', () => {
      const p = mkPlayer(29, makeContract(12, 1, 1, 1));
      const result = backloadContract973(p, 2);
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('1 year or less');
    });

    it('fails if already backloaded', () => {
      const p = mkPlayer(29, makeContract(12, 4, 1, 1));
      p.contract.backloaded = true;
      const result = backloadContract973(p, 2);
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('Already backloaded');
    });

    it('fails when no base salary can be converted', () => {
      const p = mkPlayer(29, makeContract(1, 4, 0, 0));
      p.contract.baseSalary = 0;
      const result = backloadContract973(p, 2);
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('No base salary');
    });

    it('applies expected backload math and marks contract', () => {
      const p = mkPlayer(29, makeContract(12, 4, 8, 10));
      const result = backloadContract973(p, 2);

      expect(result).toMatchObject({
        ok: true,
        savings: 4,
        voidYears: 2,
        newHit: 10,
      });

      expect(p.contract).toMatchObject({
        baseSalary: 7.2,
        prorated: 2.8,
        backloaded: true,
        voidYears: 2,
        salary: 10,
      });
    });

    it('caps void years at 3', () => {
      const p = mkPlayer(29, makeContract(12, 4, 8, 10));
      const result = backloadContract973(p, 9);
      expect(result.ok).toBe(true);
      expect(result.voidYears).toBe(3);
    });
  });

  describe('extendAndRestructure973', () => {
    it('fails when contract is not v35-shaped', () => {
      const result = extendAndRestructure973({ age: 27, contract: { salary: 10 } }, 2);
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('v35');
    });

    it('fails for invalid extension lengths', () => {
      const p = mkPlayer(27, makeContract(9, 2, 2, 4));
      const result = extendAndRestructure973(p, -1);
      expect(result.ok).toBe(false);
      expect(result.msg).toContain('Invalid extension');
    });

    it('extends and restructures when possible', () => {
      const p = mkPlayer(27, makeContract(9, 2, 2, 4));
      const result = extendAndRestructure973(p, 2);

      expect(result).toMatchObject({
        ok: true,
        savings: 7.2,
        addedYears: 2,
        newHit: 4.6,
      });

      expect(p.contract.years).toBe(4);
      expect(p.contract.restructured).toBe(true);
    });

    it('still succeeds as extension-only when restructure guard fails', () => {
      const p = mkPlayer(23, makeContract(0.6, 1, 0, 0));
      const result = extendAndRestructure973(p, 1);

      expect(result.ok).toBe(true);
      expect(result.savings).toBe(0);
      expect(result.addedYears).toBe(1);
      expect(result.msg).toContain('Extended 1yr.');
    });

    it('caps added years at 3', () => {
      const p = mkPlayer(27, makeContract(9, 2, 2, 4));
      const result = extendAndRestructure973(p, 10);
      expect(result.ok).toBe(true);
      expect(result.addedYears).toBe(3);
    });
  });

  describe('calcContractScore994', () => {
    const gradeCases = [
      [10, 'A+'],
      [18, 'A'],
      [27, 'B'],
      [34, 'C'],
      [44, 'D'],
      [60, 'F'],
    ];

    gradeCases.forEach(([totalValue, expectedGrade]) => {
      it(`returns ${expectedGrade} for totalValue=${totalValue}`, () => {
        const result = calcContractScore994(80, 'XX', 27, 3, totalValue, 250);
        expect(result.grade).toBe(expectedGrade);
      });
    });

    it('returns numeric scoring metadata', () => {
      const result = calcContractScore994(80, 'XX', 27, 3, 27, 250);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('surplus');
      expect(result).toHaveProperty('annualCapPct');
      expect(result).toHaveProperty('fairValue');
      expect(result.annualCapPct).toBe(0.036);
    });

    it('clamps score between 0 and 100', () => {
      const high = calcContractScore994(90, 'XX', 27, 3, 0, 250);
      const low = calcContractScore994(90, 'XX', 27, 3, 150, 250);
      expect(high.score).toBe(100);
      expect(low.score).toBe(0);
    });
  });

  describe('calcDeadCap994', () => {
    it('matches expected dead cap math', () => {
      const result = calcDeadCap994(20, 4, 1);
      expect(result).toEqual({ deadCapHit: 15, capSavings: 15, netCapImpact: 0 });
    });

    it('clamps yearsRemaining to at least 1', () => {
      const result = calcDeadCap994(20, 0, 0);
      expect(result).toEqual({ deadCapHit: 20, capSavings: 20, netCapImpact: 0 });
    });

    it('clamps yearsCut to yearsRemaining', () => {
      const result = calcDeadCap994(20, 2, 5);
      expect(result).toEqual({ deadCapHit: 0, capSavings: 0, netCapImpact: 0 });
    });
  });

  describe('calcFourthDownEV995', () => {
    it('recommends go on 4th-and-1 at midfield', () => {
      const result = calcFourthDownEV995(1, 50, 0, 2, 900);
      expect(result.recommendation).toBe('go');
    });

    it('recommends punt on long-yardage deep in own territory', () => {
      const result = calcFourthDownEV995(15, 20, 0, 2, 900);
      expect(result.recommendation).toBe('punt');
    });

    it('returns stable option structure', () => {
      const result = calcFourthDownEV995(4, 45, 0, 1, 500);
      expect(result.goForIt).toHaveProperty('ev');
      expect(result.fieldGoal).toHaveProperty('ev');
      expect(result.fieldGoal).toHaveProperty('applicable');
      expect(result.punt).toHaveProperty('ev');
      expect(['go', 'fg', 'punt']).toContain(result.recommendation);
      expect(['clear', 'close', 'situational']).toContain(result.confidence);
    });

    it('marks field goal as applicable when distance <= 65', () => {
      const result = calcFourthDownEV995(2, 70, 0, 1, 700);
      expect(result.fieldGoal.applicable).toBe(true);
    });

    it('marks field goal as not applicable when distance > 65', () => {
      const result = calcFourthDownEV995(2, 50, 0, 1, 700);
      expect(result.fieldGoal.applicable).toBe(false);
    });

    it('adjusts confidence when desperate/protecting modifiers apply', () => {
      const desperate = calcFourthDownEV995(1, 50, -8, 4, 120);
      const protecting = calcFourthDownEV995(1, 50, 7, 4, 120);
      expect(desperate.confidence).toBe('clear');
      expect(['clear', 'close', 'situational']).toContain(protecting.confidence);
      expect(['go', 'fg', 'punt']).toContain(protecting.recommendation);
    });
  });
});
