import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { FranchiseIntelBriefing, TeamCrisisProfile, PressureCard, SetupColdOpen as SetupColdOpenModel } from '@mfd/engine';
import { monoSm, pixelSm } from '../../shared/pixelUi';

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
  const primaryPressure = crisis.pressureCards.find((card) => card.id === requiredPressureId)
    ?? [...crisis.pressureCards].sort((a, b) => b.score - a.score)[0]
    ?? null;
  const secondaryPressures = primaryPressure
    ? crisis.pressureCards.filter((card) => card.id !== primaryPressure.id)
    : crisis.pressureCards;
  const primaryOpened = primaryPressure ? openedDrilldowns.includes(primaryPressure.id) : false;
  const primaryAccent = primaryPressure ? PRESSURE_ACCENT[primaryPressure.severity] : 'gold';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))' }}>
        <PixelPanel title="Brief Diagnosis" accent="cyan">
          <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>{supportCopy?.headline ?? crisis.headline}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                {supportCopy?.topPressureUrgency ?? briefDiagnosis?.weekOneThreat ?? crisis.weekOneThreat}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                {supportCopy?.boardWarning ?? data.overallAssessment}
              </div>
            </div>
            <div style={{ display: 'grid', gap: '8px', alignContent: 'start' }}>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                {briefDiagnosis?.ownerExpectation ?? crisis.ownerPressure}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                {briefDiagnosis?.mediaNarrative ?? crisis.mediaPressure}
              </div>
              {briefDiagnosis?.openerLabel ? (
                <div style={{ ...pixelSm, color: 'var(--mfd-gold)', lineHeight: 1.5 }}>{briefDiagnosis.openerLabel}</div>
              ) : null}
            </div>
          </div>
        </PixelPanel>

        {primaryPressure ? (
          <PixelPanel title="Open This First" accent={primaryAccent}>
            <button
              type="button"
              data-spotlight-target={primaryOpened ? undefined : 'wizard.intel-briefing.confirm'}
              disabled={!onToggleDrilldown}
              onClick={() => onToggleDrilldown?.(primaryPressure.id)}
              style={{
                appearance: 'none',
                width: '100%',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-3)',
                color: 'inherit',
                font: 'inherit',
                padding: '8px',
                display: 'grid',
                gap: '7px',
                textAlign: 'left',
                cursor: onToggleDrilldown ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ ...pixelSm, color: 'var(--mfd-text)' }}>{primaryPressure.label}</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {requiredPressureId === primaryPressure.id ? <PixelBadge variant="gold">REQUIRED</PixelBadge> : null}
                  <PixelBadge variant={PRESSURE_ACCENT[primaryPressure.severity]}>{primaryPressure.signal}</PixelBadge>
                </div>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{primaryPressure.diagnosis}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-cyan)', lineHeight: 1.5 }}>{primaryPressure.drilldown.bestLever}</div>
              {primaryOpened ? (
                <div style={{ display: 'grid', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--mfd-border)' }}>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{primaryPressure.drilldown.whyItMatters}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-red)' }}>{primaryPressure.drilldown.riskSource}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{primaryPressure.drilldown.seasonOneConsequence}</div>
                </div>
              ) : (
                <div style={{ ...monoSm, color: 'var(--mfd-gold)', lineHeight: 1.5 }}>
                  Open this pressure card to unlock Next.
                </div>
              )}
            </button>
          </PixelPanel>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
        <PixelPanel title="Franchise Snapshot" accent="gold">
          <div style={{ display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
            <SnapshotRow label="Window" value={data.windowPhase} detail={`Score ${data.windowScore}`} />
            <SnapshotRow label="Cap" value={data.capGrade} detail={`$${data.capSpace}M space`} />
            <SnapshotRow label="Roster" value={`${data.rosterOverall}`} detail={`League #${data.leagueRank}`} />
            <SnapshotRow label="Strengths" value={data.strengths.length ? data.strengths.join(', ') : 'None clear'} />
            <SnapshotRow label="Needs" value={data.criticalNeeds.length ? data.criticalNeeds.join(', ') : 'No critical needs'} />
          </div>
        </PixelPanel>

        <PixelPanel title="Secondary Signals" accent="cyan">
          <div style={{ display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {secondaryPressures.map((card) => (
              <button
                key={card.id}
                type="button"
                disabled={!onToggleDrilldown}
                onClick={() => onToggleDrilldown?.(card.id)}
                style={{
                  appearance: 'none',
                  width: '100%',
                  border: '1px solid var(--mfd-border)',
                  background: 'var(--mfd-bg-3)',
                  color: 'inherit',
                  font: 'inherit',
                  padding: '8px',
                  display: 'grid',
                  gap: '6px',
                  textAlign: 'left',
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
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.4 }}>
                  {card.drilldown.bestLever}
                </div>
                {openedDrilldowns.includes(card.id) ? (
                  <div style={{ display: 'grid', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--mfd-border)' }}>
                    <div style={{ ...monoSm, color: 'var(--mfd-red)' }}>{card.drilldown.riskSource}</div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{card.drilldown.seasonOneConsequence}</div>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '4px',
        alignContent: 'start',
        border: '1px solid var(--mfd-border)',
        background: 'var(--mfd-bg-3)',
        padding: '6px',
        minHeight: '48px',
      }}
    >
      <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>{label}</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
        <span style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.4 }}>{value}</span>
        {detail ? <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.4 }}>{detail}</span> : null}
      </div>
    </div>
  );
}
