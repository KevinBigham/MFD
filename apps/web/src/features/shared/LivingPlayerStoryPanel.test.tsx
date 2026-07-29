import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { LivingPlayerStory } from '@mfd/engine';
import { LivingPlayerStoryPanel } from './LivingPlayerStoryPanel';

const story: LivingPlayerStory = {
  playerId: 'player-1',
  playerName: 'Jay Breakout',
  teamId: 'afce1',
  stage: 'legacy',
  status: 'active',
  headline: 'Jay Breakout completed the climb',
  summary: 'A prospect became a league name.',
  heat: 90,
  mentor: {
    playerId: 'mentor-1',
    name: 'Marcus Mentor',
    positionGroup: 'WR',
    year: 2026,
    bonus: 3,
  },
  activeThreadId: 'storyline-1',
  nextBeatHint: 'Next beat: defend the crown.',
  chapters: [
    {
      id: 'mentor',
      source: 'mentorship',
      year: 2026,
      week: null,
      label: 'The apprenticeship',
      summary: 'Marcus Mentor took Jay under his wing.',
      sourceRef: 'mentoringPair:mentor-1:player-1',
    },
    {
      id: 'award',
      source: 'award',
      year: 2026,
      week: null,
      label: 'Rookie of the Year',
      summary: 'Jay won Rookie of the Year.',
      sourceRef: 'award:2026:oroy:player-1',
    },
  ],
  sourceRefs: ['mentoringPair:mentor-1:player-1', 'award:2026:oroy:player-1'],
};

describe('LivingPlayerStoryPanel', () => {
  it('renders the mentor-to-legacy chain and Chip read with profile/timeline actions', () => {
    const markup = renderToStaticMarkup(
      <LivingPlayerStoryPanel
        story={story}
        chipLine="Chip: this is the chapter to watch."
        onOpenProfile={vi.fn()}
        onOpenTimeline={vi.fn()}
      />,
    );

    expect(markup).toContain('data-living-player-story="player-1"');
    expect(markup).toContain('LIVING PLAYER STORY');
    expect(markup).toContain('Mentor: Marcus Mentor');
    expect(markup).toContain('THE APPRENTICESHIP');
    expect(markup).toContain('Rookie of the Year');
    expect(markup).toContain('Chip: this is the chapter to watch.');
    expect(markup).toContain('Open Profile');
    expect(markup).toContain('Open Timeline');
    expect(markup).toContain('Read-only chain');
  });
});
