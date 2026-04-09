import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { FranchiseBlueprint } from '@mfd/engine';
import { PixelMetricCard, autoGrid, monoSm, pixelSm, display } from '../../shared/pixelUi';

export function BlueprintPhase({ data }: { data: FranchiseBlueprint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '20px 0', borderBottom: '2px solid var(--mfd-gold)' }}>
        <div style={{ ...display, fontSize: '28px', color: 'var(--mfd-gold)', lineHeight: 1.2 }}>
          {data.teamName.toUpperCase()}
        </div>
        <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)', marginTop: '8px' }}>
          {data.year} FRANCHISE BLUEPRINT
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">{data.windowPhase}</PixelBadge>
          <PixelBadge variant="cyan">{data.windowTrend}</PixelBadge>
          <PixelBadge variant="default">{data.difficulty}</PixelBadge>
        </div>
      </div>

      {/* Identity */}
      <div style={autoGrid(200)}>
        <PixelMetricCard label="Offense" value={data.selectedSchemes.offenseLabel} accent="gold" detail="Offensive scheme" />
        <PixelMetricCard label="Defense" value={data.selectedSchemes.defenseLabel} accent="cyan" detail="Defensive scheme" />
        <PixelMetricCard label="Roster" value={data.rosterStrength} accent="green" detail="Roster grade" />
        <PixelMetricCard label="Cap" value={data.capOutlook.split('.')[0] ?? data.capOutlook} accent="gold" detail="Financial outlook" />
      </div>

      {/* Season Goals */}
      <PixelPanel title="Season Goals" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.seasonGoals.map((goal, i) => (
            <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PixelBadge variant={i === 0 ? 'green' : i === 1 ? 'gold' : 'cyan'}>{i === 0 ? 'FLOOR' : i === 1 ? 'TARGET' : 'CEILING'}</PixelBadge>
              <span style={{ ...monoSm, color: '#ddd' }}>{goal.label}</span>
              <span style={{ ...monoSm, color: '#888' }}>{goal.description}</span>
            </div>
          ))}
        </div>
      </PixelPanel>

      {/* Key Players */}
      {data.keyPlayers.length > 0 ? (
        <PixelPanel title="Key Players" accent="green">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {data.keyPlayers.map((p) => (
              <div key={p.playerId} style={{ padding: '6px 10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)' }}>
                <PixelBadge variant="gold">{p.pos}</PixelBadge>
                <span style={{ ...monoSm, color: '#ddd', marginLeft: '6px' }}>{p.name} ({p.ovr})</span>
              </div>
            ))}
          </div>
        </PixelPanel>
      ) : null}

      {/* Needs & Strengths */}
      <div style={autoGrid(200)}>
        <PixelPanel title="Critical Needs" accent="red">
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {data.criticalNeeds.map((n) => <PixelBadge key={n} variant="red">{n}</PixelBadge>)}
            {data.criticalNeeds.length === 0 && <span style={{ ...monoSm, color: '#666' }}>None</span>}
          </div>
        </PixelPanel>
      </div>

      {/* Blueprint Narrative */}
      <PixelPanel title="The Plan" accent="gold">
        <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.8, fontSize: '12px' }}>
          {data.blueprintNarrative}
        </div>
      </PixelPanel>

      {/* AGM Closing Words */}
      {data.agmClosingWords ? (
        <div style={{
          padding: '16px', border: '2px solid rgba(255, 215, 0, 0.3)',
          background: 'rgba(255, 215, 0, 0.04)', textAlign: 'center',
        }}>
          <div style={{ ...monoSm, color: 'var(--mfd-gold)', lineHeight: 1.6, fontStyle: 'italic' }}>
            &ldquo;{data.agmClosingWords}&rdquo;
          </div>
        </div>
      ) : null}
    </div>
  );
}
