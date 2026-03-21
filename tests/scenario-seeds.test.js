import { describe, expect, it } from 'vitest';
import { SCENARIO_SEEDS } from '../src/systems/scenario-seeds.js';

describe('scenario-seeds', function () {
  it('has at least 6 scenarios', function () {
    expect(SCENARIO_SEEDS.list.length).toBeGreaterThanOrEqual(6);
  });

  it('each scenario has required fields', function () {
    SCENARIO_SEEDS.list.forEach(function (s) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(typeof s.difficulty).toBe('number');
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.difficulty).toBeLessThanOrEqual(5);
    });
  });

  it('gets scenario by id', function () {
    var cap = SCENARIO_SEEDS.get('cap_hell');
    expect(cap.name).toBe('Cap Hell');
    expect(cap.modifiers.capPenalty).toBe(-40);
  });

  it('returns standard for unknown id', function () {
    var result = SCENARIO_SEEDS.get('nonexistent');
    expect(result.id).toBe('standard');
  });

  it('standard scenario has no modifiers', function () {
    var mods = SCENARIO_SEEDS.getModifiers('standard');
    expect(Object.keys(mods).length).toBe(0);
  });
});
