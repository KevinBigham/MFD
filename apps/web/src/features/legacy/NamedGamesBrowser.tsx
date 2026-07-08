import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { NamedGame, NamedGameArchetype } from '@mfd/engine';
import {
  NAMED_GAME_ARCHETYPES,
  selectNamedGames,
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  navigateTo,
  screenStackStyle,
  type PixelAccent,
} from '../shared/pixelUi';

type ArchetypeFilter = 'all' | NamedGameArchetype;
type SortOrder = 'year-desc' | 'year-asc' | 'name-asc';

const ARCHETYPE_LABELS: Record<NamedGameArchetype, string> = {
  yard_miracle: 'Yard Miracle',
  dagger: 'Dagger',
  comeback: 'Comeback',
  collapse: 'Collapse',
  heartbreaker: 'Heartbreaker',
  ghost_game: 'Ghost Game',
  statement: 'Statement',
  gauntlet_game: 'Gauntlet',
  snow_bowl: 'Snow Bowl',
  shootout: 'Shootout',
  coin_flip: 'Coin Flip',
  rout: 'Rout',
};

const ARCHETYPE_ACCENTS: Record<NamedGameArchetype, PixelAccent> = {
  yard_miracle: 'gold',
  dagger: 'red',
  comeback: 'green',
  collapse: 'red',
  heartbreaker: 'red',
  ghost_game: 'cyan',
  statement: 'gold',
  gauntlet_game: 'gold',
  snow_bowl: 'cyan',
  shootout: 'gold',
  coin_flip: 'default',
  rout: 'red',
};

interface NamedGameCardProps {
  game: NamedGame;
  userTeamId: string | null;
}

function formatScore(game: NamedGame): string {
  return `${game.homeScore}-${game.awayScore}`;
}

function NamedGameCard({ game, userTeamId }: NamedGameCardProps) {
  const archetypeAccent = ARCHETYPE_ACCENTS[game.archetype];
  const userInvolved = userTeamId !== null
    && (game.homeTeamId === userTeamId || game.awayTeamId === userTeamId);
  const userWon = userInvolved && game.winnerTeamId === userTeamId;
  const userLost = userInvolved && game.winnerTeamId !== null && game.winnerTeamId !== userTeamId;
  const borderColor = userWon
    ? 'var(--mfd-gold)'
    : userLost
      ? 'var(--mfd-red)'
      : 'var(--mfd-border)';

  return (
    <div
      data-testid="named-game-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        border: `3px solid ${borderColor}`,
        background: 'var(--mfd-bg-2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ ...monoSm, color: '#fff', fontSize: '13px' }}>{game.name}</span>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            {game.year} // Week {game.week} // {formatScore(game)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <PixelBadge variant={archetypeAccent}>{ARCHETYPE_LABELS[game.archetype]}</PixelBadge>
          {userWon ? <PixelBadge variant="gold">YOUR WIN</PixelBadge> : null}
          {userLost ? <PixelBadge variant="red">YOUR LOSS</PixelBadge> : null}
        </div>
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
        {game.reason}
      </div>
    </div>
  );
}

interface NamedGamesBrowserViewProps {
  games: readonly NamedGame[];
  userTeamId: string | null;
}

