import { afterEach, describe, expect, it } from 'vitest';

import { OFFSEASON_NEWS, setGetGMArchFn } from '../src/systems/offseason-news.js';

function fixedRng(value = 0) {
  return () => value;
}

function sequenceRng(values) {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

describe('offseason-news.js', () => {
  afterEach(() => {
    setGetGMArchFn(null);
  });

  it('exposes unique template types', () => {
    const types = OFFSEASON_NEWS.templates.map((t) => t.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('trade rumor returns null without eligible player', () => {
    const template = OFFSEASON_NEWS.templates.find((t) => t.type === 'trade_rumor');
    const story = template.generate(
      [
        { id: 'me', icon: '🦅', abbr: 'PHI', roster: [{ id: 'p1', name: 'Depth WR', pos: 'WR', ovr: 70 }] },
        { id: 'ai', icon: '🐻', abbr: 'CHI', roster: [] },
      ],
      'me',
      fixedRng(0)
    );

    expect(story).toBeNull();
  });

  it('holdout threat returns story when elite expiring player exists', () => {
    const template = OFFSEASON_NEWS.templates.find((t) => t.type === 'holdout_threat');
    const story = template.generate(
      [
        {
          id: 'me',
          icon: '🦅',
          abbr: 'PHI',
          roster: [{ id: 'p2', name: 'Alpha WR', pos: 'WR', ovr: 89, contract: { years: 1 } }],
        },
      ],
      'me',
      fixedRng(0)
    );

    expect(story?.headline).toContain('Alpha WR');
    expect(story?.consequence).toEqual({ type: 'player_morale', playerId: 'p2', amount: -8 });
  });

  it('gm archetype rivalry returns null when adapter not set', () => {
    const template = OFFSEASON_NEWS.templates.find((t) => t.type === 'gm_archetype_rivalry');
    const story = template.generate(
      [
        { id: 'me', icon: '🦅', abbr: 'PHI' },
        { id: 'ai', icon: '🐻', abbr: 'CHI' },
      ],
      'me',
      fixedRng(0)
    );

    expect(story).toBeNull();
  });

  it('gm archetype rivalry uses injected archetype provider', () => {
    setGetGMArchFn(() => ({ id: 'analytics' }));
    const template = OFFSEASON_NEWS.templates.find((t) => t.type === 'gm_archetype_rivalry');
    const story = template.generate(
      [
        { id: 'me', icon: '🦅', abbr: 'PHI' },
        { id: 'ai', icon: '🐻', abbr: 'CHI' },
      ],
      'me',
      fixedRng(0)
    );

    expect(story?.archetype).toBe('analytics');
    expect(story?.headline).toContain('CHI');
    expect(story?.consequence.type).toBe('league_buzz');
  });

  it('generate returns up to five unique typed stories with ids', () => {
    setGetGMArchFn(() => ({ id: 'loyalist' }));
    const teams = [
      {
        id: 'me',
        icon: '🦅',
        abbr: 'PHI',
        roster: [
          { id: 'p1', name: 'Star QB', pos: 'QB', ovr: 90, contract: { years: 1 }, devTrait: 'superstar' },
          { id: 'p2', name: 'Top WR', pos: 'WR', ovr: 84, contract: { years: 3 } },
        ],
      },
      { id: 'ai1', icon: '🐻', abbr: 'CHI', roster: [] },
      { id: 'ai2', icon: '🦬', abbr: 'BUF', roster: [] },
    ];

    const stories = OFFSEASON_NEWS.generate(teams, 'me', sequenceRng([0.02, 0.19, 0.37, 0.52, 0.68, 0.84, 0.95]));
    const types = stories.map((story) => story.type);

    expect(stories.length).toBeGreaterThan(0);
    expect(stories.length).toBeLessThanOrEqual(5);
    expect(new Set(types).size).toBe(types.length);

    stories.forEach((story) => {
      expect(story.id).toMatch(new RegExp(`^${story.type}_\\d+$`));
      expect(typeof story.headline).toBe('string');
      expect(story.headline.length).toBeGreaterThan(10);
    });
  });

  it('handles limited inputs without throwing and respects uniqueness', () => {
    setGetGMArchFn(() => null);
    const teams = [{ id: 'me', icon: '🦅', abbr: 'PHI', roster: [{ id: 'p1', name: 'Only Guy', pos: 'QB', ovr: 76 }] }];
    const stories = OFFSEASON_NEWS.generate(teams, 'me', sequenceRng([0, 0.2, 0.4, 0.6, 0.8]));
    const types = stories.map((s) => s.type);

    expect(stories.length).toBeLessThanOrEqual(5);
    expect(new Set(types).size).toBe(types.length);
  });

  it('can return empty list when all weighted picks resolve to null stories', () => {
    setGetGMArchFn(() => null);
    const teams = [{ id: 'me', icon: '🦅', abbr: 'PHI', roster: [] }];
    const stories = OFFSEASON_NEWS.generate(teams, 'me', fixedRng(0.3)); // often picks holdout path, which is null here
    expect(Array.isArray(stories)).toBe(true);
  });
});
