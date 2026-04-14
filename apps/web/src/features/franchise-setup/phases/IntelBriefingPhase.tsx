import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { FranchiseIntelBriefing, TeamCrisisProfile, PressureCard, SetupColdOpen as SetupColdOpenModel } from '@mfd/engine';
import { PixelMetricCard, autoGrid, monoSm, pixelSm } from '../../shared/pixelUi';

const PRESSURE_ACCENT: Record<PressureCard['severity'], 'green' | 'gold' | 'red'> = {
  stable: 'green',
  warning: 'gold',
  critical: 'red',
};

export function IntelBriefingPhase({
  data,
  crisis,
  openedDrilldowns = [],
  requiredPressureId = null,
  briefDiagnosis = null,
  supportCopy = null,
  onToggleDrilldown,
}: {
  data: FranchiseIntelBriefing;
  crisis: TeamCrisisProfile;
  openedDrilldowns?: PressureCard['id'][];
  requiredPressureId?: PressureCard['id'] | null;
  briefDiagnosis?: SetupColdOpenModel | null;
  supportCopy?: {
    headline: string;
    topPressureUrgency: string;
    boardWarning: string;
    fastLaneDiagnosis: string;
  } | null;
  onToggleDrilldown?: (pressureId: PressureCard['id']) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {briefDiagnosis ? (
        <PixelPanel title="Brief Diagnosis" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>Brief Diagnosis</div>
            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{briefDiagnosis.ownerExpectation}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{briefDiagnosis.mediaNarrative}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{briefDiagnosis.lastSeasonScar}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-gold)', lineHeight: 1.6 }}>{briefDiagnosis.crisisHeadline}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-red)', lineHeight: 1.6 }}>{briefDiagnosis.weekOneThreat}</div>
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {supportCopy ? (
        <PixelPanel title="Command Read" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{supportCopy.headline}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-cyan)', lineHeight: 1.6 }}>{supportCopy.topPressureUrgency}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{supportCopy.boardWarning}</div>
          </div>
        </PixelPanel>
      ) : null}

      <div style={autoGrid(180)}>
        <PixelMetricCard label="Dynasty Window" value={data.windowPhase} accent="gold" detail={`Score: ${data.windowScore}`} />
        <PixelMetricCard label="Cap Grade" value={data.capGrade} accent={data.capGrade <= 'B' ? 'cyan' : 'gold'} detail={`$${data.capSpace}M space`} />
        <PixelMetricCard label="Roster OVR" value={data.rosterOverall} accent="green" detail="Avg starter overall" />
        <PixelMetricCard label="League Rank" value={`#${data.leagueRank}`} accent="cyan" detail="Overall power ranking" />
      </div>

      <PixelPanel title="Three-Pressure Board" accent="gold">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {crisis.pressureCards.map((card) => (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => onToggleDrilldown?.(card.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onToggleDrilldown?.(card.id);
                }
              }}
              style={{
                border: `2px solid var(--mfd-border)`,
                background: 'var(--mfd-bg-3)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: onToggleDrilldown ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ ...pixelSm, color: 'var(--mfd-text)' }}>{card.label}</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {requiredPressureId === card.id ? <PixelBadge variant="gold">REQUIRED</PixelBadge> : null}
                  <PixelBadge variant={PRESSURE_ACCENT[card.severity]}>{card.signal}</PixelBadge>
                </div>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{card.diagnosis}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                {card.drilldown.bestLever}
              </div>
              {openedDrilldowns.includes(card.id) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{card.drilldown.whyItMatters}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-red)' }}>{card.drilldown.riskSource}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-cyan)' }}>{card.drilldown.bestLever}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{card.drilldown.seasonOneConsequence}</div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </PixelPanel>

      <div style={autoGrid(260)}>
        <PixelPanel title="Strengths" accent="green">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {data.strengths.map((s) => <PixelBadge key={s} variant="green">{s}</PixelBadge>)}
            {data.strengths.length === 0 && <span style={{ ...monoSm, color: '#666' }}>No standout groups</span>}
          </div>
        </PixelPanel>
        <PixelPanel title="Critical Needs" accent="red">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {data.criticalNeeds.map((n) => <PixelBadge key={n} variant="red">{n}</PixelBadge>)}
            {data.criticalNeeds.length === 0 && <span style={{ ...monoSm, color: '#666' }}>No critical weaknesses</span>}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Scouting Report" accent="gold">
        <div style={{ ...monoSm, color: '#ccc', lineHeight: 1.7 }}>{crisis.headline}</div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6, marginTop: '8px' }}>{data.overallAssessment}</div>
        {supportCopy?.fastLaneDiagnosis ? (
          <div style={{ ...monoSm, color: 'var(--mfd-cyan)', lineHeight: 1.6, marginTop: '8px' }}>{supportCopy.fastLaneDiagnosis}</div>
        ) : null}
      </PixelPanel>
    </div>
  );
}
