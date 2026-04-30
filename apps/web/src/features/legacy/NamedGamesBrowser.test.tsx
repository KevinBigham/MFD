import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NamedGame } from '@mfd/engine';
import { NamedGamesBrowserView } from './NamedGamesBrowser';

function makeGame(overrides: Partial<NamedGame> = {}): NamedGame {
  return {
    name: 'The Reckoning',
    archetype: 'comeback',
    gameId: 'g-1',
    year: 2030,
    week: 12,
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    winnerTeamId: 'team-home',
    homeScore: 31,
    awayScore: 27,
    reason: 'Trailed by 17 in the fourth and walked it off on a strip-six.',
    ...overrides,
  };
}

describe('NamedGamesBrowserView', () => {
  it('renders the empty state when no named games are filed', () => {
    const markup = renderToStaticMarkup(
      <NamedGamesBrowserView games={[]} userTeamId="team-home" />,
    );

    expect(markup).toContain('NAMED GAMES');
    expect(markup).toContain('No named games filed yet');
    expect(markup).toContain('0 archived');
  });

  it('renders one card per filed game with score and reason', () => {
    const games = [
      makeGame({ gameId: 'a', name: 'The Reckoning', year: 2031, week: 8 }),
      makeGame({
        gameId: 'b',
        name: 'The Collapse',
        year: 2030,
        week: 10,
        archetype: 'collapse',
        winnerTeamId: 'team-away',
        homeScore: 14,
        awayScore: 38,
        reason: 'Up 21 at halftime, no second-half offense, leadership crater.',
      }),
    ];
    const markup = renderToStaticMarkup(
      <NamedGamesBrowserView games={games} userTeamId="team-home" />,
    );

    expect(markup).toContain('The Reckoning');
    expect(markup).toContain('The Collapse');
    expect(markup).toContain('31-27');
    expect(markup).toContain('14-38');
    expect(markup).toContain('Up 21 at halftime, no second-half offense, leadership crater.');
    expect(markup).toContain('2 archived');
  });

  it('badges your wins and losses against the user team', () => {
    const games = [
      makeGame({ gameId: 'win', winnerTeamId: 'team-user', homeTeamId: 'team-user' }),
      makeGame({
        gameId: 'loss',
        archetype: 'collapse',
        homeTeamId: 'team-user',
        winnerTeamId: 'team-other',
      }),
    ];
    const markup = renderToStaticMarkup(
      <NamedGamesBrowserView games={games} userTeamId="team-user" />,
    );

    expect(markup).toContain('YOUR WIN');
    expect(markup).toContain('YOUR LOSS');
    expect(markup).toContain('2 you played');
    expect(markup).toContain('1 you won');
  });

  it('exposes archetype filter buttons only for archetypes that have games', () => {
    const games = [
      makeGame({ gameId: '1', archetype: 'shootout' }),
      makeGame({ gameId: '2', archetype: 'shootout' }),
      makeGame({ gameId: '3', archetype: 'snow_bowl' }),
    ];
    const markup = renderToStaticMarkup(
      <NamedGamesBrowserView games={games} userTeamId={null} />,
    );

    expect(markup).toContain('archetype-filter-shootout');
    expect(markup).toContain('archetype-filter-snow_bowl');
    expect(markup).not.toContain('archetype-filter-yard_miracle');
    // Counts are surfaced inline on each filter chip.
    expect(markup).toContain('Shootout (2)');
    expect(markup).toContain('Snow Bowl (1)');
  });

  it('humanizes every archetype label so no internal snake_case leaks', () => {
    const games: NamedGame[] = [
      makeGame({ gameId: '1', archetype: 'yard_miracle' }),
      makeGame({ gameId: '2', archetype: 'ghost_game' }),
      makeGame({ gameId: '3', archetype: 'gauntlet_game' }),
      makeGame({ gameId: '4', archetype: 'snow_bowl' }),
      makeGame({ gameId: '5', archetype: 'coin_flip' }),
    ];
    const markup = renderToStaticMarkup(
      <NamedGamesBrowserView games={games} userTeamId={null} />,
    );

    expect(markup).toContain('Yard Miracle');
    expect(markup).toContain('Ghost Game');
    expect(markup).toContain('Gauntlet');
    expect(markup).toContain('Snow Bowl');
    expect(markup).toContain('Coin Flip');
    // Snake-case underscores must never reach the rendered chip label.
    expect(markup).not.toContain('yard_miracle (');
    expect(markup).not.toContain('ghost_game (');
  });

  it('always offers a back-to-legacy navigation control', () => {
    const markup = renderToStaticMarkup(
      <NamedGamesBrowserView games={[]} userTeamId={null} />,
    );

    expect(markup).toContain('Back to Legacy');
  });

  it('shows a sort row even when no games are filed yet', () => {
    const markup = renderToStaticMarkup(
      <NamedGamesBrowserView games={[]} userTeamId={null} />,
    );

    expect(markup).toContain('Newest First');
    expect(markup).toContain('Oldest First');
    expect(markup).toContain('By Name');
  });
});
