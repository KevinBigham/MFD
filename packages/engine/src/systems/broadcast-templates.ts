import { DEFENSIVE_PLAYS, OFFENSIVE_PLAYS } from './playbook';

function buildTemplates(openers: readonly string[], endings: readonly string[]): string[] {
  return openers.flatMap((opener) => endings.map((ending) => `${opener} ${ending}`));
}

export const routine_run = buildTemplates(
  [
    '{{player}} takes the handoff and presses ahead for',
    '{{player}} finds a crease and works out',
    '{{player}} leans behind the line for',
    '{{player}} keeps the legs churning for',
  ] as const,
  [
    '{{yards}} steady yards for {{team}}.',
    '{{yards}} on schedule as {{team}} stays balanced.',
    '{{yards}} and {{team}} keeps the sticks moving.',
    '{{yards}} before the defense can close the lane.',
  ] as const,
);

export const routine_pass = buildTemplates(
  [
    '{{player}} settles in and delivers for',
    '{{player}} drops back and connects for',
    '{{player}} finds room in the coverage for',
    '{{player}} steps up and zips it for',
  ] as const,
  [
    '{{yards}} to keep {{team}} in rhythm.',
    '{{yards}} as {{team}} keeps the drive alive.',
    '{{yards}} and the offense moves the chains.',
    '{{yards}} with the secondary giving just enough room.',
  ] as const,
);

export const big_play_run = buildTemplates(
  [
    '{{player}} bursts through the first wave for',
    '{{player}} turns the corner and rips off',
    '{{player}} slips a tackle and explodes for',
    '{{player}} sees daylight and tears away for',
  ] as const,
  [
    '{{yards}} and {{team}} suddenly flips the field.',
    '{{yards}} with the sideline coming to life for {{team}}.',
    '{{yards}} before anybody can chase it down.',
    '{{yards}} to jolt the entire stadium.',
  ] as const,
);

export const big_play_pass = buildTemplates(
  [
    '{{player}} uncorks a shot for',
    '{{player}} lets it fly and finds a window for',
    '{{player}} attacks deep and lands',
    '{{player}} launches a rope for',
  ] as const,
  [
    '{{yards}} as {{team}} rips the top off the defense.',
    '{{yards}} and the crowd gasps at the strike.',
    '{{yards}} to swing the field in a heartbeat.',
    '{{yards}} with the secondary scrambling behind the play.',
  ] as const,
);

export const touchdown = buildTemplates(
  [
    '{{player}} finishes it with',
    '{{player}} caps the drive with',
    '{{player}} puts {{team}} on the board with',
    '{{player}} breaks through for',
  ] as const,
  [
    '{{yards}} and six for {{team}}.',
    '{{yards}} into the end zone with the crowd erupting.',
    '{{yards}} and the broadcast booth is losing its mind.',
    '{{yards}} to put points on the board in a hurry.',
  ] as const,
);

export const turnover_interception = buildTemplates(
  [
    '{{player}} never sees it coming and it turns into',
    '{{player}} forces the throw and it becomes',
    '{{player}} is baited into',
    '{{player}} hangs one up and it becomes',
  ] as const,
  [
    'an interception that stuns {{team}}.',
    'a takeaway, and the defense steals the moment.',
    'a crushing pick that flips the script immediately.',
    'an interception with the sideline roaring.',
  ] as const,
);

export const turnover_fumble = buildTemplates(
  [
    '{{player}} gets hit and coughs up',
    '{{player}} loses the ball for',
    '{{player}} is stripped and it becomes',
    '{{player}} cannot hang on and it turns into',
  ] as const,
  [
    'a live ball disaster for {{team}}.',
    'a fumble that swings the momentum hard.',
    'a loose ball and the defense pounces.',
    'a turnover that leaves {{team}} stunned.',
  ] as const,
);

export const sack = buildTemplates(
  [
    '{{player}} gets dragged down for',
    '{{player}} is swallowed up for',
    '{{player}} cannot escape and takes',
    '{{player}} gets buried under',
  ] as const,
  [
    '{{yards}} lost yards as the rush gets home.',
    '{{yards}} lost with the pocket collapsing fast.',
    '{{yards}} gone and the defense roars.',
    '{{yards}} backward as protection breaks down.',
  ] as const,
);

