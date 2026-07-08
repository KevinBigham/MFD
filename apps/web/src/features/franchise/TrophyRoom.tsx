import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Ceremony, FranchiseHistoryEntry } from '@mfd/engine';
import { Chip, PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import {
  selectCeremonies,
  selectUserTeam,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  navigateTo,
  pixel,
  screenStackStyle,
} from '../shared/pixelUi';
import { CeremonyViewer } from '../legacy/CeremonyViewer';
import { LombardiTrophy } from './lombardiTrophy';

export type TrophyRoomFilter = 'all' | 'recent' | 'dynasty';

export interface TrophyRoomChampionship {
  year: number;
  opponent: string;
  score: string;
  mvp: string;
  ceremonyId?: string | null;
  record?: string | null;
}

const FILTERS: Array<{ id: TrophyRoomFilter; label: string }> = [
  { id: 'all', label: 'All Eras' },
  { id: 'recent', label: 'Recent (last 10 yrs)' },
  { id: 'dynasty', label: 'Dynasty Run' },
];

function isChampionship(entry: FranchiseHistoryEntry): boolean {
  return entry.playoffFinish.toLowerCase() === 'champion';
}

function highlightValue(ceremony: Ceremony | null | undefined, labelNeedle: string): string | null {
  const highlight = ceremony?.highlights.find((entry) =>
    entry.label.toLowerCase().includes(labelNeedle.toLowerCase()));
  return highlight?.value ?? null;
}

function extractScore(ceremony: Ceremony | null | undefined): string {
  const path = highlightValue(ceremony, 'playoff path') ?? '';
  const pathScore = [...path.matchAll(/\((\d{1,2}-\d{1,2})\)/g)].at(-1)?.[1];
  if (pathScore) return pathScore;
  const descriptionScore = ceremony?.description.match(/(\d{1,2}-\d{1,2})/)?.[1];
  return descriptionScore ?? 'Archived final';
}

function extractOpponent(ceremony: Ceremony | null | undefined): string {
  const path = highlightValue(ceremony, 'playoff path') ?? '';
  const opponent = [...path.matchAll(/super bowl vs ([^(]+)\s\(/gi)].at(-1)?.[1]?.trim();
  return opponent ?? 'Championship opponent';
}

export function buildTrophyRoomChampionships({
  history,
  ceremonies,
  teamId,
}: {
  history: FranchiseHistoryEntry[];
  ceremonies: Ceremony[];
  teamId: string | null | undefined;
}): TrophyRoomChampionship[] {
  if (!teamId) return [];
  return history
    .filter((entry) => entry.teamId === teamId && isChampionship(entry))
    .sort((left, right) => right.year - left.year)
    .map((entry) => {
      const ceremony = ceremonies.find((item) => item.year === entry.year && item.type === 'championship') ?? null;
      return {
        year: entry.year,
        opponent: extractOpponent(ceremony),
        score: extractScore(ceremony),
        mvp: highlightValue(ceremony, 'mvp') ?? 'Team effort',
        ceremonyId: ceremony?.id ?? null,
        record: entry.record,
      };
    });
}

function dynastyRunYears(championships: TrophyRoomChampionship[]): Set<number> {
  const years = championships.map((championship) => championship.year);
  const dynastyYears = new Set<number>();

  for (const year of years) {
    const windowYears = years.filter((candidate) => candidate >= year - 4 && candidate <= year);
    if (windowYears.length >= 3) {
      for (const windowYear of windowYears) dynastyYears.add(windowYear);
    }
  }

  return dynastyYears;
}

export function filterChampionships(
  championships: TrophyRoomChampionship[],
  filterMode: TrophyRoomFilter,
  currentYear: number,
): TrophyRoomChampionship[] {
  if (filterMode === 'recent') {
    return championships.filter((championship) => currentYear - championship.year <= 10);
  }
  if (filterMode === 'dynasty') {
    const years = dynastyRunYears(championships);
    return championships.filter((championship) => years.has(championship.year));
  }
  return championships;
}

function groupChampionshipsByEra(championships: TrophyRoomChampionship[]) {
  const groups = new Map<number, TrophyRoomChampionship[]>();
  for (const championship of championships) {
    const decade = Math.floor(championship.year / 10) * 10;
    groups.set(decade, [...(groups.get(decade) ?? []), championship]);
  }

  return [...groups.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([decade, entries]) => ({
      decade,
      entries: entries.sort((left, right) => right.year - left.year),
    }));
}

function trophyTier(championship: TrophyRoomChampionship, allChampionships: TrophyRoomChampionship[]): number {
  return [...allChampionships]
    .sort((left, right) => left.year - right.year)
    .findIndex((entry) => entry.year === championship.year) + 1;
}

const cardButtonStyle: CSSProperties = {
  appearance: 'none',
  width: '100%',
  margin: 0,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
};

function TrophySourcesPanel() {
  return (
    <PixelPanel title="Trophy Sources" accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">SAVE MEMORY</PixelBadge>
          <PixelBadge variant="cyan">READ ONLY</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
          Trophy rows come from saved <strong>game.franchiseHistory</strong> champion seasons for the current user team, with linked broadcasts read through <strong>selectCeremonies</strong>.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          <strong>buildTrophyRoomChampionships</strong> pairs each title with ceremony highlights for opponent, score, and MVP, then falls back to archive copy when a ceremony is missing.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Filters use route-local <strong>filterMode</strong> state, current-year recent-window math, dynasty-run grouping, and selected trophy modal state. Opening Trophy Room does not award championships, generate ceremonies, update franchise history, write media, unlock achievements, write sidecars, change the live save, or play scheduled games.
        </div>
      </div>
    </PixelPanel>
  );
}

function TrophyNextChasePanel({ hasTitles }: { hasTitles: boolean }) {
  return (
    <PixelPanel title={hasTitles ? 'Next Banner Chase' : 'First Banner Chase'} accent="gold">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7, maxWidth: '640px' }}>
          {hasTitles
            ? 'Let the trophy case pressure this season: check the race, find the next trap game, and tune the plan before the next result lands.'
            : 'The case is empty, so turn the chase into a current-week checklist: standings first, schedule next, game plan last.'}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelButton accent="cyan" onClick={() => navigateTo('/standings')}>Standings</PixelButton>
          <PixelButton accent="default" onClick={() => navigateTo('/schedule')}>Schedule</PixelButton>
          <PixelButton accent="gold" onClick={() => navigateTo('/game-plan')}>Game Plan</PixelButton>
        </div>
      </div>
    </PixelPanel>
  );
}

export function TrophyRoomView({
  championships,
  ceremonies,
  currentYear,
  filterMode,
  selectedCeremony = null,
  onFilterChange,
  onTrophySelect,
  onCeremonyOpenChange = () => undefined,
}: {
  championships: TrophyRoomChampionship[];
  ceremonies: Ceremony[];
  currentYear: number;
  filterMode: TrophyRoomFilter;
  selectedCeremony?: Ceremony | null;
  onFilterChange: (filter: TrophyRoomFilter) => void;
  onTrophySelect: (championship: TrophyRoomChampionship) => void;
  onCeremonyOpenChange?: (open: boolean) => void;
}) {
  const visibleChampionships = filterChampionships(championships, filterMode, currentYear);
  const eraGroups = groupChampionshipsByEra(visibleChampionships);
  const latestTitle = championships[0] ?? null;
  const ceremonyCount = championships.filter((championship) =>
    Boolean(championship.ceremonyId && ceremonies.some((ceremony) => ceremony.id === championship.ceremonyId))).length;

  if (championships.length === 0) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader
          title="Trophy Room"
          subtitle="Every banner. Every ring. Every parade."
          badges={<PixelBadge variant="gold">0 titles</PixelBadge>}
        />
        <TrophySourcesPanel />
        <TrophyNextChasePanel hasTitles={false} />
        <PixelPanel title="Empty Case" accent="gold">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(80px, 120px) 1fr',
            gap: '16px',
            alignItems: 'center',
            padding: '12px',
          }}
          >
            <div data-chip-pose="idle">
              <Chip pose="idle" size="sm" reducedMotion />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ ...display, color: 'var(--mfd-text)', fontSize: '22px' }}>
                No championships yet. The trophy case is empty.
              </div>
              <PixelButton accent="gold" onClick={() => navigateTo('/franchise/playoff-lore')}>
                VIEW PLAYOFF LORE
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Trophy Room"
        subtitle="Every banner. Every ring. Every parade."
        badges={(
          <>
            <PixelBadge variant="gold">{championships.length} titles</PixelBadge>
            <PixelBadge variant="cyan">{ceremonyCount} ceremonies</PixelBadge>
          </>
        )}
      />

      <TrophySourcesPanel />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Championships" value={championships.length} accent="gold" detail="Archived title seasons" />
        <PixelMetricCard label="Latest Banner" value={latestTitle?.year ?? '--'} accent="cyan" detail={latestTitle?.score ?? 'Waiting'} />
        <PixelMetricCard label="Parade Vault" value={ceremonyCount} accent="green" detail="Ceremony broadcasts linked" />
      </div>

      <TrophyNextChasePanel hasTitles />

      <PixelPanel title="Era Filter" accent="cyan">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {FILTERS.map((filter) => (
            <PixelButton
              key={filter.id}
              accent={filterMode === filter.id ? 'gold' : 'default'}
              onClick={() => onFilterChange(filter.id)}
            >
              {filter.label}
            </PixelButton>
          ))}
        </div>
      </PixelPanel>

      {eraGroups.length === 0 ? (
        <PixelPanel title="Filtered Case" accent="gold">
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No championship trophies match this filter.</span>
        </PixelPanel>
      ) : (
        eraGroups.map((group) => (
          <PixelPanel key={group.decade} title={`${group.decade}s Era`} accent="gold">
            <div style={autoGrid(240)}>
              {group.entries.map((championship) => (
                <button
                  key={championship.year}
                  type="button"
                  aria-label={`Open ${championship.year} championship trophy`}
                  onClick={() => onTrophySelect(championship)}
                  style={cardButtonStyle}
                >
                  <div style={{
                    minHeight: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px',
                    border: '3px solid var(--mfd-gold)',
                    background: 'var(--mfd-bg-2)',
                  }}
                  >
                    <LombardiTrophy
                      championshipCount={trophyTier(championship, championships)}
                      title={`${championship.year} championship trophy`}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                        <span style={{ ...pixel, color: 'var(--mfd-gold)' }}>{championship.year}</span>
                        <PixelBadge variant={championship.ceremonyId ? 'cyan' : 'default'}>
                          {championship.ceremonyId ? 'CEREMONY' : 'ARCHIVE'}
                        </PixelBadge>
                      </div>
                      <div style={{ ...display, color: 'var(--mfd-text)', fontSize: '20px', lineHeight: 1 }}>
                        {championship.score}
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                        vs {championship.opponent}
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                        MVP: {championship.mvp}
                      </div>
                      {championship.record ? (
                        <PixelBadge variant="gold">{championship.record}</PixelBadge>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </PixelPanel>
        ))
      )}

      <CeremonyViewer
        ceremony={selectedCeremony}
        open={!!selectedCeremony}
        onOpenChange={onCeremonyOpenChange}
      />
    </div>
  );
}

export function TrophyRoom() {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const ceremonies = useGameStore(selectCeremonies);
  const currentYear = useGameStore(selectYear);
  const [filterMode, setFilterMode] = useState<TrophyRoomFilter>('all');
  const [selectedCeremonyId, setSelectedCeremonyId] = useState<string | null>(null);

  const championships = useMemo(() => buildTrophyRoomChampionships({
    history: game?.franchiseHistory ?? [],
    ceremonies,
    teamId: userTeam?.id ?? null,
  }), [ceremonies, game?.franchiseHistory, userTeam?.id]);

  const selectedCeremony = ceremonies.find((ceremony) => ceremony.id === selectedCeremonyId) ?? null;

  return (
    <TrophyRoomView
      championships={championships}
      ceremonies={ceremonies}
      currentYear={currentYear}
      filterMode={filterMode}
      selectedCeremony={selectedCeremony}
      onFilterChange={setFilterMode}
      onTrophySelect={(championship) => {
        if (championship.ceremonyId) setSelectedCeremonyId(championship.ceremonyId);
      }}
      onCeremonyOpenChange={(open) => {
        if (!open) setSelectedCeremonyId(null);
      }}
    />
  );
}
