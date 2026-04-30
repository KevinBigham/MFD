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

    expect(markup).toContain('HALFTIME HELL');
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
    expect(markup).toContain('data-halftime-chip-pose="mic-check"');
    expect(markup).toContain('Second half is a choice. Pick the risk you can defend.');
  });

  it('maps halftime choice previews to deterministic Chip poses', () => {
    expect(getHalftimeChipPose(null, false)).toBe('mic-check');
    expect(getHalftimeChipPose('stick', false)).toBe('point-left');
    expect(getHalftimeChipPose('switch', false)).toBe('point-right');
    expect(getHalftimeChipPose('gamble', false)).toBe('concern');
    expect(getHalftimeChipPose('gamble', true)).toBe('thumbs-up');
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
    expect(markup).toContain('data-halftime-chip-pose="mic-check"');
    expect(markup).toContain('data-chip-motion="reduced"');
    expect(getHalftimeChipPose('switch', false, true)).toBe('mic-check');
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
    expect(markup).toContain('+12% on one high-leverage drive, -8% on all others.');
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
    expect(getHalftimeChipPose(null, true, true)).toBe('thumbs-up');
  });
});
