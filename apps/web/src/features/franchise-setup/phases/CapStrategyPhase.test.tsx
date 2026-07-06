import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CapPackage, CapStrategyBriefing } from '@mfd/engine';
import { CapStrategyPhase } from './CapStrategyPhase';

const briefing: CapStrategyBriefing = {
  capGrade: 'C',
  capSpace: 12,
  deadCap: 18,
  biggestContracts: [
    { name: 'Jet Lawson', pos: 'QB', ovr: 91, age: 27, salary: 32, years: 3, value: 'Fair' },
  ],
  expiringDeals: [],
  restructureCandidates: [],
  cutCandidates: [],
  capOutlook: 'Cap health is tight; protect injury and extension money before new spending.',
};

const packages: CapPackage[] = [
  {
    posture: 'balanced',
    label: 'Balanced',
    summary: 'Create limited space now.',
    capSpaceDelta: 4,
    deadCapDelta: 1,
    rosterImpact: 'Keeps later fixes open.',
    restructureTargets: ['Jet Lawson'],
    weekOneDelta: 1,
    ownerApprovalDelta: 0,
  },
];

describe('CapStrategyPhase', () => {
  it('labels the setup cap metric with plain cap consequences', () => {
    const html = renderToStaticMarkup(
      <CapStrategyPhase
        data={briefing}
        packages={packages}
        selectedPosture={null}
        onSelectPosture={() => undefined}
      />,
    );

    expect(html).toContain('Cap Status');
    expect(html).toContain('CAP PLAN CHOICES');
    expect(html).toContain('Injury, trade, and extension money');
    expect(html).toContain('Money already charged');
    expect(html).toContain('+1 Week 1 fix');
    expect(html).not.toContain('contract risk');
    expect(html).not.toContain('Cap Plan Grade');
    expect(html).not.toContain('A-F cap score');
    expect(html).not.toContain('Sunk cost');
    expect(html).not.toContain('Cap Grade');
    expect(html).not.toContain('Day 1 Cap Packages');
    expect(html).not.toContain('+1 Week 1 bump');
    expect(html).not.toContain('No Week 1 bump');
  });
});
