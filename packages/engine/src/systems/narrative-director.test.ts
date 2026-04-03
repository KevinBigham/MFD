import { describe, expect, it } from 'vitest';
import {
  calculateIntensity,
  createDefaultNarrativeIntensity,
  getCooldownStatus,
  recordBeat,
  shouldGenerateEvent,
} from './narrative-director';
import { makeLeagueState } from './test-helpers';

describe('narrative director', () => {
  it('high intensity suppresses negative optional events', () => {
    const game = makeLeagueState('regular_season', 8);
    game.narrativeIntensity = createDefaultNarrativeIntensity();
    game.narrativeIntensity.current = 78;

    const allowed = shouldGenerateEvent(game, 'locker_room', 50, () => 0.2, { polarity: 'negative' });
    expect(allowed).toBe(false);
  });

  it('low intensity boosts positive event generation', () => {
    const game = makeLeagueState('regular_season', 3);
    game.narrativeIntensity = createDefaultNarrativeIntensity();
    game.narrativeIntensity.current = 15;

    const allowed = shouldGenerateEvent(game, 'media', 30, () => 0.15, { polarity: 'positive' });
    expect(allowed).toBe(true);
  });

  it('intensity decays toward fifty over time', () => {
    const intensity = calculateIntensity([
      { week: 1, type: 'negative', intensity: 90, source: 'old' },
      { week: 8, type: 'neutral', intensity: 10, source: 'fresh-neutral' },
    ]);

    expect(intensity).toBeGreaterThan(40);
    expect(intensity).toBeLessThan(90);
  });

  it('breaking news is never suppressed', () => {
    const game = makeLeagueState('regular_season', 10);
    game.narrativeIntensity = createDefaultNarrativeIntensity();
    game.narrativeIntensity.current = 95;

    expect(shouldGenerateEvent(game, 'breaking_news', 80, () => 0, { polarity: 'negative', mandatory: true })).toBe(true);
  });

  it('recent beats are weighted more heavily when recording intensity', () => {
    const game = makeLeagueState('regular_season', 7);
    game.narrativeIntensity = createDefaultNarrativeIntensity();
    recordBeat(game, { week: 1, type: 'negative', intensity: 90, source: 'old-loss' });
    recordBeat(game, { week: 7, type: 'positive', intensity: 80, source: 'fresh-win' });

    expect(game.narrativeIntensity.current).toBeGreaterThan(50);
    expect(getCooldownStatus(game)).toMatch(/hot|warm/);
  });
});
