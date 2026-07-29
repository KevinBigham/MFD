import { describe, expect, it } from 'vitest';
import type { Player, Position } from '../types';
import { makeContract } from './contracts';
import {
  applyRecommendedDepthChart,
  buildCutAdvisor,
  buildRecommendedStarterIds,
  detectPositionBattles,
  STARTER_SLOTS,
} from './roster-management';
import { makeLeagueState, makePlayer } from './test-helpers';

function makeRosterPlayer(
  id: string,
  pos: Position,
  ovr: number,
  options: Partial<Player> = {},
): Player {
  const player = makePlayer(id, 'battle-team', pos, ovr, options.isStarter ?? true);
  player.age = options.age ?? player.age;
  player.pot = options.pot ?? player.pot;
  player.isStarter = options.isStarter ?? player.isStarter;
  player.injury = options.injury ?? player.injury;
  player.contract = options.contract ?? player.contract;
  return player;
}

function makeBoundaryGroup(pos: Position, slots: number): Player[] {
  const players = Array.from({ length: slots + 1 }, (_, index) =>
    makeRosterPlayer(`${pos.toLowerCase()}-${index + 1}`, pos, 85 - index * 2, {
      isStarter: index < slots,
    }),
  );
  players[slots]!.ovr = players[slots - 1]!.ovr - 3;
  return players;
}

