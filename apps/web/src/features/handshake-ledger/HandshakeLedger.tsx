import { useMemo } from 'react';
import {
  PixelBadge,
  PixelPanel,
} from '@mfd/design-system/components';
import {
  useGameStore, selectActiveStoryArcs, selectLatestGameDayPackage, selectNarrative, selectUserTeam, selectWeek,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

type PromiseStatus = 'active' | 'fulfilled' | 'broken' | 'expired';

interface HandshakePromise {
  id: string;
  to: string;
  promise: string;
  madeWeek: number;
  deadline: string;
  status: PromiseStatus;
  consequence?: string;
}

const statusVariant: Record<PromiseStatus, 'default' | 'gold' | 'green' | 'red'> = {
  active: 'gold',
  fulfilled: 'green',
  broken: 'red',
  expired: 'default',
};

export function HandshakeLedger() {
  const team = useGameStore(selectUserTeam);
  const week = useGameStore(selectWeek);
  const narrative = useGameStore(selectNarrative);
  const activeArcs = useGameStore(selectActiveStoryArcs);
  const latestPackage = useGameStore(selectLatestGameDayPackage);

  const promises = useMemo((): HandshakePromise[] => {
    if (activeArcs.length > 0) {
      return activeArcs.map((arc) => ({
        id: arc.id,
        to: arc.title,
        promise: arc.summary,
        madeWeek: arc.startedWeek,
        deadline: arc.expiresAfterWeek ? `Week ${arc.expiresAfterWeek}` : 'Open-ended',
        status: arc.expiresAfterWeek && arc.expiresAfterWeek < week ? 'broken' : 'active',
      }));
    }

    if (latestPackage) {
      return latestPackage.autopsy.nextFocus.map((focus, index) => ({
        id: `${latestPackage.id}-focus-${index}`,
        to: 'Postgame focus',
        promise: focus,
        madeWeek: latestPackage.week,
        deadline: `Week ${latestPackage.week + 1}`,
        status: latestPackage.week + 1 < week ? 'expired' : 'active',
      }));
    }

    return (narrative?.hooks ?? [])
      .filter((hook) => !hook.resolved)
      .map((hook) => ({
        id: hook.id,
        to: hook.type,
        promise: hook.description,
        madeWeek: Math.max(1, week - 2),
        deadline: `Week ${hook.deadline}`,
        status: hook.deadline < week ? 'broken' : 'active',
      }));
  }, [activeArcs, latestPackage, narrative, week]);

  const active = promises.filter((promise) => promise.status === 'active');
  const fulfilled = promises.filter((promise) => promise.status === 'fulfilled');
  const broken = promises.filter((promise) => promise.status === 'broken');

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Handshake Ledger"
        subtitle={`${team ? `${team.city} ${team.name}` : 'Franchise'} trust promises, public commitments, and narrative deadlines.`}
        badges={(
          <>
            <PixelBadge variant="gold">{active.length} active</PixelBadge>
            <PixelBadge variant={broken.length > 0 ? 'red' : 'green'}>{broken.length} broken</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Active" value={active.length} accent="gold" detail="Open promises still on the clock" />
        <PixelMetricCard label="Fulfilled" value={fulfilled.length} accent="green" detail="Trust-building commitments kept" />
        <PixelMetricCard label="Broken" value={broken.length} accent={broken.length > 0 ? 'red' : 'default'} detail="Missed or violated commitments" />
      </div>

      {broken.length > 0 ? (
        <PixelPanel title="Trust Warning" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-red)' }}>
              Broken promises stack reputation damage and raise pressure inside the building.
            </span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Clear these story threads quickly or they start defining the season narrative for you.
            </span>
          </div>
        </PixelPanel>
      ) : null}

      <PixelPanel title={`Active Promises (${active.length})`} accent="gold">
        {active.length === 0 ? (
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No open promises right now. Negotiations and story arcs will surface them automatically.
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {active.map((promise) => <PromiseCard key={promise.id} promise={promise} />)}
          </div>
        )}
      </PixelPanel>

      <div style={autoGrid(320)}>
        <PixelPanel title={`Fulfilled (${fulfilled.length})`} accent="green">
          {fulfilled.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Nothing banked yet.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {fulfilled.map((promise) => <PromiseCard key={promise.id} promise={promise} />)}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title={`Broken (${broken.length})`} accent="red">
          {broken.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Ledger is clean.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {broken.map((promise) => <PromiseCard key={promise.id} promise={promise} />)}
            </div>
          )}
        </PixelPanel>
      </div>
    </div>
  );
}

function PromiseCard({ promise }: { promise: HandshakePromise }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        border: `3px solid ${promise.status === 'broken' ? 'var(--mfd-red)' : 'var(--mfd-border)'}`,
        background: promise.status === 'broken' ? 'rgba(248, 113, 113, 0.08)' : 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{promise.to.toUpperCase()}</span>
        <PixelBadge variant={statusVariant[promise.status]}>{promise.status}</PixelBadge>
      </div>
      <span style={{ ...monoSm, color: '#fff' }}>{promise.promise}</span>
      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
        MADE: WEEK {promise.madeWeek} // DUE: {promise.deadline.toUpperCase()}
      </span>
      {promise.consequence ? (
        <span style={{ ...monoSm, color: promise.status === 'broken' ? 'var(--mfd-red)' : 'var(--mfd-gold)' }}>
          {promise.consequence}
        </span>
      ) : null}
    </div>
  );
}
