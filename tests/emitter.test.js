import { describe, expect, it } from 'vitest';
import { createEventLog } from '../src/systems/events/emitter.js';

describe('emitter (parity)', () => {
  it('createEventLog returns an object with emit method', () => {
    const log = createEventLog();
    expect(typeof log.emit).toBe('function');
    expect(typeof log.getEvents).toBe('function');
    expect(typeof log.reset).toBe('function');
  });
});
