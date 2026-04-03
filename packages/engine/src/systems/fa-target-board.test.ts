import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { makeLeagueState, makePlayer } from './test-helpers';
import { addToWatchlist, buildFATargetBoard, removeFromWatchlist } from './fa-target-board';

describe('free agency target board', () => {
  it('builds a board for a team with obvious needs', () => {
    const game = makeLeagueState('free_agency', 1);
    const team = game.teams.afce1!;
    for (const player of team.roster.filter((entry) => entry.pos === 'CB')) {
      player.ovr = 60;
    }
    const freeAgents = [
      makePlayer('fa-cb-1', null, 'CB', 84),
      makePlayer('fa-wr-1', null, 'WR', 82),
      makePlayer('fa-lb-1', null, 'LB', 80),
    ];

    const board = buildFATargetBoard(team, freeAgents, Object.values(game.teams), mulberry32(42));

    expect(board.targets.length).toBe(3);
    expect(board.bestFits[0]?.player.pos).toBe('CB');
  });

  it('projects salary upward for stronger younger players', () => {
    const game = makeLeagueState('free_agency', 1);
    const team = game.teams.afce1!;
    const star = makePlayer('fa-star', null, 'WR', 90);
    const veteran = makePlayer('fa-vet', null, 'WR', 78);
    veteran.age = 31;

    const board = buildFATargetBoard(team, [star, veteran], Object.values(game.teams), mulberry32(7));
    const [top, lower] = board.topAvailable;

    expect(top!.projectedSalary).toBeGreaterThan(lower!.projectedSalary);
  });

  it('reflects market demand from league-wide scarcity', () => {
    const game = makeLeagueState('free_agency', 1);
    for (const team of Object.values(game.teams)) {
      for (const player of team.roster.filter((entry) => entry.pos === 'OL')) {
        player.ovr = 60;
      }
    }
    const board = buildFATargetBoard(
      game.teams.afce1!,
      [makePlayer('fa-ol-1', null, 'OL', 82)],
      Object.values(game.teams),
      mulberry32(11),
    );

    expect(board.targets[0]?.marketDemand).toBe('high');
  });

  it('watchlist add and remove are persistent pure updates', () => {
    const state = { teamId: 'afce1', watchlist: [], targets: [] };
    const added = addToWatchlist(state, 'p1');
    const removed = removeFromWatchlist(added, 'p1');

    expect(added.watchlist).toEqual(['p1']);
    expect(removed.watchlist).toEqual([]);
  });

  it('surfaces bargains as high-value lower-salary players', () => {
    const game = makeLeagueState('free_agency', 1);
    const team = game.teams.afce1!;
    const youngSafety = makePlayer('fa-s-1', null, 'S', 80);
    youngSafety.age = 24;
    const oldStar = makePlayer('fa-s-2', null, 'S', 82);
    oldStar.age = 33;

    const board = buildFATargetBoard(team, [youngSafety, oldStar], Object.values(game.teams), mulberry32(99));

    expect(board.bargains.length).toBeGreaterThan(0);
    expect(board.bargains[0]!.player.id).toBeTruthy();
  });

  it('calculates sign probability from cap space and competition', () => {
    const game = makeLeagueState('free_agency', 1);
    const team = game.teams.afce1!;
    team.capSpace = 45;
    const target = makePlayer('fa-qb', null, 'QB', 85);
    const board = buildFATargetBoard(team, [target], Object.values(game.teams), mulberry32(5));

    expect(board.targets[0]!.signProbability).toBeGreaterThanOrEqual(0);
    expect(board.targets[0]!.signProbability).toBeLessThanOrEqual(100);
  });
});
