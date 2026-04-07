import { describe, expect, it } from 'vitest';
import { buildPostgameAutopsy } from '../src/systems/events/postgame-autopsy.js';

describe('postgame-autopsy (parity)', () => {
  it('buildPostgameAutopsy is a function', () => {
    expect(typeof buildPostgameAutopsy).toBe('function');
  });
});
