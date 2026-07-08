import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildRecapChipCopy,
  deriveRecapChipOutcome,
  getRecapChipLingerMs,
  getRecapChipPose,
  getRecapChipReactionStyle,
  RecapChipReaction,
  shouldCompactRecapChipReaction,
  type RecapChipOutcome,
} from './RecapChipReaction';

describe('RecapChipReaction outcome mapping', () => {
  it.each([
    ['BLOWOUT_WIN', 'rallying'],
    ['CLOSE_WIN', 'fist-bump'],
    ['WIN', 'proud'],
    ['OT_WIN', 'laughing'],
    ['COMEBACK_WIN', 'rallying'],
    ['CLOSE_LOSS', 'frustrated'],
    ['BLOWOUT_LOSS', 'head-in-hands'],
    ['CHOKE_LOSS', 'facepalm'],
    ['LOSS', 'tired'],
    ['OT_LOSS', 'head-in-hands'],
  ] satisfies Array<[RecapChipOutcome, string]>)('maps %s to %s', (outcome, pose) => {
    expect(getRecapChipPose(outcome)).toBe(pose);
  });

  it('classifies wins by comeback, overtime, blowout, close, then normal result', () => {
    expect(deriveRecapChipOutcome({ result: 'win', margin: 3, userWinProbPoints: [62, 19, 55, 100] })).toBe('COMEBACK_WIN');
    expect(deriveRecapChipOutcome({ result: 'win', margin: 3, overtime: true })).toBe('OT_WIN');
    expect(deriveRecapChipOutcome({ result: 'win', margin: 28 })).toBe('BLOWOUT_WIN');
    expect(deriveRecapChipOutcome({ result: 'win', margin: 7 })).toBe('CLOSE_WIN');
    expect(deriveRecapChipOutcome({ result: 'win', margin: 14 })).toBe('WIN');
  });

  it('classifies losses by choke, overtime, blowout, close, then normal result', () => {
    expect(deriveRecapChipOutcome({ result: 'loss', margin: 4, userWinProbPoints: [50, 81, 64, 0] })).toBe('CHOKE_LOSS');
    expect(deriveRecapChipOutcome({ result: 'loss', margin: 3, overtime: true })).toBe('OT_LOSS');
    expect(deriveRecapChipOutcome({ result: 'loss', margin: 24 })).toBe('BLOWOUT_LOSS');
    expect(deriveRecapChipOutcome({ result: 'loss', margin: 7 })).toBe('CLOSE_LOSS');
    expect(deriveRecapChipOutcome({ result: 'loss', margin: 10 })).toBe('LOSS');
  });

  it('falls back to unknown when the package result is missing or tied', () => {
    expect(deriveRecapChipOutcome({ result: null, margin: 0 })).toBe('UNKNOWN');
    expect(deriveRecapChipOutcome({ result: 'tie', margin: 0 })).toBe('UNKNOWN');
    expect(getRecapChipPose('UNKNOWN')).toBe('reviewing-tablet');
  });
});

