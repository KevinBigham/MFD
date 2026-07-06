import { describe, expect, it } from 'vitest';
import {
  getRegisteredShortcuts,
  isTextEditingShortcutTarget,
  registerShortcut,
  shortcutMatchesEvent,
  shouldSkipShortcutForTarget,
  type Shortcut,
} from './useKeyboard';
import { readFileSync } from 'fs';

const noop = () => undefined;

function eventFor(
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'shiftKey'>> = {},
): Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey'> {
  return {
    key,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

function shortcut(input: Partial<Shortcut> = {}): Shortcut {
  return {
    key: '1',
    handler: noop,
    description: 'Open route',
    ...input,
  };
}

function elementTarget(tagName: string, isContentEditable = false): EventTarget {
  return { tagName, isContentEditable } as HTMLElement;
}

describe('keyboard shortcut registry', () => {
  it('returns shortcut metadata without exposing handlers and unregisters cleanly', () => {
    const unregister = registerShortcut(shortcut({ key: 'k', meta: true, description: 'Open command palette' }));

    expect(getRegisteredShortcuts()).toContainEqual({
      key: 'k',
      meta: true,
      ctrl: undefined,
      shift: undefined,
      description: 'Open command palette',
    });
    expect(getRegisteredShortcuts()[0]).not.toHaveProperty('handler');

    unregister();

    expect(getRegisteredShortcuts()).not.toContainEqual(
      expect.objectContaining({ key: 'k', description: 'Open command palette' }),
    );
  });
});

describe('global keyboard listener wiring', () => {
  const source = readFileSync(new URL('./useKeyboard.ts', import.meta.url), 'utf-8');

  it('registers one document keydown listener and removes the same handler on cleanup', () => {
    expect(source).toContain('const handleKeyDown = useCallback((e: KeyboardEvent) => {');
    expect(source).toContain("document.addEventListener('keydown', handleKeyDown);");
    expect(source).toContain("return () => document.removeEventListener('keydown', handleKeyDown);");
    expect(source).toContain('}, [handleKeyDown]);');
  });
});

describe('keyboard shortcut matching', () => {
  it('matches unmodified shortcuts case-insensitively and rejects accidental shift', () => {
    const routeShortcut = shortcut({ key: 'a' });

    expect(shortcutMatchesEvent(routeShortcut, eventFor('A'))).toBe(true);
    expect(shortcutMatchesEvent(routeShortcut, eventFor('a', { shiftKey: true }))).toBe(false);
  });

  it('treats ctrl as a command-palette fallback for meta shortcuts', () => {
    const commandShortcut = shortcut({ key: 'k', meta: true });

    expect(shortcutMatchesEvent(commandShortcut, eventFor('k', { metaKey: true }))).toBe(true);
    expect(shortcutMatchesEvent(commandShortcut, eventFor('k', { ctrlKey: true }))).toBe(true);
    expect(shortcutMatchesEvent(commandShortcut, eventFor('k'))).toBe(false);
  });

  it('requires shift for shifted shortcuts', () => {
    const helpShortcut = shortcut({ key: '?', shift: true });

    expect(shortcutMatchesEvent(helpShortcut, eventFor('?', { shiftKey: true }))).toBe(true);
    expect(shortcutMatchesEvent(helpShortcut, eventFor('?'))).toBe(false);
  });
});

describe('keyboard shortcut editable-target behavior', () => {
  it('identifies text editing targets', () => {
    expect(isTextEditingShortcutTarget(elementTarget('INPUT'))).toBe(true);
    expect(isTextEditingShortcutTarget(elementTarget('TEXTAREA'))).toBe(true);
    expect(isTextEditingShortcutTarget(elementTarget('DIV', true))).toBe(true);
    expect(isTextEditingShortcutTarget(elementTarget('BUTTON'))).toBe(false);
    expect(isTextEditingShortcutTarget(null)).toBe(false);
  });

  it('skips unmodified shortcuts inside text editors but allows meta and ctrl shortcuts', () => {
    const inputTarget = elementTarget('INPUT');

    expect(shouldSkipShortcutForTarget(shortcut({ key: '1' }), inputTarget)).toBe(true);
    expect(shouldSkipShortcutForTarget(shortcut({ key: 'k', meta: true }), inputTarget)).toBe(false);
    expect(shouldSkipShortcutForTarget(shortcut({ key: 'b', ctrl: true }), inputTarget)).toBe(false);
  });
});
