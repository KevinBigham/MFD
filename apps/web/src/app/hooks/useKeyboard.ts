import { useEffect, useCallback, useRef } from 'react';

interface Shortcut {
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

export function useGlobalKeyboard() {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    for (const s of shortcuts) {
      const metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : true;
      const ctrlMatch = s.ctrl ? e.ctrlKey : true;
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();

      if (keyMatch && metaMatch && ctrlMatch && shiftMatch) {
        if (isInput && !s.meta && !s.ctrl) continue;
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
