import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar } from '@mfd/design-system/components';
import {
  selectFATargetBoard,
  selectPhase,
  selectScenarioState,
  selectUserTeam,
  selectWatchlistTargets,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  PlayerNameLink,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { ComparePlayersModal } from '../player/ComparePlayersModal';
import { WatchListPinButton } from '../watch-list/WatchListPinButton';

function demandAccent(demand: 'high' | 'medium' | 'low'): 'red' | 'gold' | 'green' {
  return demand === 'high' ? 'red' : demand === 'medium' ? 'gold' : 'green';
}

type FATargetBoardTarget = ReturnType<typeof selectFATargetBoard>['targets'][number];
type FATargetMarketReceiptAccent = 'green' | 'gold' | 'red' | 'cyan';

export interface FATargetMarketReceipt {
  label: string;
  detail: string;
  accent: FATargetMarketReceiptAccent;
}

function playerLabel(target: FATargetBoardTarget): string {
  return target.player.name || [target.player.firstName, target.player.lastName].filter(Boolean).join(' ').trim() || target.player.id;
}

function salaryLabel(value: number): string {
  return `$${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}M`;
}

export function buildFATargetMarketReceipt(target: FATargetBoardTarget): FATargetMarketReceipt {
  const playerName = playerLabel(target);
  const teamCount = target.competingTeams.length;
  const competition = `${teamCount} competing team${teamCount === 1 ? '' : 's'}`;
  const baseline = `${playerName} // ${target.player.pos} // ${target.fitScore} fit, ${target.signProbability}% sign probability, ${salaryLabel(target.projectedSalary)} projected.`;

  if (target.marketDemand === 'high') {
    return {
      label: 'Hot market',
      detail: `${baseline} High league demand and ${competition} mean this target may require an early bid or a watchlist decision.`,
      accent: 'red',
    };
  }

  if (target.fitScore >= 85 && target.signProbability >= 60) {
    return {
      label: 'Fit window',
      detail: `${baseline} Strong fit plus workable signing odds make this a credible user-team target before the board refreshes.`,
      accent: 'green',
    };
  }

  if (target.signProbability < 40) {
    return {
      label: 'Long shot',
      detail: `${baseline} Low signing odds and ${competition} make this planning intel, not a recommended spend by itself.`,
      accent: 'gold',
    };
  }

  return {
    label: 'Market watch',
    detail: `${baseline} ${target.marketDemand} demand and ${competition} keep this as a watchlist read until the Free Agency Hub bid path commits.`,
    accent: 'cyan',
  };
}

function sectionTargets(
  title: string,
  accent: 'gold' | 'cyan' | 'green',
  targets: ReturnType<typeof selectFATargetBoard>['targets'],
  watchlist: Set<string>,
  pendingId: string | null,
  onToggle: (playerId: string) => Promise<void>,
  onCompare: (playerId: string) => void,
) {
  return (
    <PixelPanel title={title} accent={accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {targets.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No targets available.</div>
        ) : targets.map((target) => {
          const receipt = buildFATargetMarketReceipt(target);

          return (
            <div key={`${title}-${target.player.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '3px solid var(--mfd-border)', background: 'var(--mfd-bg-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <PlayerNameLink playerId={target.player.id} name={target.player.name} ovr={target.player.ovr} style={{ ...monoSm, fontSize: '14px' }} />
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    {target.player.pos} // {target.player.ovr} OVR // age {target.player.age} // ${target.projectedSalary}M projected
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={demandAccent(target.marketDemand)}>{target.marketDemand} demand</PixelBadge>
                  <PixelBadge variant="cyan">{target.competingTeams.length} teams</PixelBadge>
                </div>
              </div>
              <PixelProgressBar value={target.fitScore} accent="green" label="Fit Score" valueLabel={`${target.fitScore}`} />
              <PixelProgressBar value={target.signProbability} accent={target.signProbability >= 65 ? 'green' : target.signProbability >= 40 ? 'gold' : 'red'} label="Sign Probability" valueLabel={`${target.signProbability}%`} />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                border: '1px solid var(--mfd-border)',
                background: 'var(--mfd-bg-elevated)',
              }}
              >
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={receipt.accent}>FA Market Receipt</PixelBadge>
                  <PixelBadge variant="default">{receipt.label}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{receipt.detail}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>
                  {title === 'Best Fits'
                    ? 'fills a weak room and matches scheme'
                    : title === 'Bargains'
                      ? 'starter value below market heat'
                      : 'best player on the open market'}
                </div>
                <PixelButton
                  accent={watchlist.has(target.player.id) ? 'gold' : 'cyan'}
                  disabled={pendingId === target.player.id}
                  onClick={() => { void onToggle(target.player.id); }}
                >
                  {watchlist.has(target.player.id) ? 'Unwatch' : 'Watch'}
                </PixelButton>
                <PixelButton accent="cyan" onClick={() => onCompare(target.player.id)}>
                  <Users size={14} aria-hidden="true" /> Compare
                </PixelButton>
                <WatchListPinButton playerId={target.player.id} />
              </div>
            </div>
          );
        })}
      </div>
    </PixelPanel>
  );
}

function FATargetScenarioLockPanel({ scenarioName }: { scenarioName: string }) {
  return (
    <PixelPanel title="Scenario Lock" accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="red">ACQUISITIONS BLOCKED</PixelBadge>
          <PixelBadge variant="gold">{scenarioName}</PixelBadge>
          <PixelBadge variant="green">BOARD OPEN</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          Source: saved scenarioState.activeScenario.constraints.blockFreeAgency. The active
          scenario blocks open-market bids, street signings, waiver claims, and practice-squad
          additions before acquisition commits.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          FA target rows remain planning guidance. Refresh Board rewrites only the saved target
          snapshot, and Watch or Unwatch updates only the faTargetBoard watchlist; neither action
          signs a player.
        </div>
      </div>
    </PixelPanel>
  );
}

export function FATargetBoard() {
  const phase = useGameStore(selectPhase);
  const team = useGameStore(selectUserTeam);
  const scenarioState = useGameStore(selectScenarioState);
  const board = useGameStore(selectFATargetBoard);
  const watchlistTargets = useGameStore(selectWatchlistTargets);
  const { refreshFATargetBoard, toggleFATargetWatchlist } = useGameStore((state) => state.actions);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [comparePlayerId, setComparePlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (board.targets.length === 0) {
      void refreshFATargetBoard();
    }
  }, [board.targets.length, refreshFATargetBoard]);

  const watchlist = new Set(board.watchlist);

  const handleToggle = async (playerId: string) => {
    setPendingId(playerId);
    try {
      await toggleFATargetWatchlist(playerId);
    } finally {
      setPendingId(null);
    }
  };
  const freeAgencyLockedByScenario = Boolean(scenarioState?.activeScenario?.constraints.blockFreeAgency);
  const activeScenarioName = scenarioState?.activeScenario?.name ?? 'Active scenario';

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="FA Target Board"
        subtitle={`${team ? `${team.city} ${team.name}` : 'User Team'} // ${phase.replaceAll('_', ' ')} market planning`}
        badges={(
          <>
            <PixelBadge variant="gold">{board.watchlist.length} watched</PixelBadge>
            <PixelBadge variant="cyan">{board.targets.length} tracked</PixelBadge>
            {freeAgencyLockedByScenario ? <PixelBadge variant="red">ACQUISITIONS LOCKED</PixelBadge> : null}
            <PixelButton accent="green" onClick={() => { void refreshFATargetBoard(); }}>Refresh Board</PixelButton>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Watchlist" value={board.watchlist.length} accent="gold" detail="Players you want live updates on" />
        <PixelMetricCard label="Top Available" value={board.topAvailable.length} accent="cyan" detail="Highest overall talent remaining" />
        <PixelMetricCard label="Best Fits" value={board.bestFits.length} accent="green" detail="Most aligned with your roster holes" />
        <PixelMetricCard label="Bargains" value={board.bargains.length} accent="gold" detail="Value targets below expected cost" />
      </div>

      <PixelPanel title="Board Source" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">Saved faTargetBoard</PixelBadge>
            <PixelBadge variant="gold">Refresh rewrites snapshot</PixelBadge>
            <PixelBadge variant="default">Watchlist only</PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Target rows are planning guidance from the saved FA target-board snapshot. An empty board requests a store
            refresh after mount, and Refresh Board rebuilds that snapshot from current free agents, team needs, scheme
            fit, cap room, and league demand. Each visible row renders an FA Market Receipt from saved target fields:
            fit score, sign probability, projected salary, market demand, and competing teams. Watch and Unwatch update
            only the target-board watchlist; bids and signings still happen in the Free Agency Hub.
          </div>
        </div>
      </PixelPanel>

      {freeAgencyLockedByScenario ? <FATargetScenarioLockPanel scenarioName={activeScenarioName} /> : null}

      {sectionTargets('Watchlist', 'gold', watchlistTargets, watchlist, pendingId, handleToggle, setComparePlayerId)}
      {sectionTargets('Top Available', 'cyan', board.topAvailable, watchlist, pendingId, handleToggle, setComparePlayerId)}
      {sectionTargets('Best Fits', 'green', board.bestFits, watchlist, pendingId, handleToggle, setComparePlayerId)}
      {sectionTargets('Bargains', 'gold', board.bargains, watchlist, pendingId, handleToggle, setComparePlayerId)}
      <ComparePlayersModal
        open={comparePlayerId !== null}
        leftPlayerId={comparePlayerId}
        onOpenChange={(open) => {
          if (!open) setComparePlayerId(null);
        }}
      />
    </div>
  );
}
