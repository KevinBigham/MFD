import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { GoalSelectionContext, GoalOption } from '@mfd/engine';
import { monoSm, pixelSm } from '../../shared/pixelUi';

const DIFFICULTY_ACCENT: Record<string, 'green' | 'gold' | 'red'> = {
  easy: 'green', medium: 'gold', hard: 'red',
};

export function SetGoalsPhase({
  data,
  selectedGoals,
  onToggleGoal,
}: {
  data: GoalSelectionContext;
  selectedGoals: string[];
  onToggleGoal: (goalId: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PixelPanel title="Owner Expectations" accent="gold">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
          <PixelBadge variant="gold">{data.ownerType.replace('_', ' ')}</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: '#bbb', lineHeight: 1.6 }}>{data.ownerExpectations}</div>
      </PixelPanel>

      <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>
        SELECT 3 SEASON GOALS ({selectedGoals.length}/3)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.availableGoals.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          const canSelect = isSelected || selectedGoals.length < 3;
          const difficulty = (goal as GoalOption & { difficulty?: string }).difficulty ?? 'medium';
          return (
            <div
              key={goal.id}
              onClick={() => { if (canSelect) onToggleGoal(goal.id); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && canSelect) onToggleGoal(goal.id); }}
              style={{
                padding: '12px', cursor: canSelect ? 'pointer' : 'not-allowed',
                border: `3px solid ${isSelected ? 'var(--mfd-gold)' : goal.recommended ? 'rgba(255, 215, 0, 0.25)' : 'var(--mfd-border)'}`,
                background: isSelected ? 'rgba(255, 215, 0, 0.08)' : 'var(--mfd-bg-3)',
                opacity: canSelect ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ ...pixelSm, color: isSelected ? 'var(--mfd-gold)' : '#ddd' }}>
                  {goal.label.toUpperCase()}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <PixelBadge variant={DIFFICULTY_ACCENT[difficulty] ?? 'gold'}>{difficulty}</PixelBadge>
                  {goal.recommended && <PixelBadge variant="gold">REC</PixelBadge>}
                  {isSelected && <PixelBadge variant="green">SELECTED</PixelBadge>}
                </div>
              </div>
              <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.5 }}>{goal.description}</div>
              {goal.reason ? (
                <div style={{ ...monoSm, color: 'var(--mfd-cyan)', marginTop: '4px', lineHeight: 1.4 }}>{goal.reason}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
