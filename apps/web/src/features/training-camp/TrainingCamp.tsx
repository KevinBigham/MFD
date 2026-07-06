import { useMemo } from 'react';
import { PixelBadge, PixelPanel, PixelTable } from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import { Activity } from 'lucide-react';
import {
  buildTeamOpsImpactReceipt,
  type TeamOpsImpactReceipt,
  type TeamOpsImpactTone,
} from '@mfd/engine';
import {
  selectUserTeamId,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelScreenHeader,
  PixelMetricCard,
  autoGrid,
  mono,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';
import {
  buildTrainingCampReadinessForecast,
  type TrainingCampReadinessForecast,
} from './trainingCampReadiness';

// ── Types ─────────────────────────────────────────────────

interface StandoutRow {
  playerName: string;
  pos: string;
  ovrBefore: number;
  ovrAfter: number;
  reason: string;
}

interface BattleRow {
  pos: string;
  winnerName: string;
  winnerOvr: number;
  loserName: string;
  loserOvr: number;
}

interface InjuryRow {
  playerName: string;
  pos: string;
  weeksOut: number;
}

// ── Columns ───────────────────────────────────────────────

const standoutColumns: ColumnDef<StandoutRow>[] = [
  { accessorKey: 'playerName', header: 'Player' },
  { accessorKey: 'pos', header: 'Pos' },
  { accessorKey: 'ovrBefore', header: 'OVR (Before)' },
  { accessorKey: 'ovrAfter', header: 'OVR (After)' },
  {
    accessorKey: 'reason',
    header: 'Type',
    cell: ({ getValue }) => {
      const val = getValue() as string;
      const label = val === 'rookie_standout' ? 'Rookie Standout'
        : val === 'breakout' ? 'Surprise Breakout'
        : 'Battle Winner';
      const variant = val === 'rookie_standout' ? 'gold'
        : val === 'breakout' ? 'green'
        : 'cyan';
      return <PixelBadge variant={variant}>{label}</PixelBadge>;
    },
  },
];

const battleColumns: ColumnDef<BattleRow>[] = [
  { accessorKey: 'pos', header: 'Position' },
  { accessorKey: 'winnerName', header: 'Winner' },
  { accessorKey: 'winnerOvr', header: 'OVR' },
  { accessorKey: 'loserName', header: 'Runner-Up' },
  { accessorKey: 'loserOvr', header: 'OVR' },
];

const injuryColumns: ColumnDef<InjuryRow>[] = [
  { accessorKey: 'playerName', header: 'Player' },
  { accessorKey: 'pos', header: 'Pos' },
  { accessorKey: 'weeksOut', header: 'Weeks Out' },
];

function toneAccent(tone: TeamOpsImpactTone): 'default' | 'gold' | 'cyan' | 'green' | 'red' {
  if (tone === 'positive') return 'green';
  if (tone === 'warning') return 'gold';
  if (tone === 'negative') return 'red';
  return 'cyan';
}

function OpsCarryover({ receipt }: { receipt: TeamOpsImpactReceipt | null }) {
  if (!receipt) return null;

  return (
    <div data-spotlight-target="chip.route.training-camp.beat-2">
      <PixelPanel title="Ops Carryover" accent="green">
        <div style={autoGrid(190)}>
          {receipt.summaryItems.map((item) => (
            <PixelMetricCard
              key={item.id}
              label={item.label}
              value={item.value}
              accent={toneAccent(item.tone)}
              detail={item.detail}
            />
          ))}
        </div>
        {receipt.mentors.topEffects.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {receipt.mentors.topEffects.slice(0, 3).map((effect) => (
              <div
                key={effect.targetPlayerId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '8px 10px',
                  border: '2px solid var(--mfd-border)',
                  background: 'var(--mfd-bg-2)',
                }}
              >
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{effect.description}</span>
                <PixelBadge variant="green">+{(effect.devBonus * 100).toFixed(0)}% DEV</PixelBadge>
              </div>
            ))}
          </div>
        ) : null}
      </PixelPanel>
    </div>
  );
}

