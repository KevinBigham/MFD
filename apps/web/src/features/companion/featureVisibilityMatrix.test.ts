import { describe, expect, it } from 'vitest';
import {
  CHIP_FEATURE_VISIBILITY_MATRIX,
  FIRST_TEN_MINUTE_FEATURES,
  REQUIRED_CHIP_FEATURES,
  getFeatureVisibilityEntry,
} from './featureVisibilityMatrix';
import { chipCopyHasActionAndConsequence } from './dialogue/types';

describe('Chip feature visibility matrix', () => {
  it('covers the required franchise systems with stable ids', () => {
    const ids = new Set(CHIP_FEATURE_VISIBILITY_MATRIX.map((entry) => entry.id));

    for (const requiredFeature of REQUIRED_CHIP_FEATURES) {
      expect(ids.has(requiredFeature)).toBe(true);
    }
    expect(ids.size).toBe(CHIP_FEATURE_VISIBILITY_MATRIX.length);
  });

  it('keeps the first ten minutes focused instead of introducing every system', () => {
    const firstTenEntries = CHIP_FEATURE_VISIBILITY_MATRIX.filter((entry) => entry.bestMoment === 'first_ten_minutes');

    expect(firstTenEntries.map((entry) => entry.id)).toEqual(FIRST_TEN_MINUTE_FEATURES);
    expect(firstTenEntries.length).toBeLessThan(8);
  });

  it('uses route entry points and player actions for every visible feature', () => {
    for (const entry of CHIP_FEATURE_VISIBILITY_MATRIX) {
      expect(entry.entryPoint.startsWith('/')).toBe(true);
      expect(entry.whatItDoes.length).toBeGreaterThan(8);
      expect(entry.whyItMatters.length).toBeGreaterThan(8);
      expect(entry.firstTimePlayerAction.length).toBeGreaterThan(8);
      expect(entry.testStatus).not.toBe('missing');
    }
  });

  it('keeps first-read feature introductions actionable with consequences', () => {
    for (const entry of CHIP_FEATURE_VISIBILITY_MATRIX) {
      const intro = `${entry.whyItMatters} ${entry.firstTimePlayerAction}`;
      expect(intro, `${entry.id}: ${intro}`).toSatisfy((copy: string) => chipCopyHasActionAndConsequence(copy));
    }
  });

  it('keeps feature purpose lines tied to player action instead of generic screen descriptions', () => {
    const purposeCopy = CHIP_FEATURE_VISIBILITY_MATRIX.map((entry) => entry.whatItDoes).join(' ');

    expect(purposeCopy).toContain('Separates Must Do, Recommended, and Optional work');
    expect(purposeCopy).toContain('Holds offers, promises, votes, owner requests, and deadlines that need choose-or-defer decisions');
    expect(purposeCopy).toContain('Names health, roles, age, contract cost, and first-backup jobs before lineup or cap moves');
    expect(purposeCopy).toContain('Saves offensive focus, protection, coverage, and run calls used by the next game');
    expect(purposeCopy).toContain('Accepts, counters, blocks, and proposes trades that move players, picks, cap space, and morale');
    expect(purposeCopy).toContain('Stashes or elevates low-cost backups for injuries, special teams, and assigned future roles');
    expect(purposeCopy).toContain('Separates public rank from record, point margin, injuries, and fan reaction before image-driven moves');
    expect(purposeCopy).toContain('Exports backup files, imports cartridges, and saves local slots before trades, imports, or offseason sequences replace progress');
    expect(purposeCopy).toContain('Saves difficulty, autosave, audio, motion, pacing, accessibility, and Chip quieting before future results');
    expect(purposeCopy).not.toMatch(/Lists the week|Collects team decisions|Sets the weekly offensive and defensive approach|Shows incoming offers and lets the player build proposals|Stores developmental depth outside the active lineup|Shows public ranking beside record|Exports, imports, save slots|Controls difficulty, autosave, audio, pacing, accessibility, and guidance behavior/i);
  });

  it('keeps feature introductions direct and free of weak metaphor copy', () => {
    const joined = CHIP_FEATURE_VISIBILITY_MATRIX.map((entry) => [
      entry.whatItDoes,
      entry.whyItMatters,
      entry.firstTimePlayerAction,
      entry.advancedPlayerNote,
    ].join(' ')).join(' ');

    expect(joined).not.toMatch(/bet against|board noise|contract-window|cap window|as leverage|money window|football window/i);
    expect(joined).not.toMatch(/sidecar|browser-local|archive handling|memory between machines/i);
    expect(joined).not.toMatch(/triage board|\bbodies\b|franchise arc|open market|emotional weight|feel authored|supporting history backup data|living league/i);
    expect(joined).not.toMatch(/market timing/i);
    expect(joined).not.toMatch(/thin positions|future bill|franchise reset|future churn|league narrative|league context|deeper evidence|surface ratings|recent bias|history context|opponent shape and injury context/i);
    expect(joined).not.toMatch(/most urgent context|division context|momentum and reputation visible|weekly loop|season context|cap context|draft window|surfaces prospect|repeated tells|moving the engine|roster holes|Sunday lineup|bad game|buried one|travel into the sim|before Advance Weekming/i);
    expect(joined).not.toMatch(/roster quality|setting strategy|performance trends|one-game randomness|calendar pressure|league reputation|outside pressure|long-term goals after weekly work|current week is safe|rules you intended/i);
    expect(joined).not.toMatch(/\b(staff identity|plan identity|identity teaches|feel authored|feels like|right amount of edge|execution, not the noise)\b/i);
    expect(joined).not.toMatch(/\b(football reason|roster reality|decisions become consequences|actual game-day lineup|safe slot)\b/i);
    expect(joined).not.toMatch(/\burgent\b/i);
    expect(joined).not.toMatch(/\bsafely wait\b/i);
    expect(joined).not.toMatch(/\bred items?\b/i);
    expect(joined).not.toMatch(/\bchemistry\b/i);
    expect(joined).not.toMatch(/\bweekly pain\b/i);
    expect(joined).not.toMatch(/\bweekly decisions\b/i);
    expect(joined).not.toMatch(/\bkeeps a season alive\b/i);
    expect(joined).not.toMatch(/\bstarter value\b/i);
    expect(joined).not.toMatch(/\baggressive game plans\b/i);
    expect(joined).not.toMatch(/\bwhich screen should be handled next\b/i);
    expect(joined).not.toMatch(/\bshaping a long save\b/i);
    expect(joined).not.toMatch(/\bunderstand Monday Briefing\b/i);
    expect(joined).not.toMatch(/\b(Injuries change both|Football plans are limited|It points to the next screen|It locks games|It shows tomorrow|It turns repeated|It adds emergency backups|Review it to separate|It shows which future starters|cheapest path to upgrade|fills holes quickly|gives the player low-cost answers|It explains outside pressure|It can warn|It helps prove|It informs long-term standards|It prevents a bad import|It locks difficulty|Balance immediate starter help|Pick immediate help)\b/i);
    expect(joined).not.toMatch(/Review backup slots before Advance Week|one bad slot can turn a good plan into a loss/i);
    expect(joined).not.toMatch(/sandbox restructures|future, and risk impact|cap space today against dead money tomorrow/i);
    expect(joined).not.toMatch(/future-pick cost|long veteran deals can block future cap space|before future Advance Week results/i);
    expect(joined).not.toMatch(/they will not fix this week’s lineup|Use staff fit to guide roster construction|role clusters|roster fit|staff fit|bad fit turns/i);
    expect(joined).not.toMatch(/scheme support/i);
    expect(joined).not.toMatch(/\bholes?\b|\bgaps?\b/i);
    expect(joined).not.toMatch(/thin backup|thin backups|thin backup groups/i);
    expect(joined).not.toMatch(/\bbefore the sim\b/i);
    expect(joined).not.toMatch(/Game Plan risk|development risk|need checks|costs draft options|rookie acquisition|veteran cap needs|veteran solutions|depth options|remove options/i);
    expect(joined).not.toMatch(/trusting rank|supporting stats|scout confidence|scouting confidence|low-confidence/i);
    expect(joined).not.toMatch(/staff strengths|strongest current position group|run through .*strengths|Scout that group/i);
    expect(joined).not.toMatch(/prospect grades|missing grades|using the ranking|good grade|need, grade, and price|starter-need grades|grade matches a draft need/i);
    expect(joined).not.toMatch(/spending resources|cap resources/i);
    expect(joined).not.toMatch(/bad batches|standings justify|justify the cost|bad claims|bad-weather|may require/i);
    expect(joined).not.toMatch(/bad timing|bad deals|bad import|If clear|clear Inbox/i);
    expect(joined).not.toMatch(/Advance Week can lock|choices can expire|contract mistakes can waste|ignoring them can put|injured players can still handle|assignments they can learn|Wrong contract moves can spend|choice can create dead money|one-week relief can block|backloads can create dead money|Trades can fix|fixing one roster need can create|answers can force|waiting too long can cost|long veteran deals can block|can force the wrong starter|can run the scheme|repeated misses can cost|weather can force|can waste picks|ranking slides can cut|can change whether|missed alerts can leave|one-game stat spikes can cut|one-game spikes|one misleading result can remove|useful starter|blind deadline timing|acting on rank alone|race context|Compare aging starters|Compare opponent strengths|compare cap space|Compare Team Needs|Compare public ranking|compare it before|compare current production/i);
    expect(joined).not.toMatch(/\broster needs?\b|across every need|same need lets/i);
    expect(joined).not.toMatch(/roster problem|backup problem|plan or roster issue|repeated problem|Scout positions your roster will lack|starter or backup problem/i);
    expect(joined).not.toContain('Optional moves may stay undone');
    expect(joined).toContain('Leave optional moves undone when lineups, deadlines, and matchup calls are acceptable');
    expect(joined).toContain('Combine opponent scouting, injuries, and player limits before Advance Week');
    expect(joined).toContain('prep quality');
    expect(joined).toContain('player growth');
    expect(joined).toContain('block injury replacements, extensions, or next-offseason cap space');
    expect(joined).toContain('Free Agency fills starter or backup jobs fast');
    expect(joined).toContain('Avoid paying veterans for every open role');
    expect(joined).toContain('sign one exact role before spending across several positions');
    expect(joined).not.toContain('chasing every roster need');
    expect(joined).toContain('Open Inbox for offers, promises, votes, and owner requests before Advance Week');
    expect(joined).toContain('your own Roster, cap space, and Game Plan decisions are set');
    expect(joined).toContain('spending cap space or picks');
    expect(joined).toContain('Order injuries, offers, promises, cap, and matchup work');
    expect(joined).toContain('Open Advance Week and cover injuries, missing starters, offers, promises, or phase rules before continuing');
    expect(joined).toContain('Monday Briefing names what must be fixed or accepted before Advance Week locks injuries, morale, standings, and deadlines');
    expect(joined).toContain('Open Action Center for current notes; then any legal roster, cap, Game Plan, trade, market, staff, or medical move stays available before Advance Week');
    expect(joined).not.toContain('Open Action Center first');
    expect(joined).not.toContain('team-building move stays available');
    expect(joined).toContain('without blocking legal roster, cap, plan, trade, or staff moves');
    expect(joined).not.toMatch(/Read the briefing before touching the roster|Read it first because Advance Week|Resolve Action Center before touching the roster/i);
    expect(joined).toContain('Saves starters, package roles, and first backups');
    expect(joined).toContain('Names health, roles, age, contract cost, and first-backup jobs before lineup or cap moves');
    expect(joined).not.toContain('Shows roles, health, age, contracts, and first-backup jobs');
    expect(joined).toContain('uncovered backup jobs, injuries, and contract mistakes waste the next matchup');
    expect(joined).toContain('Open roster injuries and first-backup jobs before setting the plan');
    expect(joined).toContain('the saved order decides who replaces an injured starter');
    expect(joined).toContain('Combine opponent scouting, injuries, and player limits before Advance Week');
    expect(joined).toContain('calls beyond starter ratings expose missed protection or coverage');
    expect(joined).toContain('Pick offensive focus, protection, and coverage calls that injured players have enough health and ratings to handle');
    expect(joined).not.toContain('Pick run/pass, protection, and coverage calls');
    expect(joined).not.toContain('injured players can still execute');
    expect(joined).toContain('calls beyond healthy-player ratings create missed protection, coverage, or run-defense assignments');
    expect(joined).not.toContain('cannot execute');
    expect(joined).not.toContain('mismatched calls expose missed protection, coverage, or run-defense assignments');
    expect(joined).not.toContain('bad protection');
    expect(joined).toContain('Injured starters change saved depth and Game Plan calls');
    expect(joined).toContain('Advance Week locks games, injuries, morale, standings, and answered or ignored deadlines');
    expect(joined).not.toContain('accepted or ignored deadlines');
    expect(joined).toContain('Change settings before Advance Week; saved results are not rewritten after the week exists');
    expect(joined).toContain('separate backup slot');
    expect(joined).toContain('Answer deadline choices before Advance Week');
    expect(joined).toContain('leave no-deadline messages for later when they do not change lineup, cap, or morale');
    expect(joined).toContain('protection, coverage, run-defense assignment, and play-call misses');
    expect(joined).toContain('before the mistake repeats');
    expect(joined).toContain('Require repeated trends before cutting or trading');
    expect(joined).toContain('one odd box score removes a starter who still fills a role');
    expect(joined).toContain('Exporting gives you a rollback before an import replaces the current dynasty');
    expect(joined).toContain('a trade spends picks or cap space');
    expect(joined).toContain('offseason moves lock');
    expect(joined).not.toContain('failed import, risky trade, or offseason mistake');
    expect(joined).not.toMatch(/\brisky trade\b|\boffseason mistake\b/i);
    expect(joined).toContain('Open Settings before Advance Week when difficulty, autosave, motion, pacing, or Chip quieting needs to change');
    expect(joined).toContain('choices expire or lock at Advance Week');
    expect(joined).toContain('trade timing, and free-agency timing');
    expect(joined).toContain('missed alerts leave a bid late or a matchup exposed');
    expect(joined).not.toContain('do not let it replace roster, cap, or Game Plan decisions');
    expect(joined).toContain('player complaints');
    expect(joined).not.toContain('morale risk');
    expect(joined).toContain('lost picks');
    expect(joined).toContain('Trades solve one starter or backup job while adding cap cost, player complaints, or lost picks');
    expect(joined).toContain('Buy when the new starter changes the next two games enough to pay the cap, pick, and morale cost');
    expect(joined).toContain('Open Team Needs after the same matchup miss repeats');
    expect(joined).toContain('ignoring the same position shortage lets it decide another week');
    expect(joined).toContain('Scout future starter and backup jobs before draft week');
    expect(joined).toContain('roster-job warnings before draft week');
    expect(joined).toContain('waiting too long removes cheaper draft choices');
    expect(joined).toContain('missing role answers, medical limits, or coachability reports force a reach or veteran overpay');
    expect(joined).not.toContain('missing role, medical, or trait answers force a reach or veteran overpay');
    expect(joined).toContain('Open Team Needs, scout reports, and cap space; name the player role before making the pick');
    expect(joined).not.toContain('Compare Team Needs, scout reports, and cap space');
    expect(joined).toContain('Match traits to staff and scheme before trusting a prospect');
    expect(joined).toContain('Shows repeated team and player trends before roster, lineup, or Game Plan choices lock in');
    expect(joined).not.toContain('Shows repeated team and player trends before bad roster, lineup, or Game Plan choices lock in');
    expect(joined).not.toContain('trends that can affect roster');
    expect(joined).toContain('injuries force a low-role emergency starter');
    expect(joined).toContain('puts an unassigned first backup on the field');
    expect(joined).toContain('cap space needed for injury replacements');
    expect(joined).toContain('Preview dead money and next-year cap before cutting or restructuring');
    expect(joined).toContain('one-week relief blocks injury replacements or extensions');
    expect(joined).toContain('Preview one cap move at a time');
    expect(joined).toContain('extension cap space, and injury-replacement money');
    expect(joined).not.toMatch(/\bextension room\b/i);
    expect(joined).toContain('extension limits next offseason');
    expect(joined).toContain('coach-owned QB, line, coverage, defender, scheme, and development-snap jobs');
    expect(joined).not.toContain('Shows head coach roles, coordinator game-plan responsibilities');
    expect(joined).toContain('development-snap jobs');
    expect(joined).toContain('Turns scout reports and Team Needs into rookie picks');
    expect(joined).toContain('leaves veteran cap costs unsolved');
    expect(joined).toContain('Signs veterans for named starter, backup, or injury-replacement jobs');
    expect(joined).toContain('emergency signings');
    expect(joined).toContain('stacked restructures, void years, and backloads create dead money or block extensions');
    expect(joined).toContain('Claims short-term backups for one-week injury, return, or special-teams jobs');
    expect(joined).toContain('Claim emergency backups before injuries force a low-role emergency starter');
    expect(joined).toContain('claims without a weekly job cost roster spots');
    expect(joined).toContain('Open Staff and Depth Chart before signing or drafting');
    expect(joined).toContain('Name aging starters, expiring contracts, and crowded roles');
    expect(joined).toContain('Stash or elevate depth with assigned scheme jobs');
    expect(joined).toContain('Open Power Rankings after results to explain fan reaction and owner patience');
    expect(joined).toContain('Open Power Rankings after injuries are handled, roster moves are saved, Game Plan is set, and Advance Week runs');
    expect(joined).not.toContain('Open Power Rankings after injuries, roster moves, Game Plan, and Advance Week choices are accepted');
    expect(joined).toContain('Name public ranking, standings, injuries, and point margin before trades or benchings');
    expect(joined).toContain('moves for rank alone cost picks, cap, or starters');
    expect(joined).not.toContain('Open media rank');
    expect(joined).not.toContain('ranking slides');
    expect(joined).not.toContain('owner patience risk');
    expect(joined).toContain('Open Contracts when cap space is tight');
    expect(joined).toContain('Open Waivers when a one-week injury or backup emergency would force a low-role emergency starter');
    expect(joined).toContain('Open Standings before buying or selling when the playoff race or division deficit changes pick and cap cost');
    expect(joined).toContain('Choose buy, sell, or hold from division deficit, wild-card line, and schedule');
    expect(joined).toContain('rushed deadline moves cost picks, cap space, or playoff ground');
    expect(joined).toContain('Open Analytics after the same protection, coverage, rushing, turnover, or efficiency miss repeats; find the trend before cutting, trading, or benching a player');
    expect(joined).not.toMatch(/Chip flags|Chip mentions|Open analytics after Chip|Use waivers when Chip|Open Contracts when Chip|Check standings when Chip/i);
    expect(joined).toContain('Names rival injuries, rivalries, standings deficits, trade timing, and free-agency timing before buy, sell, or wait choices');
    expect(joined).not.toContain('Shows league injuries, rivalries, standings deficits, and trade and free-agency timing');
    expect(joined).not.toMatch(/owner pressure|pressure decisions|pressure calls|raises owner pressure|raise owner pressure|cap pressure|division pressure|standings pressure|development pressure|position pressure/i);
    expect(joined).toContain('Exporting gives you a rollback before an import replaces the current dynasty');
    expect(joined).toContain('one odd box score cuts, trades, or benches needed role players');
    expect(joined).toContain('current production should support the role or price change');
    expect(joined).not.toMatch(/\bread\b/i);
    expect(joined).not.toMatch(/\b(?:verify|confirm|check)\b/i);
    expect(joined).not.toMatch(/\b(?:accept|add|buy|change|confirm|hire|pick|use)\b[^.!?;]*(?:only if|only when)\b/i);
    expect(joined).not.toMatch(/wrong signals|Use rankings|Treat rankings/i);
    expect(joined).toContain('Names upcoming opponents, byes, short weeks, and weather that change rest and calls');
    expect(joined).toContain('Wind, rain, short weeks, and byes');
    expect(joined).toContain('Open Schedule after Monday Briefing; short weeks, byes, and weather decide rest, depth, quick throws, or more runs before Advance Week');
    expect(joined).toContain('a 3-4 buyer needs one starter who changes the wild-card race');
    expect(joined).toContain('while buying at 2-6 wastes picks and cap');
    expect(joined).not.toMatch(/Compare record and division position|Compare media rank|media rank/i);
    expect(joined).toContain('before the next Advance Week creates results');
    expect(joined).toContain('saved results are not rewritten after the week exists');
    expect(joined).toContain('Open Records before role, extension, or trade choices');
    expect(joined).toContain('production sets price');
    expect(joined).toContain('injuries, cap, depth, and calls still need their own screens');
    expect(joined).toContain('Open Records after roster, cap, depth, and Game Plan choices are saved; stats help price roles, deals, and trades');
    expect(joined).not.toMatch(/thin position groups|rank-only moves|stats support roles|one-game spikes|calls starters cannot handle|calls the healthy lineup cannot handle/i);
    expect(joined).not.toContain('Open Records after roster, cap, depth, and Game Plan choices are accepted');
    expect(joined).not.toContain('Records prove production before role or extension choices');
    expect(joined).not.toContain('records prove production but repair nothing');
    expect(joined).not.toContain('repair nothing');
    expect(joined).not.toContain('lineup risk');
    expect(joined).toContain('a coach who cannot teach the role slows prep and development');
    expect(joined).toContain('a role mismatch turns a talented player into a wasted pick');
    expect(joined).not.toMatch(/\bmismatched\b/i);
    expect(joined).toContain('match each coach to the roles your starters will run before Advance Week');
    expect(joined).not.toContain('confirm each coach owns the roles your starters will run before Advance Week');
    expect(joined).toContain('Set nickel, goal-line, and injury backup jobs');
    expect(joined).toContain('missing package jobs put a player without that assignment on the field');
    expect(joined).not.toMatch(/wrong calls expose|wrong backup on the field|force the wrong starter|wrong packages put|unsupported packages/i);
    expect(joined).toContain('Advance Week still locks the choices you leave');
    expect(joined).toContain('Open Practice Squad when injuries leave a backup job uncovered');
    expect(joined).toContain('take away cheap backups');
    expect(joined).toContain('Open Film Room after a result exposes protection, coverage, run-defense, or lineup miss');
    expect(joined).toContain('If the same protection, coverage, or run-defense miss repeats');
    expect(joined).toContain('fix Game Plan or Depth Chart before changing personnel');
    expect(joined).not.toContain('carry into Advance Week');
    expect(joined).not.toMatch(/weekly checklist|after Must Do tasks are clear|choices are handled|decisions are handled|cap-space limits are clear/i);
    expect(joined).toContain('before Advance Week');
    expect(joined).not.toMatch(/Answer deadline items|fix any required item|weekly fallout|with risk when record|risk you cannot accept/i);
    expect(joined).not.toMatch(/Tune backup roles|Veterans can still advance|costly move to solve one week|Use repeated problems|Scout the next opponent after opening the briefing|Use standings to decide buy, sell, or hold|Treat media rank as reaction|Use trends to avoid/i);
  });

  it('can look up a feature entry by id', () => {
    expect(getFeatureVisibilityEntry('cap-lab')).toMatchObject({
      entryPoint: '/cap-lab',
      bestMoment: 'cap_pressure',
    });
    expect(getFeatureVisibilityEntry('dynasty-save-load')).toMatchObject({
      entryPoint: '/dynasty',
      testStatus: 'route_beat',
    });
    expect(getFeatureVisibilityEntry('coaching')).toMatchObject({
      entryPoint: '/coaching',
      testStatus: 'route_beat',
    });
    expect(getFeatureVisibilityEntry('settings')).toMatchObject({
      entryPoint: '/settings',
      testStatus: 'route_beat',
    });
    expect(getFeatureVisibilityEntry('team-needs')).toMatchObject({
      entryPoint: '/team-needs',
      testStatus: 'route_beat',
    });
    expect(getFeatureVisibilityEntry('free-agency')).toMatchObject({
      entryPoint: '/free-agency',
      testStatus: 'route_beat',
    });
    expect(getFeatureVisibilityEntry('waiver-wire')).toMatchObject({
      entryPoint: '/waivers',
      testStatus: 'route_beat',
    });
    expect(getFeatureVisibilityEntry('practice-squad')).toMatchObject({
      entryPoint: '/practice-squad',
      testStatus: 'route_beat',
    });
    expect(getFeatureVisibilityEntry('unknown')).toBeNull();
  });
});
