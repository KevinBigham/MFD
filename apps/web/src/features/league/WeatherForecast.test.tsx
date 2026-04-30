import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WeatherForecastView, type ForecastGame } from './WeatherForecast';

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
  },
];

describe('WeatherForecast', () => {
  it('renders the Forecast header', () => {
    const markup = renderToStaticMarkup(<WeatherForecastView games={GAMES} week={8} />);

    expect(markup).toContain('FORECAST');
    expect(markup).toContain('Week 8 forecast across the league.');
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
