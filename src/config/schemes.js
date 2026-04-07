/**
 * MFD Offensive & Defensive Schemes
 *
 * Scheme definitions control how a team's identity is shaped.
 * Each scheme has boost/penalty ratings, game plan modifiers,
 * counter relationships, and flavor text.
 */

// Offensive identity schemes (affects player development & evaluation)
export var OFF_SCHEMES = [
  { id: 'spread', name: 'Spread', boosts: { accuracy: 8, routeRunning: 6, speed: 4, separation: 4, deepRoute: 5, shortAccuracy: 3 }, pen: { runBlock: -4, blocking: -3, impactBlocking: -2 } },
  { id: 'west_coast', name: 'West Coast', boosts: { accuracy: 5, catching: 5, awareness: 4, shortRoute: 5, catchInTraffic: 3, playRecognition: 3 }, pen: { speed: -2, deepRoute: -3 } },
  { id: 'smashmouth', name: 'Smashmouth', boosts: { runBlock: 8, power: 6, blocking: 5, truckPower: 5, impactBlocking: 4, anchorStrength: 3 }, pen: { routeRunning: -4, release: -3, separation: -2 } },
  { id: 'pro_style', name: 'Pro Style', boosts: { arm: 5, awareness: 5, passBlock: 5, runBlock: 3, catchInTraffic: 3, playRecognition: 3 }, pen: { speed: -1 } },
  { id: 'air_coryell', name: 'Air Coryell', boosts: { arm: 8, deepAccuracy: 8, deepRoute: 8, separation: 5, release: 4, speed: 3 }, pen: { runBlock: -5, breakTackle: -2, shortRoute: -2 } },
  { id: 'balanced', name: 'Balanced', boosts: {}, pen: {} },
  { id: 'pistol', name: 'Pistol', boosts: { awareness: 6, speed: 5, catching: 4, elusiveness: 4, arm: 3 }, pen: { runBlock: -3, blocking: -2 } },
  { id: 'heavy_jumbo', name: 'Heavy Jumbo', boosts: { runBlock: 9, impactBlocking: 6, power: 6, truckPower: 5, toughness: 4 }, pen: { routeRunning: -6, separation: -5, speed: -4, release: -3 } },
];

// Defensive identity schemes
export var DEF_SCHEMES = [
  { id: '4-3', name: '4-3', boosts: { passRush: 4, tackle: 3, powerMoves: 3, pursuit: 2 }, pen: {} },
  { id: '3-4', name: '3-4', boosts: { coverage: 3, passRush: 3, tackle: 3, zoneCoverage: 3, blockShedding: 2 }, pen: {} },
  { id: 'multiple_d', name: 'Multiple D', boosts: { coverage: 4, playRecognition: 4, awareness: 4, passRush: 2, speed: 2 }, pen: { runStop: -2, tackle: -1 } },
  { id: 'nickel', name: 'Nickel', boosts: { coverage: 6, ballSkills: 4, manCoverage: 4, breakOnBall: 3 }, pen: { runStop: -4, tackle: -2, runSupport: -3 } },
  { id: 'bear_46', name: '46 Bear', boosts: { runStop: 9, passRush: 6, tackle: 5, powerMoves: 4, pursuit: 3, manCoverage: 5, press: 4 }, pen: { zoneCoverage: -6, coverage: -4, rangeAbility: -3 } },
];

// Offensive game plans (in-game adjustments)
export var OFF_PLANS = [
  { id: 'balanced_o', name: 'Balanced', icon: '\u2696\uFE0F', desc: 'No weaknesses, no major strengths. Safe.', rb: 0, pm: 0, tempoMod: 0, bigPlayMod: 0 },
  { id: 'air_raid', name: 'Air Raid', icon: '\u2708\uFE0F', desc: "Spread 'em out, throw early & often. Needs elite QB+WR.", rb: -0.18, pm: 10, tempoMod: 0, bigPlayMod: 0.03 },
  { id: 'ground_pound', name: 'Ground & Pound', icon: '\u{1F3C3}', desc: 'Run it down their throat. Control the clock.', rb: 0.18, pm: -6, tempoMod: -1, bigPlayMod: -0.02 },
  { id: 'west_coast', name: 'West Coast', icon: '\u{1F3AF}', desc: 'Short passes, high completion. Death by a thousand cuts.', rb: -0.05, pm: 4, tempoMod: 0, bigPlayMod: -0.04 },
  { id: 'play_action', name: 'Play Action', icon: '\u{1F3AD}', desc: 'Fake the run, bomb it deep. Needs credible run game.', rb: 0.05, pm: 3, tempoMod: 0, bigPlayMod: 0.06 },
  { id: 'hurry_up', name: 'Hurry Up', icon: '\u23E9', desc: 'No-huddle tempo. More possessions but defense tires.', rb: -0.08, pm: 5, tempoMod: 2, bigPlayMod: 0.01 },
];

