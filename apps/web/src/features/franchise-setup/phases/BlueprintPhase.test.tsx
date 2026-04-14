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
  blueprintNarrative: 'The first month decides whether this team becomes real.',
  crisisHeadline: 'The cap is narrowing your moves.',
  pressureSnapshot: [
    { id: 'cap', label: 'Cap Pressure', severity: 'critical', diagnosis: 'The books are tight.' },
  ],
  dayOneBets: ['You chose the balanced cap package.'],
  weekOneCliffhanger: {
    openerLabel: 'Week 1 vs Austin Nighthawks',
    threat: 'The opener exposes cap pressure immediately.',
    hope: 'There is enough here to steal momentum early.',
    unknown: 'The room still has to trust the standard.',
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
          unresolvedDanger: 'Secondary depth can still wreck the script.',
        }}
      />,
    );

    expect(html).toContain('Austin Nighthawks');
    expect(html).toContain('IF THIS WORKS');
    expect(html).toContain('IF THIS BREAKS');
    expect(html).toContain('TOP UNRESOLVED DANGER');
  });
});
