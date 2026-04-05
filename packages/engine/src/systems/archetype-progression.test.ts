import { describe, it, expect } from 'vitest';
import {
  getArchetypeProgressionMultipliers,
  getArchetypeAlignment,
  checkArchetypeEvolution,
  getArchetypeDevelopmentReport,
} from './archetype-progression';

// ── Helpers ──────────────────────────────────────────

function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Test Player',
    pos: 'QB' as const,
    age: 23,
    archetype: {
      archetype: 'pocket_passer',
      label: 'Pocket Passer',
      description: 'Classic drop-back passer',
    },
    ratings: {
      pocketPresence: 85,
      accuracy: 82,
      fieldVision: 80,
      decisionSpeed: 78,
      speed: 60,
      arm: 70,
      scramble: 55,
    },
    careerStats: {},
    ...overrides,
  } as any;
}

// ── Tests ────────────────────────────────────────────

describe('archetype-progression', () => {
  describe('getArchetypeProgressionMultipliers', () => {
    it('returns 1.5x for key ratings of a pocket_passer QB', () => {
      const player = makePlayer();
      const result = getArchetypeProgressionMultipliers(player);

      expect(result.keyRatings).toEqual([
        'pocketPresence',
        'accuracy',
        'fieldVision',
        'decisionSpeed',
      ]);
      expect(result.multipliers.pocketPresence).toBe(1.5);
      expect(result.multipliers.accuracy).toBe(1.5);
      expect(result.multipliers.fieldVision).toBe(1.5);
      expect(result.multipliers.decisionSpeed).toBe(1.5);
    });

    it('returns 0.8x for off-key ratings', () => {
      const player = makePlayer();
      const result = getArchetypeProgressionMultipliers(player);

      expect(result.multipliers.speed).toBe(0.8);
      expect(result.multipliers.arm).toBe(0.8);
      expect(result.multipliers.scramble).toBe(0.8);
    });

    it('returns empty multipliers and keyRatings when player has no archetype', () => {
      const player = makePlayer({ archetype: undefined });
      const result = getArchetypeProgressionMultipliers(player);

      expect(result.multipliers).toEqual({});
      expect(result.keyRatings).toEqual([]);
    });
  });

  describe('getArchetypeAlignment', () => {
    it('returns higher alignment when key ratings are above average', () => {
      // Key ratings average ~81, overall average ~72.9 => diff ~8
      // Alignment = 50 + 8*3 = 74
      const player = makePlayer();
      const alignment = getArchetypeAlignment(player);

      expect(alignment).toBeGreaterThan(60);
      expect(alignment).toBeLessThanOrEqual(100);
    });

    it('returns 50 when player has no archetype', () => {
      const player = makePlayer({ archetype: undefined });
      const alignment = getArchetypeAlignment(player);
      expect(alignment).toBe(50);
    });
  });

  describe('checkArchetypeEvolution', () => {
    it('returns null for players at or past prime age', () => {
      // QB prime age threshold is 26
      const player = makePlayer({ age: 26 });
      const rng = () => 0.1;

      const result = checkArchetypeEvolution(player, rng);
      expect(result).toBeNull();
    });

    it('returns null for players past prime age', () => {
      const player = makePlayer({ age: 30 });
      const rng = () => 0.1;

      const result = checkArchetypeEvolution(player, rng);
      expect(result).toBeNull();
    });

    it('can detect evolution when ratings skew toward a different archetype', () => {
      // Skew ratings toward gunslinger: high arm, deepAccuracy, throwOnRun, release
      const player = makePlayer({
        age: 22,
        ratings: {
          arm: 95,
          deepAccuracy: 92,
          throwOnRun: 90,
          release: 88,
          pocketPresence: 50,
          accuracy: 50,
          fieldVision: 50,
          decisionSpeed: 50,
          speed: 60,
        },
      });

      // rng returns 0.1 which is <= 0.25, so evolution fires
      const rng = () => 0.1;
      const result = checkArchetypeEvolution(player, rng);

      expect(result).not.toBeNull();
      expect(result!.previousArchetype).toBe('pocket_passer');
      expect(result!.newArchetype).toBe('gunslinger');
      expect(result!.previousLabel).toBe('Pocket Passer');
      expect(result!.newLabel).toBe('Gunslinger');
      expect(result!.narrative).toContain('Pocket Passer');
      expect(result!.narrative).toContain('Gunslinger');
    });

    it('returns null when rng exceeds 0.25 even if ratings skew', () => {
      const player = makePlayer({
        age: 22,
        ratings: {
          arm: 95,
          deepAccuracy: 92,
          throwOnRun: 90,
          release: 88,
          pocketPresence: 50,
          accuracy: 50,
          fieldVision: 50,
          decisionSpeed: 50,
        },
      });

      const rng = () => 0.5; // > 0.25, no evolution
      const result = checkArchetypeEvolution(player, rng);
      expect(result).toBeNull();
    });
  });

  describe('getArchetypeDevelopmentReport', () => {
    it('returns correct alignment, averages, and evolution risk', () => {
      const player = makePlayer({ age: 22 });
      const report = getArchetypeDevelopmentReport(player);

      expect(report.archetypeId).toBe('pocket_passer');
      expect(report.archetypeLabel).toBe('Pocket Passer');
      expect(report.alignment).toBeGreaterThan(50);

      // Key ratings: pocketPresence=85, accuracy=82, fieldVision=80, decisionSpeed=78
      // avg = (85+82+80+78)/4 = 81.25 => 81
      expect(report.keyRatingAvg).toBe(81);

      // Off-key: speed=60, arm=70, scramble=55 => avg = 61.67 => 62
      expect(report.offKeyRatingAvg).toBe(62);

      // High alignment => evolutionRisk should be 'none'
      expect(report.evolutionRisk).toBe('none');
    });

    it('shows "likely" evolution risk when alignment is low and player is young', () => {
      // Make key ratings low and off-key ratings high so alignment drops
      const player = makePlayer({
        age: 22,
        ratings: {
          pocketPresence: 40,
          accuracy: 40,
          fieldVision: 40,
          decisionSpeed: 40,
          speed: 90,
          arm: 90,
          scramble: 90,
        },
      });

      const report = getArchetypeDevelopmentReport(player);
      // Key avg = 40, off-key avg = 90, overall avg ~60
      // Alignment = 50 + (40-60)*3 = 50 - 60 = clamped to 0
      expect(report.alignment).toBeLessThan(35);
      expect(report.evolutionRisk).toBe('likely');
    });
  });
});
