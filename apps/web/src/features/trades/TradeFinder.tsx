import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar } from '@mfd/design-system/components';
import type { TradeSuggestion } from '@mfd/engine';
import { CommandCallout, monoSm } from '../shared/pixelUi';
import type { TeamWindow, TeamWindowPhase } from '../../lib/team-window';

interface TradeFinderProps {
  suggestions: Array<TradeSuggestion & { partnerName?: string }>;
  teamWindows?: Record<string, TeamWindow | null | undefined>;
  onLoadSuggestion: (suggestion: TradeSuggestion & { partnerName?: string }) => void;
}

type GeneratedOfferReceiptAccent = 'green' | 'gold' | 'cyan';

export interface GeneratedOfferReceipt {
  label: string;
  detail: string;
  accent: GeneratedOfferReceiptAccent;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatValueGap(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `Gap +${rounded}`;
  if (rounded < 0) return `Gap ${rounded}`;
  return 'Gap 0';
}

function packageTypeLabel(type: TradeSuggestion['offer']['type']): string {
  if (type === 'player_for_player') return 'player-for-player';
  if (type === 'pick_for_player') return 'pick-for-player';
  return 'mixed package';
}

function assetSummary(assets: TradeSuggestion['offer']['offering']): string {
  if (assets.length === 0) return 'no listed assets';
  return assets.map((asset) => asset.description).join(' + ');
}

function teamWindowAccent(phase: TeamWindowPhase): 'green' | 'cyan' | 'gold' | 'red' {
  if (phase === 'ALL_IN') return 'gold';
  if (phase === 'CONTEND') return 'green';
  if (phase === 'REBUILD') return 'red';
  return 'cyan';
}

function teamWindowLabel(phase: TeamWindowPhase): string {
  if (phase === 'ALL_IN') return 'ALL IN';
  if (phase === 'CONTEND') return 'CONTEND';
  if (phase === 'RETOOL') return 'RETOOL';
  return 'REBUILD';
}

export function buildGeneratedOfferReceipt(suggestion: TradeSuggestion & { partnerName?: string }): GeneratedOfferReceipt {
  const partnerName = suggestion.partnerName ?? suggestion.partner;
  const acceptance = formatPercent(suggestion.acceptanceLikelihood);
  const valueGap = formatValueGap(suggestion.valueGap);
  const fit = suggestion.need
    ? `${partnerName} targets your ${suggestion.need} need`
    : `${partnerName} surfaced as a high-confidence match`;
  const packageShape = packageTypeLabel(suggestion.offer.type);
  const offerAssets = assetSummary(suggestion.offer.offering);
  const requestAssets = assetSummary(suggestion.offer.requesting);

  if (suggestion.acceptanceLikelihood >= 0.95) {
    return {
      label: 'Green-light offer',
      detail: `${fit}; ${packageShape} uses ${offerAssets} for ${requestAssets}. ${acceptance} acceptance, ${valueGap}.`,
      accent: 'green',
    };
  }

  if (suggestion.valueGap > 0) {
    return {
      label: 'Value window',
      detail: `${fit}; ${packageShape} creates user-side value if you like the roster fit. ${acceptance} acceptance, ${valueGap}.`,
      accent: 'gold',
    };
  }

  return {
    label: 'Need match',
    detail: `${fit}; ${packageShape} is carried by the saved trade-finder reason, not a submitted proposal. ${acceptance} acceptance, ${valueGap}.`,
    accent: 'cyan',
  };
}

export function TradeFinder({ suggestions, teamWindows = {}, onLoadSuggestion }: TradeFinderProps) {
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
          {suggestions.map((suggestion) => {
            const receipt = buildGeneratedOfferReceipt(suggestion);
            const teamWindow = teamWindows[suggestion.partner] ?? null;

            return (
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
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {teamWindow ? (
                      <>
                        <PixelBadge variant={teamWindowAccent(teamWindow.phase)}>{teamWindowLabel(teamWindow.phase)} window</PixelBadge>
                        <PixelBadge variant={teamWindow.confidence === 'clear' ? 'green' : 'gold'}>{teamWindow.confidence}</PixelBadge>
                      </>
                    ) : null}
                    {suggestion.need ? <PixelBadge variant="gold">Need {suggestion.need}</PixelBadge> : null}
                  </div>
                </div>
                {teamWindow ? (
                  <details style={{ border: '1px solid var(--mfd-border)', padding: '8px', background: 'var(--mfd-bg-elevated)' }}>
                    <summary style={{ ...monoSm, color: 'var(--mfd-text)', cursor: 'pointer' }}>
                      Window drivers from saved roster, cap, picks, and strategy
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                      {teamWindow.drivers.map((driver) => (
                        <div key={`${suggestion.partner}-${driver.label}`} style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                          <strong>{driver.label}:</strong> {driver.detail}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  Offer {suggestion.offer.offering.map((asset) => asset.description).join(' + ')} for {suggestion.offer.requesting.map((asset) => asset.description).join(' + ')}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{suggestion.reasoning}</div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px',
                  border: '1px solid var(--mfd-border)',
                  background: 'var(--mfd-bg-elevated)',
                }}
                >
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <PixelBadge variant={receipt.accent}>Generated Offer Receipt</PixelBadge>
                    <PixelBadge variant="default">{receipt.label}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{receipt.detail}</div>
                </div>
                <PixelProgressBar
                  value={Math.round(suggestion.acceptanceLikelihood * 100)}
                  accent={suggestion.acceptanceLikelihood >= 0.9 ? 'green' : 'gold'}
                  label="Acceptance"
                  valueLabel={`${Math.round(suggestion.acceptanceLikelihood * 100)}%`}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <PixelButton accent="green" onClick={() => onLoadSuggestion(suggestion)}>
                    Load Package
                  </PixelButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PixelPanel>
  );
}
