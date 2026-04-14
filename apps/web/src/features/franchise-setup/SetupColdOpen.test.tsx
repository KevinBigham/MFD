import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SetupColdOpen as SetupColdOpenModel } from '@mfd/engine';
import { SetupColdOpen } from './SetupColdOpen';

const coldOpen: SetupColdOpenModel = {
  ownerExpectation: 'Ownership expects immediate coherence.',
  mediaNarrative: 'The market thinks this team can wobble fast.',
  lastSeasonScar: 'Last season ended at 10-7. Lost in Divisional Round still hangs over this building.',
  crisisHeadline: 'This team can win now, but only if Day 1 solves the right problem.',
  weekOneThreat: 'Week 1 vs Austin Nighthawks becomes dangerous if cap pressure still owns the room.',
  openerLabel: 'Week 1 vs Austin Nighthawks',
  topPressureId: 'cap',
};

describe('SetupColdOpen', () => {
  it('renders all five cold-open beats for a first-time full Day 1 run', () => {
    const html = renderToStaticMarkup(
      <SetupColdOpen
        coldOpen={coldOpen}
        beatIndex={4}
        reducedMotion={false}
        onSkip={() => undefined}
      />,
    );

    expect(html).toContain('OWNER EXPECTATION');
    expect(html).toContain('MEDIA NARRATIVE');
    expect(html).toContain('LAST SEASON SCAR');
    expect(html).toContain('CRISIS HEADLINE');
    expect(html).toContain('WEEK 1 THREAT');
    expect(html).toContain('Week 1 vs Austin Nighthawks');
    expect(html).toContain('Skip Intro');
  });

  it('renders a single staged beat during the cinematic prelude', () => {
    const html = renderToStaticMarkup(
      <SetupColdOpen
        coldOpen={coldOpen}
        beatIndex={1}
        reducedMotion={false}
        onSkip={() => undefined}
      />,
    );

    expect(html).toContain('MEDIA NARRATIVE');
    expect(html).not.toContain('LAST SEASON SCAR');
  });

  it('collapses to the stacked diagnosis layout in reduced-motion mode', () => {
    const html = renderToStaticMarkup(
      <SetupColdOpen
        coldOpen={coldOpen}
        beatIndex={0}
        reducedMotion
        onSkip={() => undefined}
      />,
    );

    expect(html).toContain('COMMAND CENTER CRISIS ROOM');
    expect(html).toContain('OWNER EXPECTATION');
    expect(html).toContain('WEEK 1 THREAT');
  });
});
