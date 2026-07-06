import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  COMMAND_CATEGORY_ORDER,
  groupCommandItems,
  MfdCommandPalette,
  type CommandItem,
} from './MfdCommandPalette';

function item(id: string, category: CommandItem['category'], label = id): CommandItem {
  return {
    id,
    category,
    label,
    onSelect: vi.fn(),
  };
}

describe('MfdCommandPalette command grouping', () => {
  it('keeps command categories ordered as action, screen, player, team', () => {
    expect(COMMAND_CATEGORY_ORDER).toEqual(['action', 'screen', 'player', 'team']);
  });

  it('groups commands by category while preserving item order inside each category', () => {
    const grouped = groupCommandItems([
      item('player-1', 'player'),
      item('screen-1', 'screen'),
      item('action-1', 'action'),
      item('screen-2', 'screen'),
      item('team-1', 'team'),
    ]);

    expect(grouped.map((group) => group.category)).toEqual(['action', 'screen', 'player', 'team']);
    expect(grouped.map((group) => group.label)).toEqual(['Actions', 'Screens', 'Players', 'Teams']);
    expect(grouped.find((group) => group.category === 'screen')?.items.map((command) => command.id)).toEqual([
      'screen-1',
      'screen-2',
    ]);
  });

  it('omits empty groups from the rendered command list contract', () => {
    const grouped = groupCommandItems([
      item('screen-1', 'screen'),
      item('action-1', 'action'),
    ]);

    expect(grouped.map((group) => group.category)).toEqual(['action', 'screen']);
  });
});

describe('MfdCommandPalette rendering', () => {
  it('renders nothing when closed', () => {
    const markup = renderToStaticMarkup(
      <MfdCommandPalette open={false} onOpenChange={() => undefined} items={[item('advance', 'action')]} />,
    );

    expect(markup).toBe('');
  });

  it('renders grouped headings and command labels when open', () => {
    const markup = renderToStaticMarkup(
      <MfdCommandPalette
        open={true}
        onOpenChange={() => undefined}
        items={[
          item('advance', 'action', 'Advance Week'),
          item('roster', 'screen', 'Roster'),
        ]}
      />,
    );

    expect(markup).toContain('Command palette');
    expect(markup).toContain('Actions');
    expect(markup).toContain('Advance Week');
    expect(markup).toContain('Screens');
    expect(markup).toContain('Roster');
  });

  it('focuses the search input when opened', () => {
    const source = readFileSync(new URL('./MfdCommandPalette.tsx', import.meta.url), 'utf-8');

    expect(source).toContain('autoFocus');
  });
});

describe('MfdCommandPalette shortcut ownership', () => {
  const source = readFileSync(new URL('./MfdCommandPalette.tsx', import.meta.url), 'utf-8');

  it('keeps its built-in Cmd/Ctrl+K listener opt-out for app shells with their own shortcut registry', () => {
    expect(source).toContain('globalShortcutEnabled?: boolean;');
    expect(source).toContain('globalShortcutEnabled = true');
    expect(source).toContain('if (!globalShortcutEnabled) return undefined;');
    expect(source).toContain("document.addEventListener('keydown', handleKeyDown);");
    expect(source).toContain("document.removeEventListener('keydown', handleKeyDown)");
  });
});
