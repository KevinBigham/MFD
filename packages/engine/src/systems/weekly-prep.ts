import type { OpponentIntel, WeeklyPrepOutcome, WeeklyPrepPlan, Team, GameState } from '../types';
import type { SimTeamContext } from './game-sim-types';
import { getClinicMods } from './coaching-clinic';
import { generateOpponentScouting } from './game-plan';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function topPlayers(team: Team, positions?: Team['roster'][number]['pos'][]): Team['roster'] {
  return [...team.roster]
    .filter((player) => !positions || positions.includes(player.pos))
    .sort((left, right) => Number(right.isStarter) - Number(left.isStarter) || right.ovr - left.ovr || left.id.localeCompare(right.id));
}

function offensiveRunStrength(team: Team): number {
  return average(topPlayers(team, ['RB', 'OL', 'TE']).slice(0, 5).map((player) => player.ovr));
}

function offensivePassStrength(team: Team): number {
  return average(topPlayers(team, ['QB', 'WR', 'TE']).slice(0, 5).map((player) => player.ovr));
}

function addPositionBonus(playerBonuses: Record<string, number>, team: Team, positions: Team['roster'][number]['pos'][], amount: number): void {
  for (const player of topPlayers(team, positions).slice(0, 4)) {
    playerBonuses[player.id] = (playerBonuses[player.id] ?? 0) + amount;
  }
}

export function buildOpponentIntel(game: GameState, teamId: string, opponentTeamId: string): OpponentIntel {
  const opponent = game.teams[opponentTeamId];
  if (!opponent) {
    throw new Error(`Cannot build opponent intel for missing team ${opponentTeamId}.`);
  }
  const baseReport = generateOpponentScouting(game, teamId, opponentTeamId);
  const dangerPlayers = [...baseReport.keyPlayers]
    .sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id))
    .slice(0, 4);
  const weakLinks = [...opponent.roster]
    .filter((player) => player.isStarter)
    .sort((left, right) => left.ovr - right.ovr || left.id.localeCompare(right.id))
    .slice(0, 4);
  const attackLane = baseReport.vulnerabilityRatings.passing >= baseReport.vulnerabilityRatings.rushing ? 'passing' : 'rushing';
  const defendLane = offensivePassStrength(opponent) >= offensiveRunStrength(opponent) ? 'passing' : 'rushing';
  const tendencies = [
    `${baseReport.teamName} profiles as the No. ${baseReport.offenseRank} offense and No. ${baseReport.defenseRank} defense.`,
    ...baseReport.strengths.slice(0, 2),
    ...baseReport.weaknesses.slice(0, 2),
  ];

  return {
    teamId,
    opponentTeamId,
    baseReport,
    dangerPlayers,
    weakLinks,
    attackLane,
    defendLane,
    tendencies,
    recommendations: {
      offense: attackLane === 'passing'
        ? ['Stress the secondary early.', 'Force their coverage unit to tackle in space.']
        : ['Attack the front and stay on schedule.', 'Lean on downhill runs to control the box.'],
      defense: defendLane === 'passing'
        ? ['Disrupt the quarterback and close explosives.', 'Challenge their primary receiving lane.']
        : ['Win the line of scrimmage against the run.', 'Force longer third downs.'],
    },
  };
}

