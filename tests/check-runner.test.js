import { describe, expect, it } from 'vitest';

import {
  createCheckRunner,
  runCheckGroups,
} from '../src/dev/module-validation/check-runner.js';

describe('module-validation/check-runner', () => {
  it('tracks check count and errors', () => {
    var runner = createCheckRunner();
    runner.check(false, 'ok');
    runner.check(true, 'fail-1');

    expect(runner.getCheckCount()).toBe(2);
    expect(runner.getErrors()).toEqual(['fail-1']);
  });

  it('aggregates checks by group in stable order', () => {
    var runner = createCheckRunner();
    var groups = [
      {
        name: 'a',
        run: function (check) {
          check(false, 'a1');
          check(true, 'a2');
        },
      },
      {
        name: 'b',
        run: function (check) {
          check(false, 'b1');
        },
      },
    ];

    var out = runCheckGroups(groups, runner);
    expect(out).toEqual([
      { name: 'a', checks: 2 },
      { name: 'b', checks: 1 },
    ]);
    expect(runner.getCheckCount()).toBe(3);
    expect(runner.getErrors()).toEqual(['a2']);
  });
});
