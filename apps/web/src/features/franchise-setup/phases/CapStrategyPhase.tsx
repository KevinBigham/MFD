import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { CapPackage, CapPosture, CapStrategyBriefing, ChoiceForecastPreview } from '@mfd/engine';
import { PixelMetricCard, autoGrid, monoSm } from '../../shared/pixelUi';
import { ChoiceDeltaBadges } from '../ChoiceDeltaBadges';

export function CapStrategyPhase({
  data,
  packages,
  selectedPosture,
  previewByPosture,
  onSelectPosture,
}: {
  data: CapStrategyBriefing;
  packages: CapPackage[];
  selectedPosture: CapPosture | null;
  previewByPosture?: Partial<Record<CapPosture, ChoiceForecastPreview>>;
  onSelectPosture: (posture: CapPosture) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={autoGrid(160)}>
        <PixelMetricCard label="Cap Grade" value={data.capGrade} accent={data.capGrade <= 'B' ? 'green' : 'gold'} detail="Overall health" />
        <PixelMetricCard label="Cap Space" value={`$${data.capSpace}M`} accent="cyan" detail="Available room" />
        <PixelMetricCard label="Dead Cap" value={`$${data.deadCap}M`} accent="red" detail="Sunk cost" />
      </div>

      <PixelPanel title="Biggest Contracts" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {data.biggestContracts.map((c) => (
            <div key={c.name} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #1a1a1a',
            }}>
              <PixelBadge variant="gold">{c.pos}</PixelBadge>
              <span style={{ ...monoSm, color: '#ddd', flex: 1 }}>{c.name}</span>
              <span style={{ ...monoSm, color: '#fff', fontWeight: 'bold' }}>${c.salary}M</span>
              <span style={{ ...monoSm, color: '#888' }}>{c.years}Y</span>
              <PixelBadge variant={c.value === 'Fair' ? 'green' : 'red'}>{c.value}</PixelBadge>
            </div>
          ))}
        </div>
      </PixelPanel>

      {data.restructureCandidates.length > 0 ? (
        <PixelPanel title="Restructure Candidates" accent="cyan">
          {data.restructureCandidates.map((c) => (
            <div key={c.playerId} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #1a1a1a',
            }}>
              <PixelBadge variant="cyan">{c.pos}</PixelBadge>
              <span style={{ ...monoSm, color: '#ddd', flex: 1 }}>{c.playerName}</span>
              <span style={{ ...monoSm, color: 'var(--mfd-cyan)' }}>Save ${c.restructureSavings}M</span>
            </div>
          ))}
        </PixelPanel>
      ) : null}

      {data.cutCandidates.length > 0 ? (
        <PixelPanel title="Potential Cuts" accent="red">
          {data.cutCandidates.map((c) => (
            <div key={c.playerId} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #1a1a1a',
            }}>
              <PixelBadge variant="red">{c.pos}</PixelBadge>
              <span style={{ ...monoSm, color: '#ddd', flex: 1 }}>{c.playerName}</span>
              <span style={{ ...monoSm, color: 'var(--mfd-green)' }}>Save ${c.savingsIfCut}M</span>
            </div>
          ))}
        </PixelPanel>
      ) : null}

      <PixelPanel title="Cap Outlook" accent="default">
        <div style={{ ...monoSm, color: '#ccc', lineHeight: 1.7 }}>{data.capOutlook}</div>
      </PixelPanel>

      <PixelPanel title="Day 1 Cap Packages" accent="cyan">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {packages.map((pkg, index) => {
            const selected = pkg.posture === selectedPosture;
            const isSpotlightTarget = !selectedPosture && index === 0;
            return (
              <div
                key={pkg.posture}
                data-spotlight-target={isSpotlightTarget ? 'wizard.cap-strategy.confirm' : undefined}
                role="button"
                tabIndex={0}
                onClick={() => onSelectPosture(pkg.posture)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectPosture(pkg.posture);
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
                  <span style={{ ...monoSm, color: 'var(--mfd-text)', fontWeight: 700 }}>{pkg.label}</span>
                  {selected ? <PixelBadge variant="cyan">SELECTED</PixelBadge> : null}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{pkg.summary}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant="green">{`+$${pkg.capSpaceDelta}M`}</PixelBadge>
                  <PixelBadge variant={pkg.weekOneDelta >= 1 ? 'gold' : 'default'}>
                    {pkg.weekOneDelta >= 1 ? `+${pkg.weekOneDelta} Week 1` : 'No Week 1 bump'}
                  </PixelBadge>
                </div>
                <ChoiceDeltaBadges preview={previewByPosture?.[pkg.posture]} />
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{pkg.rosterImpact}</div>
              </div>
            );
          })}
        </div>
      </PixelPanel>
    </div>
  );
}
