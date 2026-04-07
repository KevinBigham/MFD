import { describe, expect, it } from 'vitest';

import { NARRATIVE_STATES } from '../src/systems/story-arcs.js';
import { MENTOR_SYSTEM } from '../src/systems/mentor-system.js';

describe('mentor-system.js', () => {
  it('maps positions into mentorship groups', () => {
    expect(MENTOR_SYSTEM.getGroup('QB')).toBe('QB');
    expect(MENTOR_SYSTEM.getGroup('WR')).toBe('WR');
    expect(MENTOR_SYSTEM.getGroup('TE')).toBe('WR');
    expect(MENTOR_SYSTEM.getGroup('CB')).toBe('DB');
    expect(MENTOR_SYSTEM.getGroup('K')).toBeNull();
  });

  it('eligibility checks enforce mentor/mentee constraints', () => {
    expect(MENTOR_SYSTEM.isMentorEligible({ age: 31, ovr: 80, isStarter: true })).toBe(true);
    expect(MENTOR_SYSTEM.isMentorEligible({ age: 29, ovr: 80, isStarter: true })).toBe(false);

    expect(MENTOR_SYSTEM.isMenteeEligible({ age: 22, ovr: 60, pot: 70 })).toBe(true);
    expect(MENTOR_SYSTEM.isMenteeEligible({ age: 24, ovr: 60, pot: 70 })).toBe(false);
  });

  it('canPair requires same position group and different ids', () => {
    const mentor = { id: 'm1', pos: 'WR' };
    const mentee = { id: 'm2', pos: 'TE' };
    expect(MENTOR_SYSTEM.canPair(mentor, mentee)).toBe(true);
    expect(MENTOR_SYSTEM.canPair(mentor, { id: 'm1', pos: 'TE' })).toBe(false);
    expect(MENTOR_SYSTEM.canPair(mentor, { id: 'x', pos: 'QB' })).toBe(false);
  });

  it('weeklyBonus scales with OVR gap', () => {
    expect(MENTOR_SYSTEM.weeklyBonus({ ovr: 95 }, { ovr: 65 })).toBe(2.5);
    expect(MENTOR_SYSTEM.weeklyBonus({ ovr: 88 }, { ovr: 72 })).toBe(1.8);
    expect(MENTOR_SYSTEM.weeklyBonus({ ovr: 83 }, { ovr: 72 })).toBe(1.2);
    expect(MENTOR_SYSTEM.weeklyBonus({ ovr: 78 }, { ovr: 72 })).toBe(0.8);
  });

  it('applyWeekly applies pot and mentor bonus including arc/superstar modifiers', () => {
    const mentor = {
      id: 'm1',
      pos: 'QB',
      ovr: 90,
      devTrait: 'superstar',
      _arcState: NARRATIVE_STATES.MENTOR,
    };
    const mentee = { id: 'm2', pos: 'QB', ovr: 70, pot: 80 };
    const roster = [mentor, mentee];

    MENTOR_SYSTEM.applyWeekly({ m1: 'm2' }, roster);

    expect(mentee.pot).toBeCloseTo(80.05, 5);
    expect(mentee._mentorBonus).toBeCloseTo((1.8 + 0.35) * 1.3, 5);
  });

  it('retirementBoost grants final morale/potential boost and mentor tag', () => {
    const mentor = { name: 'Vet Leader' };
    const mentee = { morale: 95, pot: 97 };

    MENTOR_SYSTEM.retirementBoost(mentor, mentee);

    expect(mentee.morale).toBe(99);
    expect(mentee.pot).toBe(99);
    expect(mentee._legacyMentor).toBe('Vet Leader');
  });
});