export const field_goal = buildTemplates(
  [
    '{{player}} steps in and drills',
    '{{player}} lines it up and sends through',
    '{{player}} calmly knocks home',
    '{{player}} hammers through',
  ] as const,
  [
    '{{yards}} from the spot to give {{team}} three.',
    '{{yards}} and {{team}} cashes in the drive.',
    '{{yards}} with the special teams unit delivering.',
    '{{yards}} to keep points flowing for {{team}}.',
  ] as const,
);

export const punt = buildTemplates(
  [
    '{{team}} has to settle for',
    '{{team}} stalls out and sends away',
    '{{team}} cannot finish the series and punts',
    '{{team}} runs out of answers and boots',
  ] as const,
  [
    '{{yards}} of field-position football.',
    '{{yards}} as the drive fizzles out.',
    '{{yards}} and the defense gets the stop.',
    '{{yards}} with nothing easy available on third down.',
  ] as const,
);

export const clutch = buildTemplates(
  [
    'With everything tightening late, {{player}} finds',
    'Season-on-the-line energy now, and {{player}} delivers',
    'Fourth-quarter pressure everywhere, and {{player}} creates',
    'In the biggest snap of the night, {{player}} produces',
  ] as const,
  [
    '{{yards}} for {{team}} when every yard feels heavier.',
    '{{yards}} and the game shifts under the lights.',
    '{{yards}} with the tension practically crackling.',
    '{{yards}} as the crowd holds its breath.',
  ] as const,
);

export const rivalry = buildTemplates(
  [
    'The rivalry boils over as {{player}} sparks',
    'Bad blood all over this one, and {{player}} produces',
    'Another chapter in the feud brings',
    'The grudge match keeps escalating with',
  ] as const,
  [
    '{{yards}} for {{team}}.',
    '{{yards}} and both sidelines are barking now.',
    '{{yards}} with the tension climbing another notch.',
    '{{yards}} as the hatred fuels the moment.',
  ] as const,
);

export const overtime = buildTemplates(
  [
    'Overtime football, and {{player}} finds',
    'Deep into bonus football, {{player}} delivers',
    'With overtime nerves everywhere, {{player}} creates',
    'The extra session belongs to {{player}} for',
  ] as const,
  [
    '{{yards}} in a season-defining moment.',
    '{{yards}} with the entire game hanging there.',
    '{{yards}} and the pressure gets even louder.',
    '{{yards}} as sudden-death tension floods the stadium.',
  ] as const,
);

export const heroicLeads = [
  'The star takes over.',
  'That is franchise-player stuff.',
  'The superstar answers again.',
  'Elite talent on full display.',
] as const;

export const underdogLeads = [
  'The unlikely hero steps up.',
  'The backup keeps believing.',
  'A no-fear moment from the understudy.',
  'The underdog just found the spotlight.',
] as const;

export const rivalryLeads = [
  'The bad blood keeps boiling.',
  'This rivalry is getting nastier.',
  'The feud gets another haymaker.',
  'The grudge only gets louder here.',
] as const;

export const clutchLeads = [
  'The tension is real.',
  'Every second matters now.',
  'The moment just got massive.',
  'This drive carries real weight.',
] as const;

export const overtimeLeads = [
  'Overtime changes everything.',
  'The season hangs in the balance now.',
  'Bonus football, maximum pressure.',
  'Nobody is blinking in overtime.',
] as const;

export const HIGH_LEVERAGE_TEMPLATES = [
  'That play just swung win probability by {{wpSwing}} points for {{team}}, moving it from {{wpBefore}} to {{wpAfter}}.',
  '{{team}} just felt a {{wpSwing}}-point WP swing, climbing from {{wpBefore}} to {{wpAfter}} in a heartbeat.',
  'A {{wpSwing}}-point win probability jolt sends {{team}} from {{wpBefore}} to {{wpAfter}}.',
  'Momentum bends hard for {{team}} after a {{wpSwing}}-point swing, from {{wpBefore}} to {{wpAfter}}.',
] as const;

