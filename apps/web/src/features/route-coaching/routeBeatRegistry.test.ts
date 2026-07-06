import { describe, expect, it } from 'vitest';
import {
  CHIP_ROUTE_POSES,
  ROUTE_BEAT_REGISTRY,
  ROUTE_KEYS,
  type RouteBeat,
  type RouteKey,
} from './routeBeatRegistry';

const allBeats: readonly RouteBeat[] = ROUTE_KEYS.reduce<RouteBeat[]>(
  (beats, routeKey) => [...beats, ...ROUTE_BEAT_REGISTRY[routeKey]],
  [],
);

describe('route beat registry', () => {
  it('keeps total route beats inside the public-release range', () => {
    expect(allBeats.length).toBeGreaterThanOrEqual(46);
    expect(allBeats.length).toBeLessThanOrEqual(106);
  });

  it('gives every coached route at least two beats', () => {
    for (const routeKey of ROUTE_KEYS) {
      expect(ROUTE_BEAT_REGISTRY[routeKey].length).toBeGreaterThanOrEqual(2);
    }
  });

  it('uses ids that are unique repo-wide within the registry', () => {
    const ids = allBeats.map((beat) => beat.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses only route spotlight targets matching the locked route pattern or null', () => {
    for (const beat of allBeats) {
      expect(beat.spotlightTarget).toSatisfy((target: string | null) =>
        target === null || /^chip\.route\.[a-z-]+\.beat-\d$/.test(target),
      );
    }
  });

  it('anchors dynasty save/load and settings guidance to deliberate spotlight targets', () => {
    expect(ROUTE_BEAT_REGISTRY['dynasty-save-load'].map((beat) => beat.spotlightTarget)).toEqual([
      'chip.route.dynasty-save-load.beat-1',
      'chip.route.dynasty-save-load.beat-2',
    ]);
    expect(ROUTE_BEAT_REGISTRY.settings.map((beat) => beat.spotlightTarget)).toEqual([
      'chip.route.settings.beat-1',
      'chip.route.settings.beat-2',
    ]);
  });

  it('keeps every beat line below 140 characters', () => {
    for (const beat of allBeats) {
      expect(beat.text.length).toBeLessThan(140);
    }
  });

  it('keeps route beat text out of vague wrong-X shorthand', () => {
    for (const beat of allBeats) {
      expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(/\bwrong\b/i);
    }
  });

  it('pairs every route beat with a player action and a consequence, limit, or deadline', () => {
    const actionCue =
      /\b(start|open|set|fix|choose|decide|resolve|answer|preview|protect|validate|download|copy|apply|cut|accept|decline|hire|release|move|mark|spend|fill|pick|pin|run|clear|name|track|sign|bid|claim|trade|build|treat|finish|test|add|change|save)\b/i;
    const consequenceCue =
      /\b(before|if|when|can|will|cannot|not|risk|locks?|changes?|expire|cost|deadline|advance|save|confirm|wait|avoid|missing|bad|weak|injur\w*|cap|morale|owner|pressure|fallback|replace|lose|block|create|limits?|spends?|waste|future|next|later|timing|playoff|standings|depth|starter|lineup|contract|money|bill|flexibility|outcome|score|result|final|early|late|after|until|without|instead|only|still|current)\b/i;

    for (const beat of allBeats) {
      expect(beat.text, `${beat.id}: ${beat.text}`).toMatch(actionCue);
      expect(beat.text, `${beat.id}: ${beat.text}`).toMatch(consequenceCue);
      expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(/\bUse\b/);
      expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(/\bcompare\b/i);
      expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(/\bread\b/i);
      expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(/\b(?:verify|verifying|verified|confirm|confirming|confirmed|check|checking|checked|review|reviewing)\b/i);
    }
  });

  it('keeps player-facing route guidance out of implementation jargon', () => {
    const implementationJargon = [
      /read-model/i,
      /display-only/i,
      /route-local/i,
      /source panels?/i,
      /source filters?/i,
      /operations source/i,
      /commit boundary/i,
      /commit path/i,
      /commit route/i,
      /\bcommits?\b/i,
      /\bcommitting\b/i,
      /durable writes?/i,
      /\brender(?:ing)?\b/i,
      /\bmutat\w*\b/i,
      /\bhelpers?\b/i,
      /\bcartridge\b/i,
      /browser-local/i,
      /\bCPU\b/,
      /sim-bonus/i,
      /saved outputs/i,
      /read-only/i,
      /\breceipts?\b/i,
      /round button/i,
      /local modal/i,
      /\bWeek Advance\b/,
      /\btrue blockers?\b/i,
      /\badvance blocker\b/i,
      /\bcan wait\b/i,
      /\bnothing is blocked\b/i,
      /\btrue deadlines?\b/i,
      /next week's plan/i,
      /changing the next plan/i,
      /matchup risk/i,
      /owner patience risk/i,
      /fans flag/i,
      /plan trouble/i,
      /wrong choices slow/i,
      /growth unused/i,
      /compatible effects/i,
      /scheme support/i,
      /leadership is unclear/i,
      /starter-need grades are unclear/i,
      /starter-need grades/i,
      /need, grade, and price/i,
      /grade matches a draft need/i,
      /\bnext week turns\b/i,
      /\brequired red items?\b/i,
      /\bred items?\b/i,
      /\bred items are unresolved risk\b/i,
      /bad batches|standings justify|justify the cost|bad claims|bad-weather|may require/i,
      /bad timing|bad deals|bad import|If clear|clear Inbox/i,
      /looking at a profile/i,
      /ignoring it/i,
      /compare division race/i,
      /near the deadline, compare/i,
      /compare Analytics with Stat Central/i,
      /compare facilities, medical staff/i,
      /missed alerts chase the wrong fix/i,
      /chasing an extra luxury player/i,
      /media rank/i,
      /ranking slides/i,
      /loose targets/i,
      /changes city, budget, and fans/i,
      /worst matchup/i,
    ];

    for (const beat of allBeats) {
      for (const pattern of implementationJargon) {
        expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(pattern);
      }
      expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(/opponent lock/i);
    }
  });

  it('keeps information-screen guidance tied to decisions and consequences', () => {
    expect(ROUTE_BEAT_REGISTRY['power-rankings'][0]?.text).toContain('Optional: open public ranking');
    expect(ROUTE_BEAT_REGISTRY['power-rankings'][0]?.text).toContain('Standings set playoffs');
    expect(ROUTE_BEAT_REGISTRY['power-rankings'][0]?.text).toContain('moves for rank alone cost picks or starters');
    expect(ROUTE_BEAT_REGISTRY['power-rankings'][0]?.text).not.toContain('media rank');
    expect(ROUTE_BEAT_REGISTRY['power-rankings'][0]?.text).not.toContain('slide cuts');
    expect(ROUTE_BEAT_REGISTRY['power-rankings'][1]?.text).toContain('record and public rank disagree');
    expect(ROUTE_BEAT_REGISTRY['power-rankings'][1]?.text).toContain('trades spend picks or cap');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][0]?.text).toContain('Must Do: open Action Center');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][0]?.text).toContain('Where: Monday Briefing');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][0]?.text).toContain('Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][0]?.text).not.toContain('waiting decisions');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][0]?.text).not.toContain('Must Do: read injuries');
    expect(ROUTE_BEAT_REGISTRY['roster'][0]?.text).toContain('Recommended: decide starter, backup, trade, or cut');
    expect(ROUTE_BEAT_REGISTRY['roster'][0]?.text).toContain('Where: highlighted player');
    expect(ROUTE_BEAT_REGISTRY['roster'][0]?.text).toContain('Consequence: extra names do not fix the role');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][0]?.text).toContain('Recommended: set offense, protection, and coverage after injuries');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][0]?.text).toContain('Where: Game Plan');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][0]?.text).toContain('Consequence: hurt starters need safer calls');
    expect(ROUTE_BEAT_REGISTRY['week-advance'][0]?.text).toContain('Must Do: run Advance Week last');
    expect(ROUTE_BEAT_REGISTRY['week-advance'][0]?.text).toContain('Where: Advance screen');
    expect(ROUTE_BEAT_REGISTRY['week-advance'][0]?.text).toContain('Consequence: standings, injuries, morale, deadlines, and opponent prep become final');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][1]?.text).toContain('after Action Center');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][1]?.text).toContain('open Depth Chart or Game Plan');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][1]?.text).toContain('Consequence: saved lineup and calls lock');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][1]?.text).not.toContain('When Must Do is clear');
    expect(ROUTE_BEAT_REGISTRY['monday-briefing'][1]?.text).not.toContain('no required item is stopping');
    expect(ROUTE_BEAT_REGISTRY['season-recap'][0]?.text).toContain('open Season Recap before the first bid');
    expect(ROUTE_BEAT_REGISTRY['season-recap'][0]?.text).toContain('a rushed bid misses an extension');
    expect(ROUTE_BEAT_REGISTRY['season-recap'][0]?.text).not.toContain('read Season Recap');
    expect(ROUTE_BEAT_REGISTRY['newsroom'][0]?.text).toContain('Roster, Contracts, Cap Lab, Game Plan, or Locker Room');
    expect(ROUTE_BEAT_REGISTRY['newsroom'][0]?.text).toContain('before Advance Week');
    expect(ROUTE_BEAT_REGISTRY.inbox[0]?.text).toContain('Where: Inbox');
    expect(ROUTE_BEAT_REGISTRY.inbox[0]?.text).toContain('offers, promises, votes, and owner requests expire');
    expect(ROUTE_BEAT_REGISTRY['analytics-evidence'][1]?.text).toContain('name repeated stat failures');
    expect(ROUTE_BEAT_REGISTRY['analytics-evidence'][1]?.text).toContain('one odd box score benches a needed role player');
    expect(ROUTE_BEAT_REGISTRY['analytics-evidence'][1]?.text).not.toContain('weak stat');
    expect(ROUTE_BEAT_REGISTRY['analytics-evidence'][0]?.text).toContain('before benching starters');
    expect(ROUTE_BEAT_REGISTRY['analytics-evidence'][0]?.text).toContain('open Analytics with Stat Central');
    expect(ROUTE_BEAT_REGISTRY['analytics-evidence'][0]?.text).toContain('one odd box score benches a needed role player');
    expect(ROUTE_BEAT_REGISTRY['analytics-evidence'][0]?.text).not.toContain('bad bench calls');
    expect(ROUTE_BEAT_REGISTRY['player-profile'][1]?.text).toContain('choose Contracts, Trades, or Depth Chart');
    expect(ROUTE_BEAT_REGISTRY['player-profile'][1]?.text).toContain('after injury, role, and cost notes');
    expect(ROUTE_BEAT_REGISTRY['player-profile'][1]?.text).toContain('this profile changes nothing');
    expect(ROUTE_BEAT_REGISTRY['player-profile'][1]?.text).not.toContain('when ready');
    expect(ROUTE_BEAT_REGISTRY['player-profile'][1]?.text).not.toContain('notes explain injury, role, and cost');
    expect(ROUTE_BEAT_REGISTRY['player-development'][0]?.text).toContain('name age, development path, and assigned role');
    expect(ROUTE_BEAT_REGISTRY['player-development'][0]?.text).toContain('roleless reps waste growth weeks');
    expect(ROUTE_BEAT_REGISTRY['player-development'][0]?.text).not.toContain('age curve');
    expect(ROUTE_BEAT_REGISTRY['player-development'][0]?.text).not.toContain('delays starter growth');
    expect(ROUTE_BEAT_REGISTRY['player-development'][0]?.text).not.toContain('wrong fit');
    expect(ROUTE_BEAT_REGISTRY['player-development'][1]?.text).toContain('until you assign reps, camp, or mentors');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][0]?.text).toContain('name traits, production, cap hit, and assigned role');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][0]?.text).toContain('before starter or extension calls');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][0]?.text).toContain('missed cap cost overpays');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][0]?.text).not.toContain('comparison rows');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][0]?.text).not.toContain('assigned-role gap creates the wrong deal');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][0]?.text).not.toContain('role risk');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][0]?.text).not.toContain('use this page');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][1]?.text).toContain('choose starters from traits, production, cap hit, and stats');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][1]?.text).toContain('missed cap cost overpays or leaves a role uncovered');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][1]?.text).not.toContain('use traits');
    expect(ROUTE_BEAT_REGISTRY['player-comparison'][1]?.text).not.toContain('bad deals');
    expect(ROUTE_BEAT_REGISTRY.relocation[0]?.text).toContain('relocation rewrites city, budget, and fan base');
    expect(ROUTE_BEAT_REGISTRY.relocation[1]?.text).toContain('it rewrites city, budget, and fan base');
    expect(ROUTE_BEAT_REGISTRY['broadcast-suite'][0]?.text).toContain('Where: Broadcast');
    expect(ROUTE_BEAT_REGISTRY['broadcast-suite'][0]?.text).toContain('score, injury, and turnover notes explain what must change');
    expect(ROUTE_BEAT_REGISTRY['broadcast-suite'][0]?.text).not.toContain('compare scoring swings');
    expect(ROUTE_BEAT_REGISTRY['broadcast-suite'][1]?.text).toContain('name the drive, turnover, or missed stop');
    expect(ROUTE_BEAT_REGISTRY['broadcast-suite'][1]?.text).toContain('this explains results; it does not rerun them');
    expect(ROUTE_BEAT_REGISTRY['game-day-recap'][0]?.text).toContain('Where: Game Day');
    expect(ROUTE_BEAT_REGISTRY['game-day-recap'][0]?.text).toContain('without them, Game Plan misses injuries or weather');
    expect(ROUTE_BEAT_REGISTRY['game-day-recap'][0]?.text).not.toContain("next week's plan");
    expect(ROUTE_BEAT_REGISTRY['game-day-recap'][1]?.text).toContain('Recommended: answer press');
    expect(ROUTE_BEAT_REGISTRY['game-day-recap'][1]?.text).toContain('Where: Roster, Game Plan');
    expect(ROUTE_BEAT_REGISTRY['game-day-recap'][1]?.text).toContain('misses repeat next week');
    expect(ROUTE_BEAT_REGISTRY['film-room'][0]?.text).toContain('protection, coverage, run-defense, and play-call misses');
    expect(ROUTE_BEAT_REGISTRY['film-room'][0]?.text).not.toContain('changing the next plan');
    expect(ROUTE_BEAT_REGISTRY['film-room'][0]?.text).toContain('Where: Film Room');
    expect(ROUTE_BEAT_REGISTRY['film-room'][0]?.text).toContain('Consequence: fix Game Plan or Depth Chart');
    expect(ROUTE_BEAT_REGISTRY['film-room'][1]?.text).toContain('fix each protection, coverage, or call miss');
    expect(ROUTE_BEAT_REGISTRY['film-room'][1]?.text).toContain('Where: Game Plan or Depth Chart');
    expect(ROUTE_BEAT_REGISTRY['film-room'][1]?.text).toContain('Consequence: Advance Week locks the plan');
    expect(ROUTE_BEAT_REGISTRY['scouting-board'][1]?.text).toContain('mismatches waste scout work');
    expect(ROUTE_BEAT_REGISTRY['scouting-board'][1]?.text).not.toContain('loose targets');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][0]?.text).toContain('hurt starters need safer calls');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][0]?.text).not.toContain('roster can execute');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][0]?.text).not.toContain('make the plan fail');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][1]?.text).toContain('Where: Game Plan');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][1]?.text).toContain('missed protection or coverage repeats next game');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][1]?.text).not.toContain('bad protection');
    expect(ROUTE_BEAT_REGISTRY['game-plan'][1]?.text).not.toMatch(/run fits?/i);
    expect(ROUTE_BEAT_REGISTRY['cap-laboratory'][0]?.text).toContain('preview restructures, void years, and backloads');
    expect(ROUTE_BEAT_REGISTRY['cap-laboratory'][0]?.text).toContain('Where: Cap Lab');
    expect(ROUTE_BEAT_REGISTRY['cap-laboratory'][0]?.text).toContain('dead money or block extensions');
    expect(ROUTE_BEAT_REGISTRY['cap-laboratory'][0]?.text).not.toContain('bad batches');
    expect(ROUTE_BEAT_REGISTRY['super-bowl'][0]?.text).toContain('records the champion');
    expect(ROUTE_BEAT_REGISTRY['super-bowl'][0]?.text).toContain('Advance Week must resolve them first');
    expect(ROUTE_BEAT_REGISTRY['super-bowl'][1]?.text).toContain('Optional: open champion history');
    expect(ROUTE_BEAT_REGISTRY['super-bowl'][1]?.text).toContain('go to Roster, Contracts, Depth Chart, or Game Plan');
    expect(ROUTE_BEAT_REGISTRY['super-bowl'][1]?.text).toContain('this screen cannot fix them');
    expect(ROUTE_BEAT_REGISTRY['week-advance'][1]?.text).toContain('fix injuries, save starters, and answer offers first');
    expect(ROUTE_BEAT_REGISTRY['week-advance'][1]?.text).toContain('Where: team screens');
    expect(ROUTE_BEAT_REGISTRY['week-advance'][1]?.text).toContain('Consequence: lineup and morale lock');
    expect(ROUTE_BEAT_REGISTRY['week-advance'][1]?.text).not.toContain('fix required items first');
    expect(ROUTE_BEAT_REGISTRY['owner-promises'][1]?.text).toContain('Where: Owner');
    expect(ROUTE_BEAT_REGISTRY['owner-promises'][1]?.text).toContain('missed commitments cut owner patience');
    expect(ROUTE_BEAT_REGISTRY['owner-promises'][1]?.text).not.toContain('job approval');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][0]?.text).toContain('name roster job first');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][0]?.text).toContain('Where: Free Agency/Waivers/Practice Squad/Trades');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][0]?.text).toContain('roleless moves spend cap or picks');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][0]?.text).not.toContain('mismatched market spends cap or picks');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][0]?.text).not.toContain('the wrong path wastes cap or picks');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][1]?.text).toContain('after role and cap limit');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][1]?.text).toContain('Where: FA/Waivers/Practice Squad/Trades');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][1]?.text).toContain('job stays open');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][1]?.text).not.toContain('cap space and roster role are clear');
    expect(ROUTE_BEAT_REGISTRY['market-planning'][1]?.text).not.toContain('roster fit');
    expect(ROUTE_BEAT_REGISTRY['expansion-draft'][0]?.text).toContain('protect core starters before adding a luxury player');
    expect(ROUTE_BEAT_REGISTRY['expansion-draft'][0]?.text).toContain('every unprotected backup is available to be taken');
    expect(ROUTE_BEAT_REGISTRY['expansion-draft'][0]?.text).not.toContain('every unprotected backup can be taken');
    expect(ROUTE_BEAT_REGISTRY['expansion-draft'][0]?.text).not.toContain('chasing an extra luxury player');
    expect(ROUTE_BEAT_REGISTRY['roster-churn'][1]?.text).toContain('Where: Waivers or Practice Squad');
    expect(ROUTE_BEAT_REGISTRY['roster-churn'][1]?.text).toContain('needed depth is lost');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][0]?.text).toContain('set roles for reaches and steals');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][0]?.text).toContain('Where: Draft Recap');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][0]?.text).toContain('wastes cheap contract years');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][1]?.text).toContain('open past classes before changing scouts');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][1]?.text).toContain('Where: Draft Recap');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][1]?.text).toContain('no-pick classes cannot judge scouts');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][1]?.text).not.toContain('Missing rows');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][1]?.text).not.toContain('do not judge that class yet');
    expect(ROUTE_BEAT_REGISTRY['trade-market-radar'][0]?.text).toContain('early spending misses the open job');
    expect(ROUTE_BEAT_REGISTRY['trade-market-radar'][0]?.text).toContain('target role');
    expect(ROUTE_BEAT_REGISTRY['trade-market-radar'][0]?.text).toContain('choose seller, target role, and max price');
    expect(ROUTE_BEAT_REGISTRY['trade-market-radar'][0]?.text).toContain('Where: Trade Block');
    expect(ROUTE_BEAT_REGISTRY['trade-market-radar'][0]?.text).not.toContain('sellers, fit, and price');
    expect(ROUTE_BEAT_REGISTRY['trade-market-radar'][1]?.text).toContain('treat Trade Block as target list');
    expect(ROUTE_BEAT_REGISTRY['trade-market-radar'][1]?.text).toContain('Where: Trade Block, then Trades');
    expect(ROUTE_BEAT_REGISTRY['trade-market-radar'][1]?.text).toContain('prices rise before offers are made');
    expect(ROUTE_BEAT_REGISTRY['social-feed'][0]?.text).toContain('If posts name injuries or morale drops');
    expect(ROUTE_BEAT_REGISTRY['social-feed'][0]?.text).toContain('Roster, Locker Room, or Medical');
    expect(ROUTE_BEAT_REGISTRY['social-feed'][0]?.text).not.toContain('fans flag');
    expect(ROUTE_BEAT_REGISTRY['social-feed'][1]?.text).toContain('after Roster and Game Plan, open MFSN fan reaction');
    expect(ROUTE_BEAT_REGISTRY['social-feed'][1]?.text).toContain('posts point back to those screens');
    expect(ROUTE_BEAT_REGISTRY['social-feed'][1]?.text).not.toContain('use fan reaction');
    expect(ROUTE_BEAT_REGISTRY['social-feed'][1]?.text).not.toContain('plan trouble');
    expect(ROUTE_BEAT_REGISTRY['record-book'][0]?.text).toContain('after roster, cap, depth, and Game Plan choices are saved');
    expect(ROUTE_BEAT_REGISTRY['record-book'][0]?.text).toContain('stats help price roles, deals, and trades');
    expect(ROUTE_BEAT_REGISTRY['record-book'][0]?.text).not.toContain('prove production');
    expect(ROUTE_BEAT_REGISTRY['record-book'][0]?.text).not.toContain('repair nothing');
    expect(ROUTE_BEAT_REGISTRY['record-book'][0]?.text).not.toContain('are accepted');
    expect(ROUTE_BEAT_REGISTRY['record-book'][0]?.text).not.toContain('after Must Do tasks are clear');
    expect(ROUTE_BEAT_REGISTRY['record-book'][1]?.text).toContain('open Records before role, deal, or trade choices');
    expect(ROUTE_BEAT_REGISTRY['record-book'][1]?.text).toContain('production sets price');
    expect(ROUTE_BEAT_REGISTRY['record-book'][1]?.text).toContain('injuries, cap, depth, and calls need other screens');
    expect(ROUTE_BEAT_REGISTRY['record-book'][1]?.text).not.toContain('lineup risk');
    expect(ROUTE_BEAT_REGISTRY['record-book'][1]?.text).not.toContain('use records');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][1]?.text).toContain('before extensions or role changes');
    expect(ROUTE_BEAT_REGISTRY['scouting-board'][1]?.text).toContain('Where: Scouting');
    expect(ROUTE_BEAT_REGISTRY['scouting-board'][1]?.text).toContain('role, medical-limit, and coachability answers');
    expect(ROUTE_BEAT_REGISTRY['scouting-board'][0]?.text).toContain('name starter role, medical limit, and coachability');
    expect(ROUTE_BEAT_REGISTRY['scouting-board'][0]?.text).toContain('Where: Scouting');
    expect(allBeats.map((beat) => beat.text).join(' ')).not.toMatch(/role, medical, or trait answers|role, medical, and traits/i);
    expect(ROUTE_BEAT_REGISTRY['scouting-board'][0]?.text).toContain('unknowns force reaches or overpays');
    expect(ROUTE_BEAT_REGISTRY.schedule[0]?.text).toContain('open Schedule before Advance Week');
    expect(ROUTE_BEAT_REGISTRY.schedule[0]?.text).toContain('Where: Schedule');
    expect(ROUTE_BEAT_REGISTRY.schedule[0]?.text).toContain('change rest or calls');
    expect(ROUTE_BEAT_REGISTRY.schedule[0]?.text).not.toContain('matchup risk');
    expect(ROUTE_BEAT_REGISTRY.schedule[1]?.text).toContain('missed rest creates starter fatigue');
    expect(ROUTE_BEAT_REGISTRY.schedule[1]?.text).toContain('Where: Schedule, Game Plan');
    expect(ROUTE_BEAT_REGISTRY.schedule[1]?.text).toContain('weather shrinks calls');
    expect(ROUTE_BEAT_REGISTRY.schedule[1]?.text).not.toContain('bad timing');
    expect(ROUTE_BEAT_REGISTRY['watch-list'][0]?.text).toContain('Optional: pin possible targets');
    expect(ROUTE_BEAT_REGISTRY['watch-list'][0]?.text).toContain('Injuries still need Roster, Free Agency, Waivers, Trades, or Depth Chart');
    expect(ROUTE_BEAT_REGISTRY['watch-list'][1]?.text).toContain('go to Free Agency, Waivers, Trades, or Depth Chart');
    expect(ROUTE_BEAT_REGISTRY['watch-list'][1]?.text).toContain('before bids, claims, or roles close');
    expect(ROUTE_BEAT_REGISTRY['watch-list'][1]?.text).not.toContain('track targets here');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][1]?.text).toContain('no-pick classes cannot judge scouts');
    expect(ROUTE_BEAT_REGISTRY['draft-recap'][1]?.text).not.toContain('cannot prove scout misses yet');
    expect(ROUTE_BEAT_REGISTRY['trade-market-radar'][0]?.text).toContain('Where: Trade Block');
    expect(ROUTE_BEAT_REGISTRY['front-office'][0]?.text).toContain('preview role, cap hit, and dead money');
    expect(ROUTE_BEAT_REGISTRY['front-office'][0]?.text).toContain('Where: Front Office');
    expect(ROUTE_BEAT_REGISTRY['front-office'][0]?.text).toContain('needed cuts or restructures block fixes');
    expect(ROUTE_BEAT_REGISTRY['front-office'][1]?.text).toContain('locked moves create dead money or release players');
    expect(ROUTE_BEAT_REGISTRY['front-office'][0]?.text).not.toContain('compare projections, savings, and warnings before acting');
    expect(ROUTE_BEAT_REGISTRY.endorsements[0]?.text).toContain('open sponsor offers before Accept');
    expect(ROUTE_BEAT_REGISTRY.endorsements[0]?.text).toContain('Where: Endorsements');
    expect(ROUTE_BEAT_REGISTRY.endorsements[0]?.text).toContain('unmet requirements lose revenue');
    expect(ROUTE_BEAT_REGISTRY.endorsements[0]?.text).toContain('lock a goal');
    expect(ROUTE_BEAT_REGISTRY.endorsements[0]?.text).not.toContain('wrong money');
    expect(ROUTE_BEAT_REGISTRY.endorsements[0]?.text).not.toContain('unmet goal');
    expect(ROUTE_BEAT_REGISTRY.endorsements[0]?.text).not.toContain('Compare deals, requirements, and offseason offers before accepting');
    expect(ROUTE_BEAT_REGISTRY['league-pulse'][0]?.text).toContain('open League Pulse');
    expect(ROUTE_BEAT_REGISTRY['league-pulse'][0]?.text).toContain('rival injuries and standings deficits set buy, sell, or hold timing');
    expect(ROUTE_BEAT_REGISTRY['league-pulse'][0]?.text).not.toContain('use League Pulse');
    expect(ROUTE_BEAT_REGISTRY['league-pulse'][0]?.text).not.toContain('urgent roster');
    expect(ROUTE_BEAT_REGISTRY['league-pulse'][1]?.text).toContain('open league news before bids or Game Plan');
    expect(ROUTE_BEAT_REGISTRY['league-pulse'][1]?.text).toContain('missed trade, rival, or injury alerts leave a bid late or matchup exposed');
    expect(ROUTE_BEAT_REGISTRY['league-pulse'][1]?.text).not.toContain('use league news');
    expect(ROUTE_BEAT_REGISTRY['league-pulse'][1]?.text).not.toContain('do not let it replace roster, cap, or Game Plan decisions');
    expect(ROUTE_BEAT_REGISTRY['league-news'][1]?.text).toContain('missed injury, trade, rule, or record alerts spend before a job changes');
    expect(ROUTE_BEAT_REGISTRY['league-news'][1]?.text).not.toContain('late reaction');
    expect(ROUTE_BEAT_REGISTRY.newsroom[0]?.text).toContain('open Newsroom reaction');
    expect(ROUTE_BEAT_REGISTRY.newsroom[1]?.text).toContain('fix roster, cap, or plan on those screens');
    expect(ROUTE_BEAT_REGISTRY.newsroom[1]?.text).toContain('open Newsroom after weekly moves');
    expect(ROUTE_BEAT_REGISTRY.newsroom[1]?.text).not.toContain('use Newsroom');
    expect(ROUTE_BEAT_REGISTRY.inbox[1]?.text).toContain('after Inbox, fix injuries or matchup calls');
    expect(ROUTE_BEAT_REGISTRY.inbox[1]?.text).toContain('Where: Roster or Game Plan');
    expect(ROUTE_BEAT_REGISTRY.inbox[1]?.text).toContain('missed fixes lock at Advance Week');
    expect(ROUTE_BEAT_REGISTRY.inbox[1]?.text).not.toContain('use Inbox for deadline items');
    expect(ROUTE_BEAT_REGISTRY.inbox[0]?.text).toContain('answer deadlines before Advance Week');
    expect(ROUTE_BEAT_REGISTRY.inbox[0]?.text).toContain('Where: Inbox');
    expect(ROUTE_BEAT_REGISTRY.inbox[0]?.text).toContain('offers, promises, votes, and owner requests expire');
    expect(ROUTE_BEAT_REGISTRY.inbox[1]?.text).not.toContain('When clear, open Roster for injuries');
    expect(ROUTE_BEAT_REGISTRY.inbox[1]?.text).not.toContain('deadlines only');
    expect(ROUTE_BEAT_REGISTRY.inbox[1]?.text).not.toContain('If none exist');
    expect(ROUTE_BEAT_REGISTRY.inbox[1]?.text).not.toContain('unanswered items');
    expect(ROUTE_BEAT_REGISTRY['owner-promises'][0]?.text).toContain('add promises after mandates');
    expect(ROUTE_BEAT_REGISTRY['owner-promises'][0]?.text).toContain('Where: Owner');
    expect(ROUTE_BEAT_REGISTRY['owner-promises'][0]?.text).toContain('conflicting promises cut owner patience');
    expect(ROUTE_BEAT_REGISTRY['owner-promises'][0]?.text).not.toContain('verify mandates');
    expect(ROUTE_BEAT_REGISTRY.staff[0]?.text).toContain('choose QB, line, coverage, and defender calls');
    expect(ROUTE_BEAT_REGISTRY.staff[0]?.text).toContain('Where: Staff');
    expect(ROUTE_BEAT_REGISTRY.staff[0]?.text).toContain('overmatched calls waste prep');
    expect(ROUTE_BEAT_REGISTRY.staff[0]?.text).not.toContain('coordinator calls fit starters');
    expect(ROUTE_BEAT_REGISTRY.staff[0]?.text).not.toContain('assignments not installed');
    expect(ROUTE_BEAT_REGISTRY.staff[0]?.text).not.toContain('coordinator fit');
    expect(ROUTE_BEAT_REGISTRY.staff[0]?.text).not.toContain('scheme support');
    expect(ROUTE_BEAT_REGISTRY.endorsements[1]?.text).toContain('name payout, player, and goal before Accept or Decline');
    expect(ROUTE_BEAT_REGISTRY.endorsements[1]?.text).toContain('Consequence: unmet goals miss revenue');
    expect(ROUTE_BEAT_REGISTRY.endorsements[1]?.text).not.toContain('wrong pairing');
    expect(ROUTE_BEAT_REGISTRY.endorsements[1]?.text).not.toContain('A bad fit');
    expect(ROUTE_BEAT_REGISTRY['league-weather'][0]?.text).toContain('missed deep throws and failed long kicks');
    expect(ROUTE_BEAT_REGISTRY['league-weather'][0]?.text).toContain('open League Weather before pass depth and kick choices');
    expect(ROUTE_BEAT_REGISTRY['league-weather'][0]?.text).not.toContain('use League Weather');
    expect(ROUTE_BEAT_REGISTRY['league-weather'][0]?.text).not.toContain('riskier');
    expect(ROUTE_BEAT_REGISTRY['league-weather'][1]?.text).toContain('run or short-pass calls');
    expect(ROUTE_BEAT_REGISTRY['league-weather'][1]?.text).toContain('deep throws and long kicks lose value');
    expect(ROUTE_BEAT_REGISTRY['league-weather'][1]?.text).not.toContain('ignored weather raises turnovers');
    expect(ROUTE_BEAT_REGISTRY['league-weather'][1]?.text).not.toContain('use forecasts');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][0]?.text).toContain('discipline, relocation, or rule petition');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][0]?.text).toContain('before voting closes');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][0]?.text).toContain('leaves that ruling unchanged');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][0]?.text).not.toContain('A wrong petition');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][0]?.text).not.toContain('wastes the vote window');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][0]?.text).not.toContain('wrong ruling request');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][1]?.text).toContain('cap/labor votes');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][1]?.text).toContain('Commissioner for petitions');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][1]?.text).toContain('the other screen misses that deadline');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][1]?.text).not.toContain('use CBA');
    expect(ROUTE_BEAT_REGISTRY['commissioner-governance'][1]?.text).not.toContain('wrong screen');
    expect(ROUTE_BEAT_REGISTRY.cba[0]?.text).toContain('vote accept, reject, or abstain');
    expect(ROUTE_BEAT_REGISTRY.cba[0]?.text).toContain('before the CBA deadline');
    expect(ROUTE_BEAT_REGISTRY.cba[0]?.text).toContain('delays stall cap, roster, or labor-rule changes');
    expect(ROUTE_BEAT_REGISTRY.cba[0]?.text).not.toContain('delayed voting stalls');
    expect(ROUTE_BEAT_REGISTRY.cba[1]?.text).toContain('open Commissioner for discipline, relocation, or petitions');
    expect(ROUTE_BEAT_REGISTRY.cba[1]?.text).toContain('CBA history does not create rulings or meet petition deadlines');
    expect(ROUTE_BEAT_REGISTRY.cba[1]?.text).not.toContain('cannot pass a new one');
    expect(ROUTE_BEAT_REGISTRY['league-rules'][0]?.text).toContain('active cap, roster, trade, waiver, and practice-squad rules');
    expect(ROUTE_BEAT_REGISTRY['league-rules'][0]?.text).toContain('old rule numbers make claims or cuts illegal');
    expect(ROUTE_BEAT_REGISTRY['league-rules'][0]?.text).not.toContain('stale values make deadlines illegal');
    expect(ROUTE_BEAT_REGISTRY['league-rules'][0]?.text).not.toContain('Wrong assumptions');
    expect(ROUTE_BEAT_REGISTRY['league-rules'][1]?.text).toContain('rule history after active rules are handled');
    expect(ROUTE_BEAT_REGISTRY['league-rules'][1]?.text).toContain('cap, labor, or deadline changes need CBA or Commissioner');
    expect(ROUTE_BEAT_REGISTRY['league-rules'][1]?.text).not.toContain('history cannot pass a new rule');
    expect(ROUTE_BEAT_REGISTRY['scenario-constraints'][0]?.text).toContain('open active scenario rules before trades, free agency, waivers, or draft picks');
    expect(ROUTE_BEAT_REGISTRY['scenario-constraints'][0]?.text).toContain('disabled actions will not complete');
    expect(ROUTE_BEAT_REGISTRY['scenario-constraints'][0]?.text).not.toContain('Open active limits');
    expect(ROUTE_BEAT_REGISTRY['scenario-constraints'][1]?.text).toContain('export first for rollback');
    expect(ROUTE_BEAT_REGISTRY['season-recap'][0]?.text).toContain('Name contracts, staff vacancies, and cap space');
    expect(ROUTE_BEAT_REGISTRY['season-recap'][0]?.text).toContain('a rushed bid misses an extension');
    expect(ROUTE_BEAT_REGISTRY['season-recap'][0]?.text).not.toContain('Missed-opportunity notes');
    expect(ROUTE_BEAT_REGISTRY['season-recap'][0]?.text).not.toContain('should start');
    expect(ROUTE_BEAT_REGISTRY['season-recap'][1]?.text).toContain('go to Contracts, Free Agency, Coaching, or Roster');
    expect(ROUTE_BEAT_REGISTRY['season-recap'][1]?.text).toContain('sharing will not change them');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][0]?.text).toContain('manual picks do not change standings, morale, or growth');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][0]?.text).toContain('open award race before role changes');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][0]?.text).not.toContain('use award race');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][1]?.text).toContain('open past winners before extensions or role changes');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][1]?.text).toContain('awards support contract roles');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][1]?.text).toContain('not lineup, cap, or depth fixes');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][1]?.text).not.toContain('award-level production');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][1]?.text).not.toContain('support value');
    expect(ROUTE_BEAT_REGISTRY['awards-hub'][1]?.text).not.toContain('use past winners');
    expect(ROUTE_BEAT_REGISTRY['franchise-legends'][1]?.text).toContain('Hall goals do not change lineup, cap, or records');
    expect(ROUTE_BEAT_REGISTRY['franchise-legends'][1]?.text).not.toContain('they do not change current records or cap');
    expect(ROUTE_BEAT_REGISTRY['franchise-legends'][0]?.text).toContain('after injury, cap, depth, and Game Plan choices are saved');
    expect(ROUTE_BEAT_REGISTRY['franchise-legends'][0]?.text).toContain("Hall goals do not repair this week's roster");
    expect(ROUTE_BEAT_REGISTRY['franchise-legends'][0]?.text).not.toContain('are accepted');
    expect(ROUTE_BEAT_REGISTRY['franchise-legends'][0]?.text).not.toContain('after Must Do tasks are clear');
    expect(ROUTE_BEAT_REGISTRY.standings[1]?.text).toContain('skipping them costs picks');
    expect(ROUTE_BEAT_REGISTRY.standings[1]?.text).toContain('decide deadline posture');
    expect(ROUTE_BEAT_REGISTRY.standings[0]?.text).toContain('open Standings before buy, sell, or hold');
    expect(ROUTE_BEAT_REGISTRY.standings[0]?.text).toContain('Where: Standings');
    expect(ROUTE_BEAT_REGISTRY.standings[0]?.text).toContain('rushed deadline moves cost picks or playoffs');
    expect(ROUTE_BEAT_REGISTRY['training-camp'][0]?.text).toContain('set open camp drills before Advance Week');
    expect(ROUTE_BEAT_REGISTRY['training-camp'][0]?.text).toContain("missed camp actions lose this week's growth chance");
    expect(ROUTE_BEAT_REGISTRY['training-camp'][0]?.text).not.toContain('growth unused');
    expect(ROUTE_BEAT_REGISTRY['training-camp'][0]?.text).not.toContain('Camp Readiness');
    expect(ROUTE_BEAT_REGISTRY['trade-deadline'][0]?.text).toContain('before offers expire');
    expect(ROUTE_BEAT_REGISTRY['trade-deadline'][1]?.text).toContain('waiting turns a fair deal into lost depth or extra picks');
    expect(ROUTE_BEAT_REGISTRY['dynasty-save-load'][0]?.text).toContain('failed import overwrites progress');
    expect(ROUTE_BEAT_REGISTRY['dynasty-save-load'][1]?.text).toContain('make a local slot before replacing the current dynasty');
    expect(ROUTE_BEAT_REGISTRY['dynasty-save-load'][1]?.text).not.toContain('use a local slot');
    expect(ROUTE_BEAT_REGISTRY['depth-chart'][0]?.text).toContain('Where: Depth Chart');
    expect(ROUTE_BEAT_REGISTRY['depth-chart'][0]?.text).toContain('roster list alone does not decide who plays');
    expect(ROUTE_BEAT_REGISTRY['depth-chart'][1]?.text).toContain('Consequence: missed order sends an unassigned backup into calls');
    expect(ROUTE_BEAT_REGISTRY.roster[1]?.text).toContain('uncovered injuries force signings');
    expect(ROUTE_BEAT_REGISTRY.roster[1]?.text).toContain('open Roster for injury and backup health');
    expect(ROUTE_BEAT_REGISTRY.roster[1]?.text).not.toContain('bad lineups');
    expect(ROUTE_BEAT_REGISTRY['locker-room'][0]?.text).toContain('Where: Locker Room');
    expect(ROUTE_BEAT_REGISTRY['locker-room'][0]?.text).toContain("meetings or rallies spend this week's morale action");
    expect(ROUTE_BEAT_REGISTRY['locker-room'][1]?.text).toContain('pick meetings, rallies, or captains');
    expect(ROUTE_BEAT_REGISTRY['locker-room'][1]?.text).toContain('morale changes lock for the week');
    expect(ROUTE_BEAT_REGISTRY['locker-room'][1]?.text).not.toContain('owns the room');
    expect(ROUTE_BEAT_REGISTRY['locker-room'][1]?.text).not.toContain('only when');
    expect(allBeats.map((beat) => beat.text).join(' ')).not.toMatch(/cost is acceptable|safer Game Plan|use scoring swings, injuries, and turnovers|use replay angles|use Schedule to plan|check sponsor money|verify sponsor-player pairing|check sellers, player role, and price|use division race and wild-card line|near the deadline, use record|use Analytics with Stat Central|use Timeline before|review CBA proposal effects|use facilities, medical staff, mentors, and camp results|verify slots, budget, and who the mentor helps|use this page before starter|use forecasts before Advance Week|use Newsroom to confirm|use rivalry history before|use a local slot before/i);
    expect(ROUTE_BEAT_REGISTRY['settings'][0]?.text).toContain('before Advance Week');
    expect(ROUTE_BEAT_REGISTRY['settings'][0]?.text).toContain('saved results are not rewritten');
    expect(ROUTE_BEAT_REGISTRY['settings'][0]?.text).toContain('game pace');
    expect(ROUTE_BEAT_REGISTRY['settings'][0]?.text).not.toContain('sim pace');
    expect(ROUTE_BEAT_REGISTRY.settings[1]?.text).toContain('before Advance Week');
    expect(ROUTE_BEAT_REGISTRY.settings[1]?.text).toContain('missed upgrades delay player growth or injury recovery');
    expect(ROUTE_BEAT_REGISTRY.settings[1]?.text).not.toContain('facility affects growth, medical affects injury recovery');
    expect(ROUTE_BEAT_REGISTRY.settings[1]?.text).not.toContain('wrong choices slow');
    expect(ROUTE_BEAT_REGISTRY.settings[1]?.text).not.toContain('only when');
    expect(ROUTE_BEAT_REGISTRY['training-camp'][1]?.text).toContain('set training after facility, medical, mentor, and camp results');
    expect(ROUTE_BEAT_REGISTRY['training-camp'][1]?.text).toContain('overloads or idle weeks cost growth or create injuries');
    expect(ROUTE_BEAT_REGISTRY.mentors[0]?.text).toContain('choose mentor position, budget, and affected players before hiring');
    expect(ROUTE_BEAT_REGISTRY.mentors[0]?.text).toContain('unmatched position spends budget without growth');
    expect(ROUTE_BEAT_REGISTRY.mentors[0]?.text).not.toContain('mismatched mentor spends budget without growth');
    expect(ROUTE_BEAT_REGISTRY.mentors[1]?.text).toContain('preview players and budget before Hire or Release');
    expect(ROUTE_BEAT_REGISTRY.mentors[1]?.text).toContain('unplanned moves cut a mentor assigned to a player or fund an unused position');
    expect([
      ROUTE_BEAT_REGISTRY['game-plan'][1]?.text,
      ROUTE_BEAT_REGISTRY.staff[0]?.text,
      ROUTE_BEAT_REGISTRY['front-office'][1]?.text,
      ROUTE_BEAT_REGISTRY['roster-churn'][1]?.text,
    ].join(' ')).not.toMatch(/wrong calls|wrong move creates|wrong move loses/i);
    expect(ROUTE_BEAT_REGISTRY['roster-churn'][1]?.text).toContain('needed depth is lost');
    expect(ROUTE_BEAT_REGISTRY.mentors[0]?.text).not.toContain('compatible effects');
    expect(ROUTE_BEAT_REGISTRY.settings[1]?.text).not.toContain('shape development and injury risk');
    expect(ROUTE_BEAT_REGISTRY['training-camp'][1]?.text).not.toContain('shape development and injury risk');
    expect(ROUTE_BEAT_REGISTRY.relocation[0]?.text).toContain('preview eligibility, cost, market, and fan support');
    expect(ROUTE_BEAT_REGISTRY.relocation[0]?.text).toContain('relocation rewrites city, budget, and fan base');
    expect(ROUTE_BEAT_REGISTRY.relocation[0]?.text).not.toContain('accepted costs change location and budget');
    expect(ROUTE_BEAT_REGISTRY.relocation[0]?.text).not.toContain('Relocation can change location, budget, and fan support');
    expect(ROUTE_BEAT_REGISTRY.relocation[0]?.text).not.toContain('it changes city, budget, and fans');
    expect(ROUTE_BEAT_REGISTRY.relocation[1]?.text).toContain('it rewrites city, budget, and fan base');
    expect(ROUTE_BEAT_REGISTRY.relocation[0]?.text).not.toContain('preview first');
    expect(ROUTE_BEAT_REGISTRY.relocation[1]?.text).not.toContain('only when');
    expect(allBeats.map((beat) => beat.text).join(' ')).not.toMatch(/deadlines only|If none exist|wrong ruling request|wrong screen leaves|A wrong petition wastes|preview first|Relocation can change location/i);
    expect(allBeats.map((beat) => beat.text).join(' ')).not.toMatch(/compare division race|near the deadline, compare|compare Analytics with Stat Central|compare facilities, medical staff/i);
    expect(ROUTE_BEAT_REGISTRY.standings[1]?.text).toContain('skipping them costs picks');
    expect(ROUTE_BEAT_REGISTRY.standings[1]?.text).not.toContain('missing that context');
    expect(ROUTE_BEAT_REGISTRY.standings[1]?.text).not.toContain('ignoring them costs');
  });

  it('keeps high-frequency weekly route beats explicit about where and consequence', () => {
    const weeklyRouteKeys: RouteKey[] = [
      'locker-room',
      'game-day-recap',
      'broadcast-suite',
      'film-room',
      'schedule',
      'inbox',
    ];

    for (const routeKey of weeklyRouteKeys) {
      for (const beat of ROUTE_BEAT_REGISTRY[routeKey]) {
        expect(beat.text, `${beat.id}: ${beat.text}`).toMatch(/\b(Must Do|Recommended|Optional):/);
        expect(beat.text, `${beat.id}: ${beat.text}`).toContain('Where:');
        expect(beat.text, `${beat.id}: ${beat.text}`).toContain('Consequence:');
      }
    }
  });

  it('keeps football-ops route beats explicit about where and consequence', () => {
    const footballOpsRouteKeys: RouteKey[] = [
      'owner-promises',
      'staff',
      'cap-laboratory',
      'front-office',
      'endorsements',
    ];

    for (const routeKey of footballOpsRouteKeys) {
      for (const beat of ROUTE_BEAT_REGISTRY[routeKey]) {
        expect(beat.text, `${beat.id}: ${beat.text}`).toMatch(/\b(Must Do|Recommended|Optional):/);
        expect(beat.text, `${beat.id}: ${beat.text}`).toContain('Where:');
        expect(beat.text, `${beat.id}: ${beat.text}`).toContain('Consequence:');
      }
    }
  });

  it('keeps acquisition and scouting route beats explicit about where and consequence', () => {
    const acquisitionRouteKeys: RouteKey[] = [
      'draft-board',
      'draft-recap',
      'trade-center',
      'trade-market-radar',
      'market-planning',
      'roster-churn',
      'scouting-board',
      'standings',
    ];

    for (const routeKey of acquisitionRouteKeys) {
      for (const beat of ROUTE_BEAT_REGISTRY[routeKey]) {
        expect(beat.text, `${beat.id}: ${beat.text}`).toMatch(/\b(Must Do|Recommended|Optional):/);
        expect(beat.text, `${beat.id}: ${beat.text}`).toContain('Where:');
        expect(beat.text, `${beat.id}: ${beat.text}`).toContain('Consequence:');
      }
    }
  });

  it('starts every route beat with priority language and a consequence cue', () => {
    for (const beat of allBeats) {
      expect(beat.text, `${beat.id}: ${beat.text}`).toMatch(/^(Must Do|Recommended|Optional):/);
      expect(beat.text, `${beat.id}: ${beat.text}`).toMatch(/\b(before|locks?|force|missed|expire|deadline|matchup|only|dead money|overpay|growth|injury|patience|not|does not|will|cannot|spends?|changes?|risk|cost|final|without|after|creates?|removes?|cuts?|wastes?|loses?|overwrites?|stalls?|misses?|bench(?:es)?|delays?|blocks?|thins?|releases?|takes?|illegal|unmet)\b/i);
      expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(/\b(?:accept|add|buy|change|confirm|hire|pick|use|verify)\b[^.!?;]*(?:only if|only when|only after|unless)\b/i);
    }
  });

  it('gives first-week core route beats explicit where and consequence lines', () => {
    const coreRouteKeys: RouteKey[] = [
      'monday-briefing',
      'roster',
      'depth-chart',
      'game-plan',
      'week-advance',
    ];

    for (const routeKey of coreRouteKeys) {
      for (const beat of ROUTE_BEAT_REGISTRY[routeKey]) {
        expect(beat.text, `${beat.id}: ${beat.text}`).toContain('Where:');
        expect(beat.text, `${beat.id}: ${beat.text}`).toContain('Consequence:');
      }
    }
  });

  it('keeps route Chip information beats out of weak maybe/concealment phrasing', () => {
    const retiredWeakPhrases = [
      /guessing can hide/i,
      /one result can fool you/i,
      /one-game results can trick/i,
      /contract risk can change the call/i,
      /cap and role risk can hide/i,
      /role risk can hide/i,
      /Missing cap or role risk/i,
      /can raise or cool feuds/i,
      /can leave the matchup unprepared/i,
      /can change buy, sell, or hold timing/i,
      /wind or rain can make/i,
      /injured starters can leave wrong jobs/i,
      /run\/pass/i,
      /wrong jobs/i,
      /missed deadlines can remove offers/i,
      /backloads can create dead money/i,
      /wrong click/i,
      /wrong click can block extensions/i,
      /can create dead money or lose the player/i,
      /cost can create dead money or lost depth/i,
      /wrong deal can miss revenue/i,
      /wrong pairing can miss revenue/i,
      /wrong pairing misses revenue/i,
      /wrong money or requirements miss revenue/i,
      /picks can buy the wrong fix/i,
      /draft clock can force/i,
      /shopping without a target can overpay/i,
      /creates? a new problem/i,
      /starter or backup problem/i,
      /cap, starter, or backup problem/i,
      /starter-need reports/i,
      /draft need/i,
      /repeated stat problem/i,
      /assigned-role issue/i,
      /cap risk overpays/i,
      /wrong problem/i,
      /moving early can miss/i,
      /move can create a new roster need/i,
      /name roster need/i,
      /choose the roster need/i,
      /actual roster need/i,
      /wrong move can lose depth/i,
      /one-game spikes can bench/i,
      /one-game spikes remove starters/i,
      /profile notes inform moves/i,
      /rank-only moves/i,
      /cost picks or wins/i,
      /stats support role/i,
      /awards guide contract roles/i,
      /before the need is real/i,
      /cannot fix roster, cap, or plan by itself/i,
      /calls starters cannot handle/i,
      /injured starters get calls/i,
      /weaker pick or trade/i,
      /uncovered job/i,
      /contract cost can make/i,
      /benching can make the deal wrong/i,
      /wrong role can waste development/i,
      /missed cap risk can overpay/i,
      /missed alerts can leave/i,
      /missed alerts can chase/i,
      /delayed voting can stall/i,
      /delayed voting stalls/i,
      /slide can cut owner patience/i,
      /Wrong assumptions can make/i,
      /Wrong assumptions make/i,
      /Rule history explains old changes/i,
      /history cannot pass a new rule/i,
      /rushed bid can miss/i,
      /failed import can overwrite/i,
      /wrong save can take over/i,
      /wrong click can lose a mentor/i,
      /helped player|player helped|growth help|budget room|development money/i,
      /backup can be taken/i,
      /player can be taken/i,
      /weather can raise turnover risk/i,
      /Wrong calls slow prep and development/i,
      /\\belsewhere\\b/i,
      /own screens/i,
      /Back To Profile or Stat Central for actions and stats/i,
      /Use this screen for celebration and history/i,
      /\bhole\b/i,
      /each locks different risk/i,
      /plan risk/i,
      /shows a real fix/i,
      /development help/i,
      /owner pressure/i,
      /deadline pressure/i,
      /media pressure/i,
      /fan pressure/i,
      /rival injuries and pressure/i,
      /Newsroom pressure/i,
      /time pressure/i,
      /job-pressure/i,
      /buy\/sell\/hold math/i,
      /intel only/i,
      /gated franchise move/i,
      /wasted cap value/i,
      /small-sample stat swings/i,
      /extra screens/i,
      /weak matchups/i,
      /same problem/i,
      /thin depth/i,
      /urgent items/i,
      /After urgent/i,
      /Check injuries, owner patience/i,
      /Check active deals/i,
      /Read active limits/i,
      /check backup health/i,
      /check injured starters/i,
      /read morale/i,
      /read score/i,
      /check scoring swings/i,
      /check protection/i,
      /review champion history/i,
      /check weather/i,
      /check possible targets/i,
      /check Roster injuries/i,
      /check mandates/i,
      /read active promises/i,
      /check whether the coordinator/i,
      /check next year's cap/i,
      /check sponsor-player/i,
      /check eligibility/i,
      /read the action row/i,
      /check standings/i,
      /check Player Profile/i,
      /check age curve/i,
      /age curve/i,
      /review rivalry intensity/i,
      /read media rank/i,
      /check injuries, point margin/i,
      /read League Pulse/i,
      /check League Weather/i,
      /check forecasts/i,
      /read News for/i,
      /read Newsroom/i,
      /read MFSN/i,
      /spend the week's morale tool/i,
      /cost is justified/i,
      /bad bench calls/i,
      /react late/i,
      /when you will keep them/i,
      /read active rules/i,
      /read CBA proposal/i,
      /check active rule values/i,
      /read challenge badges/i,
      /review Legends/i,
      /Check contracts/i,
      /check Camp Readiness/i,
      /check facilities/i,
      /check budget/i,
      /check cap, depth/i,
      /Read eligibility/i,
      /sort fan reaction/i,
      /Act only when/i,
      /fix required items first/i,
      /deadline items/i,
      /Open active limits/i,
      /active limits before trying/i,
      /Camp Readiness for open camp actions/i,
      /risk you cannot accept/i,
      /Answer deadline items/i,
      /Only required items/i,
      /bad cut/i,
      /bad release/i,
      /bad restructure/i,
      /poor fit/i,
      /panic move/i,
      /useful starter/i,
      /useful mentor/i,
      /current rules are clear/i,
      /blind deadline timing/i,
      /race context/i,
      /blind move/i,
      /acting on rank alone/i,
      /misses waste growth/i,
      /raise injury risk/i,
      /compare sponsor requirements/i,
      /compare repeated stat failures/i,
      /compare age and development notes/i,
      /compare traits, production/i,
      /compare injuries, point margin/i,
      /Compare contracts, staff vacancies/i,
      /cannot prove scout misses yet/i,
      /ignoring them costs/i,
    ];

    for (const beat of allBeats) {
      for (const pattern of retiredWeakPhrases) {
        expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(pattern);
      }
    }

    expect(ROUTE_BEAT_REGISTRY['player-profile'][0]?.text).toContain(
      'missed injury, role, or cost turns into dead money or lost depth',
    );
  });

  it('keeps route Chip guidance plain instead of metaphor-heavy', () => {
    const vagueOrMetaphorPhrases = [
      /under lights/i,
      /the board will take somebody/i,
      /make it the right somebody/i,
      /prices move while you stare/i,
      /wrong room/i,
      /outside noise/i,
      /thin room/i,
      /not decoration/i,
      /marching orders/i,
      /board is clean/i,
      /board is quiet/i,
      /decision desk/i,
      /scheme drift/i,
      /trading blind/i,
      /punishes improvisation/i,
      /vague shopping/i,
      /league temperature/i,
      /target boards/i,
      /deadline desk/i,
      /owner heat/i,
      /trust consequences/i,
      /rivalry heat/i,
      /sentiment can flag heat/i,
      /sentiment can flag/i,
      /weekly .*work is clean/i,
      /weekly work/i,
      /football work/i,
      /market windows/i,
      /news is the wire/i,
      /weekly bet/i,
      /device-only notebook/i,
      /football screens/i,
      /hunting for work/i,
      /trade block is radar/i,
      /trade radar/i,
      /one chain/i,
      /dossier/i,
      /replay context/i,
      /contract context/i,
      /rule context/i,
      /history context/i,
      /risk signals/i,
      /governance control/i,
      /roster triage/i,
      /contract triage/i,
      /opponent shape and injury context/i,
      /season memory/i,
      /choices are clean/i,
      /archive wall/i,
      /truth check/i,
      /card tells the truth/i,
      /franchise insurance/i,
      /restore paths/i,
      /deadline screen is live/i,
      /prices move/i,
      /stat lens/i,
      /trophy archive/i,
      /collects rings/i,
      /\bpodium\b/i,
      /\bhandshakes?\b/i,
      /already saved/i,
      /\bfallout\b/i,
      /use it as context/i,
      /roster hole/i,
      /plan work/i,
      /record, story/i,
      /Sunday lineup/i,
      /perfect counter/i,
      /star power/i,
      /too calm/i,
      /buried at/i,
      /cheap depth matters/i,
      /use timing here/i,
      /draft history for that year/i,
      /stats and history show/i,
      /big moments/i,
      /League Pulse shows/i,
      /history shows who changed what/i,
      /history helps set/i,
      /Legends shows franchise history/i,
      /Mentors turn retired legends/i,
      /math before emotion/i,
      /culture control/i,
      /one-game noise/i,
      /legacy goals/i,
      /team identity/i,
      /results feel wrong/i,
      /trust the roster screen/i,
      /market screen/i,
      /real game-day lineup/i,
      /real need/i,
      /reputation, not standings/i,
      /set standards before extensions/i,
      /long-term standards/i,
      /bury better value/i,
      /They explain value/i,
      /matter more/i,
      /The page explains risk/i,
      /one-game results can cause bad roster moves/i,
      /which stats matter/i,
      /backup order matter/i,
      /contract value/i,
      /pick value/i,
      /Review Broadcast after/i,
      /It shows scoring swings/i,
      /Schedule shows/i,
      /Use Watch List to track later targets/i,
      /Use Watch List to track roster players/i,
      /Draft Recap grades the class/i,
      /Trade Block shows/i,
      /Use standings after a result/i,
      /Use Analytics and Stat Central to verify/i,
      /learn why the result happened/i,
      /find why the game swung/i,
      /what held up/i,
      /celebrates the winner/i,
      /shape development and injury risk/i,
      /Comparison rows show/i,
      /Read League Pulse after/i,
      /League news can warn/i,
      /News can reveal/i,
      /Newsroom shows reaction/i,
      /It can reveal owner/i,
      /Trade Deadline shows/i,
      /Owner promises affect approval/i,
      /Owner approval changes when you make or miss promises/i,
      /Commissioner Office handles league rulings/i,
      /CBA rules change only after votes pass/i,
      /League Rules lists active values/i,
      /Season Recap summarizes the closed year/i,
      /Training camp resolves through Advance Week/i,
      /Pin later targets here/i,
      /If none are urgent/i,
      /can mean buy/i,
      /After roster and plan are set/i,
      /Use lanes to separate/i,
      /Use history only/i,
      /this page will not fix/i,
      /hire mentors only after/i,
      /bad cut/i,
      /bad release/i,
      /bad restructure/i,
      /poor fit/i,
      /panic move/i,
    ];

    for (const beat of allBeats) {
      for (const pattern of vagueOrMetaphorPhrases) {
        expect(beat.text, `${beat.id}: ${beat.text}`).not.toMatch(pattern);
      }
    }
  });

  it('uses only locked route Chip pose codes', () => {
    for (const beat of allBeats) {
      expect(CHIP_ROUTE_POSES).toContain(beat.pose);
    }
  });

  it('uses the public-release route coaching key set', () => {
    const expected: RouteKey[] = [
      'monday-briefing',
      'roster',
      'depth-chart',
      'locker-room',
      'game-plan',
      'game-day-recap',
      'broadcast-suite',
      'film-room',
      'super-bowl',
      'week-advance',
      'schedule',
      'watch-list',
      'inbox',
      'owner-promises',
      'staff',
      'cap-laboratory',
      'front-office',
      'endorsements',
      'draft-board',
      'draft-recap',
      'trade-center',
      'trade-market-radar',
      'market-planning',
      'roster-churn',
      'scouting-board',
      'standings',
      'analytics-evidence',
      'player-profile',
      'player-timeline',
      'player-development',
      'player-comparison',
      'player-rivalries',
      'power-rankings',
      'league-pulse',
      'league-weather',
      'league-news',
      'newsroom',
      'social-feed',
      'commissioner-governance',
      'cba',
      'league-rules',
      'scenario-constraints',
      'record-book',
      'awards-hub',
      'franchise-legends',
      'season-recap',
      'dynasty-save-load',
      'settings',
      'training-camp',
      'mentors',
      'trade-deadline',
      'relocation',
      'expansion-draft',
    ];

    expect(ROUTE_KEYS).toEqual(expected);
    expect(Object.keys(ROUTE_BEAT_REGISTRY)).toEqual(expected);
  });

  it('keeps beat order stable by route and beat number', () => {
    expect(ROUTE_KEYS.map((routeKey) => ROUTE_BEAT_REGISTRY[routeKey].map((beat) => beat.id))).toEqual([
      ['chip.route.monday-briefing.beat-1', 'chip.route.monday-briefing.beat-2'],
      ['chip.route.roster.beat-1', 'chip.route.roster.beat-2'],
      ['chip.route.depth-chart.beat-1', 'chip.route.depth-chart.beat-2'],
      ['chip.route.locker-room.beat-1', 'chip.route.locker-room.beat-2'],
      ['chip.route.game-plan.beat-1', 'chip.route.game-plan.beat-2'],
      ['chip.route.game-day-recap.beat-1', 'chip.route.game-day-recap.beat-2'],
      ['chip.route.broadcast-suite.beat-1', 'chip.route.broadcast-suite.beat-2'],
      ['chip.route.film-room.beat-1', 'chip.route.film-room.beat-2'],
      ['chip.route.super-bowl.beat-1', 'chip.route.super-bowl.beat-2'],
      ['chip.route.week-advance.beat-1', 'chip.route.week-advance.beat-2'],
      ['chip.route.schedule.beat-1', 'chip.route.schedule.beat-2'],
      ['chip.route.watch-list.beat-1', 'chip.route.watch-list.beat-2'],
      ['chip.route.inbox.beat-1', 'chip.route.inbox.beat-2'],
      ['chip.route.owner-promises.beat-1', 'chip.route.owner-promises.beat-2'],
      ['chip.route.staff.beat-1', 'chip.route.staff.beat-2'],
      ['chip.route.cap-laboratory.beat-1', 'chip.route.cap-laboratory.beat-2'],
      ['chip.route.front-office.beat-1', 'chip.route.front-office.beat-2'],
      ['chip.route.endorsements.beat-1', 'chip.route.endorsements.beat-2'],
      ['chip.route.draft-board.beat-1', 'chip.route.draft-board.beat-2'],
      ['chip.route.draft-recap.beat-1', 'chip.route.draft-recap.beat-2'],
      ['chip.route.trade-center.beat-1', 'chip.route.trade-center.beat-2'],
      ['chip.route.trade-market-radar.beat-1', 'chip.route.trade-market-radar.beat-2'],
      ['chip.route.market-planning.beat-1', 'chip.route.market-planning.beat-2'],
      ['chip.route.roster-churn.beat-1', 'chip.route.roster-churn.beat-2'],
      ['chip.route.scouting-board.beat-1', 'chip.route.scouting-board.beat-2'],
      ['chip.route.standings.beat-1', 'chip.route.standings.beat-2'],
      ['chip.route.analytics-evidence.beat-1', 'chip.route.analytics-evidence.beat-2'],
      ['chip.route.player-profile.beat-1', 'chip.route.player-profile.beat-2'],
      ['chip.route.player-timeline.beat-1', 'chip.route.player-timeline.beat-2'],
      ['chip.route.player-development.beat-1', 'chip.route.player-development.beat-2'],
      ['chip.route.player-comparison.beat-1', 'chip.route.player-comparison.beat-2'],
      ['chip.route.player-rivalries.beat-1', 'chip.route.player-rivalries.beat-2'],
      ['chip.route.power-rankings.beat-1', 'chip.route.power-rankings.beat-2'],
      ['chip.route.league-pulse.beat-1', 'chip.route.league-pulse.beat-2'],
      ['chip.route.league-weather.beat-1', 'chip.route.league-weather.beat-2'],
      ['chip.route.league-news.beat-1', 'chip.route.league-news.beat-2'],
      ['chip.route.newsroom.beat-1', 'chip.route.newsroom.beat-2'],
      ['chip.route.social-feed.beat-1', 'chip.route.social-feed.beat-2'],
      ['chip.route.commissioner-governance.beat-1', 'chip.route.commissioner-governance.beat-2'],
      ['chip.route.cba.beat-1', 'chip.route.cba.beat-2'],
      ['chip.route.league-rules.beat-1', 'chip.route.league-rules.beat-2'],
      ['chip.route.scenario-constraints.beat-1', 'chip.route.scenario-constraints.beat-2'],
      ['chip.route.record-book.beat-1', 'chip.route.record-book.beat-2'],
      ['chip.route.awards-hub.beat-1', 'chip.route.awards-hub.beat-2'],
      ['chip.route.franchise-legends.beat-1', 'chip.route.franchise-legends.beat-2'],
      ['chip.route.season-recap.beat-1', 'chip.route.season-recap.beat-2'],
      ['chip.route.dynasty-save-load.beat-1', 'chip.route.dynasty-save-load.beat-2'],
      ['chip.route.settings.beat-1', 'chip.route.settings.beat-2'],
      ['chip.route.training-camp.beat-1', 'chip.route.training-camp.beat-2'],
      ['chip.route.mentors.beat-1', 'chip.route.mentors.beat-2'],
      ['chip.route.trade-deadline.beat-1', 'chip.route.trade-deadline.beat-2'],
      ['chip.route.relocation.beat-1', 'chip.route.relocation.beat-2'],
      ['chip.route.expansion-draft.beat-1', 'chip.route.expansion-draft.beat-2'],
    ]);
  });
});
