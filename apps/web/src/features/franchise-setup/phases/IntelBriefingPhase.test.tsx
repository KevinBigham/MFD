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
  overallAssessment: 'This roster can compete if Day 1 solves the right pressure.',
};

const crisis: TeamCrisisProfile = {
  headline: 'The cap is narrowing your moves.',
  ownerPressure: 'Ownership wants coherence.',
  mediaPressure: 'The market is skeptical.',
  weekOneThreat: 'Week 1 will expose cap pressure immediately.',
  weekOneHope: 'The opener is winnable with a clean plan.',
  weekOneUnknown: 'The room still has to buy it.',
  pressureCards: [
    {
      id: 'roster',
      label: 'Roster Pressure',
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
      label: 'Cap Pressure',
      severity: 'critical',
      score: 82,
      diagnosis: 'The books are tight.',
      signal: 'CRITICAL',
      drilldown: {
        whyItMatters: 'Cap room decides whether you can pivot.',
        riskSource: 'One bad contract is holding the room hostage.',
        bestLever: 'Choose a Day 1 cap package.',
        seasonOneConsequence: 'A tight cap slows every recovery move.',
      },
    },
    {
      id: 'culture',
      label: 'Culture Pressure',
      severity: 'warning',
      score: 58,
      diagnosis: 'The room can wobble.',
      signal: 'WATCH',
      drilldown: {
        whyItMatters: 'The room still needs a tone.',
        riskSource: 'Veterans do not trust the current standard.',
        bestLever: 'Set a clear mandate.',
        seasonOneConsequence: 'A split room makes bad weeks heavier.',
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
    expect(html).toContain('REQUIRED');
    expect(html).toContain('Cap Pressure');
    expect(html).toContain('One bad contract is holding the room hostage.');
    expect(html).toContain('Choose a Day 1 cap package.');
  });

  it('leads with one open-this-first pressure card instead of a full board', () => {
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
    expect(html).toContain('Cap Pressure');
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

    expect(html).toContain('Open this pressure card to unlock Next.');
    expect(html).not.toContain('One bad contract is holding the room hostage.');
  });

  it('keeps secondary pressure signals compact below the required card', () => {
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

    expect(html).toContain('SECONDARY SIGNALS');
    expect(html).toContain('Roster Pressure');
    expect(html).toContain('Culture Pressure');
    expect(html).toContain('Set the right starters.');
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

    expect(html).toContain('FRANCHISE SNAPSHOT');
    expect(html).toContain('Window');
    expect(html).toContain('opening');
    expect(html).toContain('Needs');
    expect(html).not.toContain('Dynasty Window');
    expect(html).not.toContain('Scouting Report');
  });
});
