import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SocialPost } from '@mfd/engine';
import { buildVisibleSocialPosts, SocialFeed } from './SocialFeed';

let mockState = {
  socialFeed: [
    {
      id: 'post-1',
      source: 'player',
      authorName: 'Marcus Cole',
      content: 'That crowd was different tonight.',
      trigger: 'big_play',
      sentiment: 'hype',
      likes: 4200,
      timestamp: 9,
      replyTo: undefined,
    },
    {
      id: 'post-2',
      source: 'analyst',
      authorName: 'Sarah Chen, MFSN',
      content: 'Bold prediction: Chicago is peaking at the right time.',
      trigger: 'weekly',
      sentiment: 'positive',
      likes: 1800,
      timestamp: 9,
      replyTo: 'post-1',
    },
  ],
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectSocialFeed: (state: typeof mockState) => state.socialFeed,
}));

describe('SocialFeed', () => {
  it('projects saved posts newest-first and filters by source without mutating feed order', () => {
    const feed = [
      { id: 'old-player', source: 'player', timestamp: 1 },
      { id: 'middle-fan', source: 'fan', timestamp: 2 },
      { id: 'new-player', source: 'player', timestamp: 3 },
    ] as SocialPost[];

    expect(buildVisibleSocialPosts(feed, 'all').map((post) => post.id)).toEqual([
      'new-player',
      'middle-fan',
      'old-player',
    ]);
    expect(buildVisibleSocialPosts(feed, 'player').map((post) => post.id)).toEqual([
      'new-player',
      'old-player',
    ]);
    expect(feed.map((post) => post.id)).toEqual(['old-player', 'middle-fan', 'new-player']);
  });

  it('renders posts with source badges', () => {
    const markup = renderToStaticMarkup(<SocialFeed />);

    expect(markup).toContain('MFSN SOCIAL FEED');
    expect(markup).toContain('MARCUS COLE');
    expect(markup).toContain('PLAYER');
    expect(markup).toContain('SARAH CHEN, MFSN');
    expect(markup).toContain('ANALYST');
  });

  it('renders filter controls', () => {
    const markup = renderToStaticMarkup(<SocialFeed />);

    expect(markup).toContain('All');
    expect(markup).toContain('Players');
    expect(markup).toContain('Fans');
    expect(markup).toContain('Reporters');
  });

  it('explains the saved feed source and source-only filter boundary', () => {
    const markup = renderToStaticMarkup(<SocialFeed />);

    expect(markup).toContain('FEED SOURCE');
    expect(markup).toContain('Saved socialFeed');
    expect(markup).toContain('Newest-first projection');
    expect(markup).toContain('Source filters only');
    expect(markup).toContain('clones them into newest-first display order');
    expect(markup).toContain('Filter choices are not saved');
    expect(markup).toContain('no posts are generated during render');
  });

  it('renders the empty state when the feed is empty', () => {
    mockState = { socialFeed: [] };

    const markup = renderToStaticMarkup(<SocialFeed />);

    expect(markup).toContain('NO POSTS YET');
    expect(markup).toContain('advance a week to generate buzz');

    mockState = {
      socialFeed: [
        {
          id: 'post-1',
          source: 'player',
          authorName: 'Marcus Cole',
          content: 'That crowd was different tonight.',
          trigger: 'big_play',
          sentiment: 'hype',
          likes: 4200,
          timestamp: 9,
          replyTo: undefined,
        },
        {
          id: 'post-2',
          source: 'analyst',
          authorName: 'Sarah Chen, MFSN',
          content: 'Bold prediction: Chicago is peaking at the right time.',
          trigger: 'weekly',
          sentiment: 'positive',
          likes: 1800,
          timestamp: 9,
          replyTo: 'post-1',
        },
      ],
    };
  });
});
