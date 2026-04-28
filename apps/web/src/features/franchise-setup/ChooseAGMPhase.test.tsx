import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@mfd/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mfd/engine')>();
  return {
    ...actual,
    getAGMProfiles: () => [
    {
      id: 'marcus_webb',
      name: 'Marcus Webb',
      title: 'Director of Football Strategy',
      background: 'Cap-first operator.',
      personality: 'analytical',
      expertise: 'cap_management',
      selectionPitch: 'Win with clarity.',
      strengths: ['Cap discipline'],
      cardAccent: 'cyan',
      welcomeMonologue: 'Welcome.',
      teachingNarration: {
        what_is_a_head_coach: 'Coach',
        what_is_a_scouting_director: 'Scout',
      },
      catchphrase: 'The numbers never lie.',
      toneModifiers: { enthusiasm: 0.4, bluntness: 0.6, humor: 0.1 },
    },
    {
      id: 'coach_d_hardaway',
      name: "Deion 'Coach D' Hardaway",
      title: 'Senior AGM, Competitive Edge',
      background: 'Urgency-first operator.',
      personality: 'fiery',
      expertise: 'defense',
      selectionPitch: 'Compete louder.',
      strengths: ['Standards'],
      cardAccent: 'red',
      welcomeMonologue: 'Welcome.',
      teachingNarration: {
        what_is_a_head_coach: 'Coach',
        what_is_a_scouting_director: 'Scout',
      },
      catchphrase: 'No easy yards.',
      toneModifiers: { enthusiasm: 0.8, bluntness: 0.8, humor: 0.2 },
    },
    {
      id: 'sandra_chen',
      name: 'Sandra Chen',
      title: 'Senior AGM, Player Development',
      background: 'People-first operator.',
      personality: 'player_whisperer',
      expertise: 'personnel',
      selectionPitch: 'Unlock the roster.',
      strengths: ['Development arcs'],
      cardAccent: 'green',
      welcomeMonologue: 'Welcome.',
      teachingNarration: {
        what_is_a_head_coach: 'Coach',
        what_is_a_scouting_director: 'Scout',
      },
      catchphrase: 'People are the edge.',
      toneModifiers: { enthusiasm: 0.6, bluntness: 0.4, humor: 0.2 },
    },
    ],
  };
});

import { ChooseAGMPhase } from './ChooseAGMPhase';

