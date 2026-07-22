import { describe, expect, it } from 'vitest';
import { createRngState } from '../rng';
import type { GamePlan } from '../types';
import { advanceFranchiseWeek } from './franchise-week';
import { createSimulationContext, simGame } from './game-sim';
import { makeLeagueState, makeTeam } from './test-helpers';

function makePlan(overrides: Partial<GamePlan> = {}): GamePlan {
  return {
    offensiveScheme: 'balanced',
    defensiveScheme: 'base',
    keyMatchup: null,
    gamePlanBonus: 0,
    contingencyRules: [],
    ...overrides,
  };
}

function setTeamStrength(game: ReturnType<typeof makeLeagueState>, teamId: string, ovr: number): void {
  for (const player of game.teams[teamId]!.roster) {
    player.ovr = ovr;
    player.pot = Math.max(player.pot, ovr);
    for (const rating of Object.keys(player.ratings)) {
      player.ratings[rating] = ovr;
    }
  }
}

describe('contingency wiring', () => {
  it('fires authored contingencies at quarter breaks and records the response label', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 62);
    const away = makeTeam('away', 'NFC', 'West', false, 90);
    const homePlan = makePlan({
      contingencyRules: [{
        id: 'home-trail',
        trigger: 'down_by',
        threshold: 14,
        response: 'go_air_raid',
        label: 'IF DOWN BY 14+ -> GO AIR RAID',
        description: 'Open the offense when the scoreboard gets sideways.',
      }],
    });

    let activation: ReturnType<typeof simGame>['contingencyActivations'][number] | undefined;
    for (let seed = 1; seed <= 300; seed += 1) {
      const result = simGame(home, away, createSimulationContext({
        home: { gamePlan: homePlan },
      }, createRngState(seed)));
      activation = result.contingencyActivations.find((entry) => entry.ruleId === 'home-trail');
      if (activation) break;
    }

    expect(activation).toEqual(expect.objectContaining({
      teamId: 'home',
      responseLabel: 'Go Air Raid',
    }));
  });

  it('uses the contingency action so the live play mix changes once it fires', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 78);
    const away = makeTeam('away', 'NFC', 'West', false, 78);
    const contingentPlan = makePlan({
      contingencyRules: [{
        id: 'run-late',
        trigger: 'up_by',
        threshold: 21,
        response: 'kill_clock',
        label: 'IF UP BIG -> KILL CLOCK',
        description: 'Sit on the lead.',
      }],
    });

    let changedByContingency = false;
    for (let seed = 1; seed <= 300; seed += 1) {
      const baseline = simGame(home, away, createSimulationContext({
        home: { gamePlan: makePlan() },
        weather: 'dome',
      }, createRngState(seed)));
      const contingent = simGame(home, away, createSimulationContext({
        home: { gamePlan: contingentPlan },
        weather: 'dome',
      }, createRngState(seed)));

      const activated = contingent.contingencyActivations.some((entry) => entry.ruleId === 'run-late');
      const changed = contingent.homeStats.rushAttempts !== baseline.homeStats.rushAttempts
        || contingent.homeStats.passAttempts !== baseline.homeStats.passAttempts;

      if (activated && changed) {
        changedByContingency = true;
        break;
      }
    }

    expect(changedByContingency).toBe(true);
  });

  it('adds contingency callouts into the broadcast ghost-line queue', () => {
    let boothAlert: string | undefined;

    for (let seed = 1; seed <= 150; seed += 1) {
      const game = makeLeagueState('regular_season', 1);
      setTeamStrength(game, 'afce1', 58);
      setTeamStrength(game, 'afce2', 92);
      game.gamePlan = makePlan({
        contingencyRules: [{
          id: 'half-pressure',
          trigger: 'end_of_q2_losing',
          response: 'pressure_every_down',
          label: 'IF LOSING AT HALF -> PRESSURE EVERY DOWN',
          description: 'Turn the rush loose.',
        }],
      });

      const result = advanceFranchiseWeek(game);
      const userGame = result.nextState.schedule[0]!.games[0]!.result!;
      const callout = userGame.broadcast?.ghostLines?.find((line) =>
        line.source === 'callout'
        && line.commentatorName === 'Booth Alert'
        && line.trigger === 'quarter_break'
      );
      boothAlert = callout?.commentary;
      if (boothAlert) break;
    }

    expect(boothAlert).toBeTruthy();
  });

  it('records a league news inbox item when a user contingency fires', () => {
    let headline: string | undefined;

    for (let seed = 1; seed <= 150; seed += 1) {
      const game = makeLeagueState('regular_season', 1);
      setTeamStrength(game, 'afce1', 58);
      setTeamStrength(game, 'afce2', 92);
      game.gamePlan = makePlan({
        contingencyRules: [{
          id: 'late-push',
          trigger: 'opponent_td_lead_after_halftime',
          response: 'go_for_it_on_4th',
          label: 'IF DOWN A TD AFTER HALF -> GO FOR IT ON 4TH',
          description: 'Math-only football the rest of the way.',
        }],
      });

      const result = advanceFranchiseWeek(game);
      headline = result.nextState.leagueNews.find((item) => item.id.includes('contingency'))?.headline;
      if (headline) break;
    }

    expect(headline).toContain('Contingency fired');
  });

  it('does not fire the same contingency rule more than once', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 80);
    const away = makeTeam('away', 'NFC', 'West', false, 80);
    const homePlan = makePlan({
      contingencyRules: [{
        id: 'single-fire',
        trigger: 'wind_over_15',
        action: { type: 'switch_offense', scheme: 'run_heavy' },
        label: 'IF WINDY -> RUN HEAVY',
        description: 'Legacy single-fire rule.',
      }],
    });

    const result = simGame(home, away, createSimulationContext({
      home: { gamePlan: homePlan },
      weather: 'wind',
    }, createRngState(44)));

    expect(result.contingencyActivations.filter((entry) => entry.ruleId === 'single-fire')).toHaveLength(1);
  });
});
