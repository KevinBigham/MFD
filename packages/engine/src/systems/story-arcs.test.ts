import { describe, expect, it } from 'vitest';
import { buildWeeklySummary } from '../index';
import { advanceStoryArcs, advanceWeeklyStoryArcs } from './story-arcs';
import { makeLeagueState } from './test-helpers';

function historyEntry(
  teamId: string,
  year: number,
  wins: number,
  losses: number,
  playoffFinish = 'regular_season',
) {
  return {
    year,
    teamId,
    wins,
    losses,
    ties: 0,
    record: `${wins}-${losses}`,
    pointDifferential: (wins - losses) * 9,
    playoffFinish,
    majorEvents: [],
    awardsWon: [],
    recordsBroken: [],
  };
}

describe('advanceWeeklyStoryArcs', () => {
  it('starts and resolves a win streak arc from team momentum', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const opponent = game.teams.afce2!;
    team.wins = 5;
    team.losses = 1;
    team.streak = 3;

    const started = advanceWeeklyStoryArcs(game, {
      team,
      opponent,
      summary: buildWeeklySummary({
        team,
        opponent,
        result: null,
        year: 2026,
        week: 6,
        phase: 'regular_season',
        ownerDelta: 2,
        injuries: [],
        notes: ['Momentum is building'],
      }),
    });

    expect(started.some((arc) => arc.template === 'win_streak')).toBe(true);

    team.streak = 0;
    const resolved = advanceWeeklyStoryArcs(
      { ...game, narrativeState: { ...game.narrativeState, activeArcs: started } },
      { team, opponent, summary: null },
    );
    expect(resolved.some((arc) => arc.template === 'win_streak')).toBe(false);
  });

  it('tracks hot seat, breakout player, injury crisis, and revenge game arcs', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const opponent = game.teams.afce2!;
    const qb = team.roster.find((player) => player.id === 'afce1-qb')!;
    const rb = team.roster.find((player) => player.id === 'afce1-rb')!;

    team.owner.approval = 24;
    team.ownerMood = 24;
    team.ownerPatience80 = 18;
    team.streak = -1;
    qb.age = 23;
    qb.pot = qb.ovr + 9;
    qb.injury = { type: 'ankle', severity: 'out', gamesOut: 2 };
    rb.injury = { type: 'hamstring', severity: 'doubtful', gamesOut: 1 };

    const summary = buildWeeklySummary({
      team,
      opponent,
      result: {
        id: 'loss-arc',
        homeTeamId: team.id,
        awayTeamId: opponent.id,
        homeScore: 20,
        awayScore: 24,
        week: 7,
        year: 2026,
        overtime: false,
        mvpPlayerId: qb.id,
        stats: {
          [team.id]: { totalYards: 360, passingYards: 270, rushingYards: 90, turnovers: 2, sacks: 2, thirdDownConversions: 5, thirdDownAttempts: 12, timeOfPossession: 29 },
          [opponent.id]: { totalYards: 340, passingYards: 250, rushingYards: 90, turnovers: 1, sacks: 3, thirdDownConversions: 6, thirdDownAttempts: 13, timeOfPossession: 31 },
        },
      },
      year: 2026,
      week: 7,
      phase: 'regular_season',
      ownerDelta: -5,
      injuries: [],
      notes: ['Close loss to a rival'],
    });

    team.rivals[opponent.id] = { heat: 6 };
    const arcs = advanceWeeklyStoryArcs(game, { team, opponent, summary });

    expect(arcs.some((arc) => arc.template === 'hot_seat')).toBe(true);
    expect(arcs.some((arc) => arc.template === 'breakout_player' && arc.playerId === qb.id)).toBe(true);
    expect(arcs.some((arc) => arc.template === 'injury_crisis')).toBe(true);
    expect(arcs.some((arc) => arc.template === 'revenge_game' && arc.teamId === team.id)).toBe(true);
  });
});

