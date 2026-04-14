import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { ChoiceForecastPreview, CultureMandate, GoalSelectionContext, GoalOption } from '@mfd/engine';
import { monoSm, pixelSm } from '../../shared/pixelUi';
import { ChoiceDeltaBadges } from '../ChoiceDeltaBadges';

const DIFFICULTY_ACCENT: Record<string, 'green' | 'gold' | 'red'> = {
  easy: 'green', medium: 'gold', hard: 'red',
};

const MANDATES: Array<{ id: CultureMandate; label: string; desc: string }> = [
  { id: 'accountability', label: 'Accountability', desc: 'Tighten standards and make the room earn roles fast.' },
  { id: 'player_led', label: 'Player Led', desc: 'Push leadership to the veterans and let the room police itself.' },
  { id: 'development_first', label: 'Development First', desc: 'Accept short-term turbulence to accelerate young contributors.' },
];

export function SetGoalsPhase({
  data,
  selectedGoals,
  onToggleGoal,
  selectedMandate,
  mandatePreviewById,
  onSelectMandate,
}: {
  data: GoalSelectionContext;
  selectedGoals: string[];
  onToggleGoal: (goalId: string) => void;
  selectedMandate: CultureMandate | null;
  mandatePreviewById?: Partial<Record<CultureMandate, ChoiceForecastPreview>>;
  onSelectMandate: (mandate: CultureMandate) => void;
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

      <PixelPanel title="Culture Mandate" accent="cyan">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {MANDATES.map((mandate) => {
            const selected = mandate.id === selectedMandate;
            return (
              <div
                key={mandate.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectMandate(mandate.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectMandate(mandate.id);
                }}
                style={{
                  cursor: 'pointer',
                  border: `3px solid ${selected ? 'var(--mfd-cyan)' : 'var(--mfd-border)'}`,
                  background: selected ? 'rgba(0, 224, 255, 0.08)' : 'var(--mfd-bg-3)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <span style={{ ...pixelSm, color: selected ? 'var(--mfd-cyan)' : 'var(--mfd-text)' }}>
                    {mandate.label.toUpperCase()}
                  </span>
                  {selected ? <PixelBadge variant="cyan">SELECTED</PixelBadge> : null}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{mandate.desc}</div>
                <ChoiceDeltaBadges preview={mandatePreviewById?.[mandate.id]} />
              </div>
            );
          })}
        </div>
      </PixelPanel>
    </div>
  );
}
