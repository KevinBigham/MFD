import { renderToStaticMarkup } from 'react-dom/server';
import type { ScheduleWeek, Team } from '@mfd/engine';
import { describe, expect, it } from 'vitest';
import { WeatherForecastView, buildForecastGamesFromSchedule, type ForecastGame } from './WeatherForecast';

const GAMES: ForecastGame[] = [
  {
    id: 'austin-at-chicago',
    week: 8,
    awayTeamId: 'away',
    awayTeamName: 'Austin Comets',
    homeTeamId: 'user',
    homeTeamName: 'Chicago Blaze',
    condition: 'SNOW',
    conditionLabel: 'Snow',
    temperatureF: 24,
    windMph: 18,
    impactTier: 'game_changer',
    impactLabel: 'Game Changer',
    userTeamGame: true,
    dome: false,
    sourceLabel: 'Saved schedule.weather',
    sourceDetail: 'Saved matchup weather: snow.',
  },
  {
    id: 'miami-at-dallas',
    week: 8,
    awayTeamId: 'mia',
    awayTeamName: 'Miami Lights',
    homeTeamId: 'dal',
    homeTeamName: 'Dallas Wranglers',
    condition: 'DOME',
    conditionLabel: 'Dome',
    temperatureF: 72,
    windMph: 0,
    impactTier: 'minor',
    impactLabel: 'Minor',
    userTeamGame: false,
    dome: true,
    sourceLabel: 'Stadium dome',
    sourceDetail: 'Home stadium type is dome; indoor conditions are display-only when matchup weather is missing.',
  },
  {
    id: 'seattle-at-bay',
    week: 8,
    awayTeamId: 'sea',
    awayTeamName: 'Seattle Tempest',
    homeTeamId: 'bay',
    homeTeamName: 'Bay City Bridges',
    condition: 'RAIN',
    conditionLabel: 'Rain',
    temperatureF: 51,
    windMph: 12,
    impactTier: 'notable',
    impactLabel: 'Notable',
    userTeamGame: false,
    dome: false,
    sourceLabel: 'Saved schedule.weather',
    sourceDetail: 'Saved matchup weather: rain.',
  },
];

const TEAMS = {
  away: { id: 'away', city: 'Austin', name: 'Comets', stadiumType: 'outdoor' },
  user: { id: 'user', city: 'Chicago', name: 'Blaze', stadiumType: 'outdoor' },
  mia: { id: 'mia', city: 'Miami', name: 'Lights', stadiumType: 'outdoor' },
  dal: { id: 'dal', city: 'Dallas', name: 'Wranglers', stadiumType: 'dome' },
  sea: { id: 'sea', city: 'Seattle', name: 'Tempest', stadiumType: 'outdoor' },
  bay: { id: 'bay', city: 'Bay City', name: 'Bridges', stadiumType: 'outdoor' },
} as unknown as Record<string, Team>;

const SCHEDULE = [
  {
    week: 8,
    games: [
      { homeTeamId: 'user', awayTeamId: 'away', weather: 'snow', result: null },
      { homeTeamId: 'mia', awayTeamId: 'sea', weather: null, result: null },
      { homeTeamId: 'dal', awayTeamId: 'bay', weather: null, result: null },
    ],
  },
] as unknown as ScheduleWeek[];

describe('WeatherForecast', () => {
  it('renders the Forecast header', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} />);

    expect(markup).toContain('FORECAST');
    expect(markup).toContain('Week 8 forecast across the league.');
  });

  it('explains the saved weather source and route-local forecast profiles', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} />);

    expect(markup).toContain('FORECAST SOURCE');
    expect(markup).toContain('Saved schedule.weather');
    expect(markup).toContain('UI forecast profile');
    expect(markup).toContain('dome, clear, rain, snow, or wind');
    expect(markup).toContain('Heat Wave, Sunny, temperatures, wind MPH, and impact labels are route-local presentation profiles');
    expect(markup).toContain('does not generate, persist, or simulate weather');
  });

  it('renders one card per upcoming game', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} />);

    expect(markup.match(/data-weather-game-card=/g)).toHaveLength(3);
  });

  it('renders the weather glyph for each game condition', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} />);

    expect(markup).toContain('data-weather-glyph="SNOW"');
    expect(markup).toContain('data-weather-glyph="DOME"');
    expect(markup).toContain('data-weather-glyph="RAIN"');
  });

  it('labels each card with its saved, dome, or UI-only forecast source', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} />);

    expect(markup).toContain('Saved schedule.weather');
    expect(markup).toContain('Source: Saved matchup weather: snow.');
    expect(markup).toContain('Stadium dome');
    expect(markup).toContain('Source: Home stadium type is dome; indoor conditions are display-only when matchup weather is missing.');
  });

  it('builds forecast source labels from saved schedule weather without generating new weather', () => {
    const games = buildForecastGamesFromSchedule({
      schedule: SCHEDULE,
      teams: TEAMS,
      userTeamId: 'user',
      week: 8,
    });

    expect(games.map((game) => ({
      condition: game.condition,
      sourceLabel: game.sourceLabel,
      sourceDetail: game.sourceDetail,
      userTeamGame: game.userTeamGame,
    }))).toEqual([
      {
        condition: 'SNOW',
        sourceLabel: 'Saved schedule.weather',
        sourceDetail: 'Saved matchup weather: snow.',
        userTeamGame: true,
      },
      {
        condition: 'HEAT_WAVE',
        sourceLabel: 'UI forecast profile',
        sourceDetail: 'No saved matchup weather; this card uses route-local presentation only.',
        userTeamGame: false,
      },
      {
        condition: 'DOME',
        sourceLabel: 'Stadium dome',
        sourceDetail: 'Home stadium type is dome; indoor conditions are display-only when matchup weather is missing.',
        userTeamGame: false,
      },
    ]);
  });

  it('filters User Team Only games', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} initialFilter="user" />);

    expect(markup).toContain('Austin Comets');
    expect(markup).not.toContain('Miami Lights');
  });

  it('filters Domes Only games', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} initialFilter="domes" />);

    expect(markup).toContain('Dallas Wranglers');
    expect(markup).not.toContain('Chicago Blaze');
  });

  it('marks impact-tier badges for game changers', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} />);

    expect(markup).toContain('data-impact-tier="game_changer"');
    expect(markup).toContain('Game Changer');
  });

  it('filters Outdoor Only games', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} initialFilter="outdoor" />);

    expect(markup).toContain('Chicago Blaze');
    expect(markup).toContain('Bay City Bridges');
    expect(markup).not.toContain('Dallas Wranglers');
  });

  it('renders the empty state when no games are scheduled', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={[]} week={8} />);

    expect(markup).toContain('No games scheduled this week.');
  });
});
