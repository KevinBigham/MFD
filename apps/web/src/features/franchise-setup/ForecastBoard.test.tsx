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
  summary: 'Week 1 is playable, but the room still feels volatile.',
  cards: [
    { id: 'week_one_readiness', label: 'Week 1 Readiness', value: 71, delta: 8, direction: 'up', detail: 'The opening script is cleaner.' },
    { id: 'scheme_cohesion', label: 'Scheme Cohesion', value: 66, delta: 6, direction: 'up', detail: 'Staff fit improved.' },
    { id: 'culture_stability', label: 'Culture Stability', value: 59, delta: -4, direction: 'down', detail: 'The room is still split.' },
    { id: 'cap_flexibility', label: 'Cap Flexibility', value: 48, delta: -2, direction: 'down', detail: 'Room created now hurts later.' },
    { id: 'owner_heat', label: 'Owner Heat', value: 35, delta: -5, direction: 'up', detail: 'Ownership likes the aggression.' },
  ],
};

describe('ForecastBoard', () => {
  it('renders the summary and all forecast cards', () => {
    const html = renderToStaticMarkup(<ForecastBoard forecast={forecast} />);

    expect(html).toContain('Week 1 Readiness');
    expect(html).toContain('Scheme Cohesion');
    expect(html).toContain('Culture Stability');
    expect(html).toContain('Cap Flexibility');
    expect(html).toContain('Owner Heat');
    expect(html).toContain('Week 1 is playable, but the room still feels volatile.');
  });
});
