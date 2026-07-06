import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { SetupPhase } from './franchise-setup';
import {
  getBlueprintClosingMonologue,
  getCoachHiringReaction,
  getGoalReaction,
  getPhaseTransitionFlavor,
  getSchemeReaction,
  getScoutHiringReaction,
  getTeachingTips,
  getTransitionTip,
} from './agm-setup-content';

const VAGUE_SETUP_COPY = /\b(?:building trust|room is|room gets|room aligned|room understands|room will|the room|draft room|war room|big board|building execute|building has to|run through walls|run through a wall|football war metaphors|sets the temperature|locker room|poker chips|dogs|go find dogs|clinic board|conversation starts|conversation has|runway|real leak|board is|the board|high-leverage|chess|variance|leverage|weekly edge|competitive edge|weekly plan work|cleanest|cleaner optimization|dashboard that actually matters|clean signal|clean medium|execute cleanly|bet on|clean personnel|clean collective|singular edge|signals split|the math likes it|lowers volatility|narrows our margin|expensive work|math simple|roster tax|hidden yardage|impossible calls|living sideways|marrying a lie|gets cute|nickel-and-dime|sturdy football|skill players breathe|story of every pressure|feel alive|live on an island|vague story|vague optimism|story people tell themselves|splashy March headline|grown-up goal|floor, not the speech|balanced books|just marketing|momentum matters|workout heroes|stable asset|exposure decisions|marginal win value|lost flexibility|people map|fair story|by Sunday|coaching clinic|has to cook|talking safe|attitude adjustment|finesse football|who do you trust|soft goals|what are we building|who we are|same direction|coffee|narrative|perception shapes|fresh start|what feels like us|who we want to be|culture eats scheme|culture is built|culture has to be|culture while|led culture|align the culture|everyone feels valued|feels supported|foundation|whole-team|kind of human|exactly the connector|stay aligned|same page|go build that|art and science|build that bridge|shared vision|build something people want to stay part of|whole grade|underwear Olympics|workout warrior|spreadsheet and the story|Great stories|human side|go with her science|truth about character|honor his experience|modernizing our process|loves football|love football|soft players|analytics theater|fancy title|Twitter|warning light|door closed|foxhole|fraud|information market|confidence intervals|target functions|surplus value|base rates document|resource allocation problem|probability distributions|expected points added|optimize for|decisions that compound|trust protection|rewards trust and detail|assignments feel concrete|stabilize trust quickly|build trust fast|contract decision feels cold|feels like a football job|systems feel real|I can feel it|EPA per|win probability|expected wins|Process over outcome|Checking my model|my model|probabilities before|probability of success|draft model|model behind|model matches|market inefficiencies|0\.71 correlation|hit rate improvement|turns uncertainty into probability|55th percentile|bust rate|expected wins over|optimize the staff|data supports|day-two hit rate|integrate the model|62 percent|12 percent better|0\.8 wins|below replacement|second-contract AV|top five percentile|How are you feeling|raises the ceiling|build-buy-in|build buy-in|Cleaner assignments|Mentorship matters|Players are one thing|Player buy-in|Player trust|players trust|players love him|Players love him|trust a draft grade|trust the draft grade|grades easier to trust|coordinator trust|future trust|same language|same grading language|staff aligned|goals are simple|Everything else is excuses|practice different|Set the bar high|winning the North|shared destination|staff and players need alignment|first real step|clear medium-sized move|staff alignment|Scouting process shows up|stable structure|respect the plan less|theoretical upside|more than money|gives you timing|promise instead of a wish|They always do|cap sheet stops being abstract|starts becoming consequence|some just yell|receptionist|Karen|conference room|glass doors|security guard|touchscreen|elevator|skyline|I close the tablet|slide it under my arm|shake hands and make the call|I've sat with each one|real evaluator\. I like it|Listen|my guy|real smart|PowerPoint|I respect the pick|Scheme is a promise|Physical answers travel|Cute answers|sneaking in|word scares|hard work is leading somewhere real|Air Raid is exciting|real target|standard you chose|minimum standard|spiral(?:ing)?|Stability is a real form|Scheme talk is cheap|real names|Coaching fit is only real|Talent gets you drafted|safe answer|Clear roles beat slogans|real plays|real play-call|real authority|safe if|Pick the standard|His strengths matter only|draft process just got clearer|decisions safer|grades easier to act on|I am good with it|whole offense settles down|picture stays consistent|dependable structure|stress the wrong one|sharp benchmark|vague one|pretending the build is finished|baseline improved|missed progress is easy to excuse|cap cost is hard to justify|protects future relationships|safer outlets|clever on paper|rest of the roster usually follows|his strengths stay unused|weekly prep to his strengths|staff strengths|strongest current position group|run through .*strengths|Scout that group)\b/i;
const RECENT_STALE_SETUP_COPY = /\b(?:good enough|That matters early|first-month standard|Rebuild progress matters|Cap health matters|High-end talent matters|future starters matter|executes this scheme cleaner|shape draft grades|not settled|right teacher matters|Scheme fit matters more|weekly standards|which standards matter|players keep standards under pressure|practice standards|controls practice standards|Good hire\.|This coach fits the players|His strengths help only|pretty grade|contract value|draft value|current value|future value|pick value|need room|which weekly expectations matter|We do not need perfect|We need disciplined|players we already pay|wish we had|who can help us win|stable landmarks|useful role player|useful wins|should drive the plan|useful wins now|matters before Week 1|skills matter|scheme matter|Character matters|medical context|choices that matter|cap room|Understand the roster|Coaches either develop players|can steady|Once you understand the roster|support the coach's scheme|ownership understand|players can understand|make fewer mistakes than the other 31 teams|You learn by reps|build something opponents hate to play|every staff and roster decision sends a message|I will help you check|pause it, you'll tell me|future upside|takeaway upside|transition penalties|probably shouldn't pay|Stable role grades|character questions|before other plans matter|development snaps matter|flexibility you lose|roster flexibility|next offseason flexibility|Cap space is flexibility|Protect flexibility|late-season cap flexibility|losing cheap production cuts cap flexibility|Cap is simple|scheme gaps|door shuts|There it is|The plan is clear|keeps options open|roles need involvement|protect relationships|healthy over time|stretches the team without lying|position group that scares you|stale roles|Aggressive spending helps Week 1|make sure the roster can chase|can handle blitzes|can handle isolated matchups|can handle first-month pressure|That helps owner patience|can handle contact|bold outlier swings|draft handoff mistakes|handoff risk|Protect this coach's roster fit|Review that fit|weak draft fits|grade tells us talent|Scheme has to fit|poor scheme fit|poor fits|role fit|coach fit|quick throws fit|run fits get harder|fits are unclear|missed fits|weak fits|player fit|role that fits|Choose scheme fit|coaching-fit misses|bad fit costs|Check scheme fit|Forcing a poor fit|Choose Star Power|star power|low-confidence|scout confidence|scouting confidence|improves draft grades and flags future starter risk|can grade players for the coach's scheme|no unit deserves|\bworth\b)\b/i;
const RECENT_STALE_SETUP_GOAL_COPY =
  /\b(?:learn the roster|buy time for the weekly plan|checkpoints ownership will accept|ownership forgives|without a full reset|modest target|cap problems later|will have consequences|year-one prep|year-one assignments|year-one goal|roster can learn|weekly deadlines)\b/i;
const RECENT_STALE_RESIDUAL_SETUP_COPY =
  /\b(?:first-month priorities|weekly fixes|full roster reset|future starters need|wins can still hide|are watching every cut|Talent matters|current-week plan|lineup choice can change)\b/i;
const RECENT_STALE_AUTHORED_SETUP_COPY = /\b(?:owner standard|effective space|age, OVR|Week 1 execution|execution slip|year-one execution|RAS scores|hit rate on day three|league average is 22|18 percent|analytics support|playoff odds)\b/i;
const RECENT_STALE_HELP_SETUP_COPY =
  /\b(?:First job is simple|Intel is simple|simple deep-half rules|clear help rules|without much help|veteran help|veteran-help|chase veteran help|Keep the install simple|adding help|roster help|safety[- ]help answers|safety answers)\b/i;
const RECENT_STALE_SCHEME_JARGON_COPY =
  /\b(?:bad timing|fast rules|explosive-play risk|risk explosives|overmatched corners risk explosives|easy yards|leak easy yards)\b/i;
const RECENT_STALE_SETUP_FALLBACK_COPY =
  /\b(?:player roles and transition cost are clear|roster timeline and owner pressure match it|bad lineup or cap risk|makes this hire harder by Week 1|raises owner pressure|current starters already fit the roles|current starters can execute|can absorb early losses|missed checks)\b/i;
const RECENT_STALE_OWNER_PRESSURE_SHORTHAND =
  /\b(?:owner pressure|pressure decisions|pressure calls|owner-pressure problems|raising owner pressure|raise owner pressure|goals decide pressure|raises pressure on trades|Week 1 pressure hits|first-month pressure|veteran-upgrade pressure|weekly pressure|highest-pressure target|raises pressure immediately|scoring pressure|pressure mistakes|Week 1 pressure breaks calls|weak explanation raises pressure|late-season pressure)\b/i;
const RECENT_STALE_COACH_SPEAK =
  /\b(?:timing and discipline|pressure angles|missed gap responsibilities|pressure rule|brings that discipline|third-down discipline|data discipline|Tampa 2 needs discipline|confusion hurts confidence|uneven player standards|weak coordinators)\b/i;
const RECENT_STALE_UNCLEAR_SETUP_COPY =
  /\b(?:no number gets trusted|unclear decisions|unclear authority|unclear calls|assignments are unclear|roles are unclear|unclear jobs|unclear explanation|unclear accountability|unclear role grades)\b/i;
const RECENT_STALE_SCOUT_GRADE_LOCK_COPY =
  /\b(?:draft grading system|draft grades lock|draft grade locks|draft grades tied to picks|data grades|data-backed grades|Data-backed draft grading|mismatched draft grades|mismatched grades|draft grades you can act on|Review draft grades|draft grade for film|bad grades|draft-grade checklist|same role-risk-cost checklist|role, risk, and cost|roles, risks, and pick costs|risk and cost standard|risk, and cost standard|risk, and cost checklist|role risk|which grades are worth|grades are flat|workout grades alone|can grade the coach's roles|missing role grades|Coaches and scouts grade|I graded every player|film disagrees with the grade|grade shows talent|grade alone|compare grades)\b/i;
const RECENT_STALE_HIRING_QUOTE_FILLER =
  /\b(?:We win together|I'll never ask a player to do something I wouldn't do myself)\b/i;
const RECENT_STALE_AGM_PROFILE_SHORTHAND =
  /\b(?:routine decisions|high-motor players|Weak teaching|Strong corners|coldest financial decision|preserve relationships|Deep relationships with college coaches|coach relationships reveal|intangibles|clear role|make the risk clear|can put the season at risk|players can follow|clear Week 1 consequence|consequences are clear|First job is clear|clear risk advice|simple roster calls|Setup is ready|ready for more|ready by Week 1|clear deep-half rules|Can delay immediate roster calls|Can overrate effort|Can wait too long|Can delay cuts|Can undervalue coachability|Can pass on unusual prospects|Limited in-person evaluation experience|Not elite at either analytics or tape grinding|Elite red zone creativity|Tempo control that wears down defenses|Situational mastery on third down|Morale repair after staff turmoil|Would I put my paycheck|healthier tomorrow|stronger in three years|need extra attention|needs extra attention|I have played in the league|Talent wins games when)\b/i;
const RECENT_STALE_MORALE_RISK_SHORTHAND =
  /\b(?:morale risk|roles without player skill|players can grow inside|Name who gets rewarded|unassigned jobs create missed assignments and morale risk|need names before you can fix them)\b/i;
const RECENT_STALE_AGM_SOFT_CONSEQUENCE_COPY =
  /\b(?:wrong hire can slow|Aggressive spending can improve|promises can change|wrong week can make|one injury can break|cap hits can block|old money can block|opponents can force first|older choice can cost|forcing the install can create|injuries can turn|playable role can waste|wrong role can slow|surprise cap move can drop|without a named replacement job can drop|incomplete reports can waste|thin reports can turn|problem can erase)\b/i;
const RECENT_STALE_SETUP_CAPABILITY_COPY =
  /\b(?:can win contact|players can explain|scheme can explain|you can afford|coach who can teach|roster can defend|roster can still defend|roster can chase|warnings you can act on|Cap details need a second check|Effort reads miss missing role or talent)\b/i;
const RECENT_STALE_AGM_RISK_SHORTHAND =
  /\b(?:turnover risk|big-mistake risk|long-touchdown risk|injury risk|preventable risk|hidden risk|medical risk|character risk|missed-starter risk|role, character, and risk|character, and risk|pick-risk system|extra complexity risks Week 1 mistakes)\b/i;
const RECENT_STALE_HIRING_LABEL_OR_COLOR_COPY =
  /\b(?:Risk:|Cost:|Tradeoff:|legend|tremendous teacher|players voted|driving a Buick|spreadsheet nonsense|30 points a game|most physical team)\b/i;
const RECENT_STALE_FALSE_CONTEXT_OR_GREETING_COPY =
  /\b(?:Let's skip the resume|47 million|quarterback decision|Congratulations\. First choice|You inherited a team that just fired a GM|Alright, GM|Setup is information before action|not highlights)\b/i;
const RECENT_STALE_BEST_ASSIGNMENT_COPY =
  /\b(?:best blockers|best assignments|leaders' best assignments)\b/i;
const RECENT_STALE_SCOUT_WEAKNESS_COPY =
  /\b(?:Medical and athletic data need|Road-scout reports needed|warnings need road-scout|Analytics and tape need|Unusual prospects need|Pick need vs talent|Scout starter needs)\b/i;
const RESTRICTIVE_FIRST_RUN_CONDITION_COPY =
  /\b(?:choose|hire|pass|keep|use|spend|restructure|override)\b[^.!?;]*(?:only if|only when|only with|only after|unless)\b|\bdo not choose\b[^.!?;]*\bunless\b/i;
const RECENT_STALE_FIRST_RUN_CHOICE_IF_COPY = /\b(?:Choose|Use)\s+[A-Z][^.!?;]*\bif\b/;

const HIRING_CONTENT_SOURCE = readFileSync(new URL('../../../content/agm/hiring-content.json', import.meta.url), 'utf8');
const AGM_CHARACTERS_SOURCE = readFileSync(new URL('../../../content/agm/agm-characters.json', import.meta.url), 'utf8');
const TEACHING_POLISH_SOURCE = readFileSync(new URL('../../../content/agm/teaching-polish.json', import.meta.url), 'utf8');
const AGM_SETUP_CONTENT_TS_SOURCE = readFileSync(new URL('./agm-setup-content.ts', import.meta.url), 'utf8');
interface HiringContentFixture {
  head_coach_candidates: Array<{
    id: string;
    agm_reactions: Record<string, { analysis: string; one_liner: string }>;
  }>;
  scouting_director_candidates: Array<{
    id: string;
    weaknesses: string[];
    agm_reactions: Record<string, { analysis: string; one_liner: string }>;
  }>;
  hiring_celebration: Record<string, Record<string, string[]>>;
}

const HIRING_CONTENT_FIXTURE = JSON.parse(HIRING_CONTENT_SOURCE) as HiringContentFixture;
const TEACHING_POLISH_FIXTURE = JSON.parse(TEACHING_POLISH_SOURCE) as { loading_tips: string[] };
const AGM_CONTENT_SOURCE_COPY = [
  HIRING_CONTENT_SOURCE,
  AGM_CHARACTERS_SOURCE,
  TEACHING_POLISH_SOURCE,
].join(' ');

const SETUP_ACTION_CUE =
  /\b(add|assign|attach|avoid|budget|choose|commit|compare|draft|extend|find|fix|hire|identify|inspect|keep|match|model|move|name|open|pair|pass|pay|pick|preview|protect|save|set|spend|start)\b/i;
const SETUP_CONSEQUENCE_CUE =
  /\b(Week 1|before|block\w*|cap|cost|deadline|depth|development|drive\w*|execute|execution|future|injur\w*|later|limit\w*|loss\w*|miss\w*|mistakes?|morale|owner|patience|pressure|risk|roles?|snaps?|starter|stall\w*|trade|turnover|weak|wrong)\b/i;
const SOFT_HIRING_REACTION_COPY = /\b(?:can|should|may|useful|matters|good hire)\b/i;

function expectSetupActionAndConsequence(copy: string, label: string): void {
  expect(copy.length, label).toBeGreaterThan(0);
  expect(SETUP_ACTION_CUE.test(copy), `${label}: ${copy}`).toBe(true);
  expect(SETUP_CONSEQUENCE_CUE.test(copy), `${label}: ${copy}`).toBe(true);
}

describe('agm-setup-content', () => {
  it('maps live setup coach ids onto authored hiring-content coach ids', () => {
    expect(getCoachHiringReaction('marcus_webb', 'elias_rowe')).toEqual(
      getCoachHiringReaction('elias_vance', 'marcus_whitaker'),
    );
    expect(getCoachHiringReaction('coach_d_hardaway', 'dorian_cross')).toEqual(
      getCoachHiringReaction('derrick_coleman', 'victor_ramos'),
    );
    expect(getCoachHiringReaction('sandra_chen', 'nico_morales')).toEqual(
      getCoachHiringReaction('maya_alvarez', 'jamal_brooks'),
    );
  });

  it('maps live setup scouting director ids onto authored hiring-content scout ids', () => {
    expect(getScoutHiringReaction('marcus_webb', 'zoe_wilcox')).toEqual(
      getScoutHiringReaction('elias_vance', 'priya_desai'),
    );
    expect(getScoutHiringReaction('coach_d_hardaway', 'marvin_tate')).toEqual(
      getScoutHiringReaction('derrick_coleman', 'calvin_hendricks'),
    );
    expect(getScoutHiringReaction('sandra_chen', 'celia_duarte')).toEqual(
      getScoutHiringReaction('maya_alvarez', 'theo_washington'),
    );
  });

  it('throws when required hiring content is missing', () => {
    expect(() => getCoachHiringReaction('marcus_webb', 'unknown_coach')).toThrow(
      'Unknown coach content candidate unknown_coach.',
    );
    expect(() => getScoutHiringReaction('marcus_webb', 'unknown_scout')).toThrow(
      'Unknown scout content candidate unknown_scout.',
    );
  });

  it('keeps raw AGM setup content free of stale flavor-only shorthand', () => {
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(VAGUE_SETUP_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_SETUP_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_SETUP_GOAL_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_RESIDUAL_SETUP_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_AUTHORED_SETUP_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_HELP_SETUP_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_SCHEME_JARGON_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_SETUP_FALLBACK_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_OWNER_PRESSURE_SHORTHAND);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_COACH_SPEAK);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_UNCLEAR_SETUP_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_SCOUT_GRADE_LOCK_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_HIRING_QUOTE_FILLER);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_AGM_PROFILE_SHORTHAND);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_MORALE_RISK_SHORTHAND);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_AGM_SOFT_CONSEQUENCE_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_SETUP_CAPABILITY_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_AGM_RISK_SHORTHAND);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_HIRING_LABEL_OR_COLOR_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_FALSE_CONTEXT_OR_GREETING_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_BEST_ASSIGNMENT_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_SCOUT_WEAKNESS_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RESTRICTIVE_FIRST_RUN_CONDITION_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(RECENT_STALE_FIRST_RUN_CHOICE_IF_COPY);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/\b(?:Day one|first day)\b/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/\burgent\b|gut feelings?|strong playcallers|strong class|strong testing numbers/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/urgent decisions/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/cleaner snaps/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/medical and athletic support|Review coach support|poor support|defensive support|data support|scheme support|\bsupported role\b/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/\broom to buy\b/i);
    expect(AGM_SETUP_CONTENT_TS_SOURCE).not.toMatch(/The next decision is ready|Small setup choices compound|control the listed risks|decisions that matter|feel active/i);
    expect(AGM_SETUP_CONTENT_TS_SOURCE).not.toMatch(RESTRICTIVE_FIRST_RUN_CONDITION_COPY);
    expect(AGM_SETUP_CONTENT_TS_SOURCE).not.toMatch(RECENT_STALE_SETUP_FALLBACK_COPY);
    expect(AGM_SETUP_CONTENT_TS_SOURCE).toContain('starters have assigned protection, coverage, and run-defense jobs');
    expect(AGM_SETUP_CONTENT_TS_SOURCE).toContain('after naming starter strength, cap space, and owner patience');
    expect(AGM_SETUP_CONTENT_TS_SOURCE).toContain('skipped roster, cap, depth-chart, or game-plan fixes leave');
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/\bUse\b/);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/\b(?:justif(?:y|ies|ied|ying)|roster inspection|Inspect the roster|Inspect players|Data-first reads)\b/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/wrong roles create|wrong plan creates|wrong scheme calls|wrong goals|forcing wrong calls|protection risk rises/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/panic trades/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/fast answers|immediate structure|defense lags|run defense lags|day-three process has lagged|right hire lowers bust risk|players will follow/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/ignoring it|Ignoring data misses|repeat strengths|If coach preference and current player roles disagree|ignoring backup order/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/\bread\b/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/Compare age|Compare recent performance|compare agent|compare current starters|Compare roster strength/i);
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/cost, role, and risk|role-risk calls|contract risk|assignment risks?|cap and depth risk|bad lineup spots|medical, role, and trait warnings|role, medical, or trait warnings|medical or trait warning/i);
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Pick calls that put assigned blockers, receivers, or defenders in repeatable jobs');
    expect(AGM_CONTENT_SOURCE_COPY).toContain("When coach preference and current player roles disagree, protect this year's players");
    expect(AGM_CONTENT_SOURCE_COPY).toContain('skipped backup order puts an unassigned player in after injuries');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Pair him with medical and athletic data before picks, or injury and athleticism warnings stay hidden');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('ignored assignments create missed calls by kickoff');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('forcing calls that current starters cannot handle slows prep');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Forcing calls that current blockers or defenders cannot handle creates missed assignments');
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/cannot execute/i);
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Spend cap space on players who still produce');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('avoid dead money that blocks next year');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Name injured starters, role conflicts, and unhappy veterans');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('calls without backup protection create Week 1 mistakes and morale loss');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('safeties are assigned deep coverage');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Late throws or missed blocks turn precision into Week 1 stalled drives');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Fast corners with assigned deep help get takeaway chances');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Late decisions give pass rushers free shots by Week 1 and turn quick throws into interceptions');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Miss deep help, and one beaten corner gives up a long touchdown');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('medical limits before we spend a pick');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('cheap picks go to players who cannot practice or earn jobs');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('role, character warning, and pick cost');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Explaining cap hits and dead money before cuts');
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/\bthin (?:starter|starters|backup|backups|reports)\b|thin starter or backup|thin reports/i);
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Delayed roster calls leave first-backup jobs uncovered');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('unsupported targets force deadline overpays and shorten owner patience');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('unsupported goals force deadline overpays or shorten owner patience');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('without forcing deadline overpays by October');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('cost, role, and deadline behind every decision');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('contract cost before you spend picks or cap space');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Does this player own a Week 1 role, protect a starter, or cost snaps and cap space?');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Effort notes can miss role or talent gaps');
    expect(AGM_CONTENT_SOURCE_COPY).not.toContain('Effort grades miss role or talent gaps');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('starter jobs, backup cover, or contract cost need the first warning before Week 1');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('the wrong player gets snaps, drives, or money');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Unnamed roles create morale loss, wasted development snaps, and rushed fixes.');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Does this move assign a role, protect morale, or create cap and owner-patience cost?');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('role, morale, or contract consequences need the first warning before Week 1');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('hire the AGM, then name the starter jobs, first backups, cap space, and Week 1 calls that need attention');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('starter and backup jobs, player morale, or the Week 1 game plan');
    expect(AGM_CONTENT_SOURCE_COPY).not.toContain('stabilize the staff, evaluate the roster');
    expect(AGM_CONTENT_SOURCE_COPY).not.toContain('starter and backup jobs, morale, or the Week 1 game plan');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('assignment misses before they cost snaps, drives, or Week 1 games');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('assignment misses before scheme mistakes cost drives');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('one injury into two uncovered lineup spots');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('paying decline creates cap squeeze and uncovered depth');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('contract cost are named, choose the coach who teaches the roles Week 1 needs');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('Red-zone calls that turn drives into points');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('No medical or athletic cross-check before picks wastes cheap picks on players who cannot practice');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('No road-scout report before early picks misses toughness, coachability, or medical warnings');
    expect(AGM_CONTENT_SOURCE_COPY).toContain('No coach-owned development plan passes over unusual prospects or wastes their snaps');
    expect(AGM_CONTENT_SOURCE_COPY).toContain("Choose a scheme that names the leaders' jobs first");
  });

  it('keeps authored AGM hire/pass advice direct instead of soft possibility language', () => {
    const candidates = [
      ...HIRING_CONTENT_FIXTURE.head_coach_candidates,
      ...HIRING_CONTENT_FIXTURE.scouting_director_candidates,
    ];

    for (const candidate of candidates) {
      for (const [agm, reaction] of Object.entries(candidate.agm_reactions)) {
        const copy = `${reaction.analysis} ${reaction.one_liner}`;
        expectSetupActionAndConsequence(copy, `${candidate.id} ${agm} hiring reaction`);
        expectSetupActionAndConsequence(reaction.one_liner, `${candidate.id} ${agm} hiring one-liner`);
        expect(copy, `${candidate.id} ${agm}: ${copy}`).not.toMatch(SOFT_HIRING_REACTION_COPY);
      }
    }

    expect(getCoachHiringReaction('coach_d_hardaway', 'elias_rowe').analysis).toContain('spread offense leaves defense and the run game underbuilt');
    expect(getCoachHiringReaction('coach_d_hardaway', 'elias_rowe').oneLiner).toContain('run-defense jobs and coverage calls get exposed');
    expect(getCoachHiringReaction('sandra_chen', 'nico_morales').analysis).toContain('fourth-down calls and in-game adjustments behind by Week 1');
    expect(getScoutHiringReaction('marcus_webb', 'zoe_wilcox').analysis).toContain('regional scouts must report toughness');
    expect(getScoutHiringReaction('marcus_webb', 'marvin_tate').analysis).toContain('cheap picks get spent on players who cannot practice or earn jobs');
  });

  it('keeps first-run scheme and goal reactions actionable with consequences', () => {
    const agms = ['marcus_webb', 'coach_d_hardaway', 'sandra_chen'];
    const schemes = ['spread', 'west_coast', 'smashmouth', 'air_raid', 'balanced', '4-3', '3-4', 'zone_cov', 'balanced_d', 'man_press', 'moonball'];
    const goals = ['win_division', 'playoff_berth', 'winning_record', 'rebuild_progress', 'cap_health', 'star_power', 'no_losing_streak', 'draft_well', 'championship', 'invented_goal'];

    for (const agm of agms) {
      for (const scheme of schemes) {
        expectSetupActionAndConsequence(getSchemeReaction(agm, scheme), `${agm} scheme ${scheme}`);
      }
      for (const goal of goals) {
        expectSetupActionAndConsequence(getGoalReaction(agm, goal), `${agm} goal ${goal}`);
      }
    }
  });

  it('keeps first-run teaching tips and transitions actionable with consequences', () => {
    const agms = ['marcus_webb', 'coach_d_hardaway', 'sandra_chen'];
    const tips = ['roster_screen', 'depth_chart_screen', 'cap_screen', 'game_plan_screen'];
    const transitions: Array<[SetupPhase, SetupPhase]> = [
      ['choose_agm', 'intel_briefing'],
      ['intel_briefing', 'meet_roster'],
      ['meet_roster', 'hire_coach'],
      ['hire_coach', 'hire_scout'],
      ['hire_scout', 'set_scheme'],
      ['set_scheme', 'depth_chart'],
      ['depth_chart', 'cap_strategy'],
      ['cap_strategy', 'set_goals'],
      ['set_goals', 'blueprint'],
    ];

    for (const agm of agms) {
      for (const tip of tips) {
        getTeachingTips(agm, tip).forEach((copy, index) => {
          expectSetupActionAndConsequence(copy, `${agm} ${tip} teaching tip ${index}`);
        });
      }
      for (const [from, to] of transitions) {
        expectSetupActionAndConsequence(getPhaseTransitionFlavor(agm, from, to), `${agm} transition ${from}->${to}`);
      }
    }

    TEACHING_POLISH_FIXTURE.loading_tips.forEach((copy, index) => {
      expectSetupActionAndConsequence(copy, `loading tip ${index}`);
    });

    Object.entries(HIRING_CONTENT_FIXTURE.hiring_celebration).forEach(([section, agmLines]) => {
      Object.entries(agmLines).forEach(([agm, lines]) => {
        lines.forEach((copy, index) => {
          expectSetupActionAndConsequence(copy, `${section} ${agm} celebration ${index}`);
        });
      });
    });
  });

  it('explains scout-hire consequences with concrete support requirements', () => {
    const calSandra = getScoutHiringReaction('sandra_chen', 'marvin_tate');
    expect(calSandra.analysis).toContain('Pair him with medical and athletic data before picks');
    expect(calSandra.analysis).toContain('injury and athleticism warnings stay hidden');
    expect(calSandra.oneLiner).toContain('medical and athletic data');
    expect(calSandra.analysis).not.toMatch(/art and science|bridge|honor/i);

    const priyaCoachD = getScoutHiringReaction('coach_d_hardaway', 'zoe_wilcox');
    expect(priyaCoachD.analysis).toContain('assign veteran road scouts');
    expect(priyaCoachD.oneLiner).toMatch(/road scouts/i);
    expect(priyaCoachD.oneLiner).not.toMatch(/whole grade/i);
  });

  it('returns authored scheme and goal reactions with local fallbacks for unknown ids', () => {
    expect(getSchemeReaction('marcus_webb', 'spread')).toBe(
      'Choose Spread when quick throws match your quarterback and receivers. Late decisions give pass rushers free shots by Week 1 and turn quick throws into interceptions.',
    );
    expect(getSchemeReaction('coach_d_hardaway', 'west_coast')).toBe(
      'Choose West Coast when the quarterback decides fast and receivers block. Late throws or missed blocks turn precision into Week 1 stalled drives.',
    );
    expect(getSchemeReaction('coach_d_hardaway', 'smashmouth')).toBe(
      'Choose Power Run when the line and backs own first contact. Miss that contact, and the plan gets predictable by Week 1.',
    );
    expect(getSchemeReaction('coach_d_hardaway', 'zone_cov')).toBe(
      'Choose Cover Two when safeties communicate and corners tackle. Poor communication turns short completions into long drives.',
    );
    expect(getGoalReaction('sandra_chen', 'win_division')).toBe(
      'Winning the division makes owner expectations immediate. Choose it when the plan includes veteran upgrades, protected starters, and division games as early checkpoints.',
    );
    expect(getSchemeReaction('marcus_webb', 'west_coast').length).toBeGreaterThan(12);
    expect(getGoalReaction('coach_d_hardaway', 'win_division').length).toBeGreaterThan(12);

    expect(getSchemeReaction('marcus_webb', 'moonball')).toBe(
      'Choose moonball when starters have assigned protection, coverage, and run-defense jobs; otherwise Week 1 mistakes arrive first.',
    );
    expect(getGoalReaction('coach_d_hardaway', 'invented_goal')).toBe(
      'Choose that goal after naming starter strength, cap space, and owner patience; otherwise early losses force rushed trades or contract pushes.',
    );
  });

  it('returns cloned teaching tips and an empty array for unknown topics', () => {
    const tips = getTeachingTips('sandra_chen', 'roster_screen');
    expect(tips.length).toBeGreaterThanOrEqual(3);

    tips.push('mutated tip');
    expect(getTeachingTips('sandra_chen', 'roster_screen')).not.toContain('mutated tip');
    expect(getTeachingTips('sandra_chen', 'unknown_topic')).toEqual([]);
  });

  it('resolves AGM-specific, generic, day-one, local, and default transition flavor', () => {
    expect(getPhaseTransitionFlavor('marcus_webb', 'meet_roster', 'hire_coach')).toBe(
      'Name roster questions, then hire the coach whose practice plan fixes the starter job, depth gap, or staff ownership gap you found.',
    );
    expect(getPhaseTransitionFlavor('future_agm', 'meet_roster', 'hire_coach')).toBe(
      'Open Coach Hire after starter and backup warnings; without a play-call owner, no coach owns scheme or depth choices by Week 1.',
    );
    expect(getPhaseTransitionFlavor('marcus_webb', 'choose_agm', 'intel_briefing')).toBe(
      'AGM choice is locked. Now open Franchise Intel and choose whether roster roles, cap space, game plan, or owner patience needs fixing first.',
    );
    expect(getPhaseTransitionFlavor('marcus_webb', 'intel_briefing', 'meet_roster')).toBe(
      'Open the roster next; name the injured starter, overpaid contract, or uncovered first-backup job before a fix spends cap space or creates a new hole.',
    );
    expect(getPhaseTransitionFlavor('marcus_webb', 'intel_briefing', 'meet_roster')).not.toContain(
      'compare production, injuries, and contract risk before choosing fixes',
    );
    expect(getPhaseTransitionFlavor('coach_d_hardaway', 'choose_agm', 'intel_briefing')).toBe(
      'AGM choice is locked. Open Franchise Intel and choose the first fix: roster roles, cap space, game plan, or owner patience.',
    );
    expect(getPhaseTransitionFlavor('sandra_chen', 'choose_agm', 'intel_briefing')).toBe(
      'AGM choice is locked. Match starter, backup, cap, and owner warnings to staff, depth-chart, cap, or goal decisions before Week 1.',
    );
    expect(getPhaseTransitionFlavor('future_agm', 'choose_agm', 'intel_briefing')).toBe(
      'Open Franchise Intel with your AGM now; Week 1 roster, staff, and cap decisions start here.',
    );
    expect(AGM_SETUP_CONTENT_TS_SOURCE).toContain('roster, staff, depth-chart, and cap choices that decide Week 1 starter jobs, cap space, and missed calls');
    expect(AGM_SETUP_CONTENT_TS_SOURCE).not.toContain('prep risk');
    expect(AGM_SETUP_CONTENT_TS_SOURCE).not.toContain('cap choices that can affect Week 1');
    expect(getPhaseTransitionFlavor('marcus_webb', 'hire_coach', 'hire_scout')).toBe(
      "Hire the scout who names medical limits, assigned-role gaps, and coachability warnings for the coach's scheme; incomplete reports waste future-starter picks.",
    );
    expect(getPhaseTransitionFlavor('future_agm', 'hire_coach', 'hire_scout')).toBe(
      'The coach is set. Now hire the scouting director who finds medical limits, assigned-role gaps, and coachability warnings before picks are spent.',
    );
    expect(getPhaseTransitionFlavor('marcus_webb', 'blueprint', 'choose_agm' as SetupPhase)).toBe(
      'Name the setup decision before you commit; missed staff, scheme, cap, or goal choices cost Week 1 prep.',
    );
    expect(AGM_SETUP_CONTENT_TS_SOURCE).not.toContain('Compare this setup choice before you commit');
  });

  it('selects transition loading tips deterministically from seed and phase pair', () => {
    const first = getTransitionTip(77, 'meet_roster', 'hire_coach');
    const repeat = getTransitionTip(77, 'meet_roster', 'hire_coach');
    const differentPhase = getTransitionTip(77, 'hire_coach', 'hire_scout');

    expect(first).toBe(repeat);
    expect(first.length).toBeGreaterThan(12);
    expect(differentPhase.length).toBeGreaterThan(12);
  });

  it('maps live AGM ids to authored blueprint closing monologues with a fallback', () => {
    expect(getBlueprintClosingMonologue('marcus_webb')).toBe(getBlueprintClosingMonologue('elias_vance'));
    expect(getBlueprintClosingMonologue('coach_d_hardaway')).toBe(getBlueprintClosingMonologue('derrick_coleman'));
    expect(getBlueprintClosingMonologue('sandra_chen')).toBe(getBlueprintClosingMonologue('maya_alvarez'));
    expect(getBlueprintClosingMonologue('marcus_webb')).toContain('open roster cost, cap tradeoffs, and first deadlines every week');
    expect(getBlueprintClosingMonologue('marcus_webb')).toContain('injury, extension, or uncovered backup job erases a win streak');
    expect(getBlueprintClosingMonologue('sandra_chen')).toContain('what must be fixed each week');
    expect(getBlueprintClosingMonologue('sandra_chen')).toContain('owner promises are live');
    expect(getBlueprintClosingMonologue('coach_d_hardaway')).toContain('Miss prep, depth, or cap choices');
    expect(getBlueprintClosingMonologue('coach_d_hardaway')).toContain('uncovered backup jobs');
    expect(getBlueprintClosingMonologue('future_agm')).toBe('Open Roster, cap space, Depth Chart, and Game Plan before each Advance Week; skipped roster, cap, depth-chart, or game-plan fixes leave an uncovered starter job, uncovered injury, or dead-money cap squeeze.');
  });

  it('keeps high-frequency setup tips specific about cost and depth consequences', () => {
    expect(getTeachingTips('marcus_webb', 'roster_screen')[0]).toBe(
      'Start with production against cap cost. Protect players who outperform their deals, or future extensions and injury fixes get tighter.',
    );
    expect(getTeachingTips('coach_d_hardaway', 'roster_screen')[2]).toBe(
      'Name finish, effort, cap cost, and role production before keeping a player; a label without a playable role wastes snaps.',
    );
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/Compare finish|compare the middle of the roster/i);
    expect(getTeachingTips('coach_d_hardaway', 'roster_screen')[1]).toBe(
      'Identify the thinnest backup group now; injuries turn that player into the next starter.',
    );
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/weak authority|weak explanation|weakest backup group|bad-contract exits|bad contracts can leave|bad prep/i);
    expect(getTeachingTips('sandra_chen', 'cap_screen')[2]).toBe(
      'Name cap, role, and morale logic before moving a familiar player; no explanation hurts morale and owner patience.',
    );
    expect(getGoalReaction('sandra_chen', 'draft_well')).toBe(
      'Choose Draft Well when cheap starters over the next three seasons beat quick veteran fixes. Missed picks force expensive replacements.',
    );
    expect(AGM_CONTENT_SOURCE_COPY).not.toMatch(/Bad picks|Bad communication|Compare close players|mismatched roles|forcing a mismatch/i);
    expect(getPhaseTransitionFlavor('sandra_chen', 'depth_chart', 'cap_strategy')).toBe(
      'Preview cap space after depth decisions; roster spots and injury replacements need cap space later.',
    );
    expect(getTeachingTips('sandra_chen', 'game_plan_screen')[0]).toBe(
      'Choose the scheme that fits Week 1 roles; the longest install creates mistakes when assignments lag.',
    );
  });

  it('keeps live setup content practical and consequence-first', () => {
    const agms = ['marcus_webb', 'coach_d_hardaway', 'sandra_chen'];
    const coachIds = ['elias_rowe', 'dorian_cross', 'nico_morales'];
    const scoutIds = ['zoe_wilcox', 'marvin_tate', 'celia_duarte'];
    const schemes = ['spread', 'west_coast', 'smashmouth', 'air_raid', 'balanced', '4-3', '3-4', 'zone_cov', 'balanced_d', 'man_press', 'moonball'];
    const goals = ['win_division', 'playoff_berth', 'winning_record', 'rebuild_progress', 'cap_health', 'star_power', 'no_losing_streak', 'draft_well', 'championship', 'invented_goal'];
    const tips = ['roster_screen', 'depth_chart_screen', 'cap_screen', 'game_plan_screen'];
    const transitions: Array<[SetupPhase, SetupPhase]> = [
      ['choose_agm', 'intel_briefing'],
      ['intel_briefing', 'meet_roster'],
      ['meet_roster', 'hire_coach'],
      ['hire_coach', 'hire_scout'],
      ['hire_scout', 'set_scheme'],
      ['set_scheme', 'depth_chart'],
      ['depth_chart', 'cap_strategy'],
      ['cap_strategy', 'set_goals'],
      ['set_goals', 'blueprint'],
    ];
    const visibleCopy = agms.flatMap((agm) => [
      ...coachIds.flatMap((candidate) => {
        const reaction = getCoachHiringReaction(agm, candidate);
        return [reaction.analysis, reaction.oneLiner];
      }),
      ...scoutIds.flatMap((candidate) => {
        const reaction = getScoutHiringReaction(agm, candidate);
        return [reaction.analysis, reaction.oneLiner];
      }),
      ...schemes.map((scheme) => getSchemeReaction(agm, scheme)),
      ...goals.map((goal) => getGoalReaction(agm, goal)),
      ...tips.flatMap((tip) => getTeachingTips(agm, tip)),
      ...transitions.map(([from, to]) => getPhaseTransitionFlavor(agm, from, to)),
      getBlueprintClosingMonologue(agm),
    ]).join(' ');

    expect(visibleCopy).not.toMatch(VAGUE_SETUP_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_SETUP_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_HELP_SETUP_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_SCHEME_JARGON_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_SETUP_FALLBACK_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_MORALE_RISK_SHORTHAND);
    expect(visibleCopy).not.toMatch(/medical and athletic support|Review coach support|poor support|defensive support|data support|scheme support|\bsupported role\b/i);
    expect(visibleCopy).toMatch(/\b(?:risk|cost|cap|draft|grade|scheme|practice|staff|roster|roles|snaps|owner|pressure|Week 1|transition|flexibility|development)\b/i);
  });
});