function CampReadiness({ forecast }: { forecast: TrainingCampReadinessForecast }) {
  return (
    <div data-spotlight-target="chip.route.training-camp.beat-1">
      <PixelPanel title="Camp Readiness" accent={forecast.accent}>
        <div style={autoGrid(200)}>
          <PixelMetricCard
            label="Status"
            value={forecast.label}
            accent={forecast.accent}
            detail={forecast.timing}
          />
          <PixelMetricCard
            label="Saved By"
            value={forecast.commitPath}
            accent="cyan"
            detail={forecast.source}
          />
          <PixelMetricCard
            label="Saved Receipt"
            value={forecast.savedReceipt}
            accent={forecast.status === 'camp_recorded' ? 'green' : 'default'}
            detail="Read from saved camp results"
          />
          <PixelMetricCard
            label="Ops Carryover"
            value={forecast.carryover}
            accent="green"
            detail="Facility, medical, mentor, and camp receipt inputs"
          />
        </div>
      </PixelPanel>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────

export function TrainingCamp() {
  const teamId = useGameStore(selectUserTeamId);
  const game = useGameStore((s) => s.game);
  const campResults = useGameStore((s) => s.game?.trainingCampResults);

  const myResults = useMemo(() => {
    if (!campResults || !teamId) return null;
    return campResults.find((r) => r.teamId === teamId) ?? null;
  }, [campResults, teamId]);

  const opsReceipt = useMemo(() => (
    game && teamId ? buildTeamOpsImpactReceipt(game, teamId) : null
  ), [game, teamId]);
  const readinessForecast = useMemo(
    () => buildTrainingCampReadinessForecast(game, teamId, opsReceipt),
    [game, teamId, opsReceipt],
  );

  if (!myResults) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="TRAINING CAMP" subtitle="No camp results available yet" kicker="MFD NETWORK" />
        <CampReadiness forecast={readinessForecast} />
        <PixelPanel title="Camp Not Started">
          <p style={mono}>Training camp results will appear here after the post-draft phase.</p>
        </PixelPanel>
        <OpsCarryover receipt={opsReceipt} />
      </div>
    );
  }

  const standoutRows: StandoutRow[] = myResults.standouts.map((s) => ({
    playerName: s.playerName,
    pos: s.pos,
    ovrBefore: s.ovrBefore,
    ovrAfter: s.ovrAfter,
    reason: s.reason,
  }));

  const battleRows: BattleRow[] = myResults.battles.map((b) => ({
    pos: b.pos,
    winnerName: b.winnerName,
    winnerOvr: b.winnerOvr,
    loserName: b.loserName,
    loserOvr: b.loserOvr,
  }));

  const injuryRows: InjuryRow[] = myResults.injuries.map((i) => ({
    playerName: i.playerName,
    pos: i.pos,
    weeksOut: i.weeksOut,
  }));

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="TRAINING CAMP"
        subtitle="Rookie evaluations, position battles, and camp surprises"
        kicker="MFD NETWORK"
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="Camp Standouts"
          value={myResults.standouts.length}
          accent="gold"
        />
        <PixelMetricCard
          label="Position Battles"
          value={myResults.battles.length}
          accent="cyan"
        />
        <PixelMetricCard
          label="Camp Injuries"
          value={myResults.injuries.length}
          accent={myResults.injuries.length > 0 ? 'red' : 'green'}
        />
      </div>

      <CampReadiness forecast={readinessForecast} />

      <OpsCarryover receipt={opsReceipt} />

      <PixelPanel title="Camp Headlines">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {myResults.headlines.map((headline, i) => (
            <div key={i} style={{ ...monoSm, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={12} style={{ color: 'var(--mfd-gold)', flexShrink: 0 }} />
              <span>{headline}</span>
            </div>
          ))}
        </div>
      </PixelPanel>

      {standoutRows.length > 0 && (
        <PixelPanel title="Camp Standouts">
          <PixelTable columns={standoutColumns} data={standoutRows} />
        </PixelPanel>
      )}

      {battleRows.length > 0 && (
        <PixelPanel title="Position Battles">
          <PixelTable columns={battleColumns} data={battleRows} />
        </PixelPanel>
      )}

      {injuryRows.length > 0 && (
        <PixelPanel title="Camp Injuries">
          <PixelTable columns={injuryColumns} data={injuryRows} />
        </PixelPanel>
      )}
    </div>
  );
}
