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
    expect(markup).toContain('Chicago Blaze stayed in the fight and took it over Detroit Iron 31-28.');
    expect(markup).toContain('data-chip-pose="rallying"');
  });

  it('renders deterministic one-line copy for losses without hardcoded team names', () => {
    expect(buildRecapChipCopy({
      outcome: 'CHOKE_LOSS',
      teamName: 'Oakland Anchors',
      userScore: 20,
      opponentScore: 24,
    })).toBe('Oakland Anchors left the door open too long 20-24.');
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
