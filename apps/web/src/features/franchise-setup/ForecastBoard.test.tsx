import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ForecastBoard as ForecastBoardModel } from '@mfd/engine';
import { ForecastBoard } from './ForecastBoard';

const forecast: ForecastBoardModel = {
  weekOneReadiness: 71,
  schemeCohesion: 66,
  cultureStability: 59,
  capFlexibility: 48,
  ownerHeat: 35,
  summary: 'Fix unresolved roster, Week 1 game-plan, or cap choices before Week 1 or close games start with an exposed starter, wrong call, or blocked injury replacement.',
  cards: [
    { id: 'week_one_readiness', label: 'Week 1 Plan', value: 71, delta: 8, direction: 'up', detail: 'Verify starters and scheme before Week 1; wrong pairings leave protection, coverage, or run-defense assignments unprotected.' },
    { id: 'scheme_cohesion', label: 'Scheme Fit', value: 66, delta: 6, direction: 'up', detail: 'Protect this scheme plan by keeping Week 1 roles assigned; late changes create mistakes.' },
    { id: 'culture_stability', label: 'Team Morale', value: 59, delta: -4, direction: 'down', detail: 'Choose captains and assign backup roles before Week 1; missing accountability splits morale after early losses.' },
    { id: 'cap_flexibility', label: 'Cap Space', value: 48, delta: -2, direction: 'down', detail: 'Choose a cap plan before adding contracts; tight space blocks injury replacements.' },
    { id: 'owner_heat', label: 'Owner Patience', value: 35, delta: -5, direction: 'up', detail: 'Fix the starter job, cap squeeze, or coach responsible for the Week 1 plan now; leaving it unresolved cuts owner patience later.' },
  ],
};

describe('ForecastBoard', () => {
  it('renders the summary and all forecast cards', () => {
    const html = renderToStaticMarkup(<ForecastBoard forecast={forecast} />);

    expect(html).toContain('SETUP CONSEQUENCES');
    expect(html).toContain('Week 1 Plan');
    expect(html).toContain('Scheme Fit');
    expect(html).toContain('Team Morale');
    expect(html).toContain('Cap Space');
    expect(html).toContain('Owner Patience');
    expect(html).not.toMatch(/Week 1 Readiness|Scheme Cohesion|Culture Stability|Cap Flexibility|Owner Heat|owner heat|FORECAST BOARD|SETUP FORECAST/i);
    expect(html).toContain('Fix unresolved roster, Week 1 game-plan, or cap choices before Week 1 or close games start with an exposed starter, wrong call, or blocked injury replacement.');
    expect(html).not.toMatch(/wrong pairings cost the opener|wrong starter, call, or cap tradeoff/i);
    expect(html).not.toMatch(/coach play calls|play-call owner|staff play-call owner/i);
    expect(html).not.toMatch(/can swing|can flip/i);
    expect(html).not.toMatch(/staff problem|can still cost/i);
    expect(html).not.toMatch(/staff authority|unclear coach authority/i);
    expect(html).not.toMatch(/FORECAST SOURCES|FranchiseSetupWizard|setupState|generateSetupForecast|does not mutate/i);
  });
});