describe('RecapChipReaction rendering', () => {
  it('renders the Chip reaction header with polite live-region semantics', () => {
    const markup = renderToStaticMarkup(
      <RecapChipReaction
        outcome="COMEBACK_WIN"
        teamName="Chicago Blaze"
        opponentName="Detroit Iron"
        userScore={31}
        opponentScore={28}
        reducedMotion
      />,
    );

    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('data-recap-chip-reaction="COMEBACK_WIN"');
    expect(markup).toContain('Chicago Blaze won after trailing against Detroit Iron 31-28.');
    expect(markup).toContain('Must Do: identify slow-start cause before Game Plan changes.');
    expect(markup).toContain('Where: Recap, Game Plan.');
    expect(markup).toContain('Consequence: missed protection hits next week before comeback calls help.');
    expect(markup).not.toContain('adjustments help');
    expect(markup).toContain('data-chip-pose="rallying"');
  });

  it('renders deterministic one-line copy for losses without hardcoded team names', () => {
    expect(buildRecapChipCopy({
      outcome: 'CHOKE_LOSS',
      teamName: 'Oakland Anchors',
      userScore: 20,
      opponentScore: 24,
    })).toBe('Oakland Anchors lost after leading 20-24. Must Do: identify the late call or tired starter before changing roster. Where: Recap, Roster, Game Plan. Consequence: late-game misses repeat and cut owner patience and job security.');
  });

  it('keeps every recap reaction tied to a must-do action, where, and consequence', () => {
    const outcomes: RecapChipOutcome[] = [
      'BLOWOUT_WIN',
      'CLOSE_WIN',
      'WIN',
      'OT_WIN',
      'COMEBACK_WIN',
      'CLOSE_LOSS',
      'BLOWOUT_LOSS',
      'CHOKE_LOSS',
      'LOSS',
      'OT_LOSS',
      'UNKNOWN',
    ];

    for (const outcome of outcomes) {
      const copy = buildRecapChipCopy({
        outcome,
        teamName: 'Chicago Blaze',
        opponentName: 'Detroit Iron',
        userScore: 24,
        opponentScore: 20,
      });

      expect(copy).toContain('Must Do:');
      expect(copy).toContain('Where:');
      expect(copy).toContain('Consequence:');
      expect(copy).toMatch(/\b(change|find|identify|name|open|set|Roster|Depth Chart|Game Plan|Film Room|Recap|Advance Week)\b/i);
      expect(copy).toMatch(/\b(before|unless|can|if|risk|bench|repeat\w*|pressure|irreversible|next|wrong|waste\w*|outlive\w*)\b/i);
      expect(copy).not.toMatch(/\b(verify|confirm|check|review)\b/i);
      expect(copy).not.toMatch(/\bcompare\b/i);
      expect(copy).not.toMatch(/\buse\b/i);
      expect(copy).not.toMatch(/can swing|can flip/i);
      expect(copy).not.toMatch(/leverage leak|lost late leverage|got handled|gave back control|owner heat|tape ready|travels into next week|early hole|waste a good plan|next sim/i);
      expect(copy).not.toMatch(/Keep the plan stable/i);
      expect(copy).not.toMatch(/survived late|completed the comeback|won overtime|lost overtime|won big|lost badly/i);
      expect(copy).not.toMatch(/adjustments help/i);
      expect(copy).not.toMatch(/Use Film Room before changing roster or Game Plan|Open Postgame Recap and Game Plan|Check the early failure in Recap|Open Roster, Depth Chart, and Game Plan before Advance Week|Open Recap and Game Plan now|Keep roster and plan unchanged unless Film Room|Find the biggest matchup miss in Recap or Film Room before Advance Week/i);
      expect(copy).not.toMatch(/random fixes|one late weakness|tired players can carry risk|first problem repeat|guessing can create a worse fix|missed late fixes can repeat/i);
      expect(copy).not.toMatch(/failed starters|same starter or plan mismatch|without proof can bench what worked/i);
      expect(copy).not.toMatch(/wide margin|early failure|lost late|change nothing unless Film Room shows a reason|wrong fix can waste cap or depth|fixing the wrong position can waste/i);
      expect(copy).not.toMatch(/wrong player or call|fixing the wrong position/i);
      expect(copy).not.toMatch(/matchup problem/i);
      expect(copy).not.toMatch(/Must Do: only|without proof|if you only|unnecessary changes/i);
    }
  });

  it('compacts after five seconds by default and two seconds in reduced motion', () => {
    expect(getRecapChipLingerMs(false)).toBe(5000);
    expect(getRecapChipLingerMs(true)).toBe(2000);
    expect(shouldCompactRecapChipReaction(4999, false)).toBe(false);
    expect(shouldCompactRecapChipReaction(5000, false)).toBe(true);
    expect(shouldCompactRecapChipReaction(1999, true)).toBe(false);
    expect(shouldCompactRecapChipReaction(2000, true)).toBe(true);
  });

  it('disables fade transition when reduced motion is active', () => {
    expect(getRecapChipReactionStyle(false, true)).toMatchObject({
      opacity: 1,
      transform: 'translateY(0) scale(1)',
      transition: 'none',
    });
  });

  it('uses a smaller dock-style transform after the linger window', () => {
    expect(getRecapChipReactionStyle(true, false)).toMatchObject({
      opacity: 0.78,
      transform: 'translateY(-4px) scale(0.96)',
      transition: 'opacity 320ms ease, transform 320ms ease',
    });
  });
});
