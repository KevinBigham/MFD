import { describe, expect, it } from 'vitest';

import { COACH_PLAYER_VOICE_994 } from '../src/data/coach-player-voice.js';

describe('coach-player-voice.js', () => {
  it('defines synergy and clash archetype interaction pools', () => {
    expect(Object.keys(COACH_PLAYER_VOICE_994.synergy).length).toBeGreaterThan(4);
    expect(Object.keys(COACH_PLAYER_VOICE_994.clash).length).toBeGreaterThan(2);
    expect(COACH_PLAYER_VOICE_994.synergy.grinder_workEthic.length).toBeGreaterThan(5);
    expect(COACH_PLAYER_VOICE_994.clash.hothead_zenPlayer.length).toBeGreaterThan(5);
  });

  it('includes coordinator transition narratives', () => {
    expect(COACH_PLAYER_VOICE_994.coordinatorHire.length).toBeGreaterThan(5);
    expect(COACH_PLAYER_VOICE_994.coordinatorFire.length).toBeGreaterThan(5);
    expect(COACH_PLAYER_VOICE_994.midseasonFiring.length).toBeGreaterThan(5);
  });
});
