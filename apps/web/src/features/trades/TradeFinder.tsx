import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar } from '@mfd/design-system/components';
import type { TradeSuggestion } from '@mfd/engine';
import { CommandCallout, monoSm } from '../shared/pixelUi';

interface TradeFinderProps {
  suggestions: Array<TradeSuggestion & { partnerName?: string }>;
  onLoadSuggestion: (suggestion: TradeSuggestion & { partnerName?: string }) => void;
}

export function TradeFinder({ suggestions, onLoadSuggestion }: TradeFinderProps) {
  return (
    <PixelPanel title="Trade Finder" accent="gold">
      {suggestions.length === 0 ? (
        <CommandCallout
          eyebrow="Trade Finder"
          title="No high-confidence matches"
          body="The model does not like a ready-made package this week. Use the proposal tab if you still need to force a roster swing."
          accent="gold"
          framed={false}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {suggestions.map((suggestion) => (
            <div
              key={`${suggestion.partner}-${suggestion.offer.requesting.map((asset) => asset.description).join('-')}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                border: '3px solid var(--mfd-border)',
                background: 'var(--mfd-bg-3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{suggestion.partnerName ?? suggestion.partner}</div>
                {suggestion.need ? <PixelBadge variant="gold">Need {suggestion.need}</PixelBadge> : null}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                Offer {suggestion.offer.offering.map((asset) => asset.description).join(' + ')} for {suggestion.offer.requesting.map((asset) => asset.description).join(' + ')}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{suggestion.reasoning}</div>
              <PixelProgressBar
                value={Math.round(suggestion.acceptanceLikelihood * 100)}
                accent={suggestion.acceptanceLikelihood >= 0.9 ? 'green' : 'gold'}
                label="Acceptance"
                valueLabel={suggestion.acceptanceLikelihood.toFixed(1)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <PixelButton accent="green" onClick={() => onLoadSuggestion(suggestion)}>
                  Load Package
                </PixelButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </PixelPanel>
  );
}
