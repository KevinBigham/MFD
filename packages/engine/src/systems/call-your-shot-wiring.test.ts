import { describe, expect, it } from 'vitest';
import { advanceFranchiseWeek } from './franchise-week';
import { evaluateCallYourShotResult, type CallYourShotResult, type ShotDeclaration } from './call-your-shot';
import { makeLeagueState } from './test-helpers';
import type { GameResult, GameState } from '../types';

type AdvanceWeekWithShot = ReturnType<typeof advanceFranchiseWeek> & {
  callYourShotResult?: CallYourShotResult;
};

function getUserGameResult(nextState: GameState): GameResult {
  const userGame = nextState.schedule
    .flatMap((entry) => entry.games)
    .find((game) => game.homeTeamId === 'afce1' || game.awayTeamId === 'afce1');

  if (userGame?.result === undefined) {
    throw new Error('Expected the user game to have a result after advancing the week.');
  }

  return userGame.result;
}

function setTeamStrength(game: GameState, teamId: string, ovr: number): void {
  for (const player of game.teams[teamId]!.roster) {
    player.ovr = ovr;
    player.pot = Math.max(player.pot, ovr);
    for (const rating of Object.keys(player.ratings)) {
      player.ratings[rating] = ovr;
    }
  }
}

function findDeclarationForOutcome(result: GameResult, expectedSuccess: boolean): ShotDeclaration {
  const declarations: ShotDeclaration[] = [
    'run_dominant',
    'air_attack',
    'defensive_shutout',
    'total_domination',
    'underdog_special',
  ];
  const declaration = declarations.find((entry) =>
    evaluateCallYourShotResult(() => 0.5, entry, result, 'afce1').success === expectedSuccess);

  expect(declaration).toBeDefined();
  return declaration!;
}

function withActiveShot(game: GameState, declaration: ShotDeclaration): GameState {
  (game as GameState & { activeCallYourShot?: ShotDeclaration }).activeCallYourShot = declaration;
  return game;
}

describe('call-your-shot wiring', () => {
  it('resolves a declared shot after the user game finishes', () => {
    const game = withActiveShot(makeLeagueState('regular_season', 1), 'underdog_special');

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithShot;

    expect(result.callYourShotResult).toBeDefined();
    expect(getUserGameResult(result.nextState) as GameResult & { callYourShotResult?: CallYourShotResult }).toMatchObject({
      callYourShotResult: expect.objectContaining({
        outcome: expect.any(String),
      }),
    });
  });

  it('clears the active declaration after resolution', () => {
    const game = withActiveShot(makeLeagueState('regular_season', 1), 'underdog_special');

    const result = advanceFranchiseWeek(game);

    expect((result.nextState as GameState & { activeCallYourShot?: ShotDeclaration }).activeCallYourShot).toBeUndefined();
  });

  it('does not resolve anything when no shot is declared', () => {
    const game = makeLeagueState('regular_season', 1);

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithShot;

    expect(result.callYourShotResult).toBeUndefined();
  });

  it('returns a success result when the declaration conditions are met', () => {
    const baselineGame = makeLeagueState('regular_season', 1);
    setTeamStrength(baselineGame, 'afce1', 99);
    setTeamStrength(baselineGame, 'afce2', 40);
    const baselineResult = advanceFranchiseWeek(baselineGame);
    const declaration = findDeclarationForOutcome(getUserGameResult(baselineResult.nextState), true);

    const wiredGame = makeLeagueState('regular_season', 1);
    setTeamStrength(wiredGame, 'afce1', 99);
    setTeamStrength(wiredGame, 'afce2', 40);
    withActiveShot(wiredGame, declaration);

    const result = advanceFranchiseWeek(wiredGame) as AdvanceWeekWithShot;

    expect(result.callYourShotResult?.declaration).toBe(declaration);
    expect(result.callYourShotResult?.success).toBe(true);
    const latestPackage = result.nextState.gameDayState.recentPackages.at(-1) as { callYourShotResult?: CallYourShotResult } | undefined;
    expect(latestPackage?.callYourShotResult?.declaration).toBe(declaration);
  });

  it('returns a failure result when the declaration conditions are not met', () => {
    const baselineGame = makeLeagueState('regular_season', 1);
    setTeamStrength(baselineGame, 'afce1', 40);
    setTeamStrength(baselineGame, 'afce2', 99);
    const baselineResult = advanceFranchiseWeek(baselineGame);
    const declaration = findDeclarationForOutcome(getUserGameResult(baselineResult.nextState), false);

    const wiredGame = makeLeagueState('regular_season', 1);
    setTeamStrength(wiredGame, 'afce1', 40);
    setTeamStrength(wiredGame, 'afce2', 99);
    withActiveShot(wiredGame, declaration);

    const result = advanceFranchiseWeek(wiredGame) as AdvanceWeekWithShot;

    expect(result.callYourShotResult?.declaration).toBe(declaration);
    expect(result.callYourShotResult?.success).toBe(false);
  });
});
