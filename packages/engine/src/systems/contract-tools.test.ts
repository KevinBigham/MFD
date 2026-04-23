import { describe, it, expect } from 'vitest';
import { makeContract } from './contracts';
import {
  evaluateRestructureEligibility,
  evaluateBackloadEligibility,
  evaluateStandardCutImpact,
  evaluatePostJune1CutImpact,
  projectContractCap,
} from './contract-tools';

describe('contract-tools / evaluateRestructureEligibility', () => {
  it('returns eligible=false for null contract', () => {
    const result = evaluateRestructureEligibility(null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('No contract.');
    expect(result.savings).toBe(0);
  });

  it('returns eligible=true with savings for a fresh multi-year deal', () => {
    const contract = makeContract(12, 4, 8, 10);
    const result = evaluateRestructureEligibility(contract);
    expect(result.eligible).toBe(true);
    expect(result.savings).toBeGreaterThan(0);
    expect(result.projectedHit).toBeLessThan(result.currentHit);
    expect(result.spreadYears).toBe(4);
  });

  it('returns eligible=false when contract already restructured', () => {
    const contract = makeContract(12, 4, 8, 10);
    contract.restructured = true;
    const result = evaluateRestructureEligibility(contract);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/already restructured/i);
  });

  it('returns eligible=false when contract has only 1 year left', () => {
    const contract = makeContract(12, 1, 4, 10);
    const result = evaluateRestructureEligibility(contract);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/too short/i);
  });

  it('does NOT mutate the input contract (deep equality)', () => {
    const contract = makeContract(12, 4, 8, 10);
    const snapshot = structuredClone(contract);
    evaluateRestructureEligibility(contract);
    expect(contract).toEqual(snapshot);
  });
});

describe('contract-tools / evaluateBackloadEligibility', () => {
  it('returns eligible=false for null contract', () => {
    const result = evaluateBackloadEligibility(null, 2);
    expect(result.eligible).toBe(false);
  });

  it('returns eligible=true with void years for a valid contract', () => {
    const contract = makeContract(10, 3, 6, 8);
    const result = evaluateBackloadEligibility(contract, 2);
    expect(result.eligible).toBe(true);
    expect(result.voidYearsAdded).toBeGreaterThan(0);
    expect(result.totalVoidYears).toBe(result.voidYearsAdded);
  });

  it('returns eligible=false when already at void year limit', () => {
    const contract = makeContract(10, 3, 6, 8);
    contract.voidYears = 3;
    const result = evaluateBackloadEligibility(contract, 1);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/void year limit/i);
  });

  it('does NOT mutate the input contract', () => {
    const contract = makeContract(10, 3, 6, 8);
    const snapshot = structuredClone(contract);
    evaluateBackloadEligibility(contract, 2);
    expect(contract).toEqual(snapshot);
  });
});

describe('contract-tools / evaluateStandardCutImpact', () => {
  it('returns zeros for null contract', () => {
    const result = evaluateStandardCutImpact(null);
    expect(result.eligible).toBe(false);
    expect(result.deadCap).toBe(0);
    expect(result.capSavings).toBe(0);
  });

  it('computes dead cap and savings for a standard cut', () => {
    const contract = makeContract(10, 3, 6, 8);
    const result = evaluateStandardCutImpact(contract);
    expect(result.eligible).toBe(true);
    // prorated = 2, deadIfCut = 2 * 3 = 6 (all proration accelerates)
    expect(result.deadCap).toBe(6);
    // currentHit = 10 + 2 = 12; savings = 12 - 6 = 6
    expect(result.currentHit).toBe(12);
    expect(result.capSavings).toBe(6);
  });

  it('does NOT mutate the input contract', () => {
    const contract = makeContract(10, 3, 6, 8);
    const snapshot = structuredClone(contract);
    evaluateStandardCutImpact(contract);
    expect(contract).toEqual(snapshot);
  });
});

describe('contract-tools / evaluatePostJune1CutImpact', () => {
  it('returns zeros for null contract', () => {
    const result = evaluatePostJune1CutImpact(null);
    expect(result.eligible).toBe(false);
  });

  it('splits dead cap between current and next year', () => {
    const contract = makeContract(10, 3, 6, 8);
    const result = evaluatePostJune1CutImpact(contract);
    expect(result.eligible).toBe(true);
    // prorated = 2
    expect(result.currentYearDead).toBe(2);
    // remaining proration = 2 * (3 - 1) = 4
    expect(result.nextYearDead).toBe(4);
    expect(result.deadCap).toBe(6);
    // savings this year = currentHit (12) - currentYearDead (2) = 10
    expect(result.capSavings).toBe(10);
  });

  it('does NOT mutate the input contract', () => {
    const contract = makeContract(10, 3, 6, 8);
    const snapshot = structuredClone(contract);
    evaluatePostJune1CutImpact(contract);
    expect(contract).toEqual(snapshot);
  });
});

describe('contract-tools / projectContractCap', () => {
  it('projects cap hit across remaining contract years', () => {
    const contract = makeContract(10, 3, 6, 8);
    const projection = projectContractCap(contract, 2026, 4);
    expect(projection).toHaveLength(4);
    // Year 0: active
    expect(projection[0]!.expired).toBe(false);
    expect(projection[0]!.contractHit).toBe(12); // 10 + 2
    // Year 3 (offset 3): contract expired after 3 years
    expect(projection[3]!.expired).toBe(true);
    expect(projection[3]!.contractHit).toBe(0);
  });

  it('attaches salary cap for each projection year', () => {
    const contract = makeContract(10, 3, 6, 8);
    const projection = projectContractCap(contract, 2026, 3);
    projection.forEach((entry) => {
      expect(entry.salaryCap).toBeGreaterThan(0);
      expect(entry.year).toBeGreaterThanOrEqual(2026);
    });
    // Cap grows year-over-year by default
    expect(projection[1]!.salaryCap).toBeGreaterThanOrEqual(projection[0]!.salaryCap);
  });

  it('returns all-expired zeros for null contract', () => {
    const projection = projectContractCap(null, 2026, 3);
    expect(projection).toHaveLength(3);
    projection.forEach((entry) => {
      expect(entry.expired).toBe(true);
      expect(entry.contractHit).toBe(0);
    });
  });

  it('does NOT mutate the input contract', () => {
    const contract = makeContract(10, 3, 6, 8);
    const snapshot = structuredClone(contract);
    projectContractCap(contract, 2026, 4);
    expect(contract).toEqual(snapshot);
  });

  it('returns empty array for zero seasons', () => {
    const contract = makeContract(10, 3, 6, 8);
    const projection = projectContractCap(contract, 2026, 0);
    expect(projection).toHaveLength(0);
  });
});
