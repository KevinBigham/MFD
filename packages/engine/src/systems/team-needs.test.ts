import { describe, expect, it } from 'vitest';
import { makeLeagueState, makePlayer } from './test-helpers';
import { analyzeTeamNeeds, compareTeamNeeds } from './team-needs';

describe('team needs system', () => {
  it('grades all 11 position groups', () => {
    const game = makeLeagueState();
    const report = analyzeTeamNeeds(game.teams.afce1!, {
      QB: 78, RB: 76, WR: 77, TE: 75, OL: 76, DL: 76, LB: 75, CB: 75, S: 74, K: 70, P: 70,
    });

    expect(report.positionGrades).toHaveLength(11);
  });

  it('assigns A+ to groups far above league average', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    team.roster.filter((player) => player.pos === 'QB').forEach((player) => { player.ovr = 92; });

    const report = analyzeTeamNeeds(team, {
      QB: 80, RB: 76, WR: 77, TE: 75, OL: 76, DL: 76, LB: 75, CB: 75, S: 74, K: 70, P: 70,
    });

    expect(report.positionGrades.find((entry) => entry.group === 'QB')?.grade).toBe('A+');
  });

  it('assigns F to groups far below league average', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    team.roster = team.roster.filter((player) => player.pos !== 'CB');
    team.roster.push(makePlayer('afce1-cb3', team.id, 'CB', 58));
    team.roster.push(makePlayer('afce1-cb4', team.id, 'CB', 55, false));

    const report = analyzeTeamNeeds(team, {
      QB: 80, RB: 76, WR: 77, TE: 75, OL: 76, DL: 76, LB: 75, CB: 76, S: 74, K: 70, P: 70,
    });

    expect(report.positionGrades.find((entry) => entry.group === 'CB')?.grade).toBe('F');
  });

  it('identifies the weakest three groups as critical needs', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    for (const player of team.roster) {
      if (player.pos === 'K' || player.pos === 'P' || player.pos === 'S') {
        player.ovr = 58;
      }
    }

    const report = analyzeTeamNeeds(team, {
      QB: 80, RB: 76, WR: 77, TE: 75, OL: 76, DL: 76, LB: 75, CB: 76, S: 74, K: 72, P: 72,
    });

    expect(report.criticalNeeds).toHaveLength(3);
    expect(report.criticalNeeds).toEqual(expect.arrayContaining(['K', 'P', 'S']));
  });

  it('flags age risk when a room has multiple older starters', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    for (const player of team.roster.filter((entry) => entry.pos === 'WR')) {
      player.age = 31;
      player.isStarter = true;
    }

    const report = analyzeTeamNeeds(team, {
      QB: 80, RB: 76, WR: 77, TE: 75, OL: 76, DL: 76, LB: 75, CB: 76, S: 74, K: 72, P: 72,
    });

    expect(report.positionGrades.find((entry) => entry.group === 'WR')?.ageRisk).toBe('high');
  });

  it('does not treat a weak QB3 as a crisis behind a strong starter and backup', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    team.roster = team.roster.filter((player) => player.pos !== 'QB');
    team.roster.push(makePlayer('qb1', team.id, 'QB', 91));
    team.roster.push(makePlayer('qb2', team.id, 'QB', 76, false));
    team.roster.push(makePlayer('qb3', team.id, 'QB', 45, false));

    const report = analyzeTeamNeeds(team, {
      QB: 78, RB: 76, WR: 77, TE: 75, OL: 76, DL: 76, LB: 75, CB: 76, S: 74, K: 72, P: 72,
    });
    const qb = report.positionGrades.find((entry) => entry.group === 'QB')!;

    expect(qb.starterOvr).toBe(91);
    expect(qb.needScore).toBe(0);
  });

  it('emits concrete depth and age reasons for a fragile quarterback room', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    team.roster = team.roster.filter((player) => player.pos !== 'QB');
    const starter = makePlayer('qb1', team.id, 'QB', 82);
    starter.age = 31;
    team.roster.push(starter, makePlayer('qb2', team.id, 'QB', 58, false));

    const report = analyzeTeamNeeds(team, {
      QB: 84, RB: 76, WR: 77, TE: 75, OL: 76, DL: 76, LB: 75, CB: 76, S: 74, K: 72, P: 72,
    });
    const reasons = report.positionGrades.find((entry) => entry.group === 'QB')?.reasonCodes ?? [];

    expect(reasons).toContain('QB2 is 58 OVR');
    expect(reasons).toContain('QB1 is 31 years old');
  });

  it('compares strengths and weaknesses between two teams', () => {
    const game = makeLeagueState();
    const comparison = compareTeamNeeds(game.teams.afce1!, game.teams.afce2!, {
      QB: 80, RB: 76, WR: 77, TE: 75, OL: 76, DL: 76, LB: 75, CB: 76, S: 74, K: 72, P: 72,
    });

    expect(comparison).toHaveLength(11);
    expect(comparison.every((entry) => typeof entry.group === 'string')).toBe(true);
  });
});