describe('advanceStoryArcs', () => {
  it('is deterministic for the same state and year', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce2!;
    game.franchiseHistory = [
      historyEntry(team.id, 2023, 4, 13, 'missed_playoffs'),
      historyEntry(team.id, 2024, 5, 12, 'missed_playoffs'),
      historyEntry(team.id, 2025, 6, 11, 'missed_playoffs'),
      historyEntry(team.id, 2026, 9, 8, 'regular_season'),
    ];

    const first = advanceStoryArcs(game, 2026);
    const second = advanceStoryArcs(game, 2026);

    expect(first).toEqual(second);
  });

  it('detects a rebuild breakthrough after three losing seasons', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce2!;
    game.franchiseHistory = [
      historyEntry(team.id, 2023, 3, 14, 'missed_playoffs'),
      historyEntry(team.id, 2024, 5, 12, 'missed_playoffs'),
      historyEntry(team.id, 2025, 6, 11, 'missed_playoffs'),
      historyEntry(team.id, 2026, 9, 8, 'regular_season'),
    ];

    const result = advanceStoryArcs(game, 2026);
    const rebuild = result.arcs.find((arc) => arc.type === 'rebuild' && arc.teamId === team.id);

    expect(rebuild).toMatchObject({
      teamId: team.id,
      startYear: 2023,
      endYear: 2026,
      currentStage: 'breakthrough',
    });
    expect(rebuild?.stageHistory).toHaveLength(4);
    expect(result.inboxEntries.some((item) => item.id.includes('rebuild') && item.year === 2026)).toBe(true);
  });

  it('detects a dynasty run after three straight 12-win seasons', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afcn1!;
    game.franchiseHistory = [
      historyEntry(team.id, 2024, 12, 5, 'divisional_exit'),
      historyEntry(team.id, 2025, 13, 4, 'conference_final_exit'),
      historyEntry(team.id, 2026, 14, 3, 'champion'),
    ];

    const result = advanceStoryArcs(game, 2026);
    const dynasty = result.arcs.find((arc) => arc.type === 'dynasty_run' && arc.teamId === team.id);

    expect(dynasty).toMatchObject({
      teamId: team.id,
      startYear: 2024,
      endYear: null,
      currentStage: 'dynasty_breakthrough',
    });
    expect(dynasty?.stageHistory.map((beat) => beat.year)).toEqual([2024, 2025, 2026]);
  });

  it('tracks multiple teams independently in the same season', () => {
    const game = makeLeagueState('offseason');
    const contender = game.teams.afcw1!;
    const cinderella = game.teams.nfcs2!;
    game.franchiseHistory = [
      historyEntry(contender.id, 2025, 11, 6, 'divisional_exit'),
      historyEntry(contender.id, 2026, 12, 5, 'conference_final_exit'),
      historyEntry(cinderella.id, 2026, 8, 9, 'divisional_exit'),
    ];

    const result = advanceStoryArcs(game, 2026);

    expect(result.arcs.some((arc) => arc.type === 'contender_window' && arc.teamId === contender.id)).toBe(true);
    expect(result.arcs.some((arc) => arc.type === 'cinderella' && arc.teamId === cinderella.id)).toBe(true);
  });

  it('closes an active contender arc when a dead-cap collapse hits', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afcs1!;
    team.deadCap = 31;
    team.capSpace = -4;
    game.storyArcs = [{
      id: `contender_window-${team.id}-2024`,
      type: 'contender_window',
      teamId: team.id,
      startYear: 2024,
      endYear: null,
      currentStage: 'window_extended',
      stageHistory: [
        { stage: 'window_opened', year: 2024, note: 'Window opened', narrativeText: 'The roster announced itself.' },
        { stage: 'window_extended', year: 2025, note: 'Window extended', narrativeText: 'The core kept the pressure on.' },
      ],
    }];
    game.franchiseHistory = [
      historyEntry(team.id, 2024, 11, 6, 'divisional_exit'),
      historyEntry(team.id, 2025, 12, 5, 'conference_final_exit'),
      historyEntry(team.id, 2026, 8, 9, 'regular_season'),
    ];

    const result = advanceStoryArcs(game, 2026);
    const contender = result.arcs.find((arc) => arc.type === 'contender_window' && arc.teamId === team.id);
    const collapse = result.arcs.find((arc) => arc.type === 'collapse' && arc.teamId === team.id);

    expect(contender?.endYear).toBe(2026);
    expect(contender?.currentStage).toBe('window_narrowed');
    expect(collapse).toMatchObject({
      teamId: team.id,
      currentStage: 'cap_overflow',
    });
  });

  it('returns no multi-season arcs at league init', () => {
    const game = makeLeagueState('preseason');

    const result = advanceStoryArcs(game, game.year);

    expect(result.arcs).toEqual([]);
    expect(result.inboxEntries).toEqual([]);
  });
});
