import { useMemo, useState } from 'react';
import type { ScheduleWeek, Team, WeatherCondition } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import {
  selectSchedule,
  selectTeams,
  selectUserTeam,
  selectWeek,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelScreenHeader,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { WeatherGlyphSvg, type WeatherGlyphVariant } from './weatherGlyphSvg';

type ForecastFilter = 'all' | 'user' | 'outdoor' | 'domes';
export type ImpactTier = 'game_changer' | 'notable' | 'minor';
export type ForecastSourceLabel = 'Saved schedule.weather' | 'Stadium dome' | 'UI forecast profile';

export interface ForecastGame {
  id: string;
  week: number;
  awayTeamId: string;
  awayTeamName: string;
  homeTeamId: string;
  homeTeamName: string;
  condition: WeatherGlyphVariant;
  conditionLabel: string;
  temperatureF: number;
  windMph: number;
  impactTier: ImpactTier;
  impactLabel: string;
  userTeamGame: boolean;
  dome: boolean;
  sourceLabel: ForecastSourceLabel;
  sourceDetail: string;
}

const FILTERS: Array<{ id: ForecastFilter; label: string }> = [
  { id: 'all', label: 'All Games' },
  { id: 'user', label: 'User Team Only' },
  { id: 'outdoor', label: 'Outdoor Only' },
  { id: 'domes', label: 'Domes Only' },
];

const CONDITION_LABELS: Record<WeatherGlyphVariant, string> = {
  SUNNY: 'Sunny',
  PARTLY_CLOUDY: 'Partly Cloudy',
  CLOUDY: 'Cloudy',
  RAIN: 'Rain',
  SNOW: 'Snow',
  WIND: 'Wind',
  DOME: 'Dome',
  HEAT_WAVE: 'Heat Wave',
};

const IMPACT_VARIANTS: Record<ImpactTier, 'red' | 'gold' | 'cyan'> = {
  game_changer: 'red',
  notable: 'gold',
  minor: 'cyan',
};

const SOURCE_VARIANTS: Record<ForecastSourceLabel, 'cyan' | 'gold' | 'default'> = {
  'Saved schedule.weather': 'cyan',
  'Stadium dome': 'gold',
  'UI forecast profile': 'default',
};

function conditionToVariant(condition: WeatherCondition | null | undefined, homeTeam: Team): WeatherGlyphVariant {
  if (condition === 'dome' || homeTeam.stadiumType === 'dome') return 'DOME';
  if (condition === 'rain') return 'RAIN';
  if (condition === 'snow') return 'SNOW';
  if (condition === 'wind') return 'WIND';
  if (homeTeam.city === 'Miami' || homeTeam.city === 'Tampa Bay' || homeTeam.city === 'Jacksonville') return 'HEAT_WAVE';
  return 'SUNNY';
}

function profileFor(variant: WeatherGlyphVariant): Pick<ForecastGame, 'temperatureF' | 'windMph' | 'impactTier' | 'impactLabel'> {
  if (variant === 'SNOW') return { temperatureF: 24, windMph: 16, impactTier: 'game_changer', impactLabel: 'Game Changer' };
  if (variant === 'WIND') return { temperatureF: 48, windMph: 24, impactTier: 'game_changer', impactLabel: 'Game Changer' };
  if (variant === 'RAIN') return { temperatureF: 51, windMph: 12, impactTier: 'notable', impactLabel: 'Notable' };
  if (variant === 'HEAT_WAVE') return { temperatureF: 92, windMph: 6, impactTier: 'notable', impactLabel: 'Notable' };
  if (variant === 'DOME') return { temperatureF: 72, windMph: 0, impactTier: 'minor', impactLabel: 'Minor' };
  if (variant === 'CLOUDY' || variant === 'PARTLY_CLOUDY') return { temperatureF: 58, windMph: 8, impactTier: 'minor', impactLabel: 'Minor' };
  return { temperatureF: 64, windMph: 5, impactTier: 'minor', impactLabel: 'Minor' };
}

function sourceForForecast(
  condition: WeatherCondition | null | undefined,
  homeTeam: Team,
): Pick<ForecastGame, 'sourceLabel' | 'sourceDetail'> {
  if (condition) {
    return {
      sourceLabel: 'Saved schedule.weather',
      sourceDetail: `Saved matchup weather: ${condition}.`,
    };
  }
  if (homeTeam.stadiumType === 'dome') {
    return {
      sourceLabel: 'Stadium dome',
      sourceDetail: 'Home stadium type is dome; indoor conditions are display-only when matchup weather is missing.',
    };
  }
  return {
    sourceLabel: 'UI forecast profile',
    sourceDetail: 'No saved matchup weather; this card uses route-local presentation only.',
  };
}

function filterGames(games: ForecastGame[], filter: ForecastFilter): ForecastGame[] {
  if (filter === 'user') return games.filter((game) => game.userTeamGame);
  if (filter === 'outdoor') return games.filter((game) => !game.dome);
  if (filter === 'domes') return games.filter((game) => game.dome);
  return games;
}

export function buildForecastGamesFromSchedule({
  schedule,
  teams,
  userTeamId,
  week,
}: {
  schedule: ScheduleWeek[];
  teams: Record<string, Team>;
  userTeamId: string | null;
  week: number;
}): ForecastGame[] {
  const targetWeek = schedule.find((entry) => entry.week === week)
    ?? schedule.find((entry) => entry.week > week && entry.games.some((game) => !game.result));
  if (!targetWeek) return [];

  return targetWeek.games
    .filter((game) => !game.result)
    .map((game) => {
      const homeTeam = teams[game.homeTeamId];
      const awayTeam = teams[game.awayTeamId];
      if (!homeTeam || !awayTeam) return null;
      const condition = conditionToVariant(game.weather ?? null, homeTeam);
      const profile = profileFor(condition);
      const source = sourceForForecast(game.weather ?? null, homeTeam);
      return {
        id: `${targetWeek.week}:${game.awayTeamId}@${game.homeTeamId}`,
        week: targetWeek.week,
        awayTeamId: awayTeam.id,
        awayTeamName: `${awayTeam.city} ${awayTeam.name}`,
        homeTeamId: homeTeam.id,
        homeTeamName: `${homeTeam.city} ${homeTeam.name}`,
        condition,
        conditionLabel: CONDITION_LABELS[condition],
        dome: condition === 'DOME',
        userTeamGame: game.homeTeamId === userTeamId || game.awayTeamId === userTeamId,
        ...profile,
        ...source,
      };
    })
    .filter((game): game is ForecastGame => game !== null);
}

export function WeatherForecastView({
  games,
  week,
  initialFilter = 'all',
}: {
  games: ForecastGame[];
  week: number;
  initialFilter?: ForecastFilter;
}) {
  const [filter, setFilter] = useState<ForecastFilter>(initialFilter);
  const visibleGames = useMemo(() => filterGames(games, filter), [filter, games]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Forecast"
        subtitle={`Week ${week} forecast across the league.`}
        badges={(
          <>
            <PixelBadge variant="cyan">{games.length} games</PixelBadge>
            <PixelBadge variant="gold">{games.filter((game) => game.impactTier !== 'minor').length} weather alerts</PixelBadge>
          </>
        )}
      />

      <PixelPanel title="Forecast Source" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">Saved schedule.weather</PixelBadge>
            <PixelBadge variant="gold">UI forecast profile</PixelBadge>
            <PixelBadge variant="default">No render mutation</PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            This board reads unsimmed matchup weather from the saved schedule: dome, clear, rain, snow, or wind.
            Heat Wave, Sunny, temperatures, wind MPH, and impact labels are route-local presentation profiles for
            missing or saved conditions; rendering the forecast does not generate, persist, or simulate weather.
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="Filters" accent="cyan">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {FILTERS.map((entry) => (
            <PixelButton key={entry.id} accent={filter === entry.id ? 'gold' : 'default'} onClick={() => setFilter(entry.id)}>
              {entry.label}
            </PixelButton>
          ))}
        </div>
      </PixelPanel>

      {visibleGames.length === 0 ? (
        <PixelPanel title="Forecast Board" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            No games scheduled this week.
          </div>
        </PixelPanel>
      ) : (
        <div style={autoGrid(300)}>
          {visibleGames.map((game) => (
            <article
              key={game.id}
              data-weather-game-card={game.id}
              style={{
                minHeight: '184px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '14px',
                border: `2px solid ${game.impactTier === 'game_changer' ? 'var(--mfd-red)' : 'var(--mfd-border)'}`,
                background: 'var(--mfd-bg-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                  <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>
                    WEEK {game.week}
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '20px', color: 'var(--mfd-text)', lineHeight: 1.1 }}>
                    {game.awayTeamName} @ {game.homeTeamName}
                  </div>
                </div>
                <WeatherGlyphSvg variant={game.condition} label={game.conditionLabel} />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="cyan">{game.conditionLabel}</PixelBadge>
                <span data-impact-tier={game.impactTier}>
                  <PixelBadge variant={IMPACT_VARIANTS[game.impactTier]}>{game.impactLabel}</PixelBadge>
                </span>
                <PixelBadge variant={game.dome ? 'gold' : 'default'}>{game.dome ? 'Dome' : 'Outdoor'}</PixelBadge>
                <PixelBadge variant={SOURCE_VARIANTS[game.sourceLabel]}>{game.sourceLabel}</PixelBadge>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{game.temperatureF}F</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Wind {game.windMph} MPH</span>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                Source: {game.sourceDetail}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function WeatherForecast() {
  const schedule = useGameStore(selectSchedule);
  const teams = useGameStore(selectTeams);
  const userTeam = useGameStore(selectUserTeam);
  const week = useGameStore(selectWeek);
  const games = useMemo(
    () => buildForecastGamesFromSchedule({ schedule, teams: teams ?? {}, userTeamId: userTeam?.id ?? null, week }),
    [schedule, teams, userTeam?.id, week],
  );

  return <WeatherForecastView games={games} week={week} />;
}
