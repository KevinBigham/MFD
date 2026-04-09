import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { CapStrategyBriefing } from '@mfd/engine';
import { PixelMetricCard, autoGrid, monoSm } from '../../shared/pixelUi';

export function CapStrategyPhase({ data }: { data: CapStrategyBriefing }) {
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
    </div>
  );
}