function NamedGamesSourcesPanel({ gameCount, visibleArchetypeCount }: { gameCount: number; visibleArchetypeCount: number }) {
  return (
    <PixelPanel title="Named Game Sources" accent="cyan">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
        {[
          {
            id: 'timeline',
            label: 'Saved timeline',
            status: `${gameCount} filed`,
            detail: 'Source: selectNamedGames reads selectDynastyTimeline and keeps only saved event.type === named_game rows with a namedGame payload.',
            accent: 'cyan' as const,
          },
          {
            id: 'filters',
            label: 'Filter state',
            status: 'route-local',
            detail: 'Archetype filter and sort order live in this route. Changing them does not write dynastyTimeline or repair saved games.',
            accent: 'gold' as const,
          },
          {
            id: 'archetypes',
            label: 'Archetype labels',
            status: `${visibleArchetypeCount}/12 active`,
            detail: 'NAMED_GAME_ARCHETYPES owns the valid set; the route humanizes labels and only shows filters for archetypes present in saved rows.',
            accent: visibleArchetypeCount > 0 ? 'green' as const : 'default' as const,
          },
          {
            id: 'writer',
            label: 'Writer path',
            status: 'week advance',
            detail: 'Named games are detected upstream from completed results in franchise-week; this route does not inspect raw game results or re-run detectNamedGame.',
            accent: 'gold' as const,
          },
        ].map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minHeight: '112px',
              padding: '10px',
              border: '1px solid #1f1f1f',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...monoSm, color: '#fff' }}>{row.label}</span>
              <PixelBadge variant={row.accent}>{row.status}</PixelBadge>
            </div>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

export function NamedGamesBrowserView({ games, userTeamId }: NamedGamesBrowserViewProps) {
  const [archetypeFilter, setArchetypeFilter] = useState<ArchetypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('year-desc');

  const archetypeCounts = useMemo(() => {
    const counts = new Map<NamedGameArchetype, number>();
    for (const game of games) {
      counts.set(game.archetype, (counts.get(game.archetype) ?? 0) + 1);
    }
    return counts;
  }, [games]);

  const visibleArchetypes = useMemo(
    () => NAMED_GAME_ARCHETYPES.filter((archetype) => archetypeCounts.has(archetype)),
    [archetypeCounts],
  );

  const filteredGames = useMemo(() => {
    const filtered = archetypeFilter === 'all'
      ? [...games]
      : games.filter((game) => game.archetype === archetypeFilter);
    if (sortOrder === 'year-asc') {
      filtered.sort((a, b) => a.year - b.year || a.week - b.week);
    } else if (sortOrder === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'year-desc' is the default; selectNamedGames already returns sorted desc.
    return filtered;
  }, [archetypeFilter, games, sortOrder]);

  const userInvolvedCount = useMemo(
    () => games.filter((game) =>
      userTeamId !== null && (game.homeTeamId === userTeamId || game.awayTeamId === userTeamId)).length,
    [games, userTeamId],
  );

  const userWinCount = useMemo(
    () => games.filter((game) =>
      userTeamId !== null && game.winnerTeamId === userTeamId).length,
    [games, userTeamId],
  );

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Named Games"
        subtitle="Trophy-tier games the league will retell. Sort by era, archetype, or franchise involvement."
        badges={(
          <>
            <PixelBadge variant="gold">{games.length} archived</PixelBadge>
            {userInvolvedCount > 0 ? (
              <PixelBadge variant="cyan">{userInvolvedCount} you played</PixelBadge>
            ) : null}
            {userWinCount > 0 ? (
              <PixelBadge variant="green">{userWinCount} you won</PixelBadge>
            ) : null}
          </>
        )}
      />

      <NamedGamesSourcesPanel gameCount={games.length} visibleArchetypeCount={visibleArchetypes.length} />

      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="Games Filed"
          value={games.length}
          accent="gold"
          detail="Trophy-tier games tagged across the dynasty"
        />
        <PixelMetricCard
          label="Archetypes Seen"
          value={visibleArchetypes.length}
          accent="cyan"
          detail="Distinct narrative outcomes the league has produced"
        />
        <PixelMetricCard
          label="Your Involvement"
          value={userInvolvedCount}
          accent="green"
          detail={userInvolvedCount === 0 ? 'No tagged games yet' : `${userWinCount} wins, ${userInvolvedCount - userWinCount} losses or ties`}
        />
      </div>

      <PixelPanel title="Filter" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <PixelButton
              accent={archetypeFilter === 'all' ? 'cyan' : 'default'}
              onClick={() => setArchetypeFilter('all')}
              data-testid="archetype-filter-all"
            >
              All ({games.length})
            </PixelButton>
            {visibleArchetypes.map((archetype) => (
              <PixelButton
                key={archetype}
                accent={archetypeFilter === archetype ? ARCHETYPE_ACCENTS[archetype] : 'default'}
                onClick={() => setArchetypeFilter(archetype)}
                data-testid={`archetype-filter-${archetype}`}
              >
                {ARCHETYPE_LABELS[archetype]} ({archetypeCounts.get(archetype) ?? 0})
              </PixelButton>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Sort:</span>
            <PixelButton
              accent={sortOrder === 'year-desc' ? 'gold' : 'default'}
              onClick={() => setSortOrder('year-desc')}
            >
              Newest First
            </PixelButton>
            <PixelButton
              accent={sortOrder === 'year-asc' ? 'gold' : 'default'}
              onClick={() => setSortOrder('year-asc')}
            >
              Oldest First
            </PixelButton>
            <PixelButton
              accent={sortOrder === 'name-asc' ? 'gold' : 'default'}
              onClick={() => setSortOrder('name-asc')}
            >
              By Name
            </PixelButton>
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="Game Archive" accent="gold">
        {filteredGames.length === 0 ? (
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            {games.length === 0
              ? 'No named games filed yet. Trophy-tier results will surface here as the dynasty ages.'
              : 'No games match this filter. Try a different archetype.'}
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredGames.map((game) => (
              <NamedGameCard key={game.gameId} game={game} userTeamId={userTeamId} />
            ))}
          </div>
        )}
      </PixelPanel>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PixelButton accent="default" onClick={() => navigateTo('/legacy')}>
          Back to Legacy
        </PixelButton>
      </div>
    </div>
  );
}

export function NamedGamesBrowser() {
  const games = useGameStore(selectNamedGames);
  const userTeam = useGameStore(selectUserTeam);
  return <NamedGamesBrowserView games={games} userTeamId={userTeam?.id ?? null} />;
}