export const CRITICAL_LEVERAGE_TEMPLATES = [
  'A {{wpSwing}}-point WP swing. The analytics room just erupted as {{team}} jumped from {{wpBefore}} to {{wpAfter}}.',
  'This is massive: {{team}} just ripped off a {{wpSwing}}-point swing, moving from {{wpBefore}} to {{wpAfter}}.',
  'That snap just detonated the model for {{team}} with a {{wpSwing}}-point leap from {{wpBefore}} to {{wpAfter}}.',
  '{{team}} just authored a seismic {{wpSwing}}-point swing, surging from {{wpBefore}} to {{wpAfter}}.',
] as const;

export const PLAYBOOK_BRIDGE_TEMPLATES = {
  run: [
    '{{offensivePlay}} is the call into {{defensivePlay}}.',
    'They dial up {{offensivePlay}} against {{defensivePlay}}.',
    '{{offensivePlay}} tests the front while {{defensivePlay}} crowds the fit.',
    '{{offensivePlay}} challenges the edges of {{defensivePlay}} right away.',
  ] as const,
  pass: [
    '{{offensivePlay}} gets drawn up against {{defensivePlay}}.',
    'The booth spots {{offensivePlay}} attacking {{defensivePlay}}.',
    '{{offensivePlay}} asks the protection to sort out {{defensivePlay}}.',
    '{{offensivePlay}} unfolds with {{defensivePlay}} trying to squeeze every window.',
  ] as const,
  touchdown: [
    '{{offensivePlay}} breaks through the {{defensivePlay}} look for the finish.',
    '{{offensivePlay}} wins the rep against {{defensivePlay}} at the goal line.',
    '{{offensivePlay}} beats {{defensivePlay}} when the end zone is only a breath away.',
    '{{offensivePlay}} solves {{defensivePlay}} inside the scoring area.',
  ] as const,
  turnover: [
    '{{offensivePlay}} runs straight into {{defensivePlay}} and the defense steals the snap.',
    '{{defensivePlay}} blows up {{offensivePlay}} and flips possession.',
    '{{defensivePlay}} diagnoses {{offensivePlay}} instantly and the ball changes hands.',
    '{{offensivePlay}} never settles because {{defensivePlay}} takes over the rep.',
  ] as const,
  sack: [
    '{{defensivePlay}} collapses the pocket and buries the QB before {{offensivePlay}} develops.',
    '{{offensivePlay}} has no chance once {{defensivePlay}} caves in the protection.',
    '{{defensivePlay}} times up {{offensivePlay}} and drives the quarterback backward.',
    '{{offensivePlay}} gets swallowed whole by the pressure from {{defensivePlay}}.',
  ] as const,
  big_play: [
    '{{offensivePlay}} catches {{defensivePlay}} sleeping and breaks wide open.',
    '{{offensivePlay}} stretches {{defensivePlay}} until the coverage snaps.',
    '{{offensivePlay}} hits a crease before {{defensivePlay}} can recover.',
    '{{defensivePlay}} guesses wrong and {{offensivePlay}} rips off an explosive gain.',
  ] as const,
  clutch: [
    'Fourth quarter, and {{offensivePlay}} against {{defensivePlay}} is the call that defines this drive.',
    '{{offensivePlay}} meets {{defensivePlay}} with the game tightening around both sidelines.',
    'The high-leverage answer is {{offensivePlay}}, even with {{defensivePlay}} hunting the stop.',
    '{{defensivePlay}} loads up for the moment, and {{offensivePlay}} has to answer.',
  ] as const,
  goal_line: [
    '{{offensivePlay}} at the goal line against a stacked {{defensivePlay}} look.',
    'Everything compresses near the paint as {{offensivePlay}} crashes into {{defensivePlay}}.',
    '{{defensivePlay}} dares {{offensivePlay}} to win in the smallest space on the field.',
    '{{offensivePlay}} tries to carve out daylight while {{defensivePlay}} crowds the goal line.',
  ] as const,
  two_minute: [
    'Clock bleeding, {{offensivePlay}} is the hurry-up call against {{defensivePlay}}.',
    '{{offensivePlay}} has to move fast because {{defensivePlay}} knows the clock matters now.',
    'The two-minute drill leans on {{offensivePlay}} while {{defensivePlay}} races to match.',
    '{{defensivePlay}} is guarding the sideline, and {{offensivePlay}} has to keep the drive alive.',
  ] as const,
  third_down: [
    'Third and long, {{offensivePlay}} is the money call against {{defensivePlay}}.',
    '{{offensivePlay}} tries to move the chains with {{defensivePlay}} keyed in on the marker.',
    '{{defensivePlay}} knows the sticks are nearby, and {{offensivePlay}} has to answer now.',
    '{{offensivePlay}} carries the down while {{defensivePlay}} closes on the conversion point.',
  ] as const,
  trick_play: [
    'The misdirection! {{offensivePlay}} fools the {{defensivePlay}} completely.',
    '{{offensivePlay}} shows one picture and spins {{defensivePlay}} the other way.',
    '{{defensivePlay}} bites on the eye candy and {{offensivePlay}} steals the moment.',
    '{{offensivePlay}} gets theatrical, and {{defensivePlay}} has to recover in a hurry.',
  ] as const,
  blitz: [
    '{{defensivePlay}} brings the heat and {{offensivePlay}} has to beat the pressure.',
    '{{offensivePlay}} barely has time because {{defensivePlay}} is screaming downhill.',
    '{{defensivePlay}} sends extra rushers straight through the heart of {{offensivePlay}}.',
    '{{offensivePlay}} has to diagnose it fast with {{defensivePlay}} attacking the pocket.',
  ] as const,
} as const;

