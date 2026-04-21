import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import { deriveDynastyId } from '../../lib/career-meta';
import { type PlayoffLoreCard } from '../../lib/playoff-lore';
import { listAllPlayoffLoreCards, type PlayoffLoreAggregateEntry } from '../../lib/scrapbook-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
  teamIdFromDynastyId,
  teamThemeVars,
} from '../shared/pixelUi';
import { PlayoffLoreCardView } from './PlayoffLoreCard';

type SortMode = 'year' | 'round' | 'outcome';
type FilterMode = 'all' | 'current' | 'wins' | 'super_bowl';

const SORT_MODES: Array<{ id: SortMode; label: string }> = [
  { id: 'year', label: 'Year ↓' },
  { id: 'round', label: 'Round ↓' },
  { id: 'outcome', label: 'Outcome' },
];

const FILTER_MODES: Array<{ id: FilterMode; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'current', label: 'Current Dynasty' },
  { id: 'wins', label: 'Wins Only' },
  { id: 'super_bowl', label: 'Super Bowl Only' },
];

function roundRank(round: PlayoffLoreCard['round']): number {
  switch (round) {
    case 'super_bowl':
      return 4;
    case 'conference':
      return 3;
    case 'divisional':
      return 2;
    case 'wild_card':
    default:
      return 1;
  }
}

function outcomeRank(outcome: PlayoffLoreCard['outcome']): number {
  return outcome === 'win' ? 1 : 0;
}

function sortCards(entries: PlayoffLoreAggregateEntry[], mode: SortMode): PlayoffLoreAggregateEntry[] {
  const copy = [...entries];

  switch (mode) {
    case 'round':
      return copy.sort((left, right) =>
        roundRank(right.card.round) - roundRank(left.card.round)
        || right.seasonYear - left.seasonYear
        || right.card.week - left.card.week
        || left.card.headline.localeCompare(right.card.headline),
      );
    case 'outcome':
      return copy.sort((left, right) =>
        outcomeRank(right.card.outcome) - outcomeRank(left.card.outcome)
        || right.seasonYear - left.seasonYear
        || roundRank(right.card.round) - roundRank(left.card.round)
        || right.card.week - left.card.week
        || left.card.headline.localeCompare(right.card.headline),
      );
    case 'year':
    default:
      return copy.sort((left, right) =>
        right.seasonYear - left.seasonYear
        || right.card.week - left.card.week
        || roundRank(right.card.round) - roundRank(left.card.round)
        || left.card.headline.localeCompare(right.card.headline),
      );
  }
}

function applyFilter(
  entries: PlayoffLoreAggregateEntry[],
  filter: FilterMode,
  currentDynastyId: string | null,
): PlayoffLoreAggregateEntry[] {
  switch (filter) {
    case 'current':
      return currentDynastyId ? entries.filter((entry) => entry.dynastyId === currentDynastyId) : entries;
    case 'wins':
      return entries.filter((entry) => entry.card.outcome === 'win');
    case 'super_bowl':
      return entries.filter((entry) => entry.card.round === 'super_bowl');
    case 'all':
    default:
      return entries;
  }
}

function truncateDynastyId(dynastyId: string): string {
  if (dynastyId.length <= 16) return dynastyId;
  return `${dynastyId.slice(0, 16)}...`;
}

function groupCardsByDynasty(entries: PlayoffLoreAggregateEntry[]): Array<{
  dynastyId: string;
  entries: PlayoffLoreAggregateEntry[];
}> {
  const grouped = new Map<string, PlayoffLoreAggregateEntry[]>();

  for (const entry of entries) {
    const current = grouped.get(entry.dynastyId);
    if (current) {
      current.push(entry);
      continue;
    }
    grouped.set(entry.dynastyId, [entry]);
  }

  return [...grouped.entries()].map(([dynastyId, dynastyEntries]) => ({
    dynastyId,
    entries: dynastyEntries,
  }));
}