export function evaluateWeeklyPrep(team: Team, intel: OpponentIntel, plan: WeeklyPrepPlan): WeeklyPrepOutcome {
  const clinicMods = getClinicMods(team.clinic);
  const playerBonuses: Record<string, number> = {};
  const reasoning: string[] = [];
  let readiness = 55;
  let teamOvrBonus = 0;
  let fatigueDelta = 0;
  let injuryRiskDelta = 0;
  let moraleDelta = 0;
  let chemistryDelta = 0;

  if (plan.offensiveFocus === 'attack_secondary' && intel.attackLane === 'passing') {
    readiness += 12;
    teamOvrBonus += 2;
    addPositionBonus(playerBonuses, team, ['QB', 'WR', 'TE'], 2);
    reasoning.push('Weekly script attacks the opponent secondary.');
  } else if (plan.offensiveFocus === 'attack_front' && intel.attackLane === 'rushing') {
    readiness += 12;
    teamOvrBonus += 2;
    addPositionBonus(playerBonuses, team, ['RB', 'OL', 'TE'], 2);
    reasoning.push('Prep leans into a soft front seven.');
  } else if (plan.offensiveFocus === 'feed_star') {
    readiness += 8;
    const featured = plan.keyMatchupPlayerId
      ? team.roster.find((player) => player.id === plan.keyMatchupPlayerId) ?? topPlayers(team, ['QB', 'RB', 'WR', 'TE'])[0]
      : topPlayers(team, ['QB', 'RB', 'WR', 'TE'])[0];
    if (featured) playerBonuses[featured.id] = (playerBonuses[featured.id] ?? 0) + 3;
    reasoning.push('The prep board is built to feature a primary playmaker.');
  } else if (plan.offensiveFocus === 'protect_qb') {
    readiness += 5;
    teamOvrBonus += 1;
    addPositionBonus(playerBonuses, team, ['QB', 'OL'], 2);
    reasoning.push('Protection emphasis should steady the pocket.');
  } else {
    readiness += 4;
    teamOvrBonus += 1;
    reasoning.push('Balanced weekly offense keeps the full script available.');
  }

  if (plan.defensiveFocus === 'limit_explosive' && intel.defendLane === 'passing') {
    readiness += 10;
    teamOvrBonus += 2;
    addPositionBonus(playerBonuses, team, ['CB', 'S'], 2);
    reasoning.push('Coverage emphasis matches the opponent passing threat.');
  } else if (plan.defensiveFocus === 'heat_qb' && intel.defendLane === 'passing') {
    readiness += 9;
    addPositionBonus(playerBonuses, team, ['DL', 'LB'], 2);
    reasoning.push('Pressure plan targets the quarterback directly.');
  } else if (plan.defensiveFocus === 'stop_run' && intel.defendLane === 'rushing') {
    readiness += 10;
    teamOvrBonus += 2;
    addPositionBonus(playerBonuses, team, ['DL', 'LB'], 2);
    reasoning.push('Run fits are the weekly defensive priority.');
  } else if (plan.defensiveFocus === 'erase_wr1') {
    readiness += 7;
    addPositionBonus(playerBonuses, team, ['CB', 'S'], 2);
    reasoning.push('Coverage calls are tilted toward the top receiving threat.');
  } else {
    readiness += 4;
    reasoning.push('Balanced defensive prep avoids overcommitting too early.');
  }

  if (plan.keyMatchupPlayerId) {
    playerBonuses[plan.keyMatchupPlayerId] = (playerBonuses[plan.keyMatchupPlayerId] ?? 0) + 2;
    readiness += 4;
    reasoning.push('A targeted matchup player got extra install attention.');
  }

  if (plan.practiceIntensity === 'light') {
    fatigueDelta -= 2;
    injuryRiskDelta -= 2;
    moraleDelta += 1;
    readiness -= 1;
    reasoning.push('Light practice protects the roster and lowers injury exposure.');
  } else if (plan.practiceIntensity === 'full_pads') {
    fatigueDelta += 3;
    injuryRiskDelta += Math.max(1, 3 - Math.round(clinicMods.padsInjReduction * 10));
    chemistryDelta += 1;
    readiness += 2;
    reasoning.push('Full pads sharpened physical execution at the cost of extra wear.');
  } else {
    fatigueDelta += 1;
    injuryRiskDelta += 1;
    readiness += 1;
  }

  if (plan.snapManagement === 'protect_starters') {
    fatigueDelta -= 1;
    injuryRiskDelta -= 1;
    moraleDelta -= 1;
  } else if (plan.snapManagement === 'ride_stars') {
    fatigueDelta += 1;
    moraleDelta += 1;
    for (const star of topPlayers(team).slice(0, 2)) {
      playerBonuses[star.id] = (playerBonuses[star.id] ?? 0) + 1;
    }
  }

  if (plan.specialSituation === 'third_down') {
    readiness += 3;
    teamOvrBonus += 1;
  } else if (plan.specialSituation === 'red_zone') {
    readiness += 3;
    chemistryDelta += 1;
  } else if (plan.specialSituation === 'two_minute') {
    readiness += 2;
    moraleDelta += 1;
  } else if (plan.specialSituation === 'field_position') {
    readiness += 2;
    teamOvrBonus += 1;
  }

  const outcome: WeeklyPrepOutcome = {
    teamId: team.id,
    opponentTeamId: intel.opponentTeamId,
    year: plan.year,
    week: plan.week,
    plan,
    readiness: clamp(readiness, 0, 100),
    reasoning,
    effects: {
      teamOvrBonus: clamp(teamOvrBonus, -3, 6),
      playerBonuses,
      fatigueDelta,
      injuryRiskDelta,
      moraleDelta,
      chemistryDelta,
    },
  };

  return outcome;
}

export function applyWeeklyPrepToSim(_team: Team, outcome: WeeklyPrepOutcome): SimTeamContext {
  return {
    teamOvrBonus: outcome.effects.teamOvrBonus,
    playerOvrBonuses: { ...outcome.effects.playerBonuses },
  };
}
