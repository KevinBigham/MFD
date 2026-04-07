import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TRAINING_CAMP_986, configureTrainingCampRuntime } from '../src/systems/training-camp.js';

function makeTeam(player, staff = null) {
  return {
    roster: [player],
    staff,
  };
}

describe('training-camp.js', () => {
  let oldPosDef;
  let oldCalcOvr;

  beforeEach(() => {
    oldPosDef = globalThis.POS_DEF;
    oldCalcOvr = globalThis.calcOvr;
  });

  afterEach(() => {
    globalThis.POS_DEF = oldPosDef;
    globalThis.calcOvr = oldCalcOvr;
    configureTrainingCampRuntime({});
  });

  it('defines expected focus options', () => {
    expect(TRAINING_CAMP_986.focuses).toEqual([
      'offense',
      'defense',
      'conditioning',
      'development',
      'chemistry',
    ]);
  });

  it('exposes run(team, focus, rng) function', () => {
    expect(typeof TRAINING_CAMP_986.run).toBe('function');
    expect(TRAINING_CAMP_986.run.length).toBe(3);
  });

  it('conditioning focus boosts morale and produces no gain/loss entry', () => {
    const player = { name: 'A', pos: 'QB', morale: 70, ratings: {}, personality: { workEthic: 5 } };
    const team = makeTeam(player);

    const results = TRAINING_CAMP_986.run(team, 'conditioning', () => 0.5);
    expect(player.morale).toBe(73);
    expect(results).toEqual([]);
  });

  it('conditioning morale is capped at 99', () => {
    const player = { name: 'A', pos: 'QB', morale: 98, ratings: {}, personality: { workEthic: 5 } };
    const team = makeTeam(player);

    TRAINING_CAMP_986.run(team, 'conditioning', () => 0.5);
    expect(player.morale).toBe(99);
  });

  it('chemistry focus boosts chemistry and produces no gain/loss entry', () => {
    const player = { name: 'A', pos: 'QB', chemistry: 60, ratings: {}, personality: { workEthic: 5 } };
    const team = makeTeam(player);

    const results = TRAINING_CAMP_986.run(team, 'chemistry', () => 0.5);
    expect(player.chemistry).toBe(65);
    expect(results).toEqual([]);
  });

  it('chemistry is capped at 100', () => {
    const player = { name: 'A', pos: 'QB', chemistry: 98, ratings: {}, personality: { workEthic: 5 } };
    const team = makeTeam(player);

    TRAINING_CAMP_986.run(team, 'chemistry', () => 0.5);
    expect(player.chemistry).toBe(100);
  });

  it('offense focus with position match can produce star gains', () => {
    globalThis.POS_DEF = { QB: { r: ['throwPower'] } };
    globalThis.calcOvr = () => 88;

    const player = {
      name: 'QB One',
      pos: 'QB',
      age: 24,
      ratings: { throwPower: 70 },
      ovr: 70,
      personality: { workEthic: 7 },
    };

    const team = makeTeam(player);
    const results = TRAINING_CAMP_986.run(team, 'offense', () => 0.5);

    expect(player.ratings.throwPower).toBe(72);
    expect(player.ovr).toBe(88);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: 'star', change: 2, pos: 'QB' });
  });

  it('development focus gives younger players an extra boost', () => {
    globalThis.POS_DEF = { WR: { r: ['route'] } };
    globalThis.calcOvr = (p) => p.ovr;

    const player = {
      name: 'Young WR',
      pos: 'WR',
      age: 23,
      ratings: { route: 80 },
      ovr: 80,
      personality: { workEthic: 6 },
    };

    const team = makeTeam(player);
    const results = TRAINING_CAMP_986.run(team, 'development', () => 0.5);

    expect(results[0].change).toBeGreaterThanOrEqual(2);
    expect(player.ratings.route).toBeGreaterThan(80);
  });

  it('low work-ethic players can decline when bad-roll condition triggers', () => {
    globalThis.POS_DEF = { QB: { r: ['throwPower'] } };
    globalThis.calcOvr = (p) => p.ovr;

    const player = {
      name: 'Risky QB',
      pos: 'QB',
      age: 26,
      ratings: { throwPower: 60 },
      ovr: 60,
      personality: { workEthic: 2 },
    };

    const team = makeTeam(player);
    const rolls = [0, 0];
    const rng = () => rolls.shift() ?? 0;

    const results = TRAINING_CAMP_986.run(team, 'offense', rng);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: 'decline', change: -1 });
    expect(player.ratings.throwPower).toBe(59);
  });

  it('clamps rating gains at 99 and max gain at +3', () => {
    globalThis.POS_DEF = { QB: { r: ['throwPower'] } };
    globalThis.calcOvr = (p) => p.ovr;

    const player = {
      name: 'Cap Test QB',
      pos: 'QB',
      age: 24,
      ratings: { throwPower: 98 },
      ovr: 98,
      personality: { workEthic: 10 },
    };

    const staff = {
      hc: { ratings: { development: 100 } },
      oc: { ratings: { development: 100 } },
    };

    const team = makeTeam(player, staff);
    const results = TRAINING_CAMP_986.run(team, 'offense', () => 0.999);

    expect(results[0].change).toBe(3);
    expect(player.ratings.throwPower).toBe(99);
  });

  it('still returns result entries even if POS_DEF is unavailable', () => {
    globalThis.POS_DEF = undefined;
    globalThis.calcOvr = undefined;

    const player = {
      name: 'No Def QB',
      pos: 'QB',
      age: 24,
      ratings: { throwPower: 70 },
      ovr: 70,
      personality: { workEthic: 7 },
    };

    const team = makeTeam(player);
    const results = TRAINING_CAMP_986.run(team, 'offense', () => 0.5);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('star');
    expect(player.ratings.throwPower).toBe(70);
  });

  it('supports injected runtime hooks for monolith-local helpers', () => {
    configureTrainingCampRuntime({
      getPosDef: () => ({ QB: { r: ['throwPower'] } }),
      calcOvr: () => 91,
    });
    globalThis.POS_DEF = undefined;
    globalThis.calcOvr = undefined;

    const player = {
      name: 'Injected QB',
      pos: 'QB',
      age: 24,
      ratings: { throwPower: 70 },
      ovr: 70,
      personality: { workEthic: 7 },
    };

    const team = makeTeam(player);
    const results = TRAINING_CAMP_986.run(team, 'offense', () => 0.5);

    expect(results[0].type).toBe('star');
    expect(player.ratings.throwPower).toBe(72);
    expect(player.ovr).toBe(91);
  });
});
