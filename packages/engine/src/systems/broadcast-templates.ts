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
