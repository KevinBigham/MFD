/**
 * MFD Offensive & Defensive Schemes
 *
 * Scheme definitions, game plans, counter matrices, and flavor text.
 */

export interface Scheme {
  id: string;
  name: string;
  boosts: Record<string, number>;
  pen: Record<string, number>;
}

export interface OffPlan {
  id: string;
  name: string;
  desc: string;
  rb: number;
  pm: number;
  tempoMod: number;
  bigPlayMod: number;
}

export interface DefPlan {
  id: string;
  name: string;
  desc: string;
  blitz: number;
  covMod: number;
  runStopMod: number;
  bigPlayRisk: number;
}

export interface SchemeFxEntry {
  passMod: number;
  rushMod: number;
  blitzAdj: number;
  covAdj: number;
  bigPlayAdj: number;
  turnoverAdj: number;
}

export const OFF_SCHEMES: readonly Scheme[] = [
  { id: 'spread', name: 'Spread', boosts: { accuracy: 8, routeRunning: 6, speed: 4, separation: 4, deepRoute: 5, shortAccuracy: 3 }, pen: { runBlock: -4, blocking: -3, impactBlocking: -2 } },
  { id: 'west_coast', name: 'West Coast', boosts: { accuracy: 5, catching: 5, awareness: 4, shortRoute: 5, catchInTraffic: 3, playRecognition: 3 }, pen: { speed: -2, deepRoute: -3 } },
  { id: 'smashmouth', name: 'Smashmouth', boosts: { runBlock: 8, power: 6, blocking: 5, truckPower: 5, impactBlocking: 4, anchorStrength: 3 }, pen: { routeRunning: -4, release: -3, separation: -2 } },
  { id: 'pro_style', name: 'Pro Style', boosts: { arm: 5, awareness: 5, passBlock: 5, runBlock: 3, catchInTraffic: 3, playRecognition: 3 }, pen: { speed: -1 } },
  { id: 'air_coryell', name: 'Air Coryell', boosts: { arm: 8, deepAccuracy: 8, deepRoute: 8, separation: 5, release: 4, speed: 3 }, pen: { runBlock: -5, breakTackle: -2, shortRoute: -2 } },
  { id: 'balanced', name: 'Balanced', boosts: {}, pen: {} },
  { id: 'pistol', name: 'Pistol', boosts: { awareness: 6, speed: 5, catching: 4, elusiveness: 4, arm: 3 }, pen: { runBlock: -3, blocking: -2 } },
  { id: 'heavy_jumbo', name: 'Heavy Jumbo', boosts: { runBlock: 9, impactBlocking: 6, power: 6, truckPower: 5, toughness: 4 }, pen: { routeRunning: -6, separation: -5, speed: -4, release: -3 } },
];

export const DEF_SCHEMES: readonly Scheme[] = [
  { id: '4-3', name: '4-3', boosts: { passRush: 4, tackle: 3, powerMoves: 3, pursuit: 2 }, pen: {} },
  { id: '3-4', name: '3-4', boosts: { coverage: 3, passRush: 3, tackle: 3, zoneCoverage: 3, blockShedding: 2 }, pen: {} },
  { id: 'multiple_d', name: 'Multiple D', boosts: { coverage: 4, playRecognition: 4, awareness: 4, passRush: 2, speed: 2 }, pen: { runStop: -2, tackle: -1 } },
  { id: 'nickel', name: 'Nickel', boosts: { coverage: 6, ballSkills: 4, manCoverage: 4, breakOnBall: 3 }, pen: { runStop: -4, tackle: -2, runSupport: -3 } },
  { id: 'bear_46', name: '46 Bear', boosts: { runStop: 9, passRush: 6, tackle: 5, powerMoves: 4, pursuit: 3, manCoverage: 5, press: 4 }, pen: { zoneCoverage: -6, coverage: -4, rangeAbility: -3 } },
];

