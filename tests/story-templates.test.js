import { describe, expect, it } from 'vitest';

import { PRESSER_TAG_TRIGGERS, STORY_TEMPLATES } from '../src/systems/story-templates.js';

describe('story-templates.js', () => {
  it('defines 15 story templates and unique ids', () => {
    expect(STORY_TEMPLATES).toHaveLength(15);
    const ids = STORY_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('holdout trigger requires regular phase, trait, expiring contract, and high OVR', () => {
    const holdout = STORY_TEMPLATES.find((t) => t.id === 'holdout');
    const active = holdout.triggerFn({
      phase: 'regular',
      player: { trait: 'mercenary', contract: { years: 1 }, ovr: 82 },
    });
    const inactive = holdout.triggerFn({
      phase: 'regular',
      player: { trait: 'captain', contract: { years: 1 }, ovr: 82 },
    });
    expect(active).toBe(true);
    expect(inactive).toBe(false);
  });

  it('qb_controversy trigger activates only for close QB competition', () => {
    const qb = STORY_TEMPLATES.find((t) => t.id === 'qb_controversy');
    const on = qb.triggerFn({
      phase: 'regular',
      weekNum: 7,
      roster: [{ pos: 'QB', ovr: 79 }, { pos: 'QB', ovr: 75 }],
    });
    const off = qb.triggerFn({
      phase: 'regular',
      weekNum: 7,
      roster: [{ pos: 'QB', ovr: 85 }, { pos: 'QB', ovr: 70 }],
    });
    expect(on).toBe(true);
    expect(off).toBe(false);
  });

  it('includes presser tag triggers for hot_seat and underdog_run progression', () => {
    const keys = PRESSER_TAG_TRIGGERS.map((t) => t.storyId);
    expect(keys).toEqual(expect.arrayContaining(['hot_seat', 'underdog_run']));
  });
});