export const PLAY_SPECIFIC_COMMENTARY: Record<string, readonly string[]> = {
  inside_zone: [
    'Inside Zone presses the A-gap crease with textbook patience.',
    'Inside Zone finds daylight between the guards before the linebackers can fold in.',
  ],
  outside_zone: [
    'Outside Zone stretches the edge until a cutback lane shows itself.',
    'Outside Zone dares the defense to run laterally and stay disciplined.',
  ],
  power_run: [
    'Power Run follows the puller and hammers into the alley.',
    'Power Run brings the guard around and tries to punish the front.',
  ],
  draw: [
    'The Draw waits a heartbeat, then slips under the pass rush.',
    'Draw Play invites the rush upfield before hitting underneath it.',
  ],
  counter: [
    'Counter flashes one way and snaps back into the weak-side lane.',
    'Counter uses the false step to steal leverage from the linebackers.',
  ],
  sweep: [
    'Toss Sweep races for the corner before pursuit can scrape over the top.',
    'Toss Sweep asks the perimeter blocks to spring the edge.',
  ],
  qb_sneak: [
    'QB Sneak turns into a pile-moving test of inches.',
    'QB Sneak is pure leverage and leg drive right over center.',
  ],
  option_run: [
    'Read Option makes the end defender wrong and turns hesitation into yards.',
    'Read Option forces the edge to choose, and either answer can be punished.',
  ],
  goal_line_dive: [
    'Goal Line Dive is all compression, pad level, and forward surge.',
    'Goal Line Dive goes straight at the heart of the defense with no disguise.',
  ],
  jet_sweep: [
    'Jet Sweep uses motion to outrun the fit to the edge.',
    'Jet Sweep tries to steal angles before the backside pursuit can rally.',
  ],
  slant: [
    'Quick Slant snaps across the defender’s face before the window closes.',
    'The Quick Slant is out on rhythm, beating leverage with timing.',
  ],
  out_route: [
    'Out Route attacks the boundary and asks for precise footwork at the sideline.',
    'Out Route wins if the quarterback gets the ball out before the break.',
  ],
  deep_post: [
    'Deep Post bends inside and hunts the void behind the safeties.',
    'The Deep Post goes vertical and threatens the defense over the top.',
  ],
  corner_route: [
    'Corner Route climbs and breaks to the pylon-side void in coverage.',
    'Corner Route tries to high-low the safety on the outside shoulder.',
  ],
  screen_pass: [
    'Screen Pass lets the rush through just long enough to punish it.',
    'Screen Pass turns the convoy loose in space if the timing hits.',
  ],
  play_action: [
    'Play Action sells the run and tries to freeze the second level.',
    'Play Action turns hard run steps into a shot behind the linebackers.',
  ],
  crossing_route: [
    'Crossing Route drags the coverage across the field and creates a run-after-catch chance.',
    'Crossing Route works through traffic until a defender loses the trail.',
  ],
  seam_route: [
    'Seam Route splits the hashes and stresses the safeties vertically.',
    'Seam Route hits the soft spot between linebacker depth and safety help.',
  ],
  quick_out: [
    'Quick Out is catch-and-throw timing to the sticks.',
    'Quick Out wins only if the ball arrives before the corner can drive downhill.',
  ],
  fade: [
    'Fade tosses it high and outside where only the target can climb for it.',
    'Fade is a trust throw to the boundary against tight coverage.',
  ],
  wheel_route: [
    'Wheel Route starts low and turns upfield once the coverage bites.',
    'Wheel Route hides the vertical release until the back is already turning the corner.',
  ],
  te_drag: [
    'TE Drag sneaks under the linebackers and keeps moving across the formation.',
    'TE Drag uses traffic and leverage to uncover in the middle.',
  ],
  dagger: [
    'Dagger clears the top and drives a deep in-breaker right behind it.',
    'Dagger layers the coverage with a vertical clear-out and a hard dig behind it.',
  ],
  rollout: [
    'Rollout changes the launch point and forces the coverage to flow with it.',
    'Rollout buys vision on the edge and puts the defense in chase mode.',
  ],
} as const;

