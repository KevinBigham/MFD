import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AGMProfile, AGMPhaseDialogue, AGMReaction } from '@mfd/engine';
import { AGMPanel } from './AGMPanel';

const agm: AGMProfile = {
  id: 'marcus_webb',
  name: 'Marcus Webb',
  title: 'Director of Baseball Strategy',
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

const dialogue: AGMPhaseDialogue = {
  phaseId: 'meet_roster',
  intro: 'Here is the room.',
  insights: [{ category: 'strength', text: 'There is talent here.', dataPoint: '83 OVR' }],
  recommendation: 'Build around the core.',
  closingRemark: 'We can work with this.',
  tone: 'confident',
};

const reaction: AGMReaction = {
  sentiment: 'love_it',
  reaction: 'I like the direction.',
  followUp: 'Keep the pressure on.',
};

describe('AGMPanel', () => {
  it('renders tone badge and teaching tooltip content', () => {
    const html = renderToStaticMarkup(
      <AGMPanel
        agm={agm}
        phase="meet_roster"
        dialogue={dialogue}
        reaction={reaction}
        welcomeMonologue={null}
        teachingNarration={null}
        teachingTips={['Start with your best players.']}
        blueprintMonologue={null}
      />,
    );

    expect(html).toContain('Confident');
    expect(html).toContain('MARCUS WEBB SAYS:');
    expect(html).toContain('Start with your best players.');
  });

  it('renders blueprint chrome and begin season prompt', () => {
    const html = renderToStaticMarkup(
      <AGMPanel
        agm={agm}
        phase="blueprint"
        dialogue={null}
        reaction={null}
        welcomeMonologue={null}
        teachingNarration={null}
        teachingTips={undefined}
        blueprintMonologue="We have the plan. Now we live it."
      />,
    );

    expect(html).toContain('END OF DAY 1');
    expect(html).toContain('We have the plan. Now we live it.');
    expect(html).toContain('BEGIN SEASON');
  });
});
