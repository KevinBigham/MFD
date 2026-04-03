import { describe, expect, it } from 'vitest';
import { makeLeagueState, makePlayer } from './test-helpers';
import { generateDraftRecap } from './draft-recap';

function addRookie(
  game: ReturnType<typeof makeLeagueState>,
  teamId: string,
  playerId: string,
  pos: Parameters<typeof makePlayer>[2],
  ovr: number,
  round: number,
  pick: number,
) {
  const rookie = makePlayer(playerId, teamId, pos, ovr, false);
  rookie.age = 22;
  rookie.yearsExp = 0;
  rookie.draftYear = game.year;
  rookie.draftRound = round;
  rookie.draftPick = pick;
  rookie.teamId = teamId;
  game.players[rookie.id] = rookie;
  game.teams[teamId].roster.push(rookie);
  return rookie;
}

describe('draft recap', () => {
  it('generates a recap for a completed draft class', () => {
    const game = makeLeagueState('post_draft', 1);
    addRookie(game, 'afce1', 'rookie-a', 'QB', 83, 1, 12);
    addRookie(game, 'afce1', 'rookie-b', 'WR', 77, 2, 44);

    const recap = generateDraftRecap(game, 'afce1');

    expect(recap).not.toBeNull();
    expect(recap?.year).toBe(game.year);
    expect(recap?.picks.length).toBe(2);
  });

  it('flags a late high-value rookie as a steal', () => {
    const game = makeLeagueState('post_draft', 1);
    const steal = addRookie(game, 'afce1', 'steal', 'WR', 86, 4, 118);
    addRookie(game, 'afce1', 'fair', 'RB', 74, 2, 40);

    const recap = generateDraftRecap(game, 'afce1');

    expect(recap?.steals.some((entry) => entry.playerId === steal.id)).toBe(true);
  });

  it('flags an early low-value rookie as a reach', () => {
    const game = makeLeagueState('post_draft', 1);
    const reach = addRookie(game, 'afce1', 'reach', 'QB', 61, 1, 4);
    addRookie(game, 'afce1', 'steady', 'LB', 79, 2, 41);

    const recap = generateDraftRecap(game, 'afce1');

    expect(recap?.biggestReach.playerId).toBe(reach.id);
  });

  it('grades strong classes above weak classes', () => {
    const strongGame = makeLeagueState('post_draft', 1);
    addRookie(strongGame, 'afce1', 'strong-1', 'QB', 85, 1, 9);
    addRookie(strongGame, 'afce1', 'strong-2', 'WR', 82, 2, 41);

    const weakGame = makeLeagueState('post_draft', 1);
    addRookie(weakGame, 'afce1', 'weak-1', 'QB', 64, 1, 8);
    addRookie(weakGame, 'afce1', 'weak-2', 'WR', 63, 2, 45);

    const strong = generateDraftRecap(strongGame, 'afce1');
    const weak = generateDraftRecap(weakGame, 'afce1');

    expect((strong?.classGrade ?? 'F').localeCompare(weak?.classGrade ?? 'F')).toBeLessThan(0);
  });

  it('includes the league top five picks in league highlights', () => {
    const game = makeLeagueState('post_draft', 1);
    addRookie(game, 'afce1', 'p1', 'QB', 84, 1, 1);
    addRookie(game, 'afce2', 'p2', 'RB', 82, 1, 2);
    addRookie(game, 'afcn1', 'p3', 'WR', 81, 1, 3);
    addRookie(game, 'afcn2', 'p4', 'CB', 80, 1, 4);
    addRookie(game, 'nfce1', 'p5', 'DL', 79, 1, 5);

    const recap = generateDraftRecap(game, 'afce1');

    expect(recap?.leagueHighlights).toHaveLength(5);
  });
});
