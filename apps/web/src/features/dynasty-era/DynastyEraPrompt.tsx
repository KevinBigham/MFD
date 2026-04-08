/**
 * DynastyEraPrompt — Modal that prompts the user to name their dynasty era.
 * Triggered after winning a championship or reaching 5+ seasons.
 * Shows AI-generated era name suggestions with option to type custom.
 */
import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelModal, PixelPanel } from '@mfd/design-system/components';
import { generateEraSuggestions, mulberry32, type EraNameSuggestion } from '@mfd/engine';
import { useGameStore, selectUserTeam } from '../../app/store/game-store';
import { monoSm, pixelSm } from '../shared/pixelUi';

export interface DynastyEraPromptProps {
  open: boolean;
  onClose: () => void;
}

export function DynastyEraPrompt({ open, onClose }: DynastyEraPromptProps) {
  const game = useGameStore((s) => s.game);
  const team = useGameStore(selectUserTeam);
  const nameDynastyEra = useGameStore((s) => s.actions.nameDynastyEra);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const suggestions: EraNameSuggestion[] = useMemo(() => {
    if (!game) return [];
    const rng = mulberry32(game.seed ^ game.year ^ 0xEEEE);
    return generateEraSuggestions(game, rng);
  }, [game]);

  const finalName = useCustom ? customName.trim() : selectedName;

  const handleConfirm = async () => {
    if (!finalName) return;
    await nameDynastyEra(finalName);
    onClose();
  };

  return (
    <PixelModal
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
      title="Name Your Dynasty Era"
      accent="gold"
      width={500}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          {team ? `The ${team.city} ${team.name}` : 'Your franchise'} has earned the right to name this era.
          Choose a suggestion or write your own legacy.
        </div>

        <PixelPanel title="Suggestions" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => { setSelectedName(s.name); setUseCustom(false); }}
                style={{
                  padding: '10px 12px',
                  border: `2px solid ${selectedName === s.name && !useCustom ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                  background: selectedName === s.name && !useCustom ? 'rgba(255, 215, 0, 0.1)' : 'var(--mfd-bg-2)',
                  color: selectedName === s.name && !useCustom ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--mfd-font-mono)',
                  fontSize: '11px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>{s.name}</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>{s.reason}</div>
              </button>
            ))}
          </div>
        </PixelPanel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>OR NAME IT YOURSELF</div>
          <input
            type="text"
            value={customName}
            onChange={(e) => { setCustomName(e.target.value); setUseCustom(true); }}
            onFocus={() => setUseCustom(true)}
            placeholder="The Golden Dynasty..."
            maxLength={40}
            style={{
              padding: '10px 12px',
              background: useCustom ? 'rgba(255, 215, 0, 0.06)' : 'var(--mfd-bg)',
              border: `2px solid ${useCustom && customName.trim() ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
              color: 'var(--mfd-text)',
              fontFamily: 'var(--mfd-font-mono)',
              fontSize: '12px',
            }}
          />
        </div>

        {finalName && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <PixelBadge variant="gold">ERA</PixelBadge>
            <span style={{ ...monoSm, color: 'var(--mfd-gold)', fontWeight: 600 }}>{finalName}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <PixelButton accent="default" onClick={onClose}>
            Skip
          </PixelButton>
          <PixelButton accent="gold" onClick={() => void handleConfirm()} disabled={!finalName}>
            Name This Era
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
