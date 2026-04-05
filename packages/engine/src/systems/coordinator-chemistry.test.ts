import { describe, it, expect } from 'vitest';
import { calculateStaffChemistry, getChemistryBonus, evaluateCoordinatorFit } from './coordinator-chemistry';

describe('coordinator-chemistry', () => {
  describe('calculateStaffChemistry', () => {
    it('returns default 50s when no HC', () => {
      const result = calculateStaffChemistry(null);
      expect(result.hcOcSynergy).toBe(50);
      expect(result.hcDcSynergy).toBe(50);
      expect(result.ocDcBalance).toBe(50);
      expect(result.overall).toBe(50);

      const noHc = calculateStaffChemistry({ hc: null, oc: null, dc: null } as any);
      expect(noHc.overall).toBe(50);
    });

    it('calculates HC-OC synergy from matrix (Strategist + pass_arch = 15 bonus)', () => {
      const staff = {
        hc: { archetype: 'Strategist' },
        oc: { specialty75: { id: 'pass_arch', label: 'Pass Architect' } },
        dc: null,
      } as any;

      const result = calculateStaffChemistry(staff);
      // 50 + 15*2 = 80
      expect(result.hcOcSynergy).toBe(80);
    });

    it('rewards complementary OC-DC styles with ocDcBalance = 75', () => {
      const staff = {
        hc: { archetype: 'Strategist' },
        oc: { specialty75: { id: 'pass_arch', label: 'Pass Architect' } },   // aggressive
        dc: { specialty75: { id: 'run_stop', label: 'Run Stopper' } },        // conservative
      } as any;

      const result = calculateStaffChemistry(staff);
      expect(result.ocDcBalance).toBe(75);
    });
  });

  describe('getChemistryBonus', () => {
    it('returns +2 mods for overall >= 80', () => {
      const bonus = getChemistryBonus({
        hcOcSynergy: 70,
        hcDcSynergy: 70,
        ocDcBalance: 70,
        overall: 82,
        narrative: '',
      });

      expect(bonus.offenseMod).toBe(2);
      expect(bonus.defenseMod).toBe(2);
      expect(bonus.moraleMod).toBe(2);
      expect(bonus.devBoost).toBe(1);
    });

    it('returns -1 mods for overall < 40', () => {
      const bonus = getChemistryBonus({
        hcOcSynergy: 30,
        hcDcSynergy: 30,
        ocDcBalance: 30,
        overall: 35,
        narrative: '',
      });

      expect(bonus.offenseMod).toBe(-1);
      expect(bonus.defenseMod).toBe(-1);
      expect(bonus.moraleMod).toBe(-1);
      expect(bonus.devBoost).toBe(0);
    });
  });

  describe('evaluateCoordinatorFit', () => {
    it('returns neutral when no candidate', () => {
      const result = evaluateCoordinatorFit(null, { hc: { archetype: 'Strategist' }, oc: null, dc: null } as any, 'OC');
      expect(result.recommendation).toBe('neutral');
      expect(result.score).toBe(50);
    });

    it('returns excellent for high-synergy candidate', () => {
      const staff = {
        hc: { archetype: 'Strategist' },
        oc: null,
        dc: { specialty75: { id: 'run_stop', label: 'Run Stopper' } },  // conservative DC
      } as any;

      const candidate = {
        archetype: 'offensive',
        specialty75: { id: 'pass_arch', label: 'Pass Architect' },       // aggressive OC
        yearsExp: 12,
      } as any;

      const result = evaluateCoordinatorFit(candidate, staff, 'OC');
      // Strategist + pass_arch = 15 bonus → synergy 80, complementary style +10 → 90
      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(result.recommendation).toBe('excellent');
      expect(result.strengths.length).toBeGreaterThan(0);
    });
  });
});
