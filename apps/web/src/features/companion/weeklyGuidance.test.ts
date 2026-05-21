import { describe, expect, it } from 'vitest';
import {
  buildWeeklyGuidance,
  weeklyGuidanceToDialogueEntry,
} from './weeklyGuidance';

describe('weekly guidance', () => {
  it('turns a post-loss injury week into one clear next action', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'loss',
      currentWeek: 4,
      record: '1-3',
      opponentName: 'Austin Armadillos',
      injuryCount: 3,
      pendingDecisionCount: 2,
      capSpace: 6,
      difficulty: 'hard',
    });

    expect(guidance.whatChanged).toContain('loss');
    expect(guidance.topAction).toBe('Owner-desk decisions come before the advance.');
    expect(guidance.urgent).toContain('2 decisions waiting');
    expect(guidance.canWait).toContain('Legacy rooms can wait');
    expect(guidance.risk).toContain('Hard difficulty');
    expect(guidance.pose).toBe('frustrated');
  });

  it('degrades to Monday Briefing when deeper context is unavailable', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'midseason',
      currentWeek: 2,
    });

    expect(guidance.topAction).toBe('Monday Briefing sets the board.');
    expect(guidance.whyItMatters).toContain('Briefing is triage');
    expect(guidance.pose).toBe('reviewing-tablet');
    expect(weeklyGuidanceToDialogueEntry(guidance)).toEqual(expect.objectContaining({
      id: 'chip.weekly.guidance.2',
      pose: 'reviewing-tablet',
      text: expect.stringContaining('Monday Briefing sets the board.'),
      contextDetails: expect.arrayContaining([
        expect.stringContaining('What changed:'),
        expect.stringContaining('Can wait:'),
      ]),
    }));
  });
});
