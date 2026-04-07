import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { COACH_PLAYER_VOICE_994 } from '../src/data/coach-player-voice.js';

const cpvJson = JSON.parse(
  readFileSync(new URL('../src/data/coach-player-voice.json', import.meta.url), 'utf8')
);

describe('coach-player-voice data', () => {
  it('contains synergy/clash plus coordinator event pools', () => {
    ['synergy', 'clash', 'coordinatorHire', 'coordinatorFire', 'midseasonFiring'].forEach((k) => {
      expect(COACH_PLAYER_VOICE_994).toHaveProperty(k);
      expect(cpvJson).toHaveProperty(k);
    });
  });

  it('keeps major bucket keys aligned between JS and JSON', () => {
    expect(Object.keys(COACH_PLAYER_VOICE_994.synergy).sort()).toEqual(
      Object.keys(cpvJson.synergy).sort()
    );
    expect(Object.keys(COACH_PLAYER_VOICE_994.clash).sort()).toEqual(
      Object.keys(cpvJson.clash).sort()
    );
    expect(cpvJson.coordinatorHire.length).toBeGreaterThan(5);
    expect(cpvJson.midseasonFiring.length).toBeGreaterThan(5);
  });
});
