import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SchemeSelectionContext } from '@mfd/engine';
import { SetSchemePhase } from './SetSchemePhase';

const schemeContext: SchemeSelectionContext = {
  currentOffScheme: 'spread',
  currentDefScheme: 'cover_3',
  offenseOptions: [
    {
      schemeId: 'spread',
      label: 'Spread',
      description: 'Quick throws for current receivers.',
      fitScore: 82,
      transitionPenalty: 12,
      staffAlignmentBonus: 8,
      recommended: true,
      recommendationScore: 88,
      staffAligned: true,
      bestFitPlayers: [
        { playerId: 'qb-1', name: 'Jet Lawson', pos: 'QB', ovr: 88, fitScore: 91 },
        { playerId: 'wr-1', name: 'Milo Hart', pos: 'WR', ovr: 85, fitScore: 87 },
      ],
      worstFitPlayers: [],
    },
  ],
  defenseOptions: [
    {
      schemeId: 'cover_3',
      label: 'Cover 3',
      description: 'Keep coverage rules simple.',
      fitScore: 74,
      transitionPenalty: 0,
      staffAlignmentBonus: 0,
      recommended: false,
      recommendationScore: 70,
      staffAligned: false,
      bestFitPlayers: [],
      worstFitPlayers: [],
    },
  ],
};

describe('SetSchemePhase', () => {
  it('uses plain setup labels instead of raw fit/alignment shorthand', () => {
    const html = renderToStaticMarkup(
      <SetSchemePhase
        data={schemeContext}
        selectedOffense={null}
        selectedDefense={null}
        onSelectOffense={() => undefined}
        onSelectDefense={() => undefined}
      />,
    );

    expect(html).toContain('OFFENSIVE CALLS');
    expect(html).toContain('DEFENSIVE CALLS');
    expect(html).toContain('RECOMMENDED');
    expect(html).toContain('Roster match: 82');
    expect(html).toContain('Install cost: -12');
    expect(html).toContain('Staff teaches this');
    expect(html).toContain('Best current players: Jet Lawson (88), Milo Hart (85)');
    expect(html).not.toContain('Offensive Identity');
    expect(html).not.toContain('Defensive Identity');
    expect(html).not.toContain('Fit: 82');
    expect(html).not.toContain('Transition: -12');
    expect(html).not.toContain('Staff Aligned');
    expect(html).not.toContain('Staff can teach');
    expect(html).not.toContain('Thrives:');
    expect(html).not.toMatch(/>REC</);
  });
});
