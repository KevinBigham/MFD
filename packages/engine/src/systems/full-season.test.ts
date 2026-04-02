import { describe, expect, it } from 'vitest';
import { advanceFranchiseWeek, syncAllPlayerArchiveEntries } from '../index';
import { makeLeagueState } from './test-helpers';
import type { GameState, Player, ScheduleWeek } from '../types';

function makeSchedule(teamIds: string[]): ScheduleWeek[] {
  const teams = [...teamIds].sort();
  const weeks: ScheduleWeek[] = [];
  const working = [...teams];

  for (let week = 1; week <= 18; week += 1) {
    const games = [];
    for (let index = 0; index < working.length / 2; index += 1) {
      const home = week % 2 === 0 ? working[working.length - 1 - index]! : working[index]!;
      const away = week % 2 === 0 ? working[index]! : working[working.length - 1 - index]!;
      games.push({ homeTeamId: home, awayTeamId: away, result: null });
    }

    weeks.push({ week, games });
    const fixed = working[0]!;
    const rotated = [fixed, working[working.length - 1]!, ...working.slice(1, -1)];
    working.splice(0, working.length, ...rotated);
  }

  return weeks;
}

function findPlayer(game: GameState, playerId: string): Player | null {
  return game.players[playerId] ?? null;
}

function makeIntegrationGame(): GameState {
  const game = makeLeagueState('preseason', 1);
  const teamIds = Object.keys(game.teams);
  game.schedule = makeSchedule(teamIds);

  for (const team of Object.values(game.teams)) {
    team.isUser = false;
  }

  const breakout = game.teams.afce2!;
  breakout.gmStrategy = 'rebuild';
  const breakoutQb = breakout.roster.find((player) => player.pos === 'QB')!;
  const breakoutRb = breakout.roster.find((player) => player.pos === 'RB')!;
  const breakoutWr = breakout.roster.find((player) => player.pos === 'WR')!;
  breakoutQb.age = 24;
  breakoutQb.ovr = 83;
  breakoutQb.ratings.awareness = 85;
  breakoutRb.age = 23;
  breakoutRb.ovr = 82;
  breakoutWr.age = 24;
  breakoutWr.ovr = 81;

  const retireQb = game.teams.nfcs2!.roster.find((player) => player.pos === 'QB')!;
  retireQb.age = 36;
  retireQb.ovr = 55;
  retireQb.ratings.awareness = 55;

  const retireRb = game.teams.afcw2!.roster.find((player) => player.pos === 'RB')!;
  retireRb.age = 34;
  retireRb.ovr = 58;
  retireRb.ratings.speed = 57;

  const retireCb = game.teams.nfce2!.roster.find((player) => player.pos === 'CB')!;
  retireCb.age = 35;
  retireCb.ovr = 58;
  retireCb.ratings.speed = 56;

  syncAllPlayerArchiveEntries(game, game.year);
  return game;
}

describe('three-season integration loop', () => {
  it('simulates three consecutive seasons with progression, retirements, AI pivots, and realistic QB draft pressure', () => {
    let state = makeIntegrationGame();
    const trackedPlayerId = state.teams.afce2!.roster.find((player) => player.pos === 'QB')!.id;
    const startingOvr = findPlayer(state, trackedPlayerId)!.ovr;
    const startingYear = state.year;
    let completedSeasons = 0;
    let qbTopFiveDraftYears = 0;
    let guard = 0;

    while (completedSeasons < 3 && guard < 500) {
      if (state.phase === 'draft' && state.offseasonState) {
        const draftYear = state.year;
        const topFiveTeams = state.offseasonState.draftOrder.slice(0, 5).map((entry) => entry.teamId);
        state = advanceFranchiseWeek(state).nextState;
        const topFiveSelections = topFiveTeams.flatMap((teamId) =>
          state.teams[teamId]!.roster.filter((player) => player.draftYear === draftYear && player.draftRound === 1),
        );
        if (topFiveSelections.some((player) => player.pos === 'QB')) {
          qbTopFiveDraftYears += 1;
        }
      } else {
        const previousPhase = state.phase;
        state = advanceFranchiseWeek(state).nextState;
        if (previousPhase === 'playoffs' && state.phase === 'offseason') {
          completedSeasons += 1;
        }
      }

      guard += 1;
    }

    const trackedPlayer = findPlayer(state, trackedPlayerId);
    const retiredPlayers = state.playerArchive.filter((entry) => entry.retirementYear !== null);
    const middlingTeams = state.franchiseHistory.filter((entry) => {
      if (entry.year < startingYear) return false;
      const games = entry.wins + entry.losses + entry.ties;
      const winPct = games > 0 ? (entry.wins + entry.ties * 0.5) / games : 0;
      return winPct >= 0.45 && winPct <= 0.55;
    });

    expect(guard).toBeLessThan(500);
    expect(completedSeasons).toBe(3);
    expect(trackedPlayer?.ovr).not.toBe(startingOvr);
    expect(retiredPlayers.length).toBeGreaterThanOrEqual(3);
    expect(state.eventLog.some((event) => event.type === 'gm_strategy_shift')).toBe(true);
    expect(qbTopFiveDraftYears).toBeGreaterThanOrEqual(1);
    expect(middlingTeams.some((entry) => state.teams[entry.teamId]!.ownerPatience80 > 25)).toBe(true);
  });
});