export const OFF_PLANS: readonly OffPlan[] = [
  { id: 'balanced_o', name: 'Balanced', desc: 'No weaknesses, no major strengths. Safe.', rb: 0, pm: 0, tempoMod: 0, bigPlayMod: 0 },
  { id: 'air_raid', name: 'Air Raid', desc: "Spread 'em out, throw early & often. Needs elite QB+WR.", rb: -0.18, pm: 10, tempoMod: 0, bigPlayMod: 0.03 },
  { id: 'ground_pound', name: 'Ground & Pound', desc: 'Run it down their throat. Control the clock.', rb: 0.18, pm: -6, tempoMod: -1, bigPlayMod: -0.02 },
  { id: 'west_coast', name: 'West Coast', desc: 'Short passes, high completion. Death by a thousand cuts.', rb: -0.05, pm: 4, tempoMod: 0, bigPlayMod: -0.04 },
  { id: 'play_action', name: 'Play Action', desc: 'Fake the run, bomb it deep. Needs credible run game.', rb: 0.05, pm: 3, tempoMod: 0, bigPlayMod: 0.06 },
  { id: 'hurry_up', name: 'Hurry Up', desc: 'No-huddle tempo. More possessions but defense tires.', rb: -0.08, pm: 5, tempoMod: 2, bigPlayMod: 0.01 },
];

export const DEF_PLANS: readonly DefPlan[] = [
  { id: 'balanced_d', name: 'Balanced D', desc: 'Sound fundamentals. No glaring weakness.', blitz: 0, covMod: 0, runStopMod: 0, bigPlayRisk: 0 },
  { id: 'blitz_heavy', name: 'Blitz Heavy', desc: 'Bring pressure every play. Feast or famine.', blitz: 0.18, covMod: -4, runStopMod: 2, bigPlayRisk: 0.06 },
  { id: 'zone_cov', name: 'Zone Coverage', desc: 'Blanket the field. Limits big plays, gives up underneath.', blitz: -0.04, covMod: 4, runStopMod: -2, bigPlayRisk: -0.05 },
  { id: 'man_press', name: 'Man Press', desc: "Lock 'em up at the line. CB-dependent -- elite or bust.", blitz: 0.04, covMod: 6, runStopMod: -3, bigPlayRisk: 0.03 },
  { id: 'run_stuff', name: 'Run Stuff', desc: 'Stack the box. Shut down the run, dare them to throw.', blitz: 0.06, covMod: -6, runStopMod: 8, bigPlayRisk: 0.02 },
  { id: 'prevent', name: 'Prevent', desc: "Protect the lead. No big plays, but they'll march.", blitz: -0.08, covMod: 8, runStopMod: -4, bigPlayRisk: -0.08 },
];

export const SCHEME_COUNTERS: Record<string, Record<string, number>> = {
  air_raid:     { balanced_d: 0, blitz_heavy: 4, zone_cov: -3, man_press: 1, run_stuff: 6, prevent: -5 },
  ground_pound: { balanced_d: 1, blitz_heavy: 5, zone_cov: 1, man_press: 3, run_stuff: -7, prevent: 6 },
  balanced_o:   { balanced_d: 0, blitz_heavy: 1, zone_cov: 0, man_press: 0, run_stuff: 0, prevent: 0 },
  west_coast:   { balanced_d: 1, blitz_heavy: 5, zone_cov: -4, man_press: -2, run_stuff: 3, prevent: 1 },
  play_action:  { balanced_d: 2, blitz_heavy: -1, zone_cov: 5, man_press: -2, run_stuff: 6, prevent: -3 },
  hurry_up:     { balanced_d: 2, blitz_heavy: 3, zone_cov: -2, man_press: 1, run_stuff: 1, prevent: -1 },
};

