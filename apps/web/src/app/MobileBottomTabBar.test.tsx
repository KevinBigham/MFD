/**
 * Sprint 44 — MobileBottomTabBar render tests.
 *
 * Uses renderToStaticMarkup (matching sibling AutosaveToast.test.tsx) so we
 * don't need @testing-library. useRouter() is stubbed via vi.mock because
 * the bar sits outside a RouterProvider in these unit tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Users, Crown } from 'lucide-react';

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}));

import { MobileBottomTabBar } from './MobileBottomTabBar';

const drawerGroups = [
  {
    id: 'core',
    label: 'CORE',
    items: [
      { path: '/', shortLabel: 'Briefing', icon: <Users size={16} /> },
      { path: '/week-advance', shortLabel: 'Advance', icon: <Users size={16} /> },
    ],
  },
  {
    id: 'dynasty',
    label: 'DYNASTY',
    items: [
      { path: '/owner', shortLabel: 'Owner', icon: <Crown size={16} /> },
    ],
  },
];

describe('MobileBottomTabBar', () => {
  it('renders all five primary slots including the More trigger', () => {
    const markup = renderToStaticMarkup(
      <MobileBottomTabBar activePath="/" drawerGroups={drawerGroups} badges={{}} />,
    );
    expect(markup).toContain('Briefing');
    expect(markup).toContain('Roster');
    expect(markup).toContain('Schedule');
    expect(markup).toContain('Advance');
    expect(markup).toContain('More');
  });

  it('tags itself with data-mfd-mobile-nav so CSS can gate visibility', () => {
    const markup = renderToStaticMarkup(
      <MobileBottomTabBar activePath="/" drawerGroups={drawerGroups} badges={{}} />,
    );
    expect(markup).toContain('data-mfd-mobile-nav="true"');
  });

  it('uses fixed position + env(safe-area-inset-bottom) for notched devices', () => {
    const markup = renderToStaticMarkup(
      <MobileBottomTabBar activePath="/" drawerGroups={drawerGroups} badges={{}} />,
    );
    expect(markup).toContain('position:fixed');
    expect(markup).toContain('safe-area-inset-bottom');
  });

  it('marks every nav button as data-mfd-nav-item for global 44px touch target CSS', () => {
    const markup = renderToStaticMarkup(
      <MobileBottomTabBar activePath="/roster" drawerGroups={drawerGroups} badges={{}} />,
    );
    // All primary slots + More = 5 attributes at minimum.
    const matches = markup.match(/data-mfd-nav-item="true"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it('paints the badge dot on a primary slot when a badge count is present', () => {
    const markup = renderToStaticMarkup(
      <MobileBottomTabBar activePath="/" drawerGroups={drawerGroups} badges={{ '/roster': 3 }} />,
    );
    expect(markup).toContain('aria-label="3 update"');
    expect(markup).toContain('--mfd-red');
  });

  it('highlights the More slot when the active route is not one of the primaries', () => {
    const markup = renderToStaticMarkup(
      <MobileBottomTabBar activePath="/trades" drawerGroups={drawerGroups} badges={{}} />,
    );
    // When More is "active", its button wears the gold border-top — so the
    // gold color token must appear in the markup.
    expect(markup).toContain('--mfd-gold');
  });
});
