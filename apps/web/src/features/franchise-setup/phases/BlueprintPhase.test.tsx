import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FranchiseBlueprint } from '@mfd/engine';
import { BlueprintPhase } from './BlueprintPhase';

const blueprint: FranchiseBlueprint = {
  teamName: 'Kansas City BBQ Fountains',
  year: 2026,
  difficulty: 'pro',
  windowPhase: 'opening',
  windowTrend: 'improving',
  selectedSchemes: {
    offenseSchemeId: 'spread',
    offenseLabel: 'Spread',
    defenseSchemeId: 'cover_3',
    defenseLabel: 'Cover 3',
  },
  seasonGoals: [
    { id: 'winning_record', label: 'Winning Record', description: 'Finish over .500' },
    { id: 'playoff_berth', label: 'Playoff Berth', description: 'Reach January' },
    { id: 'draft_well', label: 'Draft Well', description: 'Protect the pipeline' },
  ],
  criticalNeeds: ['CB'],
  keyPlayers: [{ playerId: 'qb-1', name: 'Jet Lawson', pos: 'QB', ovr: 91 }],
  rosterStrength: 'Playoff-caliber core',
  capOutlook: 'Tight but manageable.',
  blueprintNarrative: 'The first month decides whether the roster can protect the quarterback.',
  crisisHeadline: 'The cap is narrowing your moves.',
  pressureSnapshot: [
    { id: 'cap', label: 'Cap Space', severity: 'critical', diagnosis: 'The books are tight.' },
  ],
  dayOneBets: ['You chose the balanced cap package.'],
  weekOneCliffhanger: {
    openerLabel: 'Week 1 vs Austin Nighthawks',
    threat: 'The opener exposes tight cap space immediately.',
    hope: 'Fix the cap plan and the opener stays winnable.',
    unknown: 'Check backup roles before kickoff.',
  },
};

describe('BlueprintPhase', () => {
  it('renders the sharper runtime cliffhanger framing', () => {
    const html = renderToStaticMarkup(
      <BlueprintPhase
        data={blueprint}
        runtimeCliffhanger={{
          opponentIdentity: 'Austin Nighthawks',
          ifThisWorks: 'The opener proves the plan can hold under live fire.',
          ifThisBreaks: 'The cap squeeze shows up before halftime.',
          unresolvedDanger: 'Secondary depth still wrecks the script.',
          decisionSummary: ['Cap Package: Restructure Multiple Contracts. Future cap hits limit injury, trade, and extension fixes.'],
        }}
      />,
    );

    expect(html).toContain('Austin Nighthawks');
    expect(html).toContain('SETUP DIAGNOSIS');
    expect(html).toContain('IF THIS WORKS');
    expect(html).toContain('IF THIS BREAKS');
    expect(html).toContain('TOP UNRESOLVED DANGER');
    expect(html).toContain('SETUP DECISIONS CARRIED INTO WEEK 1');
    expect(html).toContain('WEEK 1 RISK CHECK');
    expect(html).toContain('If ignored:');
    expect(html).toContain('If solved:');
    expect(html).toContain('Before kickoff:');
    expect(html).toContain('Roster strength');
    expect(html).toContain('MINIMUM PROMISE');
    expect(html).toContain('MAIN PROMISE');
    expect(html).toContain('STRETCH PROMISE');
    expect(html).toContain('Restructure Multiple Contracts');
    expect(html).toContain('Future cap hits limit injury, trade, and extension fixes.');
    expect(html).not.toMatch(/DAY 1 DECISIONS CARRIED INTO KICKOFF|WEEK 1 CLIFFHANGER|DAY 1 BET|Day 1 Diagnosis|Push Chips|Aggressive Cap Push|\bbet\b|Threat:|Hope:|Unknown:|Roster grade|momentum|trust the standard|If fixed:|Check before kickoff:/i);
    expect(html).not.toMatch(/\b(?:FLOOR|TARGET|CEILING)\b/);
  });
});
