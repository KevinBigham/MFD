import { describe, expect, it } from 'vitest';

import { ACTION_KEYS, KEYMAP, TAB_ORDER } from '../src/config/keyboard.js';

describe('keyboard config', () => {
  it('maps numeric and letter shortcuts to tabs/actions', () => {
    expect(KEYMAP['1']).toBe('home');
    expect(KEYMAP.r).toBe('roster');
    expect(KEYMAP['[']).toBe('prevTab');
    expect(ACTION_KEYS[' ']).toBe('simWeek');
    expect(ACTION_KEYS.Escape).toBe('closeModal');
  });

  it('defines tab order including core views', () => {
    expect(TAB_ORDER[0]).toBe('home');
    expect(TAB_ORDER).toContain('roster');
    expect(TAB_ORDER).toContain('office');
  });
});
