import { describe, it, expect } from 'vitest';
import {
  DOCTRINE_DEFS,
  getAllDoctrines,
  getDoctrineById,
  checkDoctrineEligibility,
  awardDoctrine,
  getDoctrinesByCategory,
} from './franchise-doctrines';

describe('Franchise Doctrines', () => {
  it('has 12 doctrines defined', () => {
    expect(Object.keys(DOCTRINE_DEFS).length).toBe(12);
  });

  it('getAllDoctrines returns all 12', () => {
    expect(getAllDoctrines().length).toBe(12);
  });

  it('every doctrine has required fields', () => {
    for (const doctrine of getAllDoctrines()) {
      expect(doctrine.id).toBeTruthy();
      expect(doctrine.name.length).toBeGreaterThan(3);
      expect(doctrine.description.length).toBeGreaterThan(10);
      expect(doctrine.origin.length).toBeGreaterThan(5);
      expect(doctrine.bonus.length).toBeGreaterThan(5);
      expect(['culture', 'strategy', 'reputation', 'personnel']).toContain(doctrine.category);
    }
  });

  it('getDoctrineById finds existing doctrine', () => {
    const doctrine = getDoctrineById('hardline_policy');
    expect(doctrine.name).toBe('Hardline Policy');
  });

  it('checkDoctrineEligibility allows first-time earning', () => {
    expect(checkDoctrineEligibility('hardline_policy', [])).toBe(true);
  });

  it('checkDoctrineEligibility blocks duplicate earning', () => {
    const earned = [awardDoctrine('hardline_policy', 2026, 5)];
    expect(checkDoctrineEligibility('hardline_policy', earned)).toBe(false);
  });

  it('awardDoctrine creates earned doctrine with year/week', () => {
    const earned = awardDoctrine('trust_the_process', 2028, 1);
    expect(earned.earnedYear).toBe(2028);
    expect(earned.earnedWeek).toBe(1);
    expect(earned.name).toBe('Trust the Process');
  });

  it('getDoctrinesByCategory groups correctly', () => {
    const doctrines = [
      awardDoctrine('hardline_policy', 2026, 1),
      awardDoctrine('championship_dna', 2027, 1),
      awardDoctrine('cap_wizardry', 2028, 1),
    ];
    const grouped = getDoctrinesByCategory(doctrines);
    expect(grouped.culture.length).toBe(1);
    expect(grouped.reputation.length).toBe(1);
    expect(grouped.strategy.length).toBe(1);
    expect(grouped.personnel.length).toBe(0);
  });

  it('categories span all 4 types', () => {
    const categories = new Set(getAllDoctrines().map((d) => d.category));
    expect(categories.size).toBe(4);
  });
});
