import { describe, expect, it } from 'vitest';

import { aiPickDefGPPreview, aiPickOffGPPreview } from '../src/systems/ai-gameplan.js';

describe('ai-gameplan.js', () => {
  it('aiPickOffGPPreview chooses air_raid for strong QB + WR group', () => {
    const team = {
      roster: [
        { pos: 'QB', ovr: 82 },
        { pos: 'WR', ovr: 78 },
        { pos: 'WR', ovr: 75 },
        { pos: 'TE', ovr: 74 },
        { pos: 'RB', ovr: 68 },
      ],
    };
    expect(aiPickOffGPPreview(team)).toBe('air_raid');
  });

  it('aiPickOffGPPreview chooses ground_pound when RB is high and QB is low', () => {
    const team = {
      roster: [
        { pos: 'QB', ovr: 69 },
        { pos: 'RB', ovr: 83 },
        { pos: 'WR', ovr: 67 },
      ],
    };
    expect(aiPickOffGPPreview(team)).toBe('ground_pound');
  });

  it('aiPickOffGPPreview falls back to balanced_o', () => {
    const team = {
      roster: [
        { pos: 'QB', ovr: 70 },
        { pos: 'RB', ovr: 70 },
        { pos: 'WR', ovr: 68 },
      ],
    };
    expect(aiPickOffGPPreview(team)).toBe('balanced_o');
  });

  it('aiPickDefGPPreview chooses blitz_heavy for strong front and weak coverage', () => {
    const team = {
      roster: [
        { pos: 'DL', ovr: 81 },
        { pos: 'DL', ovr: 80 },
        { pos: 'LB', ovr: 79 },
        { pos: 'LB', ovr: 78 },
        { pos: 'LB', ovr: 77 },
        { pos: 'CB', ovr: 66 },
        { pos: 'S', ovr: 68 },
      ],
    };
    expect(aiPickDefGPPreview(team)).toBe('blitz_heavy');
  });

  it('aiPickDefGPPreview chooses man_press for elite DB room', () => {
    const team = {
      roster: [
        { pos: 'DL', ovr: 72 },
        { pos: 'LB', ovr: 73 },
        { pos: 'CB', ovr: 82 },
        { pos: 'CB', ovr: 79 },
        { pos: 'S', ovr: 78 },
      ],
    };
    expect(aiPickDefGPPreview(team)).toBe('man_press');
  });

  it('aiPickDefGPPreview falls back to balanced_d', () => {
    const team = {
      roster: [
        { pos: 'DL', ovr: 70 },
        { pos: 'LB', ovr: 69 },
        { pos: 'CB', ovr: 70 },
        { pos: 'S', ovr: 71 },
      ],
    };
    expect(aiPickDefGPPreview(team)).toBe('balanced_d');
  });
});
