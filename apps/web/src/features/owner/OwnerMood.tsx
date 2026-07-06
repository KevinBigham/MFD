import { useMemo } from 'react';
import {
  PixelPanel, PixelBadge, PixelProgressBar,
} from '@mfd/design-system/components';
import {
  useGameStore, selectUserTeam, selectOwnerState, selectLatestSummary, selectOwners, selectOwnerMandates,
} from '../../app/store/game-store';
import { getSelectedAGM } from '@mfd/engine';
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

const MANDATE_ACCENT: Record<string, 'green' | 'gold' | 'red' | 'cyan'> = {
  complete: 'green',
  on_track: 'cyan',
  at_risk: 'gold',
  failed: 'red',
};

function ownerPromiseTierLabel(slot: string): string {
  if (slot === 'floor') return 'Minimum promise';
  if (slot === 'target') return 'Main promise';
  if (slot === 'ceiling') return 'Stretch promise';
  return 'Owner promise';
}

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
  const mandates = useGameStore(selectOwnerMandates);
  const frontOffice = useGameStore((state) => state.game?.frontOffice ?? null);
  const owner = team && owners ? owners[team.ownerId] : null;

  const approval = ownerState?.approval ?? 60;
  const patience = owner?.patience ?? 60;
  const stage = getStage(approval);
  const confidenceScore = Math.round(patience * 0.65 + approval * 0.35);
  const hotSeat = approval < 30;
  const cfg = STAGE_CONFIG[stage];

  const ownerName = owner?.name ?? 'Unknown Owner';
  const archetype = ownerState?.label ?? 'Unknown';
  const agm = frontOffice?.agmProfileId ? getSelectedAGM(frontOffice.agmProfileId) : null;
  const agmImpacts = (frontOffice?.agmImpactLog ?? []).slice(-3).reverse();

  const approvalHistory = useMemo(() => {
    if (!ownerState?.history?.length) return [approval];
    return ownerState.history.slice(-6).map((h) => h.approval);
  }, [ownerState, approval]);

  const goals = useMemo(() => [...mandates].sort((a, b) => a.selectedIndex - b.selectedIndex), [mandates]);

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

      {agm ? (
        <PixelPanel title="Assistant GM Impact" accent={agm.cardAccent === 'red' ? 'red' : agm.cardAccent === 'green' ? 'green' : agm.cardAccent === 'cyan' ? 'cyan' : 'gold'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
                  {agm.name.toUpperCase()}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px' }}>
                  {agm.title} // {agm.expertise.replace('_', ' ')}
                </div>
              </div>
              <PixelBadge variant={agm.cardAccent === 'red' ? 'red' : agm.cardAccent === 'green' ? 'green' : agm.cardAccent === 'cyan' ? 'cyan' : 'gold'}>
                Durable AGM
              </PixelBadge>
            </div>
            {agmImpacts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {agmImpacts.map((impact) => (
                  <div key={impact.id} style={{ ...monoSm, color: '#bbb', lineHeight: 1.5 }}>
                    W{impact.week}: {impact.summary}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </PixelPanel>
      ) : null}

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
          detail="Approval plus patience"
        />
        <PixelMetricCard
          label="Stage"
          value={stage}
          accent={cfg.accent}
          detail={`${cfg.label} mode active`}
        />
      </div>

      <PixelPanel title="Owner Pressure Sources" accent="cyan">
        <div style={autoGrid(260)}>
          {[
            {
              label: 'Saved mandates',
              body: 'Owner Goals read saved ownerMandates installed by setup; evaluation owns approval, patience, front-office reputation, and AGM impact deltas.',
              border: 'var(--mfd-gold)',
            },
            {
              label: 'Handshake mirrors',
              body: 'owner_mandate mirrors follow mandate met/exceeded/missed status and skip normal handshake deltas so consequences are not double-applied.',
              border: 'var(--mfd-cyan)',
            },
            {
              label: 'Weekly receipts',
              body: 'Latest Reaction reads saved weekSummaries, while Inbox and season reports render downstream owner-pressure receipts after evaluation.',
              border: 'var(--mfd-green)',
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '10px',
                border: `3px solid ${item.border}`,
                background: 'rgba(0, 0, 0, 0.18)',
              }}
            >
              <div style={{ ...pixelSm, color: item.border }}>{item.label}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                {item.body}
              </div>
            </div>
          ))}
        </div>
      </PixelPanel>

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
          {goals.length === 0 ? (
            <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
              No active owner mandates yet. Setup season goals will lock in here with progress and consequences.
            </div>
          ) : goals.map((goal) => (
            <div key={goal.id} style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: '12px',
              alignItems: 'start',
              paddingBottom: '8px',
              borderBottom: '1px solid #1a1a1a',
            }}>
              <div>
                <div style={{ ...display, fontSize: '18px', color: '#fff', lineHeight: 1 }}>
                  {goal.label.toUpperCase()}
                </div>
                <div style={{ ...monoSm, color: '#888', marginTop: '4px' }}>
                  {ownerPromiseTierLabel(goal.slot).toUpperCase()} // {goal.progress.label}
                </div>
                <PixelProgressBar
                  value={goal.progress.percent}
                  accent={MANDATE_ACCENT[goal.progress.status] ?? 'gold'}
                  label={goal.progress.detail}
                  valueLabel={`${goal.progress.percent}%`}
                />
                {goal.progress.agmNote ? (
                  <div style={{ ...monoSm, color: 'var(--mfd-cyan)', marginTop: '6px', lineHeight: 1.4 }}>
                    {goal.progress.agmNote}
                  </div>
                ) : null}
                {goal.evaluation ? (
                  <div style={{ ...monoSm, color: goal.evaluation.met ? 'var(--mfd-green)' : 'var(--mfd-red)', marginTop: '6px', lineHeight: 1.4 }}>
                    {goal.evaluation.summary} Owner approval {goal.evaluation.approvalDelta >= 0 ? '+' : ''}{goal.evaluation.approvalDelta}.
                  </div>
                ) : null}
              </div>
              <PixelBadge variant={goal.status === 'met' || goal.status === 'exceeded' ? 'green' : goal.status === 'missed' ? 'red' : MANDATE_ACCENT[goal.progress.status] ?? 'gold'}>
                {goal.status === 'active' ? goal.progress.status.replace('_', ' ') : goal.status}
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
