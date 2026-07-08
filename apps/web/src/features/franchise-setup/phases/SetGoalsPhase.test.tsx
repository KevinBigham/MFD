import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GoalSelectionContext } from '@mfd/engine';
import { SetGoalsPhase } from './SetGoalsPhase';

const goalContext: GoalSelectionContext = {
  ownerType: 'patient',
  ownerExpectations: 'Ownership will accept losses only if young roles are visible.',
  availableGoals: [
    {
      id: 'rebuild_progress',
      label: 'Rebuild Progress',
      description: 'Show young-player development.',
      recommended: true,
      difficulty: 'moderate',
      reason: 'Visible young snaps protect owner patience.',
    },
  ],
  recommendedGoals: [],
};

describe('SetGoalsPhase', () => {
  it('explains team rules with direct snap and owner-patience consequences', () => {
    const html = renderToStaticMarkup(
      <SetGoalsPhase
        data={goalContext}
        selectedGoals={['rebuild_progress']}
        selectedMandate={null}
        onToggleGoal={() => undefined}
        onSelectMandate={() => undefined}
      />,
    );

    expect(html).toContain('TEAM RULES');
    expect(html).toContain('Patient Owner');
    expect(html).toContain('WEEKLY OWNER PRESSURE');
    expect(html).toContain('RECOMMENDED');
    expect(html).toContain('MISTAKES CHANGE ROLES');
    expect(html).toContain('Bench or reduce players after repeated missed assignments');
    expect(html).toContain('CAPTAINS OWN CORRECTIONS');
    expect(html).toContain('Make veterans lead corrections');
    expect(html).toContain('YOUNG PLAYERS GET SNAPS');
    expect(html).toContain('Give young players snaps now; missed assignments cost drives and owner patience.');
    expect(html).not.toContain('CULTURE MANDATE');
    expect(html).not.toContain('Player Led');
    expect(html).not.toContain('Accept short-term turbulence');
    expect(html).not.toMatch(/>REC</);
    expect(html).not.toMatch(/>moderate<|>medium<|>easy<|>hard</i);
  });
});
