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

  it('renders the assistant as an animated character portrait', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="talk" headline="The room is moving." subhead="Keep the staff aligned." />,
    );

    expect(html).toContain('data-mfd-agm-character="true"');
    expect(html).toContain('role="img"');
    expect(html).toContain('Animated Assistant GM character: Marcus Webb');
  });

  it('uses a full illustrated SVG cartoon instead of the old CSS box puppet', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="point" headline="The room has a real character." subhead="No block puppet." />,
    );

    expect(html).toContain('data-mfd-agm-illustration="cartoon-svg"');
    expect(html).toContain('mfd-agm-svg__face');
    expect(html).not.toContain('mfd-agm-character__torso');
  });

  it('maps stage state into a visible character pose', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="approve" headline="The room bought in." subhead="The opener has a plan." />,
    );

    expect(html).toContain('data-mfd-agm-pose="approve"');
    expect(html).toContain('data-mfd-agm-state="approve"');
  });

  it('keeps the character card separate from scrollable guidance content', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="idle" headline="Start with the room." subhead="Then make the call.">
        <div>Candidate board</div>
      </AGMStage>,
    );

    expect(html).toContain('data-mfd-agm-stage-card="true"');
    expect(html).toContain('data-mfd-agm-stage-content="true"');
    expect(html).toContain('Candidate board');
  });

  it('renders reduced-motion friendly stage content without interactive children', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="concern" headline="Cap pressure is real." subhead="The next move matters." reducedMotion />,
    );

    expect(html).toContain('Cap pressure is real.');
    expect(html).toContain('The next move matters.');
    expect(html).toContain('CONCERN');
    expect(html).toContain('data-mfd-agm-motion="reduced"');
  });
});
