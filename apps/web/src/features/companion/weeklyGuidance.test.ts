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
    expect(guidance.topAction).toBe('Open the Inbox before touching the advance button.');
    expect(guidance.urgent).toContain('2 decisions waiting');
    expect(guidance.canWait).toContain('Deep legacy screens can wait');
    expect(guidance.risk).toContain('Hard difficulty');
  });

  it('degrades to Monday Briefing when deeper context is unavailable', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'midseason',
      currentWeek: 2,
    });

    expect(guidance.topAction).toBe('Start with the Monday Briefing.');
    expect(guidance.whyItMatters).toContain('weekly triage');
    expect(weeklyGuidanceToDialogueEntry(guidance)).toEqual(expect.objectContaining({
      id: 'chip.weekly.guidance.2',
      text: expect.stringContaining('Start with the Monday Briefing.'),
      contextDetails: expect.arrayContaining([
        expect.stringContaining('What changed:'),
        expect.stringContaining('Can wait:'),
      ]),
    }));
  });
});
