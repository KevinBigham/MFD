import { describe, expect, it } from 'vitest';
import {
  assignKickReturner,
  autoAssignSpecialTeams,
  calculateReturnYards,
  createDefaultSpecialTeamsState,
  simulateSpecialTeams,
} from './special-teams';
import { makeLeagueState, makePlayer } from './test-helpers';

describe('special teams', () => {
  it('fast returners gain more return yards on average', () => {
    const fastReturner = makePlayer('fast', 'afce1', 'WR', 84, false);
    fastReturner.ratings.speed = 95;
    const averageReturner = makePlayer('average', 'afce1', 'WR', 84, false);
    averageReturner.ratings.speed = 78;

    const fast = calculateReturnYards(fastReturner, 72, () => 0.4);
    const average = calculateReturnYards(averageReturner, 72, () => 0.4);

    expect(fast.yards).toBeGreaterThan(average.yards);
  });

  it('top returners can score touchdowns', () => {
    const returner = makePlayer('elite', 'afce1', 'RB', 88, false);
    returner.ratings.speed = 96;

    const result = calculateReturnYards(returner, 68, () => 0);

    expect(result.touchdown).toBe(true);
  });

  it('returns include fumble risk', () => {
    const returner = makePlayer('loose', 'afce1', 'WR', 76, false);
    returner.ratings.speed = 82;
    returner.ratings.ballSecurity = 40;

    const result = calculateReturnYards(returner, 78, () => 0.01);

    expect(result.fumble).toBe(true);
  });

  it('auto-assigns the fastest eligible returner', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const burner = makePlayer('burner', team.id, 'WR', 79, false);
    burner.ratings.speed = 97;
    team.roster.push(burner);
    game.players[burner.id] = burner;
    team.specialTeams = createDefaultSpecialTeamsState();

    autoAssignSpecialTeams(game, team.id);

    expect(team.specialTeams.kickReturner).toBe('burner');
    expect(team.specialTeams.puntReturner).toBe('burner');
  });

  it('ties kicker strength to touchback rate', () => {
    const game = makeLeagueState();
    const home = game.teams.afce1!;
    const away = game.teams.afce2!;
    home.specialTeams = createDefaultSpecialTeamsState();
    away.specialTeams = createDefaultSpecialTeamsState();
    assignKickReturner(game, home.id, home.roster.find((player) => player.pos === 'WR')!.id);
    assignKickReturner(game, away.id, away.roster.find((player) => player.pos === 'WR')!.id);
    const kicker = home.roster.find((player) => player.pos === 'K')!;
    kicker.ovr = 92;

    const result = simulateSpecialTeams(home, away, () => 0.1);

    expect(result.home.touchbackRate).toBeGreaterThan(0.5);
  });
});
