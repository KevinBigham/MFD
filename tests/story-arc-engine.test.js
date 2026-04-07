import { describe, expect, it } from 'vitest';

import { NARRATIVE_STATES } from '../src/systems/story-arcs.js';
import { STORY_ARC_ENGINE } from '../src/systems/story-arc-engine.js';

describe('story-arc-engine.js', () => {
  it('normalizePlayer initializes and sanitizes arc fields', () => {
    const p = { id: 'p1', _arcState: 42, _arcTurns: -3 };
    STORY_ARC_ENGINE.normalizePlayer(p);
    expect(p._arcState).toBeNull();
    expect(p._arcTurns).toBe(0);
  });

  it('initPlayer seeds expected initial states by age/ovr profile', () => {
    const breakout = STORY_ARC_ENGINE.initPlayer({ id: 'a', age: 23, ovr: 74 });
    const swan = STORY_ARC_ENGINE.initPlayer({ id: 'b', age: 36, ovr: 70 });
    const mentor = STORY_ARC_ENGINE.initPlayer({ id: 'c', age: 33, ovr: 76 });
    const elite = STORY_ARC_ENGINE.initPlayer({ id: 'd', age: 28, ovr: 88 });

    expect(breakout._arcState).toBe(NARRATIVE_STATES.BREAKOUT);
    expect(swan._arcState).toBe(NARRATIVE_STATES.SWAN_SONG);
    expect(mentor._arcState).toBe(NARRATIVE_STATES.MENTOR);
    expect(elite._arcState).toBe(NARRATIVE_STATES.ELITE);
  });

  it('getTargetState prioritizes holdout and maps key transition branches', () => {
    const holdout = STORY_ARC_ENGINE.getTargetState(
      { holdout75: true, age: 25, ovr: 80, pos: 'QB', stats: { gp: 6, int: 0, passTD: 0 } },
      4,
      2,
      6
    );
    expect(holdout).toBe(NARRATIVE_STATES.HOLDOUT);

    const slump = STORY_ARC_ENGINE.getTargetState(
      { age: 26, ovr: 82, pos: 'QB', _arcState: NARRATIVE_STATES.ELITE, stats: { gp: 6, int: 12, passTD: 6 } },
      3,
      4,
      7
    );
    expect(slump).toBe(NARRATIVE_STATES.SLUMP);

    const comeback = STORY_ARC_ENGINE.getTargetState(
      { age: 27, ovr: 79, pos: 'QB', _arcState: NARRATIVE_STATES.SLUMP, stats: { gp: 6, int: 3, passTD: 18 } },
      5,
      2,
      9
    );
    expect(comeback).toBe(NARRATIVE_STATES.COMEBACK);

    const decline = STORY_ARC_ENGINE.getTargetState(
      { age: 30, ovr: 70, pos: 'QB', _arcState: NARRATIVE_STATES.ELITE, stats: { gp: 8, int: 6, passTD: 10 } },
      6,
      3,
      10
    );
    expect(decline).toBe(NARRATIVE_STATES.DECLINE);
  });
});
