import { useMemo, useState } from 'react';
import type { Handshake, Player } from '@mfd/engine';
import {
  PixelBadge, PixelButton, PixelPanel,
} from '@mfd/design-system/components';
import {
  selectHandshakes,
  selectRoster,
  selectUserTeam,
  selectWeek,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

const statusVariant: Record<Handshake['status'], 'default' | 'gold' | 'green' | 'red'> = {
  active: 'gold',
  fulfilled: 'green',
  broken: 'red',
  expired: 'default',
};

type PlayerPromiseType = 'starter' | 'no_trade' | 'restructure';
type PromiseReceiptAccent = 'gold' | 'cyan' | 'green';

interface HandshakePromiseReceipt {
  id: string;
  playerName: string;
  promiseLabel: string;
  target: string;
  commitment: string;
  deadline: string;
  detail: string;
  source: string;
  accent: PromiseReceiptAccent;
}

function promiseLabel(promiseType: PlayerPromiseType): string {
  return {
    starter: 'Promise Starter',
    no_trade: 'Promise No Trade',
    restructure: 'Promise Restructure',
  }[promiseType];
}

function promiseAccent(promiseType: PlayerPromiseType): PromiseReceiptAccent {
  const accents: Record<PlayerPromiseType, PromiseReceiptAccent> = {
    starter: 'gold',
    no_trade: 'cyan',
    restructure: 'green',
  };
  return accents[promiseType];
}

function promiseCommitment(promiseType: PlayerPromiseType): string {
  return {
    starter: 'The saved condition watches whether the player becomes a starter.',
    no_trade: 'The saved condition watches whether the player stays on your roster.',
    restructure: 'The saved condition watches whether the player receives a restructured contract.',
  }[promiseType];
}

export function buildHandshakePromiseReceipt({
  player,
  promiseType,
  year,
  week,
  priorPromiseCount,
}: {
  player: Player;
  promiseType: PlayerPromiseType;
  year: number;
  week: number;
  priorPromiseCount: number;
}): HandshakePromiseReceipt {
  const deadlineWeek = Math.min(18, week + 4);

  return {
    id: `${player.id}-${promiseType}-${year}-${week}-${priorPromiseCount}`,
    playerName: player.name,
    promiseLabel: promiseLabel(promiseType),
    target: `${player.name} // ${player.pos} // ${player.ovr} OVR`,
    commitment: promiseCommitment(promiseType),
    deadline: `Due ${year}-W${deadlineWeek}`,
    detail: 'The promise row is appended to saved game.handshakes after actions.makePromise resolves; evaluateHandshakes owns fulfilled, broken, or expired status later.',
    source: 'Action used: actions.makePromise -> makePlayerPromise -> commitGame. This confirmation appears here only; reading it does not evaluate promises, award achievements, play games, reroll saved outcomes, or move players.',
    accent: promiseAccent(promiseType),
  };
}

export function HandshakePromiseReceiptPanel({ receipt }: { receipt: HandshakePromiseReceipt }) {
  return (
    <PixelPanel title="Promise Receipt" accent={receipt.accent}>
      <div style={autoGrid(220)}>
        <PixelMetricCard label="Promise" value={receipt.promiseLabel} accent={receipt.accent} detail={receipt.commitment} />
        <PixelMetricCard label="Target" value={receipt.playerName} accent="cyan" detail={receipt.target} />
        <PixelMetricCard label="Deadline" value={receipt.deadline} accent="gold" detail="Week/offseason evaluation owns the outcome." />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={receipt.accent}>On-screen confirmation</PixelBadge>
          <PixelBadge variant="default">Saved ledger: game.handshakes</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{receipt.detail}</div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{receipt.source}</div>
      </div>
    </PixelPanel>
  );
}

function HandshakeSourcesPanel({
  promiseCount,
  targetCount,
  week,
}: {
  promiseCount: number;
  targetCount: number;
  week: number;
}) {
  const rows = [
    {
      label: 'Saved ledger',
      body: `selectHandshakes reads ${promiseCount} saved user-team promise row${promiseCount === 1 ? '' : 's'} from game.handshakes. Owner demands, setup owner_mandate mirrors, and player promises share that ledger.`,
      border: 'var(--mfd-gold)',
    },
    {
      label: 'Target list',
      body: `selectRoster feeds ${targetCount} displayed Make Promise target${targetCount === 1 ? '' : 's'} after injured players are filtered and the list is sorted by starter flag, OVR, and id. Rendering this list does not create promises.`,
      border: 'var(--mfd-cyan)',
    },
    {
      label: 'Owner writers',
      body: 'generateOwnerDemands writes ordinary yearly owner promises, while upsertOwnerMandateHandshakes mirrors setup mandates into the same ledger. This route only displays those saved rows.',
      border: 'var(--mfd-gold)',
    },
    {
      label: 'Player commit',
      body: 'Promise Starter, Promise No Trade, and Promise Restructure commit only through actions.makePromise -> makePlayerPromise. Card rendering and status counts do not write GameState.',
      border: 'var(--mfd-green)',
    },
    {
      label: 'Evaluation path',
      body: `evaluateHandshakes runs during week/offseason progression, not during render. It updates fulfilled, broken, and expired states, then applies owner, morale, chemistry, reputation, and AGM effects. Current display week: ${week}.`,
      border: 'var(--mfd-red)',
    },
    {
      label: 'No route writes',
      body: 'Opening /handshakes, reading cards, seeing warnings, or scanning promise targets does not generate owner demands, evaluate promises, award achievements, autosave, play games, reroll saved outcomes, or move players.',
      border: 'var(--mfd-cyan)',
    },
  ];

  return (
    <PixelPanel title="Handshake Sources" accent="cyan">
      <div style={autoGrid(260)}>
        {rows.map((item) => (
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
            <div style={{ fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px', letterSpacing: 0, lineHeight: 1.35, color: item.border }}>
              {item.label}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              {item.body}
            </div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

export function HandshakeLedger() {
  const team = useGameStore(selectUserTeam);
  const year = useGameStore(selectYear);
  const week = useGameStore(selectWeek);
  const roster = useGameStore(selectRoster);
  const handshakes = useGameStore(selectHandshakes);
  const { makePromise } = useGameStore((s) => s.actions);
  const [pending, setPending] = useState<string | null>(null);
  const [promiseReceipt, setPromiseReceipt] = useState<HandshakePromiseReceipt | null>(null);

  const promises = useMemo(() => {
    if (!team) return [];
    return handshakes.filter((handshake) => handshake.teamId === team.id);
  }, [handshakes, team]);

  const active = promises.filter((promise) => promise.status === 'active');
  const fulfilled = promises.filter((promise) => promise.status === 'fulfilled');
  const broken = promises.filter((promise) => promise.status === 'broken');
  const expired = promises.filter((promise) => promise.status === 'expired');
  const promiseTargets = roster
    .filter((player) => !player.injury)
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.ovr - a.ovr || a.id.localeCompare(b.id))
    .slice(0, 5);

  const handlePromise = async (player: Player, promiseType: PlayerPromiseType) => {
    if (!team) return;
    const key = `${player.id}-${promiseType}`;
    const receipt = buildHandshakePromiseReceipt({
      player,
      promiseType,
      year,
      week,
      priorPromiseCount: promises.length,
    });
    setPending(key);
    try {
      await makePromise(team.id, player.id, promiseType);
      setPromiseReceipt(receipt);
    } finally {
      setPending(null);
    }
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Handshake Ledger"
        subtitle={`${team ? `${team.city} ${team.name}` : 'Franchise'} trust promises, owner demands, and player assurances.`}
        badges={(
          <>
            <PixelBadge variant="gold">{active.length} active</PixelBadge>
            <PixelBadge variant={broken.length > 0 ? 'red' : 'green'}>{broken.length} broken</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Active" value={active.length} accent="gold" detail={`Week ${week} pressure points`} />
        <PixelMetricCard label="Fulfilled" value={fulfilled.length} accent="green" detail="Trust-building commitments kept" />
        <PixelMetricCard label="Broken" value={broken.length} accent={broken.length > 0 ? 'red' : 'default'} detail="Missed or violated commitments" />
        <PixelMetricCard label="Expired" value={expired.length} accent="default" detail="Owner patience leaked away" />
      </div>

      <HandshakeSourcesPanel promiseCount={promises.length} targetCount={promiseTargets.length} week={week} />
      {promiseReceipt ? <HandshakePromiseReceiptPanel receipt={promiseReceipt} /> : null}

      {broken.length > 0 ? (
        <PixelPanel title="Trust Warning" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-red)' }}>
              Broken promises cut owner approval, morale, and chemistry.
            </span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              The ledger is now game state, not flavor text. Misses carry direct front-office cost.
            </span>
          </div>
        </PixelPanel>
      ) : null}

      <PixelPanel title={`Active Promises (${active.length})`} accent="gold">
        {active.length === 0 ? (
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No open promises right now. Owner demands and player assurances will populate this ledger automatically.
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {active.map((promise) => <PromiseCard key={promise.id} promise={promise} />)}
          </div>
        )}
      </PixelPanel>

      <div style={autoGrid(320)}>
        <PixelPanel title="Make Promise" accent="cyan">
          {promiseTargets.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No eligible targets right now.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {promiseTargets.map((player) => (
                <div key={player.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '3px solid var(--mfd-cyan)', background: 'rgba(34, 211, 238, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...monoSm, color: '#fff' }}>{player.name} // {player.pos}</span>
                    <PixelBadge variant={player.isStarter ? 'gold' : 'default'}>{player.isStarter ? 'starter' : 'rotation'}</PixelBadge>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelButton accent="gold" disabled={pending === `${player.id}-starter`} onClick={() => void handlePromise(player, 'starter')}>
                      Promise Starter
                    </PixelButton>
                    <PixelButton accent="cyan" disabled={pending === `${player.id}-no_trade`} onClick={() => void handlePromise(player, 'no_trade')}>
                      Promise No Trade
                    </PixelButton>
                    <PixelButton accent="green" disabled={pending === `${player.id}-restructure`} onClick={() => void handlePromise(player, 'restructure')}>
                      Promise Restructure
                    </PixelButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title={`Fulfilled (${fulfilled.length})`} accent="green">
          {fulfilled.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Nothing banked yet.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {fulfilled.map((promise) => <PromiseCard key={promise.id} promise={promise} />)}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title={`Broken / Expired (${broken.length + expired.length})`} accent="red">
          {broken.length + expired.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Ledger is clean.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...broken, ...expired].map((promise) => <PromiseCard key={promise.id} promise={promise} />)}
            </div>
          )}
        </PixelPanel>
      </div>
    </div>
  );
}

function PromiseCard({ promise }: { promise: Handshake }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        border: `3px solid ${promise.status === 'broken' ? 'var(--mfd-red)' : promise.status === 'fulfilled' ? 'var(--mfd-green)' : 'var(--mfd-border)'}`,
        background: promise.status === 'broken'
          ? 'rgba(248, 113, 113, 0.08)'
          : promise.status === 'fulfilled'
            ? 'rgba(74, 222, 128, 0.08)'
            : 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{`${promise.type} // ${promise.targetId}`.toUpperCase()}</span>
        <PixelBadge variant={statusVariant[promise.status]}>{promise.status}</PixelBadge>
      </div>
      <span style={{ ...monoSm, color: '#fff' }}>{promise.promiseText}</span>
      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
        MADE: {promise.madeYear}-W{promise.madeWeek} // DUE: {promise.deadline.year}-W{promise.deadline.week}
      </span>
      {promise.consequence ? (
        <span style={{ ...monoSm, color: promise.status === 'broken' ? 'var(--mfd-red)' : 'var(--mfd-gold)' }}>
          {promise.status === 'active' ? 'Consequence preview: ' : ''}{promise.consequence}
        </span>
      ) : null}
    </div>
  );
}
