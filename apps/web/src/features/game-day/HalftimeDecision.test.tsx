import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HalftimeDecisionView, getHalftimeChipPose } from './HalftimeDecision';

const pending = {
  teamId: 'user',
  year: 2026,
  week: 4,
  phase: 'regular_season' as const,
  homeTeamId: 'user',
  awayTeamId: 'opp',
  homeScore: 13,
  awayScore: 17,
  suggestion: {
    direction: 'more_pass' as const,
    responseLabel: 'Open the throttle',
    summary: 'Shift into a faster, pass-first second half.',
    reason: 'The offense needs chunk plays to erase the halftime deficit.',
  },
};

describe('HalftimeDecisionView', () => {
  it('renders the halftime score and suggested switch', () => {
    const markup = renderToStaticMarkup(
      <HalftimeDecisionView
        pending={pending}
        homeLabel="Chicago Blaze"
        awayLabel="Boston Reapers"
        onChoose={() => undefined}
      />,
    );

    expect(markup).toContain('HALFTIME ADJUSTMENT');
    expect(markup).toContain('Choose whether to keep the plan, adjust after drive one, or gamble on the first drive.');
    expect(markup).not.toContain('what the second half feels like');
    expect(markup).not.toContain('rating tradeoff');
    expect(markup).toContain('CHICAGO BLAZE 13 - 17 BOSTON REAPERS');
    expect(markup).toContain('OPEN THE THROTTLE');
    expect(markup).toContain('The offense needs chunk plays to erase the halftime deficit.');
  });

  it('renders Chip as the halftime host', () => {
    const markup = renderToStaticMarkup(
      <HalftimeDecisionView
        pending={pending}
        homeLabel="Chicago Blaze"
        awayLabel="Boston Reapers"
        onChoose={() => undefined}
      />,
    );

    expect(markup).toContain('data-halftime-chip-host="true"');
    expect(markup).toContain('data-halftime-chip-pose="time-out"');
    expect(markup).toContain('Must Do: choose Stick, Switch, or Gamble before second half.');
    expect(markup).toContain('Where: Halftime cards.');
    expect(markup).toContain('Consequence: Stick keeps calls; Switch starts slower, then improves later drives; Gamble boosts drive one but weakens later drives if it misses.');
    expect(markup).not.toContain('Choose now');
    expect(markup).not.toContain('Switch risks the first drive to improve later possessions');
    expect(markup).not.toContain('Gamble attacks the first drive, then weakens later possessions');
    expect(markup).not.toContain('risks drive one for later lift');
    expect(markup).not.toContain('Halftime Adjustment cards. Consequence: Stick keeps calls unchanged');
    expect(markup).not.toContain('Stick avoids disruption');
    expect(markup).not.toMatch(/team rating|rating boost/i);
    expect(markup).not.toContain('front-loads the boost');
    expect(markup).not.toContain('hurts drive one');
    expect(markup).not.toContain('starts worse then improves');
    expect(markup).not.toContain('starts hot then fades');
    expect(markup).not.toContain('later help');
    expect(markup).not.toContain('fades late');
    expect(markup).not.toContain('can weaken later drives');
  });

  it('maps halftime choice previews to deterministic Chip poses', () => {
    expect(getHalftimeChipPose(null, false)).toBe('time-out');
    expect(getHalftimeChipPose('stick', false)).toBe('coaching-crouch');
    expect(getHalftimeChipPose('switch', false)).toBe('calling-play');
    expect(getHalftimeChipPose('gamble', false)).toBe('frustrated');
    expect(getHalftimeChipPose('gamble', true)).toBe('fist-bump');
  });

  it('keeps the Chip portrait static under reduced motion', () => {
    const markup = renderToStaticMarkup(
      <HalftimeDecisionView
        pending={pending}
        homeLabel="Chicago Blaze"
        awayLabel="Boston Reapers"
        onChoose={() => undefined}
        reducedMotion
      />,
    );

    expect(markup).toContain('data-halftime-chip-host="true"');
    expect(markup).toContain('data-halftime-chip-pose="time-out"');
    expect(markup).toContain('data-chip-motion="reduced"');
    expect(getHalftimeChipPose('switch', false, true)).toBe('time-out');
  });

  it('shows stick, switch, and gamble choices', () => {
    const markup = renderToStaticMarkup(
      <HalftimeDecisionView
        pending={pending}
        homeLabel="Chicago Blaze"
        awayLabel="Boston Reapers"
        onChoose={() => undefined}
      />,
    );

    expect(markup).toContain('Stick');
    expect(markup).toContain('Switch');
    expect(markup).toContain('Gamble');
    expect(markup).toContain('No first-drive boost and no late-drive penalty');
    expect(markup).toContain('choose it when the matchup is not the problem');
    expect(markup).toContain('The first second-half drive starts slower while players adjust; later drives get a small lift.');
    expect(markup).toContain('The first second-half drive gets the biggest lift; later drives get weaker if the push misses.');
    expect(markup).not.toContain('use it when the matchup is not the problem');
    expect(markup).not.toMatch(/team rating|rating boost|rating stays/i);
    expect(markup).not.toContain('+5% efficiency');
    expect(markup).not.toContain('+12% on one high-leverage drive');
    expect(markup).not.toContain('boom-or-bust');
    expect(markup).not.toContain('call sheet settles');
    expect(markup).not.toContain('team OVR');
  });

  it('renders nothing when no halftime decision is pending', () => {
    const markup = renderToStaticMarkup(
      <HalftimeDecisionView
        pending={null}
        homeLabel="Chicago Blaze"
        awayLabel="Boston Reapers"
        onChoose={() => undefined}
      />,
    );

    expect(markup).toBe('');
  });

  it('renders the lock-in pose helper for completed actions', () => {
    expect(getHalftimeChipPose(null, true, true)).toBe('fist-bump');
  });
});
