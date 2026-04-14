import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChoiceForecastPreview } from '@mfd/engine';

vi.mock('@mfd/engine', () => ({
  getCoachCandidates: () => [
    {
      id: 'elias_rowe',
      name: 'Elias Rowe',
      age: 52,
      background: 'Strategist.',
      archetype: 'strategist',
      schemePreference: { offense: 'west_coast', defense: 'cover_3' },
      strengths: ['Planning'],
      weaknesses: ['Rigid'],
      interviewQuote: 'We will be ready.',
    },
  ],
  getAGMCoachReaction: () => ({
    recommendation: 'hire',
    analysis: 'Best fit for the room.',
    oneLiner: 'The room needs this.',
  }),
}));

import { HireCoachPhase } from './HireCoachPhase';

const preview: ChoiceForecastPreview = {
  weekOneReadinessDelta: 6,
  weekOneVolatilityDelta: -3,
  summaryLine: 'Coach fit calms the install and gives Week 1 cleaner answers.',
  secondaryDelta: {
    id: 'scheme_cohesion',
    label: 'Scheme Cohesion',
    delta: 5,
  },
};

describe('HireCoachPhase', () => {
  it('renders always-on readiness and volatility forecast chips on coach cards', () => {
    const html = renderToStaticMarkup(
      <HireCoachPhase
        agmId="marcus_webb"
        selectedCoachId={null}
        previewByCoachId={{ elias_rowe: preview }}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('WK1 +6');
    expect(html).toContain('VOL -3');
    expect(html).toContain('Scheme Cohesion +5');
  });
});
