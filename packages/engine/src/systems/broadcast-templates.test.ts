import { describe, expect, it } from 'vitest';
import {
  getPlaybookCommentary,
  PLAYBOOK_BRIDGE_TEMPLATES,
  PLAY_SPECIFIC_COMMENTARY,
} from './broadcast-templates';

describe('broadcast playbook templates', () => {
  it('expands every playbook bridge category to at least four templates', () => {
    const expectedCategories = [
      'run',
      'pass',
      'touchdown',
      'turnover',
      'sack',
      'big_play',
      'clutch',
      'goal_line',
      'two_minute',
      'third_down',
      'trick_play',
      'blitz',
    ] as const;

    expect(Object.keys(PLAYBOOK_BRIDGE_TEMPLATES).sort()).toEqual([...expectedCategories].sort());
    for (const category of expectedCategories) {
      expect(PLAYBOOK_BRIDGE_TEMPLATES[category]).toHaveLength(4);
    }
  });

  it('defines play-specific commentary for all offensive plays', () => {
    expect(Object.keys(PLAY_SPECIFIC_COMMENTARY)).toHaveLength(24);
    expect(PLAY_SPECIFIC_COMMENTARY.inside_zone.length).toBeGreaterThanOrEqual(2);
    expect(PLAY_SPECIFIC_COMMENTARY.rollout.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps play-specific commentary arrays free of duplicates', () => {
    for (const lines of Object.values(PLAY_SPECIFIC_COMMENTARY)) {
      expect(new Set(lines).size).toBe(lines.length);
    }
  });

  it('returns matchup-aware commentary for known play ids', () => {
    const commentary = getPlaybookCommentary('inside_zone', 'cover_2', 'goal_line');

    expect(commentary.length).toBeGreaterThan(0);
    expect(commentary.some((line) => line.includes('Inside Zone'))).toBe(true);
    expect(commentary.some((line) => line.includes('Cover 2'))).toBe(true);
  });

  it('returns an empty array for unknown play ids', () => {
    expect(getPlaybookCommentary('unknown', 'cover_2', 'goal_line')).toEqual([]);
    expect(getPlaybookCommentary('inside_zone', 'unknown', 'goal_line')).toEqual([]);
  });

  it('filters situation-specific commentary to the requested situation', () => {
    const goalLine = getPlaybookCommentary('goal_line_dive', 'engage_eight', 'goal_line');
    const twoMinute = getPlaybookCommentary('goal_line_dive', 'engage_eight', 'two_minute');

    expect(goalLine.some((line) => /goal line/i.test(line))).toBe(true);
    expect(twoMinute.every((line) => !/goal line against a stacked/i.test(line))).toBe(true);
  });

  it('does not return duplicate commentary lines', () => {
    const commentary = getPlaybookCommentary('deep_post', 'quarters', 'big_play');

    expect(new Set(commentary).size).toBe(commentary.length);
  });

  it('renders valid placeholders in bridge commentary', () => {
    const commentary = getPlaybookCommentary('play_action', 'zone_blitz', 'third_down');

    expect(commentary.every((line) => !line.includes('{{offensivePlay}}'))).toBe(true);
    expect(commentary.every((line) => !line.includes('{{defensivePlay}}'))).toBe(true);
  });
});
