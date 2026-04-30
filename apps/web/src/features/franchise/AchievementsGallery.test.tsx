import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Achievement } from '@mfd/engine';
import { AchievementsGalleryView } from './AchievementsGallery';
import { AchievementMedalSvg } from './achievementMedalSvg';

function achievement(overrides: Partial<Achievement>): Achievement {
  return {
    id: 'dynasty:first_championship',
    title: 'First Championship',
    description: 'Win your first title.',
    category: 'dynasty',
    tier: 'gold',
    condition: { type: 'championships', threshold: 1 },
    unlockedYear: 2030,
    unlockedWeek: 22,
    icon: 'trophy',
    ...overrides,
  };
}

const ACHIEVEMENTS: Achievement[] = [
  achievement({ id: 'dynasty:first_championship', title: 'First Championship', tier: 'gold', unlockedYear: 2030 }),
  achievement({ id: 'roster:homegrown', title: 'Homegrown', category: 'roster', tier: 'silver', unlockedYear: null, unlockedWeek: null }),
  achievement({ id: 'draft:scout_elite', title: 'Scout Elite', category: 'draft', tier: 'bronze', unlockedYear: 2029 }),
];

describe('AchievementsGallery', () => {
  it('renders the Achievements header', () => {
    const markup = renderToStaticMarkup(<AchievementsGalleryView achievements={ACHIEVEMENTS} />);

    expect(markup).toContain('ACHIEVEMENTS');
    expect(markup).toContain('Every milestone earned, every banner raised.');
  });

  it('renders one card per achievement in props', () => {
    const markup = renderToStaticMarkup(<AchievementsGalleryView achievements={ACHIEVEMENTS} />);

    expect(markup.match(/data-achievement-card=/g)).toHaveLength(3);
  });

  it('filters Unlocked achievements only', () => {
    const markup = renderToStaticMarkup(<AchievementsGalleryView achievements={ACHIEVEMENTS} initialFilter="unlocked" />);

    expect(markup).toContain('First Championship');
    expect(markup).toContain('Scout Elite');
    expect(markup).not.toContain('Homegrown');
  });

  it('filters Locked achievements only', () => {
    const markup = renderToStaticMarkup(<AchievementsGalleryView achievements={ACHIEVEMENTS} initialFilter="locked" />);

    expect(markup).toContain('Homegrown');
    expect(markup).not.toContain('First Championship');
  });

  it('renders the gold medal SVG for tier gold', () => {
    const markup = renderToStaticMarkup(<AchievementMedalSvg tier="gold" locked={false} title="Gold medal" />);

    expect(markup).toContain('data-medal-tier="gold"');
    expect(markup).toContain('data-medal-laurel="true"');
  });

  it('renders a lock overlay for locked medals', () => {
    const markup = renderToStaticMarkup(<AchievementMedalSvg tier="silver" locked title="Locked medal" />);

    expect(markup).toContain('data-medal-locked="true"');
    expect(markup).toContain('aria-label="Locked medal"');
  });

  it('shows the correct unlocked counter', () => {
    const markup = renderToStaticMarkup(<AchievementsGalleryView achievements={ACHIEVEMENTS} />);

    expect(markup).toContain('2 of 3 unlocked');
  });

  it('renders the empty state when zero achievements are unlocked', () => {
    const locked = ACHIEVEMENTS.map((entry) => ({ ...entry, unlockedYear: null, unlockedWeek: null }));
    const markup = renderToStaticMarkup(<AchievementsGalleryView achievements={locked} />);

    expect(markup).toContain('No achievements yet. Build something legendary.');
  });
});
