import { useMemo, useState } from 'react';
import type { AwardResult, AwardsHistoryEntry, FranchiseEra, Team } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  navigateTo,
  screenStackStyle,
} from '../shared/pixelUi';
import {
  selectAwardsHistory,
  selectFranchiseEras,
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import { MvpPlaqueSvg, type MvpPlaqueRibbonVariant } from './mvpPlaqueSvg';

export type MvpPlaqueAwardType = 'all' | MvpPlaqueRibbonVariant;
export type MvpPlaqueSortMode = 'year' | 'rating' | 'name';

export interface MvpPlaqueAward {
  id: string;
  year: number;
  awardType: MvpPlaqueRibbonVariant;
  awardLabel: string;
  playerName: string;
  position: string;
  statSnapshot: string;
  eraLabel: string;
  peakRating: number;
}

interface MvpPlaqueWallViewProps {
  awards: MvpPlaqueAward[];
  initialFilter?: MvpPlaqueAwardType;
  initialSort?: MvpPlaqueSortMode;
  onCareerClick?: () => void;
}

const AWARD_FILTERS: Array<{ id: MvpPlaqueAwardType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mvp', label: 'MVP' },
  { id: 'opoy', label: 'OPOY' },
  { id: 'dpoy', label: 'DPOY' },
  { id: 'coty', label: 'COTY' },
];

const SORT_MODES: Array<{ id: MvpPlaqueSortMode; label: string }> = [
  { id: 'year', label: 'Newest' },
  { id: 'rating', label: 'Peak Rating' },
  { id: 'name', label: 'A-Z' },
];

const awardIdToType: Record<string, MvpPlaqueRibbonVariant | undefined> = {
  mvp: 'mvp',
  opoy: 'opoy',
  dpoy: 'dpoy',
  coach_of_year: 'coty',
};

const labelByAwardType: Record<MvpPlaqueRibbonVariant, string> = {
  mvp: 'MVP',
  opoy: 'OPOY',
  dpoy: 'DPOY',
  coty: 'COTY',
};

const badgeByAwardType: Record<MvpPlaqueRibbonVariant, 'gold' | 'green' | 'red' | 'cyan'> = {
  mvp: 'gold',
  opoy: 'green',
  dpoy: 'red',
  coty: 'cyan',
};

function humanizeStatLabel(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toUpperCase();
}

export function formatAwardStatSnapshot(stats: AwardResult['winnerStats']): string {
  const [label, value] = Object.entries(stats)[0] ?? [];
  if (value === undefined) return 'SIGNATURE SEASON';
  if (!label) return String(value).toUpperCase();
  return `${value} ${humanizeStatLabel(label)}`;
}

function eraLabelForYear(eras: FranchiseEra[], year: number): string {
  const era = eras.find((entry) =>
    entry.startYear <= year && (entry.endYear === null || entry.endYear >= year));
  return era?.name ?? `Season ${year}`;
}

export function buildMvpPlaqueAwards(
  awardsHistory: AwardsHistoryEntry[],
  team: Pick<Team, 'id'> | null,
  eras: FranchiseEra[],
): MvpPlaqueAward[] {
  if (!team) return [];

  return awardsHistory.flatMap((entry) =>
    entry.awards.flatMap((award) => {
      const awardType = awardIdToType[award.awardId];
      if (!awardType || award.winnerTeamId !== team.id) return [];

      return [{
        id: `${entry.year}-${award.awardId}-${award.winnerId}`,
        year: entry.year,
        awardType,
        awardLabel: labelByAwardType[awardType],
        playerName: award.winnerName,
        position: award.winnerPosition ?? 'N/A',
        statSnapshot: formatAwardStatSnapshot(award.winnerStats),
        eraLabel: eraLabelForYear(eras, entry.year),
        peakRating: Math.round(award.score),
      }];
    }));
}

function sortPlaques(awards: MvpPlaqueAward[], sort: MvpPlaqueSortMode): MvpPlaqueAward[] {
  return [...awards].sort((left, right) => {
    if (sort === 'rating') {
      return right.peakRating - left.peakRating || right.year - left.year || left.playerName.localeCompare(right.playerName);
    }
    if (sort === 'name') {
      return left.playerName.localeCompare(right.playerName) || right.year - left.year;
    }
    return right.year - left.year || left.playerName.localeCompare(right.playerName);
  });
}

export function MvpPlaqueWallView({
  awards,
  initialFilter = 'all',
  initialSort = 'year',
  onCareerClick = () => navigateTo('/franchise/career'),
}: MvpPlaqueWallViewProps) {
  const [filter, setFilter] = useState<MvpPlaqueAwardType>(initialFilter);
  const [sort, setSort] = useState<MvpPlaqueSortMode>(initialSort);

  const visibleAwards = useMemo(() => {
    const filtered = filter === 'all' ? awards : awards.filter((award) => award.awardType === filter);
    return sortPlaques(filtered, sort);
  }, [awards, filter, sort]);

  const mvpCount = awards.filter((award) => award.awardType === 'mvp').length;
  const latestYear = awards.reduce<number | null>((latest, award) => latest === null ? award.year : Math.max(latest, award.year), null);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="MVP Plaque Wall"
        subtitle="Every star season your franchise turned into hardware."
        badges={<PixelBadge variant="gold">AWARDS WING</PixelBadge>}
      />

      <div style={autoGrid(180)}>
        <PixelMetricCard label="Plaques" value={awards.length} accent="gold" detail="Franchise winners" />
        <PixelMetricCard label="MVPs" value={mvpCount} accent="green" detail="League MVP plaques" />
        <PixelMetricCard label="Latest" value={latestYear ?? '--'} accent="cyan" detail="Most recent award season" />
      </div>

      <PixelPanel title="Controls" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Award:</span>
            {AWARD_FILTERS.map((mode) => (
              <PixelButton
                key={mode.id}
                accent={mode.id === filter ? 'gold' : 'default'}
                onClick={() => setFilter(mode.id)}
                data-testid="mvp-award-filter"
                data-filter={mode.id}
              >
                {mode.label}
              </PixelButton>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Sort:</span>
            {SORT_MODES.map((mode) => (
              <PixelButton
                key={mode.id}
                accent={mode.id === sort ? 'cyan' : 'default'}
                onClick={() => setSort(mode.id)}
                data-testid="mvp-sort-toggle"
                data-sort={mode.id}
              >
                {mode.label}
              </PixelButton>
            ))}
          </div>
        </div>
      </PixelPanel>

      {awards.length === 0 ? (
        <PixelPanel title="Plaque Wall Empty" accent="default">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              The plaque wall is empty. Develop a star.
            </div>
            <PixelButton accent="gold" onClick={onCareerClick}>
              View Career
            </PixelButton>
          </div>
        </PixelPanel>
      ) : visibleAwards.length === 0 ? (
        <PixelPanel title="Filtered Plaques" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No plaques match the selected award type.
          </div>
        </PixelPanel>
      ) : (
        <div style={autoGrid(260)} data-testid="mvp-plaque-grid">
          {visibleAwards.map((award) => (
            <article
              key={award.id}
              data-testid="mvp-plaque-card"
              data-award-type={award.awardType}
              data-award-year={award.year}
              style={{
                display: 'grid',
                gridTemplateColumns: '88px minmax(0, 1fr)',
                gap: '12px',
                alignItems: 'center',
                minHeight: '168px',
                padding: '12px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
            >
              <MvpPlaqueSvg awardType={award.awardType} title={`${award.awardLabel} plaque for ${award.playerName}`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <PixelBadge variant={badgeByAwardType[award.awardType]}>{award.awardLabel}</PixelBadge>
                  <PixelBadge variant="default">{award.year}</PixelBadge>
                  <PixelBadge variant="cyan">{award.position}</PixelBadge>
                </div>
                <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1.05 }}>
                  {award.playerName.toUpperCase()}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-gold)', lineHeight: 1.5 }} data-testid="mvp-plaque-stat">
                  {award.statSnapshot}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  {award.eraLabel} // peak score {award.peakRating}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function MvpPlaqueWall() {
  const awardsHistory = useGameStore(selectAwardsHistory);
  const userTeam = useGameStore(selectUserTeam);
  const eras = useGameStore(selectFranchiseEras);
  const awards = useMemo(() => buildMvpPlaqueAwards(awardsHistory, userTeam, eras), [awardsHistory, userTeam, eras]);

  return <MvpPlaqueWallView awards={awards} />;
}
