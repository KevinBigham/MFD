import { describe, expect, it, vi } from 'vitest';

vi.mock('@mfd/engine', async () => {
  const actual = await vi.importActual<typeof import('@mfd/engine')>('@mfd/engine');
  return {
    ...actual,
    getTeamContent: (idOrAbbr: string) => {
      if (idOrAbbr?.toUpperCase() === 'CHI') {
        return {
          id: 'CHI',
          primaryColor: 'var(--brand-primary)',
          secondaryColor: 'var(--brand-secondary)',
          tertiaryColor: 'var(--brand-tertiary)',
        };
      }
      return null;
    },
  };
});

import type { GameState } from '@mfd/engine';
import { resolveTeamContent } from './team-content-resolver';

function buildGame(entries: Array<{ id: string; abbr: string }>): GameState {
  return {
    teams: Object.fromEntries(
      entries.map((entry) => [entry.id, { id: entry.id, abbr: entry.abbr }]),
    ),
  } as unknown as GameState;
}

describe('resolveTeamContent', () => {
  it('returns null for nullish input', () => {
    expect(resolveTeamContent(null, null)).toBeNull();
    expect(resolveTeamContent(null, undefined)).toBeNull();
    expect(resolveTeamContent(null, '')).toBeNull();
  });

  it('resolves content via direct canonical abbr lookup', () => {
    const content = resolveTeamContent(null, 'CHI');
    expect(content?.primaryColor).toBe('var(--brand-primary)');
  });

  it('resolves content via runtime uid bridge through game.teams.abbr', () => {
    const game = buildGame([{ id: 'js2vt4ghp', abbr: 'CHI' }]);

    const content = resolveTeamContent(game, 'js2vt4ghp');

    expect(content?.primaryColor).toBe('var(--brand-primary)');
  });

  it('returns null when the runtime uid is not present in game.teams', () => {
    const game = buildGame([{ id: 'js2vt4ghp', abbr: 'CHI' }]);

    expect(resolveTeamContent(game, 'unknown-uid')).toBeNull();
  });

  it('returns null when the runtime uid resolves but the abbr has no content', () => {
    const game = buildGame([{ id: 'js2vt4ghp', abbr: 'ZZZ' }]);

    expect(resolveTeamContent(game, 'js2vt4ghp')).toBeNull();
  });

  it('prefers direct abbr lookup over game.teams bridge when both could match', () => {
    // If a canonical abbr is passed AND the runtime store happens to not have it,
    // direct lookup still succeeds — no store round-trip required.
    const game = buildGame([{ id: 'js2vt4ghp', abbr: 'DET' }]);

    const content = resolveTeamContent(game, 'CHI');

    expect(content?.id).toBe('CHI');
  });

  it('treats undefined game the same as null — direct lookup only', () => {
    expect(resolveTeamContent(undefined, 'CHI')?.id).toBe('CHI');
    expect(resolveTeamContent(undefined, 'js2vt4ghp')).toBeNull();
  });
});
