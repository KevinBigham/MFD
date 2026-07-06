import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChoiceForecastPreview } from '@mfd/engine';

vi.mock('@mfd/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mfd/engine')>();
  return {
    ...actual,
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
      recommendation: 'consider',
      analysis: 'Best fit for the room.',
      oneLiner: 'The room needs this.',
    }),
  };
});

import { HireCoachPhase } from './HireCoachPhase';

const preview: ChoiceForecastPreview = {
  weekOneReadinessDelta: 6,
  weekOneVolatilityDelta: -3,
  summaryLine: 'Coach fit calms the install and gives Week 1 cleaner answers.',
  secondaryDelta: {
    id: 'scheme_cohesion',
    label: 'Scheme Fit',
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

    expect(html).toContain('Week 1 +6');
    expect(html).toContain('Mistake Chance -3');
    expect(html).toContain('Scheme Fit +5');
    expect(html).toContain('coach-player gaps create Week 1 missed assignments');
    expect(html).toContain('WHAT CAN GO WRONG');
    expect(html).toContain('HAS COST');
    expect(html).not.toContain('CONSIDER');
    expect(html).not.toContain('RISKS');
    expect(html).not.toContain('TRADEOFF');
    expect(html).not.toContain('Risk -3');
    expect(html).not.toContain('WATCH-OUTS');
    expect(html).not.toMatch(/\bWK1\b|\bVOL\b|Scheme Cohesion|verify whether/i);
  });
});
