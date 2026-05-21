import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('navigation completeness', () => {
  const content = readFileSync(new URL('./App.tsx', import.meta.url), 'utf-8');

  it('NAV_ITEMS includes previously orphaned routes', () => {
    expect(content).toContain("path: '/super-bowl'");
    expect(content).toContain("path: '/training-camp'");
    expect(content).toContain("path: '/game-plan'");
    expect(content).toContain("path: '/film-room'");
    expect(content).toContain("path: '/fa-targets'");
    expect(content).toContain("path: '/watch-list'");
  });

  it('NAV_GROUPS includes the new paths', () => {
    expect(content).toContain("'/training-camp'");
    expect(content).toContain("'/super-bowl'");
    expect(content).toContain("'/fa-targets'");
    expect(content).toContain("'/watch-list'");
  });

  it('command palette Advance Week navigates to /week-advance', () => {
    expect(content).not.toContain("onSelect: () => {},");
    expect(content).toContain("void router.navigate({ to: '/week-advance' })");
  });

  it('nav buttons have data-nav attributes for tutorial targeting', () => {
    expect(content).toContain('data-nav={item.path}');
  });

  it('LazyRouteFrame uses styled pixel loading with animation', () => {
    expect(content).toContain('mfdLoadSlide');
    expect(content).toContain('Loader');
  });

  it('PlayerDevelopment route uses wrapper with real data', () => {
    expect(content).toContain('PlayerDevRouteWrapper');
    expect(content).toContain('generateDevelopmentReport');
  });

  it('AudioToggle is rendered in the navigation header', () => {
    expect(content).toContain('<AudioToggle');
    expect(content).toContain('playSound');
  });
});
