import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AGMProfile } from '@mfd/engine';
import { AGMStage } from './AGMStage';

const agm: AGMProfile = {
  id: 'marcus_webb',
  name: 'Marcus Webb',
  title: 'Director of Football Strategy',
  background: 'Numbers-first operator.',
  personality: 'analytical',
  expertise: 'cap_management',
  selectionPitch: 'Steady process.',
  strengths: ['Payroll modeling'],
  cardAccent: 'cyan',
  welcomeMonologue: 'Welcome aboard.',
  teachingNarration: {
    what_is_a_head_coach: 'Coach lesson.',
    what_is_a_scouting_director: 'Scout lesson.',
  },
  catchphrase: 'The numbers never lie.',
  toneModifiers: { enthusiasm: 0.4, bluntness: 0.6, humor: 0.1 },
};

describe('AGMStage', () => {
  it('renders the AGM scene with stage chrome and active state label', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="point" headline="The room has three fires." subhead="Roster, cap, culture." />,
    );

    expect(html).toContain('MARCUS WEBB');
    expect(html).toContain('The room has three fires.');
    expect(html).toContain('Roster, cap, culture.');
    expect(html).toContain('POINT');
  });

  it('renders reduced-motion friendly stage content without interactive children', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="concern" headline="Cap pressure is real." subhead="The next move matters." reducedMotion />,
    );

    expect(html).toContain('Cap pressure is real.');
    expect(html).toContain('The next move matters.');
    expect(html).toContain('CONCERN');
  });
});
