import { describe, expect, it } from 'vitest';

import { PRESS_CONF_986, configurePressConferenceRuntime } from '../src/systems/press-conference.js';

function fixedRng(value = 0) {
  return () => value;
}

describe('press-conference.js', () => {
  it('defines eight question templates and four response types', () => {
    expect(PRESS_CONF_986.questions).toHaveLength(8);
    expect(Object.keys(PRESS_CONF_986.responses)).toHaveLength(4);
  });

  it('filters out negative and hot-seat questions after dominant win', () => {
    const result = PRESS_CONF_986.generate({}, 7, true, 21, fixedRng(0));
    const types = result.questions.map((q) => q.type);

    expect(result.questions).toHaveLength(3);
    expect(types).not.toContain('negative');
    expect(types).not.toContain('hot_seat');
  });

  it('filters out positive questions after blowout loss', () => {
    const result = PRESS_CONF_986.generate({}, 7, false, -21, fixedRng(0));
    const types = result.questions.map((q) => q.type);

    expect(result.questions).toHaveLength(3);
    expect(types).not.toContain('positive');
  });

  it('returns null coach quote when personality dependency is unavailable', () => {
    const result = PRESS_CONF_986.generate({}, 7, true, 3, fixedRng(0));
    expect(result.coachQuote).toBeNull();
  });

  it('uses configured coach personalities when the monolith wires them in', () => {
    configurePressConferenceRuntime({
      getCoachPersonalities: () => ({
        grinder: {
          label: 'Grinder',
          icon: '⚙️',
          afterWin: ['Keep working.'],
          afterLoss: ['Back to the lab.'],
        },
      }),
    });

    const result = PRESS_CONF_986.generate({}, 7, true, 3, fixedRng(0));

    expect(result.coachQuote).toEqual({
      text: 'Keep working.',
      label: 'Grinder',
      icon: '⚙️',
    });

    configurePressConferenceRuntime({});
  });
});
