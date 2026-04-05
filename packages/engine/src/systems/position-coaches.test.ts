import { describe, expect, it } from 'vitest';
import {
  generatePositionCoach,
  initializePositionCoaches,
  getPositionCoachBonus,
  upgradePositionCoach,
  generateCoachingStaffReport,
  type PositionCoachStaff,
  type PositionCoach,
} from './position-coaches';

const fixedRng = () => 0.5;

function makePlayer(pos: string, ratings: Record<string, number> = {}) {
  return {
    id: `p-${pos}-1`,
    name: `Test ${pos}`,
    pos,
    ratings,
  } as any;
}

function makeCoachWithQuality(role: string, quality: number, specialty = 'tackling'): PositionCoach {
  return {
    id: `pc-${role}-test`,
    name: 'Test Coach',
    role: role as any,
    specialty,
    quality,
    yearsWithTeam: 0,
  };
}

describe('position-coaches', () => {
  it('generatePositionCoach creates coach with valid role and quality 1-10', () => {
    const coach = generatePositionCoach('OL', 5, fixedRng);

    expect(coach.role).toBe('OL');
    expect(coach.quality).toBeGreaterThanOrEqual(1);
    expect(coach.quality).toBeLessThanOrEqual(10);
    expect(coach.name).toBeTruthy();
    expect(coach.id).toMatch(/^pc-ol-/);
    expect(coach.specialty).toBeTruthy();
    expect(coach.yearsWithTeam).toBe(0);
  });

  it('initializePositionCoaches generates 7 coaches (one per role)', () => {
    const staff = initializePositionCoaches(5, fixedRng);

    expect(staff.coaches).toHaveLength(7);

    const roles = staff.coaches.map((c) => c.role);
    expect(roles).toContain('OL');
    expect(roles).toContain('DL');
    expect(roles).toContain('DB');
    expect(roles).toContain('WR');
    expect(roles).toContain('RB_TE');
    expect(roles).toContain('LB');
    expect(roles).toContain('ST');

    const uniqueRoles = new Set(roles);
    expect(uniqueRoles.size).toBe(7);
  });

  it('getPositionCoachBonus returns devMultiplier > 1 for high quality coach (quality 9)', () => {
    const staff: PositionCoachStaff = {
      coaches: [makeCoachWithQuality('DB', 9, 'coverage_technique')],
    };
    const player = makePlayer('CB', { manCoverage: 80, zoneCoverage: 75 });

    const bonus = getPositionCoachBonus(staff, player);

    expect(bonus.devMultiplier).toBeGreaterThan(1);
    expect(bonus.narrative).toContain('elite');
  });

  it('getPositionCoachBonus returns devMultiplier < 1 for low quality coach (quality 2)', () => {
    const staff: PositionCoachStaff = {
      coaches: [makeCoachWithQuality('DB', 2, 'coverage_technique')],
    };
    const player = makePlayer('CB', { manCoverage: 60 });

    const bonus = getPositionCoachBonus(staff, player);

    expect(bonus.devMultiplier).toBeLessThan(1);
    expect(bonus.narrative).toContain('slowing');
  });

  it('getPositionCoachBonus returns neutral when no staff', () => {
    const player = makePlayer('WR', { routeRunning: 70 });

    const bonus = getPositionCoachBonus(null, player);

    expect(bonus.devMultiplier).toBe(1);
    expect(bonus.ratingBoosts).toEqual({});
    expect(bonus.narrative).toBe('');
  });

  it('upgradePositionCoach replaces coach with higher quality', () => {
    const original: PositionCoachStaff = {
      coaches: [
        makeCoachWithQuality('OL', 4),
        makeCoachWithQuality('DL', 5),
      ],
    };

    const upgraded = upgradePositionCoach(original, 'OL', fixedRng);

    const newOL = upgraded.coaches.find((c) => c.role === 'OL')!;
    expect(newOL.id).not.toBe('pc-OL-test');
    expect(newOL.quality).toBeGreaterThanOrEqual(4);

    const unchangedDL = upgraded.coaches.find((c) => c.role === 'DL')!;
    expect(unchangedDL.id).toBe('pc-DL-test');
    expect(unchangedDL.quality).toBe(5);
  });

  it('generateCoachingStaffReport identifies elite and weak coaches', () => {
    const staff: PositionCoachStaff = {
      coaches: [
        makeCoachWithQuality('OL', 9),
        makeCoachWithQuality('DL', 2),
        makeCoachWithQuality('DB', 6),
      ],
    };

    const report = generateCoachingStaffReport(staff);

    const strengthsLine = report.find((l) => l.startsWith('Strengths:'));
    expect(strengthsLine).toBeTruthy();
    expect(strengthsLine).toContain('OL');

    const weaknessLine = report.find((l) => l.startsWith('Weaknesses:'));
    expect(weaknessLine).toBeTruthy();
    expect(weaknessLine).toContain('DL');
  });
});
