import { useMemo } from 'react';
import {
  PixelPanel, PixelBadge, PixelProgressBar,
} from '@mfd/design-system/components';
import {
  useGameStore, selectUserTeam, selectOwnerState, selectLatestSummary, selectOwners,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

type OwnerStage = 'PATIENT' | 'RESTLESS' | 'DEMANDING' | 'ULTIMATUM';

const STAGE_CONFIG: Record<OwnerStage, { accent: 'green' | 'cyan' | 'gold' | 'red'; label: string }> = {
  PATIENT: { accent: 'green', label: 'Patient' },
  RESTLESS: { accent: 'cyan', label: 'Restless' },
  DEMANDING: { accent: 'gold', label: 'Demanding' },
  ULTIMATUM: { accent: 'red', label: 'Ultimatum' },
};

function getStage(approval: number): OwnerStage {
  if (approval >= 70) return 'PATIENT';
  if (approval >= 50) return 'RESTLESS';
  if (approval >= 30) return 'DEMANDING';
  return 'ULTIMATUM';
}

export function OwnerMood() {
  const team = useGameStore(selectUserTeam);
  const ownerState = useGameStore(selectOwnerState);
  const latestSummary = useGameStore(selectLatestSummary);
  const owners = useGameStore(selectOwners);
  const owner = team && owners ? owners[team.ownerId] : null;

  const approval = ownerState?.approval ?? 60;
  const patience = owner?.patience ?? 60;
  const stage = getStage(approval);
  const confidenceScore = Math.round(patience * 0.65 + approval * 0.35);
  const hotSeat = approval < 30;
  const cfg = STAGE_CONFIG[stage];

  const ownerName = owner?.name ?? 'Unknown Owner';
  const archetype = ownerState?.label ?? 'Unknown';

  const approvalHistory = useMemo(() => {
    if (!ownerState?.history?.length) return [approval];
    return ownerState.history.slice(-6).map((h) => h.approval);
  }, [ownerState, approval]);

  const goals = useMemo(() => {
    if (!owner || !team) return [];
    const wins = team.wins;
    const losses = team.losses;
    return [
      {
        id: 'g1',
        label: 'Winning Record',
        status: wins > losses ? 'met' as const : wins === losses ? 'at_risk' as const : 'failing' as const,
        progress: `${wins}-${losses}`,
      },
      {
        id: 'g2',
        label: 'Playoff Contention',
        status: wins >= 7 ? 'met' as const : wins >= 4 ? 'at_risk' as const : 'failing' as const,
        progress: wins >= 7 ? 'On track' : 'Bubble',
      },
      {
        id: 'g3',
        label: 'Cap Health',
        status: team.capSpace > 20 ? 'met' as const : team.capSpace > 0 ? 'at_risk' as const : 'failing' as const,
        progress: `$${Math.round(team.capSpace)}M free`,
      },
    ];
  }, [owner, team]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Owner Relations"
        subtitle={`${ownerName} // ${archetype} // ${cfg.label.toUpperCase()}`}
        badges={(
          <>
            <PixelBadge variant={cfg.accent}>{stage}</PixelBadge>
            {hotSeat ? <PixelBadge variant="red">Hot Seat</PixelBadge> : null}
          </>
        )}
      />

      {hotSeat && (
        <PixelPanel title="Hot Seat Alert" accent="red">
          <div style={{ ...monoSm, color: '#fca5a5', lineHeight: 1.6 }}>
            Owner patience is running out. Another collapse will tilt the dynasty into ultimatum territory.
          </div>
        </PixelPanel>
      )}

      <div style={autoGrid(210)}>
        <PixelMetricCard
          label="Approval"
          value={approval}
          accent={approval >= 70 ? 'green' : approval >= 50 ? 'cyan' : approval >= 30 ? 'gold' : 'red'}
          detail={latestSummary?.ownerDelta ? `Delta ${latestSummary.ownerDelta >= 0 ? '+' : ''}${latestSummary.ownerDelta}` : 'Stable for now'}
        />
        <PixelMetricCard
          label="Patience"
          value={patience}
          accent={patience >= 60 ? 'green' : patience >= 40 ? 'cyan' : patience >= 25 ? 'gold' : 'red'}
          detail="Owner baseline tolerance"
        />
        <PixelMetricCard
          label="Confidence"
          value={confidenceScore}
          accent={confidenceScore >= 60 ? 'green' : confidenceScore >= 40 ? 'cyan' : confidenceScore >= 25 ? 'gold' : 'red'}
          detail="Weighted trust score"
        />
        <PixelMetricCard
          label="Stage"
          value={stage}
          accent={cfg.accent}
          detail={`${cfg.label} mode active`}
        />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Confidence Arc" accent={cfg.accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PixelProgressBar value={approval} accent={approval >= 70 ? 'green' : approval >= 50 ? 'cyan' : approval >= 30 ? 'gold' : 'red'} label="Approval" valueLabel={`${approval}`} />
            <PixelProgressBar value={patience} accent={patience >= 60 ? 'green' : patience >= 40 ? 'cyan' : patience >= 25 ? 'gold' : 'red'} label="Patience" valueLabel={`${patience}`} />
            <PixelProgressBar value={confidenceScore} accent={cfg.accent} label="Confidence" valueLabel={`${confidenceScore}`} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
            {(['PATIENT', 'RESTLESS', 'DEMANDING', 'ULTIMATUM'] as const).map((value) => (
              <div key={value} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: stage === value ? '#fff' : '#777' }}>
                  {value}
                </span>
                {stage === value ? <PixelBadge variant={STAGE_CONFIG[value].accent}>Active</PixelBadge> : null}
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Approval Trend" accent="cyan">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '96px' }}>
            {approvalHistory.map((value, index) => (
              <div key={`${value}-${index}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max(8, value)}%`,
                  background: value < 40 ? 'var(--mfd-red)' : value < 60 ? 'var(--mfd-gold)' : 'var(--mfd-green)',
                  border: '2px solid #111',
                }} />
                <span style={{ ...pixelSm, color: '#666' }}>W{index + 1}</span>
              </div>
            ))}
          </div>
          <div style={{ ...monoSm, color: '#999', marginTop: '8px' }}>
            {approvalHistory.length > 1 && approvalHistory[approvalHistory.length - 1]! < approvalHistory[0]!
              ? 'Trend: cooling'
              : 'Trend: stable or improving'}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Owner Goals" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {goals.map((goal) => (
            <div key={goal.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: 'center',
              paddingBottom: '8px',
              borderBottom: '1px solid #1a1a1a',
            }}>
              <div>
                <div style={{ ...display, fontSize: '18px', color: '#fff', lineHeight: 1 }}>
                  {goal.label.toUpperCase()}
                </div>
                <div style={{ ...monoSm, color: '#888', marginTop: '4px' }}>
                  {goal.progress}
                </div>
              </div>
              <PixelBadge variant={goal.status === 'met' ? 'green' : goal.status === 'at_risk' ? 'gold' : 'red'}>
                {goal.status === 'met' ? 'Met' : goal.status === 'at_risk' ? 'At Risk' : 'Failing'}
              </PixelBadge>
            </div>
          ))}
        </div>
      </PixelPanel>

      {latestSummary && (
        <PixelPanel title="Latest Reaction" accent={latestSummary.ownerDelta >= 0 ? 'green' : 'red'}>
          <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
            {latestSummary.headline.toUpperCase()}
          </div>
          <div style={{ marginTop: '8px' }}>
            <PixelBadge variant={latestSummary.ownerDelta >= 0 ? 'green' : 'red'}>
              Owner delta {latestSummary.ownerDelta >= 0 ? '+' : ''}{latestSummary.ownerDelta}
            </PixelBadge>
          </div>
        </PixelPanel>
      )}
    </div>
  );
}