describe('roster-management direct coverage', () => {
  it('builds a deterministic legal recommendation that benches unavailable players', () => {
    const healthy = makeRosterPlayer('qb-healthy', 'QB', 82, { isStarter: false });
    healthy.systemFit = 75;
    const injured = makeRosterPlayer('qb-injured', 'QB', 95);
    injured.injury = {
      id: 'qb-injury',
      type: 'knee',
      severity: 'out',
      severityTier: 'severe',
      gamesOut: 3,
      gamesRecovered: 0,
      reinjuryRisk: 0.2,
      affectedRatings: [],
      ratingPenalty: 8,
      onIR: false,
    };
    const wrFit = makeRosterPlayer('wr-fit', 'WR', 80, { isStarter: false });
    wrFit.systemFit = 90;
    const wrTie = makeRosterPlayer('wr-tie', 'WR', 80, { isStarter: true });
    wrTie.systemFit = 70;
    const wrTop = makeRosterPlayer('wr-top', 'WR', 88, { isStarter: false });
    const wrFourth = makeRosterPlayer('wr-fourth', 'WR', 77, { isStarter: true });

    const first = buildRecommendedStarterIds([injured, wrFourth, wrTie, healthy, wrFit, wrTop]);
    const second = buildRecommendedStarterIds([wrTop, healthy, wrFit, injured, wrTie, wrFourth]);

    expect(first).toEqual(second);
    expect(first).toContain('qb-healthy');
    expect(first).not.toContain('qb-injured');
    expect(first.filter((id) => id.startsWith('wr-'))).toEqual(['wr-top', 'wr-fit', 'wr-tie']);
  });

  it('uses stable player id as the final recommendation tiebreak', () => {
    const tiedReceivers = ['wr-zulu', 'wr-alpha', 'wr-mike', 'wr-bravo'].map((id) => {
      const player = makeRosterPlayer(id, 'WR', 80, { isStarter: false });
      player.systemFit = 75;
      return player;
    });

    expect(buildRecommendedStarterIds(tiedReceivers)).toEqual([
      'wr-alpha',
      'wr-bravo',
      'wr-mike',
    ]);
  });

  it('applies recommended starters and special teams to roster and player mirrors', () => {
    const game = makeLeagueState();
    const team = Object.values(game.teams).find((entry) => entry.isUser)!;
    const expectedStarterCount = Object.entries(STARTER_SLOTS).reduce(
      (total, [position, slots]) =>
        total + Math.min(slots, team.roster.filter((player) => player.pos === position).length),
      0,
    );

    const result = applyRecommendedDepthChart(game, team.id);
    const selected = new Set(result.starterIds);

    expect(result.starterIds).toHaveLength(expectedStarterCount);
    expect(team.roster.every((player) => player.isStarter === selected.has(player.id))).toBe(true);
    expect(team.roster.every((player) => game.players[player.id]?.isStarter === player.isStarter)).toBe(true);
    expect(result.specialTeams).toEqual(team.specialTeams);
    expect(result.specialTeams.longSnapper).not.toBeNull();
  });

  it('keeps unavailable stars out of recommended return and coverage units', () => {
    const game = makeLeagueState();
    const team = Object.values(game.teams).find((entry) => entry.isUser)!;
    const unavailableReturner = team.roster.find((player) => player.pos === 'WR')!;
    const unavailableCoverage = team.roster.find((player) => player.pos === 'CB')!;
    const unavailableSnapper = team.roster.find((player) => player.pos === 'OL')!;
    const unavailablePlayers = [
      unavailableReturner,
      unavailableCoverage,
      unavailableSnapper,
    ];
    for (const player of unavailablePlayers) {
      player.ovr = 99;
      player.ratings.speed = 99;
      player.ratings.awareness = 99;
      player.injury = {
        id: `${player.id}-injury`,
        type: 'knee',
        severity: 'out',
        severityTier: 'severe',
        gamesOut: 4,
        gamesRecovered: 0,
        reinjuryRisk: 0.2,
        affectedRatings: [],
        ratingPenalty: 8,
        onIR: false,
      };
    }

    const result = applyRecommendedDepthChart(game, team.id);

    expect(result.specialTeams.kickReturner).not.toBe(unavailableReturner.id);
    expect(result.specialTeams.puntReturner).not.toBe(unavailableReturner.id);
    expect(result.specialTeams.kickCoverageUnit).not.toContain(unavailableCoverage.id);
    expect(result.specialTeams.puntCoverageUnit).not.toContain(unavailableCoverage.id);
    expect(result.specialTeams.longSnapper).not.toBe(unavailableSnapper.id);
  });

  it.each([
    ['WR', 3, 'WR3 Spot'],
    ['OL', 5, 'OL5 Spot'],
    ['DL', 4, 'DL4 Spot'],
    ['LB', 3, 'LB3 Spot'],
    ['CB', 3, 'CB3 Spot'],
    ['S', 2, 'S2 Spot'],
  ] as const)('finds starter-boundary battles for %s depth charts', (pos, slots, slotLabel) => {
    const battles = detectPositionBattles(makeBoundaryGroup(pos, slots));

    expect(battles[0]).toMatchObject({
      pos,
      battleType: 'starter_boundary',
      slotLabel,
    });
  });

  it('finds young high-potential backups pushing into the starter group', () => {
    const roster = [
      makeRosterPlayer('wr1', 'WR', 87),
      makeRosterPlayer('wr2', 'WR', 84),
      makeRosterPlayer('wr3', 'WR', 83),
      makeRosterPlayer('wr4', 'WR', 80, { age: 23, pot: 89, isStarter: false }),
      makeRosterPlayer('wr5', 'WR', 74, { isStarter: false }),
    ];

    const battles = detectPositionBattles(roster);
    const pushBattle = battles.find((battle) => battle.battleType === 'backup_push');

    expect(pushBattle).toMatchObject({
      pos: 'WR',
      battleType: 'backup_push',
      challenger: { id: 'wr4' },
    });
  });

  it('labels close quarterback battles as starter competitions', () => {
    const roster = [
      makeRosterPlayer('qb1', 'QB', 81),
      makeRosterPlayer('qb2', 'QB', 79, { age: 24, pot: 84, isStarter: false }),
    ];

    const battles = detectPositionBattles(roster);

    expect(battles).toHaveLength(1);
    expect(battles[0]).toMatchObject({
      pos: 'QB',
      battleType: 'starter_competition',
      slotLabel: 'Starting QB',
    });
  });

  it('ignores injured players when evaluating open battles', () => {
    const roster = makeBoundaryGroup('WR', 3);
    roster[3]!.injury = {
      id: 'inj-1',
      type: 'hamstring',
      severity: 'out',
      severityTier: 'minor',
      gamesOut: 2,
      gamesRecovered: 0,
      reinjuryRisk: 0.1,
      affectedRatings: [],
      ratingPenalty: 2,
      onIR: false,
    };

    expect(detectPositionBattles(roster)).toEqual([]);
  });

  it('caps the battle list at eight entries even when more positions are competitive', () => {
    const roster = [
      ...makeBoundaryGroup('WR', 3),
      ...makeBoundaryGroup('OL', 5),
      ...makeBoundaryGroup('DL', 4),
      ...makeBoundaryGroup('LB', 3),
      ...makeBoundaryGroup('CB', 3),
      ...makeBoundaryGroup('S', 2),
      ...makeBoundaryGroup('RB', 1),
      ...makeBoundaryGroup('TE', 1),
      ...[
        makeRosterPlayer('qb-max-1', 'QB', 80),
        makeRosterPlayer('qb-max-2', 'QB', 78, { age: 24, pot: 84, isStarter: false }),
      ],
    ];

    expect(detectPositionBattles(roster)).toHaveLength(8);
  });

  it('sorts battles by type priority and then by the closest ovr gap', () => {
    const roster = [
      makeRosterPlayer('cb1', 'CB', 84),
      makeRosterPlayer('cb2', 'CB', 82),
      makeRosterPlayer('cb3', 'CB', 80),
      makeRosterPlayer('cb4', 'CB', 79, { isStarter: false }),
      makeRosterPlayer('wr1', 'WR', 87),
      makeRosterPlayer('wr2', 'WR', 85),
      makeRosterPlayer('wr3', 'WR', 83),
      makeRosterPlayer('wr4', 'WR', 80, { isStarter: false }),
      makeRosterPlayer('wr5', 'WR', 79, { age: 23, pot: 88, isStarter: false }),
      makeRosterPlayer('qb-sort-1', 'QB', 82),
      makeRosterPlayer('qb-sort-2', 'QB', 80, { age: 24, pot: 84, isStarter: false }),
    ];

    const battles = detectPositionBattles(roster);

    expect(battles[0]?.battleType).toBe('starter_boundary');
    expect(battles[0]?.pos).toBe('CB');
    expect(battles.some((battle) => battle.battleType === 'backup_push')).toBe(true);
    expect(battles.at(-1)?.battleType).toBe('starter_competition');
  });

  it('returns null when the roster is at or under the cap', () => {
    const roster = Array.from({ length: 53 }, (_, index) =>
      makeRosterPlayer(`fit-${index}`, 'WR', 75, { isStarter: false }),
    );

    expect(buildCutAdvisor(roster, 53)).toBeNull();
  });

  it('recommends low-value overpaid backups and aging non-starters first', () => {
    const filler = Array.from({ length: 52 }, (_, index) =>
      makeRosterPlayer(`filler-${index}`, 'WR', 85, { isStarter: index < 3 }),
    );
    const overpaid = makeRosterPlayer('overpaid', 'WR', 62, {
      isStarter: false,
      contract: makeContract(6, 3, 3, 4, 'overpaid', 'battle-team'),
    });
    const aging = makeRosterPlayer('aging', 'RB', 64, {
      age: 31,
      isStarter: false,
      contract: makeContract(2.5, 1, 0, 0, 'aging', 'battle-team'),
    });
    const result = buildCutAdvisor([...filler, overpaid, aging], 52);

    expect(result?.overBy).toBe(2);
    expect(result?.suggestions.some((suggestion) => suggestion.id === 'overpaid' && suggestion.reason === 'Overpaid backup')).toBe(true);
    expect(result?.suggestions.some((suggestion) => suggestion.id === 'aging' && suggestion.reason === 'Aging non-starter')).toBe(true);
  });

  it('includes dead-money impact in cut suggestions', () => {
    const filler = Array.from({ length: 54 }, (_, index) =>
      makeRosterPlayer(`filler-dead-${index}`, 'WR', 82, { isStarter: index < 3 }),
    );
    const expendable = makeRosterPlayer('dead-money', 'TE', 58, {
      isStarter: false,
      contract: makeContract(4, 3, 6, 4, 'dead-money', 'battle-team'),
    });

    const result = buildCutAdvisor([...filler, expendable], 54);
    const suggestion = result?.suggestions.find((entry) => entry.id === 'dead-money');

    expect(suggestion?.salary).toBeGreaterThan(0);
    expect(suggestion?.deadMoney).toBeGreaterThan(0);
  });
});