export const SCHEME_FX: Record<string, Record<string, SchemeFxEntry>> = {
  air_raid: {
    blitz_heavy: { passMod: 3, rushMod: -2, blitzAdj: -0.04, covAdj: 0, bigPlayAdj: 0.03, turnoverAdj: 0.01 },
    zone_cov: { passMod: -2, rushMod: 0, blitzAdj: 0, covAdj: 2, bigPlayAdj: -0.03, turnoverAdj: 0 },
    man_press: { passMod: 1, rushMod: -1, blitzAdj: 0, covAdj: 0, bigPlayAdj: 0.04, turnoverAdj: 0.015 },
    run_stuff: { passMod: 4, rushMod: -3, blitzAdj: 0, covAdj: -3, bigPlayAdj: 0.05, turnoverAdj: -0.01 },
    prevent: { passMod: -3, rushMod: 0, blitzAdj: 0, covAdj: 4, bigPlayAdj: -0.06, turnoverAdj: -0.01 },
  },
  ground_pound: {
    blitz_heavy: { passMod: -1, rushMod: 4, blitzAdj: -0.06, covAdj: 0, bigPlayAdj: 0.02, turnoverAdj: -0.01 },
    zone_cov: { passMod: 0, rushMod: 1, blitzAdj: 0, covAdj: 0, bigPlayAdj: 0, turnoverAdj: 0 },
    man_press: { passMod: 0, rushMod: 2, blitzAdj: 0, covAdj: 0, bigPlayAdj: 0.01, turnoverAdj: 0 },
    run_stuff: { passMod: 1, rushMod: -5, blitzAdj: 0.02, covAdj: 0, bigPlayAdj: -0.03, turnoverAdj: 0.01 },
    prevent: { passMod: 0, rushMod: 5, blitzAdj: 0, covAdj: 0, bigPlayAdj: 0.01, turnoverAdj: -0.01 },
  },
  west_coast: {
    blitz_heavy: { passMod: 4, rushMod: 0, blitzAdj: -0.06, covAdj: 0, bigPlayAdj: 0.01, turnoverAdj: -0.01 },
    zone_cov: { passMod: -3, rushMod: 0, blitzAdj: 0, covAdj: 2, bigPlayAdj: -0.02, turnoverAdj: 0.01 },
    man_press: { passMod: -1, rushMod: 0, blitzAdj: 0, covAdj: 1, bigPlayAdj: -0.01, turnoverAdj: 0.01 },
    run_stuff: { passMod: 2, rushMod: -1, blitzAdj: 0, covAdj: -2, bigPlayAdj: 0.02, turnoverAdj: 0 },
    prevent: { passMod: 1, rushMod: 0, blitzAdj: 0, covAdj: 0, bigPlayAdj: -0.03, turnoverAdj: -0.01 },
  },
  play_action: {
    blitz_heavy: { passMod: -1, rushMod: 0, blitzAdj: 0, covAdj: 0, bigPlayAdj: 0, turnoverAdj: 0.02 },
    zone_cov: { passMod: 3, rushMod: 1, blitzAdj: 0, covAdj: -2, bigPlayAdj: 0.05, turnoverAdj: -0.01 },
    man_press: { passMod: -1, rushMod: 0, blitzAdj: 0, covAdj: 1, bigPlayAdj: -0.01, turnoverAdj: 0.01 },
    run_stuff: { passMod: 4, rushMod: -2, blitzAdj: 0, covAdj: -3, bigPlayAdj: 0.06, turnoverAdj: -0.01 },
    prevent: { passMod: -2, rushMod: 1, blitzAdj: 0, covAdj: 2, bigPlayAdj: -0.04, turnoverAdj: 0 },
  },
  hurry_up: {
    blitz_heavy: { passMod: 2, rushMod: 0, blitzAdj: -0.04, covAdj: 0, bigPlayAdj: 0.02, turnoverAdj: 0 },
    zone_cov: { passMod: -1, rushMod: 0, blitzAdj: 0, covAdj: 1, bigPlayAdj: -0.01, turnoverAdj: 0 },
    man_press: { passMod: 1, rushMod: 0, blitzAdj: 0, covAdj: -1, bigPlayAdj: 0.01, turnoverAdj: 0 },
    run_stuff: { passMod: 1, rushMod: 0, blitzAdj: 0, covAdj: 0, bigPlayAdj: 0, turnoverAdj: 0 },
    prevent: { passMod: 0, rushMod: 0, blitzAdj: 0, covAdj: 0, bigPlayAdj: -0.01, turnoverAdj: 0 },
  },
};

