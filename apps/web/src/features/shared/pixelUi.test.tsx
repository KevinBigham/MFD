import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mfd/design-system/components', () => ({
  PixelConsequenceList: () => null,
  PixelMetricCard: () => null,
  PixelPanel: () => null,
  PixelPlayerLink: () => null,
  PixelScreenHeader: () => null,
}));

vi.mock('@mfd/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mfd/engine')>();
  return {
    ...actual,
    getTeamContent: (teamId: string) => {
      if (teamId === 'team-1') {
        return {
          primaryColor: 'var(--brand-primary)',
          secondaryColor: 'var(--brand-secondary)',
          tertiaryColor: 'var(--brand-tertiary)',
        };
      }
      return null;
    },
  };
});

import { autoGrid, navigateTo, teamIdFromDynastyId, teamThemeVars } from './pixelUi';

describe('pixelUi helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the expected auto-fit grid for the provided minimum width', () => {
    expect(autoGrid(140)).toEqual({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px',
    });
  });

  it('updates the hash when navigateTo runs in a browser environment', () => {
    vi.stubGlobal('window', { location: { hash: '' } });

    navigateTo('/franchise/hall');

    expect(window.location.hash).toBe('/franchise/hall');
  });

  it('does not throw when navigateTo runs without a window object', () => {
    expect(() => navigateTo('/franchise/hall')).not.toThrow();
  });

  it('returns the default team colors when no team id is provided', () => {
    expect(teamThemeVars(undefined)).toEqual({
      '--mfd-team-primary': 'var(--mfd-gold)',
      '--mfd-team-secondary': 'var(--mfd-cyan)',
      '--mfd-team-tertiary': 'var(--mfd-red)',
    });
  });

  it('returns the configured team colors when team content exists', () => {
    expect(teamThemeVars('team-1')).toEqual({
      '--mfd-team-primary': 'var(--brand-primary)',
      '--mfd-team-secondary': 'var(--brand-secondary)',
      '--mfd-team-tertiary': 'var(--brand-tertiary)',
    });
  });

  it('extracts the team id from a canonical dynasty id', () => {
    expect(teamIdFromDynastyId('123:team-1:2030')).toBe('team-1');
  });

  it('returns null when the dynasty id does not match the canonical format', () => {
    expect(teamIdFromDynastyId('not-a-dynasty-id')).toBeNull();
  });
});
