import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Achievement } from '@mfd/engine';
import { AchievementUnlockToast } from './AchievementGallery';

const achievement = {
  id: 'first-banner',
  title: 'First Banner',
  description: 'Win the first championship in the save.',
  category: 'dynasty',
  tier: 'gold',
  unlockedYear: 2030,
  unlockedWeek: 22,
} as unknown as Achievement;

describe('AchievementUnlockToast', () => {
  it('renders nothing without a newly unlocked achievement', () => {
    expect(renderToStaticMarkup(<AchievementUnlockToast achievement={null} />)).toBe('');
  });

  it('hosts newly unlocked achievements with proud Chip feedback', () => {
    const markup = renderToStaticMarkup(<AchievementUnlockToast achievement={achievement} />);

    expect(markup).toContain('ACHIEVEMENT UNLOCKED');
    expect(markup).toContain('First Banner');
    expect(markup).toContain('data-achievement-chip-host="true"');
    expect(markup).toContain('data-chip-pose="proud"');
    expect(markup).toContain('Hang the receipt. This one goes in the building.');
  });
});
