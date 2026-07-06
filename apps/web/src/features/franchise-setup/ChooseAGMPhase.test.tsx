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
      selectionPitch: 'Protect cap space before Week 1 choices lock.',
      strengths: ['Cap cost checks'],
      cardAccent: 'cyan',
      welcomeMonologue: 'Welcome.',
      teachingNarration: {
        what_is_a_head_coach: 'Coach',
        what_is_a_scouting_director: 'Scout',
      },
      catchphrase: 'Cost, deadline, consequence.',
      toneModifiers: { enthusiasm: 0.4, bluntness: 0.6, humor: 0.1 },
    },
    {
      id: 'coach_d_hardaway',
      name: "Deion 'Coach D' Hardaway",
      title: 'Senior AGM, Defensive Planning',
      background: 'Urgency-first operator.',
      personality: 'fiery',
      expertise: 'defense',
      selectionPitch: 'Fix the exposed starter or backup before kickoff.',
      strengths: ['Exposed starter checks'],
      cardAccent: 'red',
      welcomeMonologue: 'Welcome.',
      teachingNarration: {
        what_is_a_head_coach: 'Coach',
        what_is_a_scouting_director: 'Scout',
      },
      catchphrase: 'Fix the exposed position before kickoff.',
      toneModifiers: { enthusiasm: 0.8, bluntness: 0.8, humor: 0.2 },
    },
    {
      id: 'sandra_chen',
      name: 'Sandra Chen',
      title: 'Senior AGM, Player Development',
      background: 'People-first operator.',
      personality: 'player_whisperer',
      expertise: 'personnel',
      selectionPitch: 'Define player roles before development stalls.',
      strengths: ['Protect development snaps before October'],
      cardAccent: 'green',
      welcomeMonologue: 'Welcome.',
      teachingNarration: {
        what_is_a_head_coach: 'Coach',
        what_is_a_scouting_director: 'Scout',
      },
      catchphrase: 'Role, snaps, consequence.',
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
        weekOneThreat="Week 1 gets harder if cap pressure still limits fixes."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'Cap space is the first Week 1 danger, and he names the cost before we spend.',
            dayOnePromise: 'I will protect injury, trade, and extension money before kickoff.',
            seasonBet: 'We upgrade only where the cost protects Week 1.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He flags exposed starters and backup groups even when cap space is tight.',
            dayOnePromise: 'I will name the exposed starter or backup before kickoff.',
            seasonBet: 'We protect the thinnest position before kickoff.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She defines player roles before snaps are wasted.',
            dayOnePromise: 'I will make player roles clear before kickoff.',
            seasonBet: 'We protect development snaps without exposing Week 1.',
            recommended: false,
          },
        }}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('KANSAS CITY BBQ FOUNTAINS');
    expect(html).toContain('The cap is deciding how bold you get.');
    expect(html).toContain('Week 1 gets harder if cap pressure still limits fixes.');
    expect(html).toContain('Cap Space');
    expect(html).not.toContain('>cap<');
    expect(html).not.toContain('>CAP<');
    expect(html).toContain('MARCUS WEBB');
    expect(html).toContain('Cost Checks');
    expect(html).toContain('Defense Calls');
    expect(html).toContain('Roster Roles');
    expect(html).not.toMatch(/cap management|player whisperer|personnel/i);
    expect(html).toContain("Deion &#x27;Coach D&#x27; Hardaway");
    expect(html).toContain('Sandra Chen');
    expect(html).toContain('Choose the Assistant GM whose strength protects the first Week 1 danger.');
    expect(html).toContain('RECOMMENDED FOR THIS DANGER');
    expect(html).not.toContain('RECOMMENDED FOR THIS CRISIS');
    expect(html).not.toMatch(/biggest Week 1 consequence|first Week 1 consequence|Week 1 matchup risk|RECOMMENDED FOR THIS CONSEQUENCE/i);
    expect(html).not.toMatch(/>REC</);
    expect(html).toContain('I will protect injury, trade, and extension money before kickoff.');
  });

  it('uses plain setup-pressure labels instead of internal pressure ids', () => {
    const html = renderToStaticMarkup(
      <ChooseAGMPhase
        committedProfileId={null}
        initialPreviewProfileId="sandra_chen"
        topPressureId="culture"
        teamName="Kansas City BBQ Fountains"
        crisisHeadline="Players need clear jobs before kickoff."
        weekOneThreat="Week 1 gets harder if captains and backups are not assigned."
        recommendedProfileId="sandra_chen"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'Cap space is the problem, and he names the cost before we spend.',
            dayOnePromise: 'I will protect injury, trade, and extension money before kickoff.',
            seasonBet: 'We upgrade only where the cost protects Week 1.',
            recommended: false,
          },
          coach_d_hardaway: {
            whyThisFits: 'He flags exposed starters and backup groups before kickoff.',
            dayOnePromise: 'I will name the exposed starter or backup before kickoff.',
            seasonBet: 'We protect the thinnest position before kickoff.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She defines player roles before snaps are wasted.',
            dayOnePromise: 'I will make player roles clear before kickoff.',
            seasonBet: 'We protect development snaps without exposing Week 1.',
            recommended: true,
          },
        }}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('FIRST WEEK 1 DANGER');
    expect(html).toContain('Captains and Roles');
    expect(html).not.toMatch(/BIGGEST WEEK 1 CONSEQUENCE|Week 1 matchup risk|RECOMMENDED FOR THIS CONSEQUENCE/i);
    expect(html).not.toContain('>culture<');
    expect(html).not.toContain('>CULTURE<');
  });

  it('renders the active candidate in a candidate spotlight region', () => {
    const html = renderToStaticMarkup(
      <ChooseAGMPhase
        committedProfileId={null}
        initialPreviewProfileId="marcus_webb"
        topPressureId="cap"
        teamName="Kansas City BBQ Fountains"
        crisisHeadline="The cap is deciding how bold you get."
        weekOneThreat="Week 1 gets harder if cap pressure still limits fixes."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'Cap space is the problem, and he names the cost before we spend.',
            dayOnePromise: 'I will protect injury, trade, and extension money before kickoff.',
            seasonBet: 'We upgrade only where the cost protects Week 1.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He can flag exposed starters and backup groups even if cap space is tight.',
            dayOnePromise: 'I will name the exposed starter or backup before kickoff.',
            seasonBet: 'We protect the thinnest position before kickoff.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She can define player roles before snaps are wasted.',
            dayOnePromise: 'I will make player roles clear before kickoff.',
            seasonBet: 'We protect development snaps without exposing Week 1.',
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
        weekOneThreat="Week 1 gets harder if cap pressure still limits fixes."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'Cap space is the problem, and he names the cost before we spend.',
            dayOnePromise: 'I will protect injury, trade, and extension money before kickoff.',
            seasonBet: 'We upgrade only where the cost protects Week 1.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He can flag exposed starters and backup groups even if cap space is tight.',
            dayOnePromise: 'I will name the exposed starter or backup before kickoff.',
            seasonBet: 'We protect the thinnest position before kickoff.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She can define player roles before snaps are wasted.',
            dayOnePromise: 'I will make player roles clear before kickoff.',
            seasonBet: 'We protect development snaps without exposing Week 1.',
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
        weekOneThreat="Week 1 gets harder if cap pressure still limits fixes."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'Cap space is the problem, and he names the cost before we spend.',
            dayOnePromise: 'I will protect injury, trade, and extension money before kickoff.',
            seasonBet: 'We upgrade only where the cost protects Week 1.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He can flag exposed starters and backup groups even if cap space is tight.',
            dayOnePromise: 'I will name the exposed starter or backup before kickoff.',
            seasonBet: 'We protect the thinnest position before kickoff.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She can define player roles before snaps are wasted.',
            dayOnePromise: 'I will make player roles clear before kickoff.',
            seasonBet: 'We protect development snaps without exposing Week 1.',
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
        weekOneThreat="Week 1 gets harder if cap pressure still limits fixes."
        recommendedProfileId="marcus_webb"
        narrativeScenes={{
          marcus_webb: {
            whyThisFits: 'Cap space is the problem, and he names the cost before we spend.',
            dayOnePromise: 'I will protect injury, trade, and extension money before kickoff.',
            seasonBet: 'We upgrade only where the cost protects Week 1.',
            recommended: true,
          },
          coach_d_hardaway: {
            whyThisFits: 'He can flag exposed starters and backup groups even if cap space is tight.',
            dayOnePromise: 'I will name the exposed starter or backup before kickoff.',
            seasonBet: 'We protect the thinnest position before kickoff.',
            recommended: false,
          },
          sandra_chen: {
            whyThisFits: 'She can define player roles before snaps are wasted.',
            dayOnePromise: 'I will make player roles clear before kickoff.',
            seasonBet: 'We protect development snaps without exposing Week 1.',
            recommended: false,
          },
        }}
        onHire={() => undefined}
      />,
    );

    expect(html).toContain('SELECTED FOR SETUP');
    expect(html).toContain('data-mfd-agm-hire-command="true"');
    expect(html).not.toMatch(/DAY 1 DECISION|DAY 1 PROMISE|SELECTED FOR DAY 1/i);
  });
});