// Defensive game plans
export var DEF_PLANS = [
  { id: 'balanced_d', name: 'Balanced D', icon: '\u{1F6E1}\uFE0F', desc: 'Sound fundamentals. No glaring weakness.', blitz: 0, covMod: 0, runStopMod: 0, bigPlayRisk: 0 },
  { id: 'blitz_heavy', name: 'Blitz Heavy', icon: '\u{1F525}', desc: 'Bring pressure every play. Feast or famine.', blitz: 0.18, covMod: -4, runStopMod: 2, bigPlayRisk: 0.06 },
  { id: 'zone_cov', name: 'Zone Coverage', icon: '\u{1F310}', desc: 'Blanket the field. Limits big plays, gives up underneath.', blitz: -0.04, covMod: 4, runStopMod: -2, bigPlayRisk: -0.05 },
  { id: 'man_press', name: 'Man Press', icon: '\u{1F464}', desc: "Lock 'em up at the line. CB-dependent \u2014 elite or bust.", blitz: 0.04, covMod: 6, runStopMod: -3, bigPlayRisk: 0.03 },
  { id: 'run_stuff', name: 'Run Stuff', icon: '\u{1F9F1}', desc: 'Stack the box. Shut down the run, dare them to throw.', blitz: 0.06, covMod: -6, runStopMod: 8, bigPlayRisk: 0.02 },
  { id: 'prevent', name: 'Prevent', icon: '\u{1F3F0}', desc: "Protect the lead. No big plays, but they'll march.", blitz: -0.08, covMod: 8, runStopMod: -4, bigPlayRisk: -0.08 },
];

// Scheme counter matrix — offensive plan vs defensive plan → point modifier
export var SCHEME_COUNTERS = {
  air_raid:     { balanced_d: 0, blitz_heavy: 4, zone_cov: -3, man_press: 1, run_stuff: 6, prevent: -5 },
  ground_pound: { balanced_d: 1, blitz_heavy: 5, zone_cov: 1, man_press: 3, run_stuff: -7, prevent: 6 },
  balanced_o:   { balanced_d: 0, blitz_heavy: 1, zone_cov: 0, man_press: 0, run_stuff: 0, prevent: 0 },
  west_coast:   { balanced_d: 1, blitz_heavy: 5, zone_cov: -4, man_press: -2, run_stuff: 3, prevent: 1 },
  play_action:  { balanced_d: 2, blitz_heavy: -1, zone_cov: 5, man_press: -2, run_stuff: 6, prevent: -3 },
  hurry_up:     { balanced_d: 2, blitz_heavy: 3, zone_cov: -2, man_press: 1, run_stuff: 1, prevent: -1 },
  pistol:       { balanced_d: 1, blitz_heavy: 2, zone_cov: 0, man_press: 1, run_stuff: -2, prevent: 3 },
  heavy_jumbo:  { balanced_d: 2, blitz_heavy: 1, zone_cov: 2, man_press: 3, run_stuff: -5, prevent: 4 },
  smashmouth:   { balanced_d: 1, blitz_heavy: -2, zone_cov: 1, man_press: 2, run_stuff: -3, prevent: 4, bear_46: -4 },
  spread:       { balanced_d: 1, blitz_heavy: 3, zone_cov: -2, man_press: 0, run_stuff: 5, prevent: -4, bear_46: 4 },
  air_coryell:  { balanced_d: 0, blitz_heavy: 2, zone_cov: -4, man_press: 2, run_stuff: 5, prevent: -6, bear_46: 3 },
};

