import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SuperBowlPresentationView } from './SuperBowlPresentation';

describe('SuperBowlPresentationView', () => {
  it('renders fallback when no context', () => {
    const markup = renderToStaticMarkup(
      <SuperBowlPresentationView
        context={null}
        halftimeShow={null}
        mvp={null}
        parade={null}
        championName={null}
        narrative={null}
        awardSpeech={null}
      />,
    );
    expect(markup).toContain('not yet been played');
    expect(markup).toContain('SUPER BOWL SOURCES');
  });

  it('renders matchup card with Super Bowl number', () => {
    const markup = renderToStaticMarkup(
      <SuperBowlPresentationView
        context={{
          number: 'LVIII',
          matchup: 'Kansas City Chiefs vs San Francisco 49ers',
          venue: 'Apex Dome, Los Angeles',
          storylines: ['Dynasty territory.'],
        }}
        halftimeShow={null}
        mvp={null}
        parade={null}
        championName="Kansas City Chiefs"
        narrative="Super Bowl LVIII: Kansas City Chiefs win 25-22."
        awardSpeech={null}
      />,
    );
    expect(markup).toContain('Super Bowl LVIII');
    expect(markup).toContain('Kansas City Chiefs vs San Francisco 49ers');
    expect(markup).toContain('Apex Dome');
  });

  it('renders halftime show details', () => {
    const markup = renderToStaticMarkup(
      <SuperBowlPresentationView
        context={{
          number: 'LX',
          matchup: 'Team A vs Team B',
          venue: 'Test Venue',
          storylines: [],
        }}
        halftimeShow={{
          performer: 'Nova Eclipse',
          genre: 'pop',
          description: 'A dazzling show.',
          rating: 4,
        }}
        mvp={null}
        parade={null}
        championName={null}
        narrative={null}
        awardSpeech={null}
      />,
    );
    expect(markup).toContain('Nova Eclipse');
    expect(markup).toContain('POP');
    expect(markup).toContain('HALFTIME SHOW');
  });

  it('renders MVP award', () => {
    const markup = renderToStaticMarkup(
      <SuperBowlPresentationView
        context={{
          number: 'LX',
          matchup: 'Team A vs Team B',
          venue: 'Test Venue',
          storylines: [],
        }}
        halftimeShow={null}
        mvp={{
          playerId: 'p1',
          playerName: 'Patrick Starfish',
          pos: 'QB',
          stats: '300 pass yds, 3 TD',
          narrative: 'Patrick Starfish was named Super Bowl MVP.',
        }}
        parade={null}
        championName={null}
        narrative={null}
        awardSpeech={null}
      />,
    );
    expect(markup).toContain('Patrick Starfish');
    expect(markup).toContain('Super Bowl MVP');
    expect(markup).toContain('QB');
  });

  it('renders parade details with attendance', () => {
    const markup = renderToStaticMarkup(
      <SuperBowlPresentationView
        context={{
          number: 'LX',
          matchup: 'Team A vs Team B',
          venue: 'Test Venue',
          storylines: [],
        }}
        halftimeShow={null}
        mvp={null}
        parade={{
          city: 'Kansas City',
          attendance: 2500000,
          headline: 'Kansas City Chiefs parade draws 2.5M fans',
          highlights: ['Mayor presented the key to the city.'],
          mvpSpeech: '"This city deserves this."',
        }}
        championName="Kansas City Chiefs"
        narrative={null}
        awardSpeech={null}
      />,
    );
    expect(markup).toContain('CHAMPIONSHIP PARADE');
    expect(markup).toContain('2.5M');
    expect(markup).toContain('key to the city');
  });

  it('renders the podium speech excerpt when present', () => {
    const markup = renderToStaticMarkup(
      <SuperBowlPresentationView
        context={{
          number: 'LX',
          matchup: 'Team A vs Team B',
          venue: 'Test Venue',
          storylines: [],
        }}
        halftimeShow={null}
        mvp={null}
        parade={null}
        championName="Team A"
        narrative={null}
        awardSpeech={{
          presenterIntro: 'Leadership, production, and wins. Please welcome your MVP, Patrick Starfish!',
          acceptance: "I'm honored, but I'm also hungry. One MVP doesn't define a career.",
        }}
      />,
    );

    expect(markup).toContain('CHAMPION PODIUM');
    expect(markup).toContain('Patrick Starfish');
    expect(markup).toContain('One MVP doesn&#x27;t define a career.');
  });

  it('labels presentation sources without implying route writes', () => {
    const markup = renderToStaticMarkup(
      <SuperBowlPresentationView
        context={{
          number: 'LX',
          matchup: 'Team A vs Team B',
          venue: 'Test Venue',
          storylines: ['Dynasty territory.'],
        }}
        halftimeShow={{
          performer: 'Nova Eclipse',
          genre: 'pop',
          description: 'A dazzling show.',
          rating: 4,
        }}
        mvp={{
          playerId: 'p1',
          playerName: 'Patrick Starfish',
          pos: 'QB',
          stats: '300 pass yds, 3 TD',
          narrative: 'Patrick Starfish was named Super Bowl MVP.',
        }}
        parade={null}
        championName="Team A"
        narrative="Team A won the title."
        awardSpeech={{
          presenterIntro: 'Please welcome your MVP.',
          acceptance: 'This locker room earned it.',
        }}
      />,
    );

    expect(markup).toContain('SUPER BOWL SOURCES');
    expect(markup).toContain('saved playoffBracket');
    expect(markup).toContain('deterministic helpers');
    expect(markup).toContain('browser-local dismissal');
    expect(markup).toContain('generateSuperBowlContext');
    expect(markup).toContain('generateSuperBowlMVP');
    expect(markup).toContain('generateChampionParade');
    expect(markup).toContain('getAwardSpeech');
    expect(markup).toContain('mfd-celebration-dismissed');
    expect(markup).toContain('not cartridge state');
    expect(markup).toContain('Opening this route does not write playoff brackets');
    expect(markup).toContain('simulation outcomes');
  });
});
