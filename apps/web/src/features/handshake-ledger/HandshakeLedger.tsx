import { useMemo, useState } from 'react';
import type { Handshake } from '@mfd/engine';
import {
  PixelBadge, PixelButton, PixelPanel,
} from '@mfd/design-system/components';
import {
  selectHandshakes,
  selectRoster,
  selectUserTeam,
  selectWeek,
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

export function HandshakeLedger() {
  const team = useGameStore(selectUserTeam);
  const week = useGameStore(selectWeek);
  const roster = useGameStore(selectRoster);
  const handshakes = useGameStore(selectHandshakes);
  const { makePromise } = useGameStore((s) => s.actions);
  const [pending, setPending] = useState<string | null>(null);

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

  const handlePromise = async (playerId: string, promiseType: 'starter' | 'no_trade' | 'restructure') => {
    if (!team) return;
    const key = `${playerId}-${promiseType}`;
    setPending(key);
    try {
      await makePromise(team.id, playerId, promiseType);
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
                    <PixelButton accent="gold" disabled={pending === `${player.id}-starter`} onClick={() => void handlePromise(player.id, 'starter')}>
                      Promise Starter
                    </PixelButton>
                    <PixelButton accent="cyan" disabled={pending === `${player.id}-no_trade`} onClick={() => void handlePromise(player.id, 'no_trade')}>
                      Promise No Trade
                    </PixelButton>
                    <PixelButton accent="green" disabled={pending === `${player.id}-restructure`} onClick={() => void handlePromise(player.id, 'restructure')}>
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