// Detailed scheme-vs-scheme stat effects (off plan vs def plan → per-stat adjustments)
export var SCHEME_FX = {
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

// Flavor text for scheme identity (UI descriptions)
export var SCHEME_FLAVOR = {
  spread:      { offense: 'A wide-open attack built on spacing and explosive playmaking.', defense: 'They want to spread you thin and find the crease.', switch: 'The offense opens up. Spacing and timing are the new currency.', alert: 'Spread fit is slipping \u2014 route timing and separation need attention.' },
  west_coast:  { offense: 'Short, precise passing that turns checkdowns into chunk gains.', defense: 'They will nickel-and-dime you to death if you let them.', switch: 'The system demands precision. Every route must hit on time.', alert: 'West Coast rhythm is off \u2014 quick-game accuracy and awareness are lagging.' },
  smashmouth:  { offense: 'Power running at its purest \u2014 run it until they quit.', defense: 'A meat-grinder offense. They will try to bully the line of scrimmage.', switch: 'The identity shifts to physical domination. The trenches decide everything.', alert: 'The run identity is breaking down \u2014 the O-line fit is deteriorating.' },
  pro_style:   { offense: 'A complete, balanced attack \u2014 runs when needed, passes to win.', defense: 'They have answers for everything. No easy preparation.', switch: 'The playbook expands. This scheme rewards football IQ over athleticism.', alert: 'Pro Style execution is inconsistent \u2014 mental processing and awareness are lagging.' },
  air_coryell: { offense: 'Vertical assault \u2014 push every safety back and attack the deep thirds.', defense: 'They want to take the top off your defense on every play.', switch: 'The deep ball becomes the identity. Big arm, big plays, big risks.', alert: 'The vertical game is stalling \u2014 arm talent and deep route execution need work.' },
  balanced:    { offense: 'No tendencies, no weaknesses \u2014 disciplined football.', defense: 'A balanced attack offers no easy adjustments.', switch: 'The system neutralizes weaknesses. Stability over specialization.', alert: 'Even a balanced scheme needs buy-in \u2014 identity scores are drifting.' },
  pistol:      { offense: "Versatile read-option attack \u2014 the defense must account for the QB's legs.", defense: 'They can hand it off, keep it, or throw. One defender is always wrong.', switch: 'The quarterback becomes a weapon in the run game. Creativity replaces rote execution.', alert: 'The read-option is leaking \u2014 dual-threat processing and RB catching are below threshold.' },
  heavy_jumbo: { offense: 'Two tight ends, a punishing back, and the will to run it down your throat.', defense: 'They want to physically impose their will. Lighter boxes will get eaten alive.', switch: 'The offense becomes a battering ram. Skill position flash gives way to trench dominance.', alert: 'Jumbo identity is eroding \u2014 blocking grades and physical fit are declining.' },
  '4-3':       { offense: 'Four down linemen and three linebackers \u2014 the classic pro base.', defense: 'Sound fundamentals. Strong against the run and reliable in coverage.', switch: 'A proven foundation. Fits the majority of personnel groupings.', alert: 'The 4-3 base is breaking down \u2014 front-seven fit and pursuit grades are slipping.' },
  '3-4':       { offense: 'Three down, four linebackers \u2014 versatility is the weapon.', defense: 'Edge pressure from multiple angles. Hard to protect against.', switch: 'The defense gains unpredictability. Pass rush comes from everywhere.', alert: '3-4 fit is degrading \u2014 OLB pass rush and LB coverage grades need reinforcement.' },
  multiple_d:  { offense: 'Multiple fronts and coverage shells \u2014 answers for every offensive tendency.', defense: 'They can show you anything. No pre-snap reads are safe.', switch: 'The defense gains chess-match complexity. Players must process quickly.', alert: 'Multiple D demands football IQ \u2014 awareness and recognition scores are falling.' },
  nickel:      { offense: 'Six defensive backs \u2014 pure pass defense, run stop sacrificed.', defense: 'They trust the secondary to win. One extra DB for one fewer run stopper.', switch: 'Speed replaces size in the secondary. The run game will find openings.', alert: 'Nickel coverage grades are declining \u2014 ball skills and man coverage need work.' },
  bear_46:     { offense: 'Eight men near the line \u2014 maximum pressure, maximum gamble.', defense: 'The most physically dominant defensive scheme. Forces the offense to execute fast.', switch: 'The defense goes to war. Corners are on islands. Front seven must wreck the backfield.', alert: '46 Bear execution is failing \u2014 run stopping and pass rush grades are below standard.' },
};

export function getSchemeFlavorLine(schemeId, context) {
  var f = SCHEME_FLAVOR[schemeId];
  if (!f) return '';
  return f[context || 'offense'] || f.offense || '';
}

// Legacy gameplans (simplified version used in older code paths)
export var GAMEPLANS = [
  { id: 'balanced', name: 'Balanced', icon: '\u2696\uFE0F', rb: 0, pm: 0, blitz: 0 },
  { id: 'air_raid', name: 'Air Raid', icon: '\u2708\uFE0F', rb: -0.15, pm: 8, blitz: 0 },
  { id: 'ground_pound', name: 'Ground & Pound', icon: '\u{1F3C3}', rb: 0.15, pm: -5, blitz: 0 },
  { id: 'blitz_heavy', name: 'Blitz Heavy', icon: '\u{1F525}', rb: 0, pm: 0, blitz: 0.12 },
  { id: 'prevent', name: 'Prevent', icon: '\u{1F6E1}\uFE0F', rb: 0, pm: -4, blitz: -0.08 },
  { id: 'clock_killer', name: 'Clock Killer', icon: '\u23F1\uFE0F', rb: 0.2, pm: -8, blitz: 0 },
];

// Legacy gameplan counter matrix
export var GP_COUNTERS = {
  air_raid:     { prevent: 6, balanced: 1, blitz_heavy: -5 },
  ground_pound: { blitz_heavy: 5, balanced: 1, prevent: -3 },
  blitz_heavy:  { air_raid: 5, balanced: 2, ground_pound: -5 },
  balanced:     { balanced: 0, air_raid: -1, ground_pound: -1 },
  prevent:      { ground_pound: 3, clock_killer: 2, air_raid: -6 },
  clock_killer: { prevent: 3, balanced: 1, blitz_heavy: -4 },
};

export var HOME_FIELD_ADV = 3;

export var RIVALRY_NAMES = [
  'The {city1}-{city2} War', 'The {shared_trait} Bloodline', 'The {city1} Grudge Match',
  '{city2} Hate Week', 'Battle of the {shared_trait}', '{winner_city} Supremacy',
  'The {loser_city} Revenge Tour', 'The {abbr1}-{abbr2} Border Brawl',
  'The Sunday Night Vendetta', 'The {shared_trait} Showdown',
  '{city1} vs {city2}: No Peace', 'The {year} Score to Settle',
];
