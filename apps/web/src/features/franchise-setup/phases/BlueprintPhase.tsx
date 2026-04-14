import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { FranchiseBlueprint } from '@mfd/engine';
import { PixelMetricCard, autoGrid, monoSm, pixelSm, display } from '../../shared/pixelUi';

export function BlueprintPhase({
  data,
  runtimeCliffhanger,
}: {
  data: FranchiseBlueprint;
  runtimeCliffhanger?: {
    opponentIdentity: string;
    ifThisWorks: string;
    ifThisBreaks: string;
    unresolvedDanger: string;
    betSummary?: string[];
  };
}) {
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

      <PixelPanel title="Day 1 Diagnosis" accent="red">
        <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7 }}>{data.crisisHeadline}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          {data.pressureSnapshot.map((card) => (
            <div key={card.id} style={{ padding: '6px 10px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-3)' }}>
              <PixelBadge variant={card.severity === 'critical' ? 'red' : card.severity === 'warning' ? 'gold' : 'green'}>
                {card.label}
              </PixelBadge>
              <span style={{ ...monoSm, color: '#bbb', marginLeft: '6px' }}>{card.diagnosis}</span>
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

      <PixelPanel title="Day 1 Bets" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.dayOneBets.map((bet) => (
            <div key={bet} style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
              {bet}
            </div>
          ))}
        </div>
      </PixelPanel>

      <PixelPanel title="Week 1 Cliffhanger" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>{data.weekOneCliffhanger.openerLabel}</div>
          <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}><strong>Threat:</strong> {data.weekOneCliffhanger.threat}</div>
          <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}><strong>Hope:</strong> {data.weekOneCliffhanger.hope}</div>
          <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.6 }}><strong>Unknown:</strong> {data.weekOneCliffhanger.unknown}</div>
        </div>
      </PixelPanel>

      {runtimeCliffhanger ? (
        <PixelPanel title="Week 1 War Room" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...pixelSm, color: 'var(--mfd-red)' }}>{runtimeCliffhanger.opponentIdentity}</div>
            <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
              <strong>IF THIS WORKS</strong> {runtimeCliffhanger.ifThisWorks}
            </div>
            <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
              <strong>IF THIS BREAKS</strong> {runtimeCliffhanger.ifThisBreaks}
            </div>
            <div style={{ ...monoSm, color: '#aaa', lineHeight: 1.6 }}>
              <strong>TOP UNRESOLVED DANGER</strong> {runtimeCliffhanger.unresolvedDanger}
            </div>
            {runtimeCliffhanger.betSummary && runtimeCliffhanger.betSummary.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>DAY 1 BETS CARRIED INTO KICKOFF</div>
                {runtimeCliffhanger.betSummary.map((bet) => (
                  <div key={bet} style={{ ...monoSm, color: '#ddd', lineHeight: 1.5 }}>{bet}</div>
                ))}
              </div>
            ) : null}
          </div>
        </PixelPanel>
      ) : null}
    </div>
  );
}
