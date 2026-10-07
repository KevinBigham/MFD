import type { DraftProspect, GameState, PlayerArchiveEntry } from '../types';
import { hireMentor } from '../systems/alumni-mentors';
import { makeDraftPick } from '../systems/draft';
import { startDynastyEra } from '../systems/dynasty-era';
import {
  PHASE_ORDER,
  applySetupDecision,
  createFastLaneSetupState,
  finalizeSetup,
  toggleSetupDrilldown,
} from '../systems/franchise-setup';
import { makeLeagueState } from '../systems/test-helpers';
import { runTrainingCamp } from '../systems/training-camp';

export function durableFeatureState(game: GameState) {
  return {
    activeMentors: game.activeMentors,
    mentorBudget: game.mentorBudget,
    userDynastyEras: game.userDynastyEras,
    trainingCampResults: game.trainingCampResults,
    pendingPassedPickTargets: game.pendingPassedPickTargets,
    setupState: game.setupState,
    franchiseBlueprint: game.franchiseBlueprint,
  };
}

function prospect(id: string, pos: DraftProspect['pos'], grade: number): DraftProspect {
  return {
    id, firstName: 'Save', lastName: id, pos, college: 'Test U', region: 'south',
    ratings: { awareness: grade, speed: grade, stamina: grade },
    projectedRound: 1, scoutGrade: grade - 2, trueGrade: grade,
    personality: { workEthic: 7, loyalty: 5, greed: 5, pressure: 5, ambition: 7 },
    traits: [], archetype: null, characterArchetype: 'balanced',
    bustProbability: 0.1, stealProbability: 0.1, scoutingReports: [], combine: null,
    bloodline: null,
  };
}

/** Small, synthetic persistence sample populated through the real feature writers. */
export function createPopulatedDurableState(base: GameState = makeLeagueState()): GameState {
  let game = structuredClone(base);
  const userId = Object.values(game.teams).find((team) => team.isUser)!.id;
  const cpuId = Object.values(game.teams).find((team) => !team.isUser)!.id;
  const legend: PlayerArchiveEntry = {
    playerId: 'save-legend', firstName: 'Retired', lastName: 'Legend', name: 'Retired Legend',
    positions: ['WR'], jerseyNumber: 12, peakOvr: 96, peakYear: game.year - 2,
    firstYear: game.year - 11, lastYear: game.year - 1, retirementYear: game.year - 1,
    teamHistory: [{ teamId: userId, firstYear: game.year - 11, lastYear: game.year - 1 }],
    careerStats: { gp: 160, seasons: 11, snaps: 9_000, mvps: 1, allPros: 3, proBowls: 4, championships: 1 },
  };
  game.playerArchive.push(legend);
  game = hireMentor(game, legend.playerId);
  game = startDynastyEra(game, 'The First Window');
  game.year += 1;
  game = startDynastyEra(game, 'The Second Window');

  let setup = createFastLaneSetupState(game, userId);
  setup = applySetupDecision(setup, {
    acknowledged: [...PHASE_ORDER],
    cultureMandate: 'accountability',
    depthChartOverrides: { WR: [game.teams[userId]!.roster.find((player) => player.pos === 'WR')!.id] },
    agmClosingWords: 'Preserve the decisions we made together.',
  });
  setup = toggleSetupDrilldown(setup, 'cap');
  game = finalizeSetup(game, userId, setup);

  // The week orchestrator stores the report returned by this mutating camp writer.
  game.trainingCampResults = [runTrainingCamp(game, userId)];
  game.phase = 'draft';
  game.offseasonState = {
    round: 1, expiringPlayerIds: [], reSignDecisions: {}, freeAgencyBids: {},
    scoutingState: {}, scoutingWatchlist: [], tradeOffers: [],
    draftOrder: [userId, cpuId].map((teamId, index) => ({
      id: `${teamId}-${game.year}-1-${index + 1}-${teamId}`,
      teamId, round: 1, pick: index + 1, overall: index + 1, originalTeamId: teamId,
    })),
    currentDraftPickIndex: 0, completedDraftPickIds: [],
  };
  for (const [index, teamId] of [userId, cpuId].entries()) {
    game.teams[teamId]!.draftPicks = [{
      round: 1, pick: index + 1, originalTeamId: teamId, currentTeamId: teamId,
      year: game.year, isCompPick: false,
    }];
  }
  game.draftClass = [prospect('passed-qb', 'QB', 90), prospect('chosen-wr', 'WR', 80)];
  return makeDraftPick(game, 'chosen-wr').nextState;
}