const OFFENSIVE_PLAY_NAMES = new Map(OFFENSIVE_PLAYS.map((play) => [play.id, play.name]));
const OFFENSIVE_PLAY_CATEGORIES = new Map(OFFENSIVE_PLAYS.map((play) => [play.id, play.category]));
const DEFENSIVE_PLAY_NAMES = new Map(DEFENSIVE_PLAYS.map((play) => [play.id, play.name]));

const SITUATION_TO_BRIDGE_CATEGORY: Record<string, Exclude<keyof typeof PLAYBOOK_BRIDGE_TEMPLATES, 'run' | 'pass'>> = {
  touchdown: 'touchdown',
  turnover: 'turnover',
  sack: 'sack',
  big_play: 'big_play',
  clutch: 'clutch',
  goal_line: 'goal_line',
  two_minute: 'two_minute',
  third_down: 'third_down',
  trick_play: 'trick_play',
  blitz: 'blitz',
};

function replacePlayTokens(template: string, offensivePlay: string, defensivePlay: string): string {
  return template
    .replaceAll('{{offensivePlay}}', offensivePlay)
    .replaceAll('{{defensivePlay}}', defensivePlay);
}

export function getPlaybookCommentary(offPlayId: string, defPlayId: string, situation: string): string[] {
  const offensivePlay = OFFENSIVE_PLAY_NAMES.get(offPlayId);
  const defensivePlay = DEFENSIVE_PLAY_NAMES.get(defPlayId);
  const offensiveCategory = OFFENSIVE_PLAY_CATEGORIES.get(offPlayId);

  if (!offensivePlay || !defensivePlay || !offensiveCategory) {
    return [];
  }

  const commentary: string[] = [];
  const baseCategory = offensiveCategory === 'run' ? 'run' : 'pass';
  const situationalCategory = SITUATION_TO_BRIDGE_CATEGORY[situation];

  for (const template of PLAYBOOK_BRIDGE_TEMPLATES[baseCategory]) {
    commentary.push(replacePlayTokens(template, offensivePlay, defensivePlay));
  }

  if (situationalCategory) {
    for (const template of PLAYBOOK_BRIDGE_TEMPLATES[situationalCategory]) {
      commentary.push(replacePlayTokens(template, offensivePlay, defensivePlay));
    }
  }

  commentary.push(...(PLAY_SPECIFIC_COMMENTARY[offPlayId] ?? []));

  return [...new Set(commentary)];
}

export const BROADCAST_COMMENTARY_TEMPLATES = {
  routine_run,
  routine_pass,
  big_play_run,
  big_play_pass,
  touchdown,
  turnover_interception,
  turnover_fumble,
  sack,
  field_goal,
  punt,
  clutch,
  rivalry,
  overtime,
} as const;
