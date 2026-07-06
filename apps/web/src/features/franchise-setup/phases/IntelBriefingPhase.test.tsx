import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FranchiseIntelBriefing, SetupColdOpen, TeamCrisisProfile } from '@mfd/engine';
import { IntelBriefingPhase } from './IntelBriefingPhase';

const data: FranchiseIntelBriefing = {
  windowPhase: 'opening',
  windowScore: 71,
  capGrade: 'B',
  capSpace: 18,
  rosterOverall: 82,
  leagueRank: 11,
  criticalNeeds: ['CB'],
  strengths: ['QB'],
  overallAssessment: 'This roster can compete if setup fixes the right roster and cap choices.',
};

const crisis: TeamCrisisProfile = {
  headline: 'The cap is narrowing your moves.',
  ownerPressure: 'Ownership wants coherence.',
  mediaPressure: 'The market is skeptical.',
  weekOneThreat: 'Week 1 will expose tight cap space immediately.',
  weekOneHope: 'The opener is winnable when roles are assigned.',
  weekOneUnknown: 'Players still need clear accountability.',
  pressureCards: [
    {
      id: 'roster',
      label: 'Roster Needs',
      severity: 'warning',
      score: 64,
      diagnosis: 'Thin secondary.',
      signal: 'WATCH',
      drilldown: {
        whyItMatters: 'Week 1 punishes weak depth.',
        riskSource: 'CB depth is thin.',
        bestLever: 'Set the right starters.',
        seasonOneConsequence: 'Bad starts can slide the first month.',
      },
    },
    {
      id: 'cap',
      label: 'Cap Space',
      severity: 'critical',
      score: 82,
      diagnosis: 'The books are tight.',
      signal: 'CRITICAL',
      drilldown: {
        whyItMatters: 'Cap room decides whether you can pivot.',
        riskSource: 'One bad contract is limiting every recovery move.',
        bestLever: 'Choose a cap plan before Week 1.',
        seasonOneConsequence: 'A tight cap slows every recovery move.',
      },
    },
    {
      id: 'culture',
      label: 'Team Morale',
      severity: 'warning',
      score: 58,
      diagnosis: 'Choose captains and assign backup roles before Week 1; missing accountability splits morale after early losses.',
      signal: 'WATCH',
      drilldown: {
        whyItMatters: 'Players need assigned roles before losses pile up.',
        riskSource: 'Veterans are not enforcing current roles.',
        bestLever: 'Name the player mandate.',
        seasonOneConsequence: 'A split locker room makes bad weeks heavier.',
      },
    },
  ],
};

const briefDiagnosis: SetupColdOpen = {
  ownerExpectation: 'Ownership expects immediate coherence.',
  mediaNarrative: 'The market is skeptical.',
  lastSeasonScar: 'Last season ended at 9-8 and a missed wild-card opening.',
  crisisHeadline: crisis.headline,
  weekOneThreat: crisis.weekOneThreat,
  openerLabel: 'Week 1 vs Austin Nighthawks',
  topPressureId: 'cap',
};

describe('IntelBriefingPhase', () => {
  it('renders the required top pressure autopsy and compressed diagnosis copy', () => {
    const html = renderToStaticMarkup(
      <IntelBriefingPhase
        data={data}
        crisis={crisis}
        openedDrilldowns={['cap']}
        requiredPressureId="cap"
        briefDiagnosis={briefDiagnosis}
        onToggleDrilldown={() => undefined}
      />,
    );

    expect(html).toContain('BRIEF DIAGNOSIS');
    expect(html).toContain('OPEN TO CONTINUE');
    expect(html).toContain('FIX BEFORE WEEK 1');
    expect(html).toContain('Cap Space');
    expect(html).toContain('One bad contract is limiting every recovery move.');
    expect(html).toContain('Choose a cap plan before Week 1.');
    expect(html).not.toMatch(/>WATCH<|>CRITICAL<|>High Alert<|>Watchlist</i);
    expect(html).not.toMatch(/Day 1 cap package/i);
  });

  it('leads with one open-this-first Intel card instead of a full board', () => {
    const html = renderToStaticMarkup(
      <IntelBriefingPhase
        data={data}
        crisis={crisis}
        requiredPressureId="cap"
        briefDiagnosis={briefDiagnosis}
        onToggleDrilldown={() => undefined}
      />,
    );

    expect(html).toContain('OPEN THIS FIRST');
    expect(html).toContain('Cap Space');
    expect(html).not.toContain('Three-Pressure Board');
  });

  it('shows a clear unlock prompt when the required pressure has not been opened', () => {
    const html = renderToStaticMarkup(
      <IntelBriefingPhase
        data={data}
        crisis={crisis}
        openedDrilldowns={[]}
        requiredPressureId="cap"
        briefDiagnosis={briefDiagnosis}
        onToggleDrilldown={() => undefined}
      />,
    );

    expect(html).toContain('Open this Intel card to continue.');
    expect(html).toContain('FIX BEFORE WEEK 1');
    expect(html).toContain('WATCH BEFORE WEEK 1');
    expect(html).not.toContain('Open this Intel card to unlock Next.');
    expect(html).not.toContain('Open this pressure card');
    expect(html).not.toContain('Open this risk card');
    expect(html).not.toContain('One bad contract is holding the room hostage.');
  });

  it('keeps other Week 1 costs compact below the required card', () => {
    const html = renderToStaticMarkup(
      <IntelBriefingPhase
        data={data}
        crisis={crisis}
        openedDrilldowns={['cap']}
        requiredPressureId="cap"
        briefDiagnosis={briefDiagnosis}
        onToggleDrilldown={() => undefined}
      />,
    );

    expect(html).toContain('OTHER WEEK 1 COSTS');
    expect(html).toContain('Roster Needs');
    expect(html).toContain('Team Morale');
    expect(html).toContain('Set the right starters.');
    expect(html).not.toContain('OTHER SETUP RISKS');
    expect(html).not.toContain('SECONDARY SIGNALS');
    expect(html).not.toContain('Culture Pressure');
    expect(html).not.toContain('Thin secondary.');
  });

  it('compresses roster facts into one snapshot panel', () => {
    const html = renderToStaticMarkup(
      <IntelBriefingPhase
        data={data}
        crisis={crisis}
        openedDrilldowns={['cap']}
        requiredPressureId="cap"
        briefDiagnosis={briefDiagnosis}
        onToggleDrilldown={() => undefined}
      />,
    );

    expect(html).toContain('ROSTER / CAP SNAPSHOT');
    expect(html).toContain('Timeline');
    expect(html).toContain('opening');
    expect(html).toContain('Pressure 71');
    expect(html).toContain('Cap Space');
    expect(html).toContain('$18M');
    expect(html).toContain('B status');
    expect(html).toContain('Best Rooms');
    expect(html).toContain('Needs');
    expect(html).not.toContain('FRANCHISE SNAPSHOT');
    expect(html).not.toContain('Secondary Signals');
    expect(html).not.toContain('Dynasty Window');
    expect(html).not.toContain('Scouting Report');
    expect(html).not.toContain('>Cap</div><div');
    expect(html).not.toContain('B</span><span');
  });
});