describe('ChooseAGMPhase', () => {
  it('renders a stage carousel with one active AGM and two dossier candidates', () => {
    const html = renderToStaticMarkup(
      <ChooseAGMPhase
        committedProfileId={null}
        initialPreviewProfileId="marcus_webb"
        topPressureId="cap"
        teamName="Kansas City BBQ Fountains"
        crisisHeadline="The cap is deciding how bold you get."
        weekOneThreat="Week 1 gets ugly if the books still run the room."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'The books are the problem and he speaks that language.',
            dayOnePromise: 'I will buy back breathing room before kickoff.',
            seasonBet: 'We win by staying aggressive without getting desperate.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He can harden the room even if the books stay tight.',
            dayOnePromise: 'I will make the building sharper immediately.',
            seasonBet: 'We force the opener into a street fight.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She can stabilize trust around the roster.',
            dayOnePromise: 'I will make the room believe its roles.',
            seasonBet: 'We gain edge by unlocking better versions of our own players.',
            recommended: false,
          },
        }}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('KANSAS CITY BBQ FOUNTAINS');
    expect(html).toContain('The cap is deciding how bold you get.');
    expect(html).toContain('Week 1 gets ugly if the books still run the room.');
    expect(html).toContain('MARCUS WEBB');
    expect(html).toContain("Deion &#x27;Coach D&#x27; Hardaway");
    expect(html).toContain('Sandra Chen');
    expect(html).toContain('RECOMMENDED FOR THIS CRISIS');
    expect(html).toContain('I will buy back breathing room before kickoff.');
  });

  it('renders the active candidate in a candidate spotlight region', () => {
    const html = renderToStaticMarkup(
      <ChooseAGMPhase
        committedProfileId={null}
        initialPreviewProfileId="marcus_webb"
        topPressureId="cap"
        teamName="Kansas City BBQ Fountains"
        crisisHeadline="The cap is deciding how bold you get."
        weekOneThreat="Week 1 gets ugly if the books still run the room."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'The books are the problem and he speaks that language.',
            dayOnePromise: 'I will buy back breathing room before kickoff.',
            seasonBet: 'We win by staying aggressive without getting desperate.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He can harden the room even if the books stay tight.',
            dayOnePromise: 'I will make the building sharper immediately.',
            seasonBet: 'We force the opener into a street fight.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She can stabilize trust around the roster.',
            dayOnePromise: 'I will make the room believe its roles.',
            seasonBet: 'We gain edge by unlocking better versions of our own players.',
            recommended: false,
          },
        }}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('data-mfd-agm-spotlight="true"');
    expect(html).toContain('CANDIDATE SPOTLIGHT');
  });

  it('keeps the hire command prominent in the spotlight', () => {
    const html = renderToStaticMarkup(
      <ChooseAGMPhase
        committedProfileId={null}
        initialPreviewProfileId="marcus_webb"
        topPressureId="cap"
        teamName="Kansas City BBQ Fountains"
        crisisHeadline="The cap is deciding how bold you get."
        weekOneThreat="Week 1 gets ugly if the books still run the room."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'The books are the problem and he speaks that language.',
            dayOnePromise: 'I will buy back breathing room before kickoff.',
            seasonBet: 'We win by staying aggressive without getting desperate.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He can harden the room even if the books stay tight.',
            dayOnePromise: 'I will make the building sharper immediately.',
            seasonBet: 'We force the opener into a street fight.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She can stabilize trust around the roster.',
            dayOnePromise: 'I will make the room believe its roles.',
            seasonBet: 'We gain edge by unlocking better versions of our own players.',
            recommended: false,
          },
        }}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('data-mfd-agm-hire-command="true"');
    expect(html).toContain('MAKE THIS YOUR AGM');
  });

  it('labels dossier cards as preview actions', () => {
    const html = renderToStaticMarkup(
      <ChooseAGMPhase
        committedProfileId={null}
        initialPreviewProfileId="marcus_webb"
        topPressureId="cap"
        teamName="Kansas City BBQ Fountains"
        crisisHeadline="The cap is deciding how bold you get."
        weekOneThreat="Week 1 gets ugly if the books still run the room."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'The books are the problem and he speaks that language.',
            dayOnePromise: 'I will buy back breathing room before kickoff.',
            seasonBet: 'We win by staying aggressive without getting desperate.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He can harden the room even if the books stay tight.',
            dayOnePromise: 'I will make the building sharper immediately.',
            seasonBet: 'We force the opener into a street fight.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She can stabilize trust around the roster.',
            dayOnePromise: 'I will make the room believe its roles.',
            seasonBet: 'We gain edge by unlocking better versions of our own players.',
            recommended: false,
          },
        }}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('aria-label="Preview Deion &#x27;Coach D&#x27; Hardaway on the Assistant GM stage"');
    expect(html).toContain('aria-label="Preview Sandra Chen on the Assistant GM stage"');
  });

  it('shows the locked-in state after hiring an AGM', () => {
    const html = renderToStaticMarkup(
      <ChooseAGMPhase
        committedProfileId="marcus_webb"
        initialPreviewProfileId="marcus_webb"
        topPressureId="cap"
        teamName="Kansas City BBQ Fountains"
        crisisHeadline="The cap is deciding how bold you get."
        weekOneThreat="Week 1 gets ugly if the books still run the room."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'The books are the problem and he speaks that language.',
            dayOnePromise: 'I will buy back breathing room before kickoff.',
            seasonBet: 'We win by staying aggressive without getting desperate.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He can harden the room even if the books stay tight.',
            dayOnePromise: 'I will make the building sharper immediately.',
            seasonBet: 'We force the opener into a street fight.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She can stabilize trust around the roster.',
            dayOnePromise: 'I will make the room believe its roles.',
            seasonBet: 'We gain edge by unlocking better versions of our own players.',
            recommended: false,
          },
        }}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('SELECTED FOR DAY 1');
    expect(html).toContain('data-mfd-agm-hire-command="true"');
  });
});
