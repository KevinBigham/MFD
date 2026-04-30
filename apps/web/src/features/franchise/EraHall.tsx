import { useMemo } from 'react';
import type { FranchiseEra, FranchiseHistoryEntry, Player, Team } from '@mfd/engine';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import {
  selectFranchiseEras,
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
  pixel,
  screenStackStyle,
} from '../shared/pixelUi';
import { EraBadgeSvg, resolveEraBadgeVariant, type EraBadgeVariant } from './eraBadgeSvg';

export interface EraHallEntry {
  id: string;
  name: string;
  type: EraBadgeVariant;
  startYear: number;
  endYear: number | null;
  description: string;
  championships: number[];
  topPlayers: string[];
  current?: boolean;
}

function yearRange(era: Pick<EraHallEntry, 'startYear' | 'endYear'>): string {
  return `${era.startYear}-${era.endYear ?? 'NOW'}`;
}

function isWithinEra(entry: FranchiseHistoryEntry, era: FranchiseEra): boolean {
  const endYear = era.endYear ?? Number.MAX_SAFE_INTEGER;
  return entry.year >= era.startYear && entry.year <= endYear;
}

function championshipYears(history: FranchiseHistoryEntry[], era: FranchiseEra): number[] {
  return history
    .filter((entry) => isWithinEra(entry, era) && entry.playoffFinish === 'champion')
    .map((entry) => entry.year)
    .sort((left, right) => left - right);
}

function topRosterNames(team: Team | null | undefined): string[] {
  return [...(team?.roster ?? [])]
    .sort((left: Player, right: Player) => right.ovr - left.ovr || left.name.localeCompare(right.name))
    .slice(0, 3)
    .map((player) => `${player.name} (${player.pos} ${player.ovr})`);
}

export function buildEraHallEntries({
  eras,
  history,
  currentYear,
  team,
}: {
  eras: FranchiseEra[];
  history: FranchiseHistoryEntry[];
  currentYear: number;
  team: Team | null | undefined;
}): EraHallEntry[] {
  if (eras.length === 0) {
    return [{
      id: 'present-day',
      name: 'PRESENT DAY',
      type: 'rebuilding',
      startYear: currentYear,
      endYear: null,
      description: 'Your story begins here.',
      championships: [],
      topPlayers: [],
      current: true,
    }];
  }

  const currentEra = [...eras].reverse().find((era) => era.endYear === null) ?? eras[eras.length - 1] ?? null;
  return [...eras]
    .sort((left, right) => left.startYear - right.startYear || left.name.localeCompare(right.name))
    .map((era) => {
      const current = era === currentEra || (era.endYear === null && era.startYear === currentEra?.startYear);
      return {
        id: `${era.name}-${era.startYear}`,
        name: era.name,
        type: resolveEraBadgeVariant(era.name),
        startYear: era.startYear,
        endYear: era.endYear,
        description: era.description,
        championships: championshipYears(history, era),
        topPlayers: current ? topRosterNames(team) : [],
        current,
      };
    });
}

export function EraHallView({
  eras,
  currentYear,
  teamLabel,
}: {
  eras: EraHallEntry[];
  currentYear: number;
  teamLabel: string;
}) {
  const currentEra = eras.find((era) => era.current) ?? eras[eras.length - 1] ?? null;
  const totalTitles = eras.reduce((sum, era) => sum + era.championships.length, 0);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Era Hall"
        subtitle="Franchise chapters, title windows, and the roster faces that carried them."
        badges={(
          <>
            <PixelBadge variant="gold">{eras.length} eras</PixelBadge>
            <PixelBadge variant="cyan">{teamLabel}</PixelBadge>
          </>
        )}
      />

      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        padding: '8px',
        border: '3px solid var(--mfd-gold)',
        background: 'var(--mfd-bg)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
      >
        <span style={{ ...pixel, color: 'var(--mfd-gold)' }}>CURRENT ERA</span>
        <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
          {currentEra ? `${currentEra.name} // ${yearRange(currentEra)}` : `Present Day // ${currentYear}`}
        </span>
      </div>

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Era Cards" value={eras.length} accent="gold" detail="Detected franchise chapters" />
        <PixelMetricCard label="Titles In Hall" value={totalTitles} accent="green" detail="Championships grouped into eras" />
        <PixelMetricCard label="Current Year" value={currentYear} accent="cyan" detail="Live dynasty clock" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {eras.map((era) => (
          <PixelPanel key={era.id} title={era.name} accent={era.current ? 'gold' : era.type === 'fall-from-grace' ? 'red' : 'cyan'}>
            <div
              data-era-card="true"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 150px) 1fr',
                gap: '16px',
                alignItems: 'center',
                padding: '12px',
                borderLeft: era.current ? '4px solid var(--mfd-gold)' : '4px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
            >
              <EraBadgeSvg variant={era.type} title={`${era.name} badge`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ ...display, color: 'var(--mfd-text)', fontSize: '26px', lineHeight: 1 }}>
                    {era.name}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {era.current ? <PixelBadge variant="gold">CURRENT</PixelBadge> : null}
                    <PixelBadge variant="cyan">{yearRange(era)}</PixelBadge>
                  </div>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                  {era.description}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {era.championships.length > 0 ? (
                    era.championships.map((year) => (
                      <PixelBadge key={`${era.id}-${year}`} variant="gold">{year} title</PixelBadge>
                    ))
                  ) : (
                    <PixelBadge variant="default">No titles</PixelBadge>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ ...pixel, color: 'var(--mfd-text)' }}>SIGNATURE SNAPSHOT</span>
                  {era.topPlayers.length > 0 ? (
                    era.topPlayers.map((player) => (
                      <span key={`${era.id}-${player}`} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                        {player}
                      </span>
                    ))
                  ) : (
                    <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      Roster snapshot awaits archive data.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </PixelPanel>
        ))}
      </div>
    </div>
  );
}

export function EraHall() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const eras = useGameStore(selectFranchiseEras);
  const currentYear = useGameStore(selectYear);
  const entries = useMemo(() => buildEraHallEntries({
    eras,
    history: game?.franchiseHistory ?? [],
    currentYear,
    team,
  }), [currentYear, eras, game?.franchiseHistory, team]);
  const teamLabel = team ? `${team.city} ${team.name}` : 'Franchise';

  return <EraHallView eras={entries} currentYear={currentYear} teamLabel={teamLabel} />;
}
