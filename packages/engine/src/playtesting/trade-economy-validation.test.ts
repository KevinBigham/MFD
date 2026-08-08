import { describe, expect, it } from 'vitest';
import { runComprehensiveTradeValidation } from './trade-economy-validation';

describe('MFD Trade Economy Data-Integrity & Measuring Equipment Certification', () => {
  it('evaluates trade proposals, package fairness matrix, conditional pick table, and long-horizon soaks with strict counter invariants', () => {
    const metrics = runComprehensiveTradeValidation([42, 108, 256, 777, 999]);

    // Scenario Count Assertions
    expect(metrics.totalProposalsTested).toBe(2400); // 1000 unfair + 700 fair/borderline + 100 vet/qb + 600 matrix
    expect(metrics.teamsTestedCount).toBe(32);
    expect(metrics.arbitrageChainsEvaluated3Step).toBe(1000);
    expect(metrics.arbitrageChainsEvaluated5Step).toBe(1000);
    expect(metrics.seasonsSimulated).toBe(35);
    expect(metrics.dynastyUniversesSimulated).toBe(3);
    expect(metrics.rngSeedsEvaluated).toEqual([42, 108, 256, 777, 999]);

    // Package-Size x Fairness Matrix Assertions (6 cells x 100 proposals)
    expect(metrics.packageFairnessMatrix).toHaveLength(6);
    for (const cell of metrics.packageFairnessMatrix) {
      expect(cell.tested).toBe(100);
      expect(cell.acceptanceRateNew).toBeGreaterThanOrEqual(0);
    }

    // Conditional Pick Probability Audit Assertions (8 probability tiers)
    expect(metrics.conditionalPickProbTable).toHaveLength(8);
    expect(metrics.conditionalPickProbTable[0]?.probability).toBe(0.0);
    expect(metrics.conditionalPickProbTable[7]?.probability).toBe(1.0);

    // Hard Invariant Assertions across all long-horizon soaks
    for (const soak of [metrics.soak5y, metrics.soak10y, metrics.soak20y]) {
      const executed = soak.totalTradesExecutedNew;
      const totalMovements = soak.totalAssetMovementsNew;
      const players = soak.playersTradedNew;
      const picks = soak.picksTradedNew;
      const threePlus = soak.threePlusAssetTradesNew;

      // Invariant 1: Total asset movements must equal players + picks
      expect(players + picks).toBe(totalMovements);

      if (executed > 0) {
        // Invariant 2: Total asset movements must be at least 2x executed trades
        expect(totalMovements).toBeGreaterThanOrEqual(executed * 2);

        // Invariant 3: If 3+ asset trades occurred, total movements must strictly exceed 2x executed trades
        if (threePlus > 0) {
          expect(totalMovements).toBeGreaterThan(executed * 2);
        }

        // Invariant 4: Audit ledger entry count matches executed trades
        expect(soak.auditLedger.length).toBe(executed);

        // Invariant 5: 3+ asset trade count matches audit ledger totalAssetCount >= 3
        const ledgerThreePlus = soak.auditLedger.filter((t) => t.totalAssetCount >= 3).length;
        expect(threePlus).toBe(ledgerThreePlus);
      }

      // Cap Consistency Invariant
      if (soak.capHealth.worstCapPosition < 0) {
        expect(soak.capHealth.teamsOverCapNew).toBeGreaterThan(0);
      } else {
        expect(soak.capHealth.teamsOverCapNew).toBe(0);
      }
    }

    // User vs CPU Asymmetry Audit Assertion (must be FALSE: zero secret human/CPU multipliers)
    expect(metrics.asymmetryDetected).toBe(false);
  });
});
