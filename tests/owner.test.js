import { describe, expect, it } from 'vitest';

import {
  OWNER_ARCHETYPES,
  getOwnerStatus,
  initOwner,
  updateOwnerApproval,
} from '../src/systems/owner.js';

describe('owner.js', () => {
  it('defines five owner archetypes with unique ids', () => {
    const ids = OWNER_ARCHETYPES.map((o) => o.id);
    expect(OWNER_ARCHETYPES).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it('initOwner selects archetype from rng and sets defaults', () => {
    const owner = initOwner(() => 0);
    expect(owner.archetypeId).toBe(OWNER_ARCHETYPES[0].id);
    expect(owner.approval).toBe(50);
    expect(owner.history).toEqual([]);
  });

  it('updateOwnerApproval returns input owner if invalid/missing archetype', () => {
    const o1 = { approval: 50 };
    expect(updateOwnerApproval(o1, {}, { year: 2026, week: 1 })).toBe(o1);

    const o2 = { archetypeId: 'missing', approval: 50, history: [] };
    expect(updateOwnerApproval(o2, {}, { year: 2026, week: 1 })).toBe(o2);
  });

  it('applies win_now deltas and clamps approval to [0,100]', () => {
    const owner = { archetypeId: 'win_now', approval: 95, history: [] };
    const team = { wins: 10, losses: 2, roster: [] };
    const out = updateOwnerApproval(owner, team, { year: 2026, week: 8, phase: 'regular' });
    expect(out.approval).toBe(100);
    expect(out.history).toHaveLength(1);
    expect(out.history[0].delta).toBe(15);
  });

  it('patient_builder rewards young starters', () => {
    const owner = { archetypeId: 'patient_builder', approval: 50, history: [] };
    const team = {
      wins: 2,
      losses: 10,
      roster: [
        { isStarter: true, age: 22 },
        { isStarter: true, age: 23 },
        { isStarter: true, age: 24 },
        { isStarter: true, age: 25 },
        { isStarter: true, age: 24 },
      ],
    };

    const out = updateOwnerApproval(owner, team, { year: 2026, week: 9, phase: 'regular' });
    expect(out.approval).toBe(62);
    expect(out.history[0].delta).toBe(12);
  });

  it('profit_first uses cap room formula', () => {
    const owner = { archetypeId: 'profit_first', approval: 40, history: [] };
    const team = { capUsed: 100, deadCap: 10, roster: [] }; // capRoom=40 => +10
    const out = updateOwnerApproval(owner, team, { year: 2026, week: 2, phase: 'regular' });
    expect(out.approval).toBe(50);
  });

  it('fan_favorite combines star presence and streak effect', () => {
    const owner = { archetypeId: 'fan_favorite', approval: 50, history: [] };
    const team = { roster: [{ ovr: 86 }], streak: 3 };
    const out = updateOwnerApproval(owner, team, { year: 2026, week: 5, phase: 'regular' });
    expect(out.approval).toBe(62); // +8 (star) +4 (streak)
  });

  it('legacy_builder falls back safely when calcTeamDominance is unavailable', () => {
    const owner = { archetypeId: 'legacy_builder', approval: 50, history: [] };
    const out = updateOwnerApproval(owner, { roster: [] }, { year: 2026, week: 5, phase: 'regular' });
    expect(out.approval).toBe(46); // delta -4
  });

  it('history is capped to 40 entries', () => {
    let owner = { archetypeId: 'win_now', approval: 50, history: [] };
    const team = { wins: 8, losses: 4, roster: [] };

    for (let i = 0; i < 45; i += 1) {
      owner = updateOwnerApproval(owner, team, { year: 2026, week: i + 1, phase: 'regular' });
    }

    expect(owner.history).toHaveLength(40);
    expect(owner.history[0].week).toBe(6);
    expect(owner.history[39].week).toBe(45);
  });

  it('getOwnerStatus maps approval thresholds', () => {
    expect(getOwnerStatus(80).label).toBe('Thrilled');
    expect(getOwnerStatus(60).label).toBe('Satisfied');
    expect(getOwnerStatus(40).label).toBe('Neutral');
    expect(getOwnerStatus(20).label).toBe('Unhappy');
    expect(getOwnerStatus(19).label).toBe('Furious');
  });
});
