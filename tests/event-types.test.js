/**
 * Parity alias — real tests in game-event-types.test.js
 */
export { default } from './game-event-types.test.js';

import { describe, expect, it } from 'vitest';
import { EVENT_NAMES, EVENT_NAME_LIST } from '../src/systems/events/event-types.js';

describe('event-types (parity)', () => {
  it('exports EVENT_NAMES', () => {
    expect(EVENT_NAMES).toBeDefined();
    expect(EVENT_NAME_LIST.length).toBe(13);
  });
});
