import { useMemo, useState } from 'react';
import type { FranchiseHistoryEntry, GameState, HallOfFameEntry, PlayerArchiveEntry } from '@mfd/engine';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { useGameStore, selectUserTeam } from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  screenStackStyle,
  teamThemeVars,
} from '../shared/pixelUi';
import { HallOfFamerDetailModal } from './HallOfFamerDetailModal';

interface CoachRollCallEntry {
  coachId: string;
  coachName: string;
  startYear: number;
  endYear: number;
  wins: number;
  losses: number;
  championships: number;
  winPct: number;
}

interface TitleSeasonEntry {
  year: number;
  record: string;
  pointDifferential: number;
  coachName: string;
  quarterbackName: string;
}

interface EraBucket {
  decadeStart: number;
  decadeEnd: number;
  seasons: number;
  wins: number;
  losses: number;
  ties: number;
  playoffAppearances: number;
  championships: number;
}

function isPlayoffAppearance(playoffFinish: string): boolean {
  return playoffFinish !== 'missed' && playoffFinish !== 'missed_playoffs' && playoffFinish !== 'regular_season';
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function formatSeasonRange(startYear: number, endYear: number): string {
  return startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
}

function formatCoachWinPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function buildPlayerNameMap(game: GameState): Map<string, string> {
  const map = new Map<string, string>();

  for (const player of Object.values(game.players ?? {})) {
    map.set(player.id, player.name);
  }

  for (const archiveEntry of game.playerArchive ?? []) {
    map.set(archiveEntry.playerId, archiveEntry.name);
  }

  for (const entry of game.hallOfFame ?? []) {
    map.set(entry.playerId, entry.name);
  }

  return map;
}

function buildPlayerArchiveMap(game: GameState): Map<string, PlayerArchiveEntry> {
  return new Map((game.playerArchive ?? []).map((entry) => [entry.playerId, entry]));
}

function playerPositionFor(game: GameState, playerId: string): string | null {
  return game.players[playerId]?.pos
    ?? game.playerArchive.find((entry) => entry.playerId === playerId)?.positions[0]
    ?? game.hallOfFame.find((entry) => entry.playerId === playerId)?.position
    ?? null;
}

function deriveRetirementEra(
  archiveMap: Map<string, PlayerArchiveEntry>,
  teamId: string,
  playerId: string,
  seasonsWithTeam: number,
): string {
  const archiveEntry = archiveMap.get(playerId);
  if (!archiveEntry) return `${seasonsWithTeam} season(s)`;

  const stints = archiveEntry.teamHistory.filter((stint) => stint.teamId === teamId);
  if (stints.length === 0) return `${seasonsWithTeam} season(s)`;

  const startYear = Math.min(...stints.map((stint) => stint.firstYear));
  const endYear = Math.max(...stints.map((stint) => stint.lastYear));
  return formatSeasonRange(startYear, endYear);
}

function buildCoachRollCall(game: GameState, teamId: string): CoachRollCallEntry[] {
  const entries: CoachRollCallEntry[] = [];

  for (const coach of game.coachingHistory ?? []) {
    for (const stint of coach.teams.filter((teamHistory) => teamHistory.teamId === teamId)) {
      const games = stint.wins + stint.losses;
      entries.push({
        coachId: coach.coachId,
        coachName: coach.name,
        startYear: stint.startYear,
        endYear: stint.endYear,
        wins: stint.wins,
        losses: stint.losses,
        championships: stint.championships,
        winPct: games > 0 ? stint.wins / games : 0,
      });
    }
  }

  return entries.sort((left, right) =>
    right.startYear - left.startYear
    || right.endYear - left.endYear
    || right.championships - left.championships
    || left.coachName.localeCompare(right.coachName));
}

function coachOfRecordName(coaches: CoachRollCallEntry[], year: number): string {
  return coaches.find((coach) => coach.startYear <= year && coach.endYear >= year)?.coachName ?? 'Coach unavailable';
}

function startingQuarterbackName(
  game: GameState,
  playerNames: Map<string, string>,
  year: number,
  teamId: string,
): string {
  const candidates = Object.values(game.playerSeasonHistory ?? {})
    .flatMap((entries) => entries)
    .filter((entry) => entry.season === year && entry.teamId === teamId)
    .filter((entry) => playerPositionFor(game, entry.playerId) === 'QB')
    .sort((left, right) =>
      Number(right.keyStats.passYds ?? 0) - Number(left.keyStats.passYds ?? 0)
      || right.gamesStarted - left.gamesStarted
      || right.ovr - left.ovr
      || left.playerId.localeCompare(right.playerId));

  return playerNames.get(candidates[0]?.playerId ?? '') ?? 'QB unavailable';
}

function buildChampionshipRings(game: GameState, teamId: string, coaches: CoachRollCallEntry[]): TitleSeasonEntry[] {
  const playerNames = buildPlayerNameMap(game);

  return (game.franchiseHistory ?? [])
    .filter((entry) => entry.teamId === teamId && entry.playoffFinish === 'champion')
    .sort((left, right) => right.year - left.year)
    .map((entry) => ({
      year: entry.year,
      record: entry.record,
      pointDifferential: entry.pointDifferential,
      coachName: coachOfRecordName(coaches, entry.year),
      quarterbackName: startingQuarterbackName(game, playerNames, entry.year, teamId),
    }));
}

function buildEraBuckets(history: FranchiseHistoryEntry[]): EraBucket[] {
  const buckets = new Map<number, EraBucket>();

  for (const season of history) {
    const decadeStart = Math.floor(season.year / 10) * 10;
    const existing = buckets.get(decadeStart) ?? {
      decadeStart,
      decadeEnd: decadeStart + 9,
      seasons: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      playoffAppearances: 0,
      championships: 0,
    };

    existing.seasons += 1;
    existing.wins += season.wins;
    existing.losses += season.losses;
    existing.ties += season.ties;
    existing.playoffAppearances += isPlayoffAppearance(season.playoffFinish) ? 1 : 0;
    existing.championships += season.playoffFinish === 'champion' ? 1 : 0;
    buckets.set(decadeStart, existing);
  }

  return [...buckets.values()].sort((left, right) => right.decadeStart - left.decadeStart);
}

function teamsById(game: GameState): Record<string, { abbr?: string }> {
  return Object.fromEntries(
    Object.values(game.teams ?? {}).map((team) => [team.id, { abbr: team.abbr }]),
  );
}

function hallOfFamersForTeam(game: GameState, teamId: string): HallOfFameEntry[] {
  return [...(game.hallOfFame ?? [])]
    .filter((entry) => entry.teams.includes(teamId))
    .sort((left, right) =>
      right.score - left.score
      || right.peakOvr - left.peakOvr
      || right.inductionYear - left.inductionYear
      || left.name.localeCompare(right.name));
}

export function FranchiseLegends() {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const [selectedHallOfFamer, setSelectedHallOfFamer] = useState<HallOfFameEntry | null>(null);

  const franchiseHistory = useMemo(
    () => (game && userTeam ? game.franchiseHistory.filter((entry) => entry.teamId === userTeam.id).sort((left, right) => right.year - left.year) : []),
    [game, userTeam],
  );
  const foundingYear = franchiseHistory[franchiseHistory.length - 1]?.year ?? game?.year ?? 0;
  const coachRollCall = useMemo(
    () => (game && userTeam ? buildCoachRollCall(game, userTeam.id) : []),
    [game, userTeam],
  );
  const championshipRings = useMemo(
    () => (game && userTeam ? buildChampionshipRings(game, userTeam.id, coachRollCall) : []),
    [coachRollCall, game, userTeam],
  );
  const topHallOfFamers = useMemo(
    () => (game && userTeam ? hallOfFamersForTeam(game, userTeam.id).slice(0, 10) : []),
    [game, userTeam],
  );
  const allHallOfFamers = useMemo(
    () => (game && userTeam ? hallOfFamersForTeam(game, userTeam.id) : []),
    [game, userTeam],
  );
  const archiveMap = useMemo(
    () => (game ? buildPlayerArchiveMap(game) : new Map<string, PlayerArchiveEntry>()),
    [game],
  );
  const eraBuckets = useMemo(
    () => buildEraBuckets(franchiseHistory),
    [franchiseHistory],
  );

  if (!userTeam || !game) {
    return (
      <div style={{ ...screenStackStyle, ...teamThemeVars(undefined) }}>
        <PixelScreenHeader title="Franchise Legends" subtitle="No franchise is loaded." />
      </div>
    );
  }

  return (
    <div style={{ ...screenStackStyle, ...teamThemeVars(userTeam.id) }}>
      <PixelScreenHeader
        title={`${userTeam.city} ${userTeam.name}`}
        subtitle="Franchise Legends"
        badges={(
          <>
            <PixelBadge variant="gold">FOUNDED {foundingYear}</PixelBadge>
            <PixelBadge variant="cyan">{userTeam.abbr}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(180)}>
        <PixelMetricCard label="Championships" value={championshipRings.length} accent="gold" detail="Titles in franchise history" />
        <PixelMetricCard label="HOFers" value={allHallOfFamers.length} accent="gold" detail="Hall of Famers tied to this franchise" />
        <PixelMetricCard label="Retired Numbers" value={userTeam.retiredJerseys.length} accent="cyan" detail="Jerseys lifted into the rafters" />
        <PixelMetricCard label="Head Coaches" value={coachRollCall.length} accent="green" detail="Distinct franchise hires on record" />
        <PixelMetricCard label="Seasons Played" value={franchiseHistory.length} accent="default" detail="Tracked seasons in franchise history" />
      </div>

      <div style={autoGrid(360)}>
        <PixelPanel title="Championship Rings" accent="gold">
          {championshipRings.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              No championships yet. The next one starts with a season click.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {championshipRings.map((ring) => (
                <div
                  key={ring.year}
                  data-testid="championship-ring-row"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '12px',
                    border: '2px solid var(--mfd-gold)',
                    background: 'var(--mfd-bg-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                      {ring.year} TITLE RUN
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="gold">{ring.record}</PixelBadge>
                      <PixelBadge variant="green">Season PD {formatSigned(ring.pointDifferential)}</PixelBadge>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="default">Coach: {ring.coachName}</PixelBadge>
                    <PixelBadge variant="cyan">Starting QB: {ring.quarterbackName}</PixelBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Top 10 HOFers All-Time" accent="gold">
          {topHallOfFamers.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              No Hall of Famers tied to this franchise yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topHallOfFamers.map((entry, index) => (
                <button
                  key={entry.playerId}
                  type="button"
                  data-testid="hof-row"
                  onClick={() => setSelectedHallOfFamer(entry)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: '100%',
                    padding: '12px',
                    border: '2px solid var(--mfd-gold)',
                    background: 'var(--mfd-bg-2)',
                    color: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                        #{index + 1} {entry.name.toUpperCase()}
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
                        {entry.position} // inducted {entry.inductionYear}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <PixelBadge variant="gold">{Math.round(entry.score)} SCORE</PixelBadge>
                      <PixelBadge variant="cyan">PEAK {entry.peakOvr}</PixelBadge>
                      <PixelBadge variant="green">{entry.awards.championships}x TITLES</PixelBadge>
                    </div>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                    {(entry.highlights[0] ?? 'Legacy details available in the Hall of Fame profile.')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Retired Numbers" accent="cyan">
          {userTeam.retiredJerseys.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              No numbers retired yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...userTeam.retiredJerseys]
                .sort((left, right) => right.year - left.year || left.playerName.localeCompare(right.playerName))
                .map((entry) => (
                  <div
                    key={entry.id}
                    data-testid="retired-number-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      padding: '12px',
                      border: '2px solid var(--mfd-cyan)',
                      background: 'var(--mfd-bg-2)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                        #{entry.jerseyNumber} {entry.playerName.toUpperCase()}
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                        {entry.pos} // era {deriveRetirementEra(archiveMap, userTeam.id, entry.playerId, entry.seasonsWithTeam)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="cyan">{entry.year}</PixelBadge>
                      <PixelBadge variant="gold">PEAK {entry.peakOvr}</PixelBadge>
                      <PixelBadge variant="green">{entry.championships}x TITLES</PixelBadge>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Coach Roll Call" accent="green">
          {coachRollCall.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              No head-coaching history recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {coachRollCall.map((coach) => (
                <div
                  key={`${coach.coachId}-${coach.startYear}`}
                  data-testid="coach-roll-call-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: '12px',
                    border: '2px solid var(--mfd-green)',
                    background: 'var(--mfd-bg-2)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                      {coach.coachName.toUpperCase()}
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      Hire window {formatSeasonRange(coach.startYear, coach.endYear)} // {coach.wins}-{coach.losses}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant="green">WIN% {formatCoachWinPct(coach.winPct)}</PixelBadge>
                    <PixelBadge variant="gold">{coach.championships}x TITLES</PixelBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>

      <PixelPanel title="Era Strip" accent="default">
        {eraBuckets.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No seasons recorded for this franchise yet.
          </div>
        ) : (
          <div style={autoGrid(220)}>
            {eraBuckets.map((era) => (
              <div
                key={era.decadeStart}
                data-testid="era-strip-row"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '12px',
                  border: '2px solid var(--mfd-text-dim)',
                  background: 'var(--mfd-bg-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                    {era.decadeStart}s
                  </div>
                  <PixelBadge variant={era.championships > 0 ? 'gold' : era.playoffAppearances > 0 ? 'cyan' : 'default'}>
                    {era.seasons} season(s)
                  </PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                  Record {era.wins}-{era.losses}{era.ties > 0 ? `-${era.ties}` : ''} // Playoffs {era.playoffAppearances} // Titles {era.championships}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant="default">{era.decadeStart}-{era.decadeEnd}</PixelBadge>
                  <PixelBadge variant="cyan">{era.playoffAppearances} playoff trips</PixelBadge>
                  <PixelBadge variant="gold">{era.championships} championships</PixelBadge>
                </div>
              </div>
            ))}
          </div>
        )}
      </PixelPanel>

      <HallOfFamerDetailModal
        entry={selectedHallOfFamer}
        open={selectedHallOfFamer !== null}
        onClose={() => setSelectedHallOfFamer(null)}
        teams={teamsById(game)}
        dynastyTeamId={userTeam.id}
      />
    </div>
  );
}
