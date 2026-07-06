import { useEffect, useCallback, useRef } from 'react';

export interface Shortcut {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
}

const shortcuts: Shortcut[] = [];

export function registerShortcut(shortcut: Shortcut) {
  shortcuts.push(shortcut);
  return () => {
    const idx = shortcuts.indexOf(shortcut);
    if (idx !== -1) shortcuts.splice(idx, 1);
  };
}

export function getRegisteredShortcuts() {
  return shortcuts.map((s) => ({
    key: s.key,
    meta: s.meta,
    ctrl: s.ctrl,
    shift: s.shift,
    description: s.description,
  }));
}

export function isTextEditingShortcutTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable;
}

export function shortcutMatchesEvent(
  shortcut: Shortcut,
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey'>,
): boolean {
  const metaMatch = shortcut.meta ? (event.metaKey || event.ctrlKey) : true;
  const ctrlMatch = shortcut.ctrl ? event.ctrlKey : true;
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

  return keyMatch && metaMatch && ctrlMatch && shiftMatch;
}

export function shouldSkipShortcutForTarget(shortcut: Shortcut, target: EventTarget | null): boolean {
  return isTextEditingShortcutTarget(target) && !shortcut.meta && !shortcut.ctrl;
}

export function useGlobalKeyboard() {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const s of shortcuts) {
      if (shortcutMatchesEvent(s, e)) {
        if (shouldSkipShortcutForTarget(s, e.target)) continue;
        e.preventDefault();
        s.handler();
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useShortcut(
  key: string,
  handler: () => void,
  description: string,
  modifiers?: { meta?: boolean; ctrl?: boolean; shift?: boolean },
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const meta = modifiers?.meta;
  const ctrl = modifiers?.ctrl;
  const shift = modifiers?.shift;

  useEffect(() => {
    return registerShortcut({
      key,
      meta,
      ctrl,
      shift,
      handler: () => handlerRef.current(),
      description,
    });
  }, [key, description, meta, ctrl, shift]);
}
