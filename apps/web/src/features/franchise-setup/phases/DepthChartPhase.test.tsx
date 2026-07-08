import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DepthChartContext } from '@mfd/engine';
import { DepthChartPhase } from './DepthChartPhase';

const depthChartContext = {
  selectedOffenseScheme: 'spread',
  selectedDefenseScheme: 'cover_3',
  positionGroups: [
    {
      position: 'QB',
      players: [
        { playerId: 'qb-1', name: 'Jet Lawson', ovr: 88, age: 27, contractCapHit: 28, isStarter: true, fitScore: 82 },
        { playerId: 'qb-2', name: 'Cole Draft', ovr: 71, age: 22, contractCapHit: 2, isStarter: false, fitScore: 66 },
      ],
    },
  ],
  activeBattles: [],
  autoSetRecommendation: { QB: ['qb-1'] },
} as unknown as DepthChartContext;

describe('DepthChartPhase', () => {
  it('explains depth-chart philosophy consequences without setup jargon', () => {
    const html = renderToStaticMarkup(
      <DepthChartPhase
        data={depthChartContext}
        selectedPhilosophy={null}
        onSelectPhilosophy={() => undefined}
      />,
    );

    expect(html).toContain('Start the most reliable Week 1 lineup now');
    expect(html).toContain('young player’s development snaps');
    expect(html).toContain('Start experienced players first');
    expect(html).toContain('young backups lose early development snaps');
    expect(html).toContain('veterans install the Week 1 calls');
    expect(html).toContain('Start young players early for development snaps');
    expect(html).toContain('accept more Week 1 mistakes');
    expect(html).toContain('Role match 82');
    expect(html).not.toMatch(/\b\d+F\b/);
    expect(html).not.toMatch(/highest-floor|Trust experience|young upside|young backups may develop slower|system installs/i);
  });
});
