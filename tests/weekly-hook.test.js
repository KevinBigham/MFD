import { describe, expect, it } from 'vitest';
import { buildWeeklyHook } from '../src/systems/events/weekly-hook.js';

describe('weekly-hook (parity)', () => {
  it('buildWeeklyHook is a function', () => {
    expect(typeof buildWeeklyHook).toBe('function');
  });
});
