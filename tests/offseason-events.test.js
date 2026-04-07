import { describe, expect, it } from 'vitest';

import { OFFSEASON_EVENTS } from '../src/systems/offseason-events.js';

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

describe('offseason-events.js', () => {
  it('exposes unique template ids', () => {
    const ids = OFFSEASON_EVENTS.templates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns combine surprise when draft class has low-OVR prospect', () => {
    const template = OFFSEASON_EVENTS.templates.find((t) => t.id === 'combine_surprise');
    const event = template.generate(
      { dc: [{ id: 'p1', name: 'Sleeper Prospect', ovr: 60 }] },
      fixedRng(0)
    );

    expect(event?.type).toBe('combine_surprise');
    expect(event?.playerId).toBe('p1');
    expect(event?.choices).toHaveLength(2);
  });

  it('returns null for combine surprise when no low-OVR prospects exist', () => {
    const template = OFFSEASON_EVENTS.templates.find((t) => t.id === 'combine_surprise');
    const event = template.generate(
      { dc: [{ id: 'p1', name: 'Top Prospect', ovr: 75 }] },
      fixedRng(0)
    );

    expect(event).toBeNull();
  });

  it('returns null for owner demand at high owner patience', () => {
    const template = OFFSEASON_EVENTS.templates.find((t) => t.id === 'owner_demand');
    const event = template.generate({ ownerPatience: 70 }, fixedRng(0));
    expect(event).toBeNull();
  });

  it('returns owner demand with patience boost choices when owner patience is low', () => {
    const template = OFFSEASON_EVENTS.templates.find((t) => t.id === 'owner_demand');
    const event = template.generate({ ownerPatience: 40 }, fixedRng(0));

    expect(event?.type).toBe('owner_demand');
    expect(event?.choices.map((choice) => choice.effect.type)).toEqual(['patience_boost', 'patience_boost']);
  });

  it('prefers real fired coach data for coaching carousel when present', () => {
    const template = OFFSEASON_EVENTS.templates.find((t) => t.id === 'coaching_carousel');
    const event = template.generate(
      {
        season: {
          firedHCs974: [{ icon: '🔥', team: 'NYC', coach: 'Pat Stone', record: '4-13' }],
        },
        teams: [],
      },
      fixedRng(0)
    );

    expect(event?.type).toBe('coaching_carousel');
    expect(event?.headline).toContain('Pat Stone');
    expect(event?.headline).toContain('NYC');
  });

  it('falls back to losing AI teams for coaching carousel when fired coach data is empty', () => {
    const template = OFFSEASON_EVENTS.templates.find((t) => t.id === 'coaching_carousel');
    const event = template.generate(
      {
        season: { firedHCs974: [] },
        teams: [{ isUser: false, losses: 11, icon: '🦁', abbr: 'DET', staff: { hc: { name: 'Dan V' } } }],
      },
      fixedRng(0)
    );

    expect(event?.type).toBe('coaching_carousel');
    expect(event?.headline).toContain('DET');
    expect(event?.headline).toContain('Dan V');
  });

  it('returns scandal only when user team has eligible players', () => {
    const template = OFFSEASON_EVENTS.templates.find((t) => t.id === 'scandal');
    const event = template.generate(
      {
        myId: 'u1',
        teams: [{ id: 'u1', roster: [{ id: 'p2', name: 'Star WR', ovr: 84 }] }],
      },
      fixedRng(0)
    );

    expect(event?.type).toBe('scandal');
    expect(event?.player).toBe('Star WR');
  });

  it('generate returns at most four unique event types', () => {
    const ctx = {
      myId: 'user',
      ownerPatience: 40,
      dc: [{ id: 'dc1', name: 'Sleeper', ovr: 58 }],
      fas: [{ name: 'Veteran Star', ovr: 80 }],
      season: { firedHCs974: [] },
      teams: [
        {
          id: 'user',
          isUser: true,
          losses: 6,
          roster: [{ id: 'r1', name: 'Core Player', ovr: 70 }],
        },
        {
          id: 'ai1',
          isUser: false,
          losses: 12,
          icon: '🐻',
          abbr: 'CHI',
          staff: { hc: { name: 'A. Coach' } },
          roster: [],
        },
      ],
    };

    const events = OFFSEASON_EVENTS.generate(ctx, sequenceRng([0, 0.17, 0.33, 0.49, 0.65, 0.81, 0.95]));
    const types = events.map((event) => event.type);

    expect(events.length).toBeLessThanOrEqual(4);
    expect(new Set(types).size).toBe(types.length);
  });

  it('every generated event includes two player choices', () => {
    const ctx = {
      myId: 'user',
      ownerPatience: 10,
      dc: [{ id: 'dc1', name: 'Sleeper', ovr: 58 }],
      fas: [{ name: 'Veteran Star', ovr: 80 }],
      season: { firedHCs974: [{ icon: '🔥', team: 'DAL', coach: 'J. Hill', record: '5-12' }] },
      teams: [
        { id: 'user', isUser: true, losses: 8, roster: [{ id: 'r1', name: 'Core Player', ovr: 75 }] },
        { id: 'ai1', isUser: false, losses: 11, icon: '🦅', abbr: 'PHI', staff: { hc: { name: 'B. Shaw' } }, roster: [] },
      ],
    };

    const events = OFFSEASON_EVENTS.generate(ctx, sequenceRng([0.1, 0.2, 0.3, 0.4, 0.5]));

    expect(events.length).toBeGreaterThan(0);
    events.forEach((event) => {
      expect(event.choices).toHaveLength(2);
      expect(typeof event.headline).toBe('string');
    });
  });
});
