import { useMemo } from 'react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import {
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import { PixelMetricCard, autoGrid, mono, monoSm, pixelSm, screenStackStyle } from './pixelUi';

// ── Types ─────────────────────────────────────────────────

interface SessionInfo {
  phase: string;
  week: number;
  year: number;
  record: string;
  divisionRank: string;
  capSpace: string;
  keyStoryline: string;
}

// ── Helpers ───────────────────────────────────────────────

function formatPhase(phase: string): string {
  return phase.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDivisionRank(wins: number, losses: number, ties: number): string {
  const winPct = (wins + losses + ties) > 0 ? wins / (wins + losses + ties) : 0;
  if (winPct >= 0.75) return '1st in Division';
  if (winPct >= 0.55) return 'Playoff Contender';
  if (winPct >= 0.4) return 'In the Hunt';
  return 'Rebuilding';
}

function getKeyStoryline(
  wins: number,
  losses: number,
  phase: string,
  capSpace: number,
): string {
  if (phase === 'playoffs') return 'Chasing a championship.';
  if (phase === 'offseason' || phase === 'free_agency') return 'Building for next season.';
  if (phase === 'draft') return 'Selecting the next generation.';
  if (phase === 'training_camp') return 'Camp battles are heating up.';
  if (wins >= 10) return 'Dominant season — playoff push underway.';
  if (losses >= 10) return 'Tough season — draft position matters now.';
  if (capSpace < 5) return 'Cap is tight — tough decisions ahead.';
  return 'Season in progress — every week matters.';
}

// ── Component ─────────────────────────────────────────────

export function SessionSummary() {
  const game = useGameStore((s) => s.game);
  const team = useGameStore(selectUserTeam);

  const info = useMemo<SessionInfo | null>(() => {
    if (!game || !team) return null;
    const wins = team.wins ?? 0;
    const losses = team.losses ?? 0;
    const ties = team.ties ?? 0;
    const capSpace = team.capSpace ?? 0;

    return {
      phase: formatPhase(game.phase),
      week: game.week,
      year: game.year,
      record: `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`,
      divisionRank: getDivisionRank(wins, losses, ties),
      capSpace: `$${capSpace.toFixed(1)}M`,
      keyStoryline: getKeyStoryline(wins, losses, game.phase, capSpace),
    };
  }, [game, team]);

  if (!info) return null;

  return (
    <PixelPanel title="Where You Left Off">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={autoGrid(160)}>
          <PixelMetricCard label="Season" value={info.year} accent="cyan" />
          <PixelMetricCard label="Week" value={info.week} accent="default" />
          <PixelMetricCard label="Record" value={info.record} accent="gold" />
          <PixelMetricCard label="Cap Space" value={info.capSpace} accent="green" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...monoSm }}>
          <PixelBadge variant="cyan">{info.phase}</PixelBadge>
          <span style={{ color: 'var(--mfd-text-dim)' }}>{info.divisionRank}</span>
        </div>

        <div style={{ ...mono, color: 'var(--mfd-text-secondary)', fontStyle: 'italic' }}>
          {info.keyStoryline}
        </div>
      </div>
    </PixelPanel>
  );
}
