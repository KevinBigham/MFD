import { useEffect, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar } from '@mfd/design-system/components';
import {
  selectFATargetBoard,
  selectPhase,
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

function demandAccent(demand: 'high' | 'medium' | 'low'): 'red' | 'gold' | 'green' {
  return demand === 'high' ? 'red' : demand === 'medium' ? 'gold' : 'green';
}

function sectionTargets(
  title: string,
  accent: 'gold' | 'cyan' | 'green',
  targets: ReturnType<typeof selectFATargetBoard>['targets'],
  watchlist: Set<string>,
  pendingId: string | null,
  onToggle: (playerId: string) => Promise<void>,
) {
  return (
    <PixelPanel title={title} accent={accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {targets.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No targets available.</div>
        ) : targets.map((target) => (
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
            </div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

export function FATargetBoard() {
  const phase = useGameStore(selectPhase);
  const team = useGameStore(selectUserTeam);
  const board = useGameStore(selectFATargetBoard);
  const watchlistTargets = useGameStore(selectWatchlistTargets);
  const { refreshFATargetBoard, toggleFATargetWatchlist } = useGameStore((state) => state.actions);
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="FA Target Board"
        subtitle={`${team ? `${team.city} ${team.name}` : 'User Team'} // ${phase.replaceAll('_', ' ')} market planning`}
        badges={(
          <>
            <PixelBadge variant="gold">{board.watchlist.length} watched</PixelBadge>
            <PixelBadge variant="cyan">{board.targets.length} tracked</PixelBadge>
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

      {sectionTargets('Watchlist', 'gold', watchlistTargets, watchlist, pendingId, handleToggle)}
      {sectionTargets('Top Available', 'cyan', board.topAvailable, watchlist, pendingId, handleToggle)}
      {sectionTargets('Best Fits', 'green', board.bestFits, watchlist, pendingId, handleToggle)}
      {sectionTargets('Bargains', 'gold', board.bargains, watchlist, pendingId, handleToggle)}
    </div>
  );
}