function dynastyTitle(
  dynastyId: string,
  currentDynastyId: string | null,
  currentTeamName: string | null,
): string {
  if (currentDynastyId && dynastyId === currentDynastyId && currentTeamName) {
    return currentTeamName;
  }
  return truncateDynastyId(dynastyId);
}

export function PlayoffLoreDirectory({
  initialSortMode = 'year',
  initialFilterMode = 'all',
}: {
  initialSortMode?: SortMode;
  initialFilterMode?: FilterMode;
} = {}) {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const [sortMode, setSortMode] = useState<SortMode>(initialSortMode);
  const [filterMode, setFilterMode] = useState<FilterMode>(initialFilterMode);

  const allCards = listAllPlayoffLoreCards();
  const currentDynastyId = game ? deriveDynastyId(game) : null;
  const currentTeamName = userTeam ? `${userTeam.city} ${userTeam.name}` : null;
  const seasonsRepresented = new Set(allCards.map((entry) => entry.seasonYear)).size;
  const superBowlWins = allCards.filter((entry) => entry.card.round === 'super_bowl' && entry.card.outcome === 'win').length;
  const conferenceTitles = allCards.filter((entry) => entry.card.round === 'conference' && entry.card.outcome === 'win').length;
  const currentDynastyCards = currentDynastyId
    ? allCards.filter((entry) => entry.dynastyId === currentDynastyId).length
    : 0;
  const filteredCards = useMemo(
    () => sortCards(applyFilter(allCards, filterMode, currentDynastyId), sortMode),
    [allCards, currentDynastyId, filterMode, sortMode],
  );
  const groupedCards = useMemo(() => groupCardsByDynasty(filteredCards), [filteredCards]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Playoff Lore"
        subtitle="Every playoff moment across every dynasty"
        badges={<PixelBadge variant="gold">LORE</PixelBadge>}
      />

      <div style={autoGrid(180)}>
        <PixelMetricCard label="Total Cards" value={allCards.length} accent="gold" detail="Archived and pending" />
        <PixelMetricCard label="Super Bowl Wins" value={superBowlWins} accent="gold" detail="Championship cards only" />
        <PixelMetricCard label="Conference Titles" value={conferenceTitles} accent="cyan" detail="Conference-clinching wins" />
        <PixelMetricCard label="Dynasty Cards" value={currentDynastyCards} accent="green" detail="Current dynasty only" />
        <PixelMetricCard label="Seasons Represented" value={seasonsRepresented} accent="default" detail="Unique playoff years" />
      </div>

      <PixelPanel title="Controls" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Sort:</span>
            {SORT_MODES.map((mode) => (
              <PixelButton
                key={mode.id}
                accent={mode.id === sortMode ? 'gold' : 'default'}
                onClick={() => setSortMode(mode.id)}
              >
                {mode.label}
              </PixelButton>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Filter:</span>
            {FILTER_MODES.map((mode) => (
              <PixelButton
                key={mode.id}
                accent={mode.id === filterMode ? 'cyan' : 'default'}
                onClick={() => setFilterMode(mode.id)}
                disabled={mode.id === 'current' && !currentDynastyId}
              >
                {mode.label}
              </PixelButton>
            ))}
          </div>
        </div>
      </PixelPanel>

      {allCards.length === 0 ? (
        <PixelPanel title="Playoff Lore Vault" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No playoff lore cards archived yet. Win a playoff game to start filling the vault.
          </div>
        </PixelPanel>
      ) : filteredCards.length === 0 ? (
        <PixelPanel title="Filtered View" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No playoff lore cards match the current filter.
          </div>
        </PixelPanel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groupedCards.map((group) => (
            <div key={group.dynastyId} style={teamThemeVars(teamIdFromDynastyId(group.dynastyId) ?? userTeam?.id)}>
              <PixelPanel
                title={dynastyTitle(group.dynastyId, currentDynastyId, currentTeamName)}
                accent={group.dynastyId === currentDynastyId ? 'gold' : 'default'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {group.entries.map((entry) => (
                    <PlayoffLoreCardView key={`${entry.source}-${entry.card.gameId}`} card={entry.card} />
                  ))}
                </div>
              </PixelPanel>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