export const SCHEME_FLAVOR: Record<string, Record<string, string>> = {
  spread:      { offense: 'A wide-open attack built on spacing and explosive playmaking.', defense: 'They want to spread you thin and find the crease.', switch: 'The offense opens up. Spacing and timing are the new currency.', alert: 'Spread fit is slipping -- route timing and separation need attention.' },
  west_coast:  { offense: 'Short, precise passing that turns checkdowns into chunk gains.', defense: 'They will nickel-and-dime you to death if you let them.', switch: 'The system demands precision. Every route must hit on time.', alert: 'West Coast rhythm is off -- quick-game accuracy and awareness are lagging.' },
  smashmouth:  { offense: 'Power running at its purest -- run it until they quit.', defense: 'A meat-grinder offense. They will try to bully the line of scrimmage.', switch: 'The identity shifts to physical domination. The trenches decide everything.', alert: 'The run identity is breaking down -- the O-line fit is deteriorating.' },
  pro_style:   { offense: 'A complete, balanced attack -- runs when needed, passes to win.', defense: 'They have answers for everything. No easy preparation.', switch: 'The playbook expands. This scheme rewards football IQ over athleticism.', alert: 'Pro Style execution is inconsistent -- mental processing and awareness are lagging.' },
  air_coryell: { offense: 'Vertical assault -- push every safety back and attack the deep thirds.', defense: 'They want to take the top off your defense on every play.', switch: 'The deep ball becomes the identity. Big arm, big plays, big risks.', alert: 'The vertical game is stalling -- arm talent and deep route execution need work.' },
  balanced:    { offense: 'No tendencies, no weaknesses -- disciplined football.', defense: 'A balanced attack offers no easy adjustments.', switch: 'The system neutralizes weaknesses. Stability over specialization.', alert: 'Even a balanced scheme needs buy-in -- identity scores are drifting.' },
  pistol:      { offense: "Versatile read-option attack -- the defense must account for the QB's legs.", defense: 'They can hand it off, keep it, or throw. One defender is always wrong.', switch: 'The quarterback becomes a weapon in the run game. Creativity replaces rote execution.', alert: 'The read-option is leaking -- dual-threat processing and RB catching are below threshold.' },
  heavy_jumbo: { offense: 'Two tight ends, a punishing back, and the will to run it down your throat.', defense: 'They want to physically impose their will. Lighter boxes will get eaten alive.', switch: 'The offense becomes a battering ram. Skill position flash gives way to trench dominance.', alert: 'Jumbo identity is eroding -- blocking grades and physical fit are declining.' },
  '4-3':       { offense: 'Four down linemen and three linebackers -- the classic pro base.', defense: 'Sound fundamentals. Strong against the run and reliable in coverage.', switch: 'A proven foundation. Fits the majority of personnel groupings.', alert: 'The 4-3 base is breaking down -- front-seven fit and pursuit grades are slipping.' },
  '3-4':       { offense: 'Three down, four linebackers -- versatility is the weapon.', defense: 'Edge pressure from multiple angles. Hard to protect against.', switch: 'The defense gains unpredictability. Pass rush comes from everywhere.', alert: '3-4 fit is degrading -- OLB pass rush and LB coverage grades need reinforcement.' },
  multiple_d:  { offense: 'Multiple fronts and coverage shells -- answers for every offensive tendency.', defense: 'They can show you anything. No pre-snap reads are safe.', switch: 'The defense gains chess-match complexity. Players must process quickly.', alert: 'Multiple D demands football IQ -- awareness and recognition scores are falling.' },
  nickel:      { offense: 'Six defensive backs -- pure pass defense, run stop sacrificed.', defense: 'They trust the secondary to win. One extra DB for one fewer run stopper.', switch: 'Speed replaces size in the secondary. The run game will find openings.', alert: 'Nickel coverage grades are declining -- ball skills and man coverage need work.' },
  bear_46:     { offense: 'Eight men near the line -- maximum pressure, maximum gamble.', defense: 'The most physically dominant defensive scheme. Forces the offense to execute fast.', switch: 'The defense goes to war. Corners are on islands. Front seven must wreck the backfield.', alert: '46 Bear execution is failing -- run stopping and pass rush grades are below standard.' },
};

export function getSchemeFlavorLine(schemeId: string, context?: string): string {
  const f = SCHEME_FLAVOR[schemeId];
  if (!f) return '';
  return f[context ?? 'offense'] ?? f['offense'] ?? '';
}

export const HOME_FIELD_ADV = 3;
