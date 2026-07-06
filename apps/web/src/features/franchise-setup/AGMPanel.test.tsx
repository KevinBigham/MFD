import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AGMProfile, AGMPhaseDialogue, AGMReaction } from '@mfd/engine';
import { AGMPanel } from './AGMPanel';

const agm: AGMProfile = {
  id: 'marcus_webb',
  name: 'Marcus Webb',
  title: 'Director of Football Strategy',
  background: 'Numbers-first operator.',
  personality: 'analytical',
  expertise: 'cap_management',
  selectionPitch: 'Check cap cost before Week 1 choices lock.',
  strengths: ['Payroll cost checks'],
  cardAccent: 'cyan',
  welcomeMonologue: 'Welcome aboard.',
  teachingNarration: {
    what_is_a_head_coach: 'Coach lesson.',
    what_is_a_scouting_director: 'Scout lesson.',
  },
  catchphrase: 'Cost, deadline, consequence.',
  toneModifiers: { enthusiasm: 0.4, bluntness: 0.6, humor: 0.1 },
};

const dialogue: AGMPhaseDialogue = {
  phaseId: 'meet_roster',
  intro: 'Here is the room.',
  insights: [{ category: 'strength', text: 'Protect the top starter and first backup before Week 1.', dataPoint: 'starter grade' }],
  recommendation: 'Check the top starter, first backup, and cap cost before changing roles.',
  closingRemark: 'Review roster, depth, and cap before Advance Week.',
  tone: 'confident',
};

const reaction: AGMReaction = {
  sentiment: 'love_it',
  reaction: 'This protects the starter and backup order.',
  followUp: 'Check the cap cost before adding a contract.',
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
    expect(html).toContain('Cost Checks');
    expect(html).toContain('Cap Space');
    expect(html).toContain('STRONG MATCH');
    expect(html).not.toMatch(/cap management|love it|player whisperer/i);
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

    expect(html).toContain('SETUP WRAP');
    expect(html).toContain('We have the plan. Now we live it.');
    expect(html).toContain('BEGIN SEASON');
    expect(html).not.toContain('END OF DAY 1');
  });
});
