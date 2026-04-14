import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { ChoiceForecastPreview, SchemeSelectionContext, SchemeOption } from '@mfd/engine';
import { monoSm, pixelSm } from '../../shared/pixelUi';
import { ChoiceDeltaBadges } from '../ChoiceDeltaBadges';

function SchemeCard({
  option,
  selected,
  preview,
  onSelect,
}: {
  option: SchemeOption;
  selected: boolean;
  preview?: ChoiceForecastPreview;
  onSelect: () => void;
}) {
  const borderColor = selected ? 'var(--mfd-gold)' : option.recommended ? 'rgba(255, 215, 0, 0.3)' : 'var(--mfd-border)';
  return (
    <div
      style={{
        padding: '12px', border: `3px solid ${borderColor}`,
        background: selected ? 'rgba(255, 215, 0, 0.08)' : 'var(--mfd-bg-3)',
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ ...pixelSm, color: selected ? 'var(--mfd-gold)' : '#ddd' }}>{option.label.toUpperCase()}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {option.recommended && <PixelBadge variant="gold">REC</PixelBadge>}
          {selected && <PixelBadge variant="green">SELECTED</PixelBadge>}
        </div>
      </div>
      <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.5, marginBottom: '8px' }}>{option.description}</div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ ...monoSm, color: option.fitScore >= 70 ? 'var(--mfd-green)' : option.fitScore >= 50 ? 'var(--mfd-gold)' : 'var(--mfd-red, #ff4444)' }}>
          Fit: {Math.round(option.fitScore)}
        </span>
        {option.transitionPenalty > 0 && (
          <span style={{ ...monoSm, color: 'var(--mfd-gold)' }}>Transition: -{Math.round(option.transitionPenalty)}</span>
        )}
        {option.staffAligned && <PixelBadge variant="cyan">Staff Aligned</PixelBadge>}
      </div>
      <ChoiceDeltaBadges preview={preview} />
      {option.bestFitPlayers.length > 0 && (
        <div style={{ ...monoSm, color: '#777', marginTop: '6px' }}>
          Thrives: {option.bestFitPlayers.slice(0, 2).map((p) => `${p.name} (${p.ovr})`).join(', ')}
        </div>
      )}
    </div>
  );
}

export function SetSchemePhase({
  data,
  selectedOffense,
  selectedDefense,
  previewByOffenseSchemeId,
  previewByDefenseSchemeId,
  onSelectOffense,
  onSelectDefense,
}: {
  data: SchemeSelectionContext;
  selectedOffense: string | null;
  selectedDefense: string | null;
  previewByOffenseSchemeId?: Record<string, ChoiceForecastPreview>;
  previewByDefenseSchemeId?: Record<string, ChoiceForecastPreview>;
  onSelectOffense: (schemeId: string) => void;
  onSelectDefense: (schemeId: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PixelPanel title="Offensive Identity" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.offenseOptions.map((opt) => (
            <SchemeCard
              key={opt.schemeId}
              option={opt}
              selected={opt.schemeId === selectedOffense}
              preview={previewByOffenseSchemeId?.[opt.schemeId]}
              onSelect={() => onSelectOffense(opt.schemeId)}
            />
          ))}
        </div>
      </PixelPanel>

      <PixelPanel title="Defensive Identity" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.defenseOptions.map((opt) => (
            <SchemeCard
              key={opt.schemeId}
              option={opt}
              selected={opt.schemeId === selectedDefense}
              preview={previewByDefenseSchemeId?.[opt.schemeId]}
              onSelect={() => onSelectDefense(opt.schemeId)}
            />
          ))}
        </div>
      </PixelPanel>
    </div>
  );
}
