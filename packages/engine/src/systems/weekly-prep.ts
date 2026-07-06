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

function selectedAgmProfileId(game?: GameState): string | null {
  if (!game) return null;
  return game.frontOffice.agmProfileId
    ?? game.franchiseBlueprint?.agmProfileId
    ?? game.setupState?.decisions.agmProfileId
    ?? null;
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
        ? ['Throw at their secondary early; missed timing turns those calls into punts.', 'Make their coverage tackle in space; skipped WR and TE reps waste the matchup.']
        : ['Run at their front early; missed blocks leave second-and-long.', 'Use downhill runs to stress the box; missed run-call timing kills short-yardage drives.'],
      defense: defendLane === 'passing'
        ? ['Hit the quarterback before deep routes develop; missed pressure leaves explosive throws open.', 'Assign help on the primary receiving lane; unsupported coverage leaves one-on-one throws.']
        : ['Assign run-defense jobs before kickoff; open running lanes extend drives.', 'Force third-and-long; short-yardage mistakes keep their run game on schedule.'],
    },
  };
}

export function evaluateWeeklyPrep(team: Team, intel: OpponentIntel, plan: WeeklyPrepPlan, game?: GameState): WeeklyPrepOutcome {
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
    reasoning.push('Attack Secondary assigns QB, WR, and TE reps to the opponent coverage weakness; missed timing turns this matchup back into stalled drives.');
  } else if (plan.offensiveFocus === 'attack_front' && intel.attackLane === 'rushing') {
    readiness += 12;
    teamOvrBonus += 2;
    addPositionBonus(playerBonuses, team, ['RB', 'OL', 'TE'], 2);
    reasoning.push('Attack Front assigns RB, OL, and TE reps to the opponent run-defense weakness; missed blocks turn short-yardage calls into punts.');
  } else if (plan.offensiveFocus === 'feed_star') {
    readiness += 8;
    const featured = plan.keyMatchupPlayerId
      ? team.roster.find((player) => player.id === plan.keyMatchupPlayerId) ?? topPlayers(team, ['QB', 'RB', 'WR', 'TE'])[0]
      : topPlayers(team, ['QB', 'RB', 'WR', 'TE'])[0];
    if (featured) playerBonuses[featured.id] = (playerBonuses[featured.id] ?? 0) + 3;
    reasoning.push('Feed Star gives the primary playmaker extra touches; if that player is covered, the offense needs the saved counter call ready.');
  } else if (plan.offensiveFocus === 'protect_qb') {
    readiness += 5;
    teamOvrBonus += 1;
    addPositionBonus(playerBonuses, team, ['QB', 'OL'], 2);
    reasoning.push('Protect QB gives the quarterback and line extra protection reps; missed pickup rules turn pressure into sacks or rushed throws.');
  } else {
    readiness += 4;
    teamOvrBonus += 1;
    reasoning.push('Balanced offense keeps run and pass calls ready; overcommitting to one lane lets the defense sit on the call sheet.');
  }

  if (plan.defensiveFocus === 'limit_explosive' && intel.defendLane === 'passing') {
    readiness += 10;
    teamOvrBonus += 2;
    addPositionBonus(playerBonuses, team, ['CB', 'S'], 2);
    reasoning.push('Limit Explosive assigns corners and safeties to the opponent passing threat; missed help turns deep shots into points.');
  } else if (plan.defensiveFocus === 'heat_qb' && intel.defendLane === 'passing') {
    readiness += 9;
    addPositionBonus(playerBonuses, team, ['DL', 'LB'], 2);
    reasoning.push('Heat QB sends DL and LB reps at the passer; if coverage does not hold, quick throws punish the blitz.');
  } else if (plan.defensiveFocus === 'stop_run' && intel.defendLane === 'rushing') {
    readiness += 10;
    teamOvrBonus += 2;
    addPositionBonus(playerBonuses, team, ['DL', 'LB'], 2);
    reasoning.push('Stop Run gives DL and LB run-defense jobs; open running lanes turn routine runs into long drives.');
  } else if (plan.defensiveFocus === 'erase_wr1') {
    readiness += 7;
    addPositionBonus(playerBonuses, team, ['CB', 'S'], 2);
    reasoning.push('Erase WR1 assigns coverage help to the top receiver; unsupported bracket help leaves another matchup exposed.');
  } else {
    readiness += 4;
    reasoning.push('Balanced defense keeps run and pass checks ready; overcommitting early gives the opponent an easy counter.');
  }

  if (plan.keyMatchupPlayerId) {
    playerBonuses[plan.keyMatchupPlayerId] = (playerBonuses[plan.keyMatchupPlayerId] ?? 0) + 2;
    readiness += 4;
    reasoning.push('The key matchup player gets extra reps; a missed assignment there decides the matchup first.');
  }

  if (plan.practiceIntensity === 'light') {
    fatigueDelta -= 2;
    injuryRiskDelta -= 2;
    moraleDelta += 1;
    readiness -= 1;
    reasoning.push('Light practice lowers fatigue and injury-report chances; the tradeoff is less readiness before kickoff.');
  } else if (plan.practiceIntensity === 'full_pads') {
    fatigueDelta += 3;
    injuryRiskDelta += Math.max(1, 3 - Math.round(clinicMods.padsInjReduction * 10));
    chemistryDelta += 1;
    readiness += 2;
    reasoning.push('Full pads sharpen contact and assignment detail; the tradeoff is extra fatigue and more injury-report chances.');
  } else {
    fatigueDelta += 1;
    injuryRiskDelta += 1;
    readiness += 1;
  }

  if (plan.snapManagement === 'protect_starters') {
    fatigueDelta -= 1;
    injuryRiskDelta -= 1;
    moraleDelta -= 1;
    reasoning.push('Protect Starters lowers fatigue and injury-report chances; backups may carry more game-plan snaps.');
  } else if (plan.snapManagement === 'ride_stars') {
    fatigueDelta += 1;
    moraleDelta += 1;
    for (const star of topPlayers(team).slice(0, 2)) {
      playerBonuses[star.id] = (playerBonuses[star.id] ?? 0) + 1;
    }
    reasoning.push('Ride Stars gives top players extra snaps this week; if the game stays physical, fatigue rises and injury-report chances increase.');
  }

  if (plan.specialSituation === 'third_down') {
    readiness += 3;
    teamOvrBonus += 1;
    reasoning.push('Third Down reps decide drives before fourth down; missed protection or coverage calls keep the opponent on the field.');
  } else if (plan.specialSituation === 'red_zone') {
    readiness += 3;
    chemistryDelta += 1;
    reasoning.push('Red Zone reps turn short fields into points; missed spacing leaves scoring chances at field-goal range.');
  } else if (plan.specialSituation === 'two_minute') {
    readiness += 2;
    moraleDelta += 1;
    reasoning.push('Two Minute reps set clock and sideline rules; missed rules waste late-game scoring chances.');
  } else if (plan.specialSituation === 'field_position') {
    readiness += 2;
    teamOvrBonus += 1;
    reasoning.push('Field Position reps protect punt, coverage, and short-field calls; missed rules give the opponent cheap yards.');
  }

  if (selectedAgmProfileId(game) === 'coach_d_hardaway') {
    const offenseAligned = (
      (plan.offensiveFocus === 'attack_secondary' && intel.attackLane === 'passing')
      || (plan.offensiveFocus === 'attack_front' && intel.attackLane === 'rushing')
      || plan.offensiveFocus === 'feed_star'
    );
    const defenseAligned = (
      (plan.defensiveFocus === 'limit_explosive' && intel.defendLane === 'passing')
      || (plan.defensiveFocus === 'heat_qb' && intel.defendLane === 'passing')
      || (plan.defensiveFocus === 'stop_run' && intel.defendLane === 'rushing')
      || plan.defensiveFocus === 'erase_wr1'
    );
    const pressureStandard = plan.practiceIntensity === 'full_pads' || plan.specialSituation === 'third_down';
    if ((offenseAligned || defenseAligned) && pressureStandard) {
      readiness += 3;
      teamOvrBonus += 1;
      addPositionBonus(playerBonuses, team, ['DL', 'LB', 'CB', 'S'], 1);
      reasoning.push('Coach D bonus: scouting matches the call sheet and full-pads or third-down reps sharpen DL, LB, CB, and S assignments before kickoff.');
    }
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
