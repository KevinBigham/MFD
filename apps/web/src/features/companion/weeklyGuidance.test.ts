import { describe, expect, it } from 'vitest';
import {
  buildWeeklyGuidance,
  composeWeeklyDialogueText,
  weeklyGuidanceToDialogueEntry,
  GENERIC_OPTIONAL_LINES,
  GENERIC_RECOMMENDED_LINES,
} from './weeklyGuidance';
import { MAX_CHIP_DIALOGUE_CHARS } from './dialogue/types';

describe('weekly guidance', () => {
  it('turns a post-loss injury week into one clear next action', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'loss',
      currentWeek: 4,
      record: '1-3',
      opponentName: 'Austin Armadillos',
      injuryCount: 3,
      pendingDecisionCount: 2,
      capSpace: 6,
      difficulty: 'legend',
    });

    expect(guidance.whatChanged).toContain('loss');
    expect(guidance.topAction).toBe('Must Do: choose or defer 2 pending decisions before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock.');
    expect(guidance.mustDo).toBe('Must Do: choose or defer 2 pending decisions before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock.');
    expect(guidance.recommended).toContain('Choose or defer every pending decision before Advance Week');
    expect(guidance.optional).toContain('Make any legal roster, depth chart, training');
    expect(guidance.where).toContain('Inbox, Action Center, or highlighted screen badges');
    expect(guidance.deadline).toBe('2 decisions need a choice or defer before Advance Week.');
    expect(guidance.canWait).toContain('Open awards, records, and history after you fix or accept Monday Briefing and Action Center notes');
    expect(guidance.canWait).toContain('do not change the next game');
    expect(guidance.risk).toContain('Ignored decisions expire');
    expect(guidance.risk).toContain('cut owner patience');
    expect(guidance.risk).toContain('lock weaker starter, backup, cap, lineup, or morale choices');
    expect(guidance.risk).not.toContain('owner trust');
    expect(guidance.risk).not.toContain('carry into the sim');
    expect(JSON.stringify(guidance)).not.toMatch(/\bfallback\b|\btriage\b/i);
    expect(JSON.stringify(guidance)).not.toMatch(/\bloose roster\b|\bloose week\b|contract-year math|game-plan work|stale game plan/i);
    expect(JSON.stringify(guidance)).not.toMatch(/flagged decision/i);
    expect(JSON.stringify(guidance)).not.toMatch(/waiting decision screen|unanswered items|unanswered choices|change what Advance Week locks in/i);
    expect(JSON.stringify(guidance)).not.toMatch(/\bcap room\b/i);
    expect(JSON.stringify(guidance)).toContain('cap space');
    expect(guidance.pose).toBe('frustrated');

    const injuryOnly = buildWeeklyGuidance({
      outcome: 'loss',
      currentWeek: 4,
      injuryCount: 3,
    });
    expect(injuryOnly.recommended).toContain('practice-squad option');
    expect(injuryOnly.recommended).not.toContain('fallback');
    expect(injuryOnly.risk).toContain('unassigned first backup');
    expect(injuryOnly.risk).toContain('break the saved Game Plan');
    expect(injuryOnly.risk).not.toContain('break the game plan');
  });

  it('degrades to Monday Briefing when deeper context is unavailable', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'midseason',
      currentWeek: 2,
    });

    expect(guidance.topAction).toBe('Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups, cap moves, morale, and matchup calls.');
    expect(guidance.whyItMatters).toContain('injuries, backup gaps, morale drops');
    expect(guidance.whyItMatters).toContain('uncovered protection, coverage, or run-defense calls');
    expect(guidance.whyItMatters).not.toContain('wrong calls');
    expect(guidance.whyItMatters).not.toContain('mismatched calls');
    expect(guidance.whyItMatters).toContain('before Advance Week locks the next game');
    expect(guidance.deadline).toBe('Open Monday Briefing. Fix or accept any Action Center injury, backup, morale, cap, or matchup note before Advance Week.');
    expect(guidance.where).toBe('Action Center, then any legal football-ops screen: Roster, Depth Chart, Training Camp, Game Plan, Contracts, Cap Lab, Trades, Waiver Wire, Practice Squad, Free Agency, Scouting, Coaching, or Front Office.');
    expect(guidance.recommended).toContain('Open Action Center for current notes');
    expect(guidance.recommended).toContain('any legal roster, depth chart, training');
    expect(guidance.recommended).toContain('contracts');
    expect(guidance.recommended).toContain('medical move remains available');
    expect(guidance.optional).toContain('prioritize moves that change lineup, cap space, market offer, staff plan, recovery, or matchup before Advance Week');
    expect(guidance.risk).toContain('named injury, unassigned first backup, tight cap choice, or uncovered matchup call');
    expect(guidance.risk).not.toMatch(/wrong backup|wrong call/i);
    expect(guidance.risk).not.toContain('mismatched call');
    expect(guidance.risk).toContain('locked into Advance Week');
    expect(guidance.where).not.toContain('then check Roster, Depth Chart, and Game Plan before Advance Week');
    expect(guidance.where).not.toContain('only for a named injury');
    expect(guidance.recommended).not.toContain('Check injuries, backup order, cap space, and Game Plan before kickoff');
    expect(guidance.recommended).not.toContain('only when a named issue changes this week');
    expect(JSON.stringify(guidance)).not.toContain('can affect the next game');
    expect(guidance.pose).toBe('reviewing-tablet');
    expect(weeklyGuidanceToDialogueEntry(guidance)).toEqual(expect.objectContaining({
      id: 'chip.weekly.guidance.2',
      pose: 'reviewing-tablet',
      text: expect.stringContaining('Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups, cap moves, morale, and matchup calls.'),
      contextDetails: expect.arrayContaining([
        expect.stringContaining('What changed:'),
        'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups, cap moves, morale, and matchup calls.',
        expect.stringContaining('Recommended:'),
        expect.stringContaining('Optional:'),
        expect.stringContaining('Where:'),
        expect.stringContaining('Deadline:'),
        expect.stringContaining('Optional later:'),
      ]),
    }));
    expect(JSON.stringify(guidance)).not.toMatch(/read Monday Briefing before Advance Week|Read Monday Briefing first|Where: Read Monday Briefing/i);
    expect(buildWeeklyGuidance({ outcome: 'loss', currentWeek: 4, injuryCount: 3 }).deadline).toBe(
      '3 injuries need Roster, Depth Chart, or Game Plan before kickoff locks the lineup.',
    );
  });

  it('keeps generated dialogue labels useful without duplicate prefixes', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'loss',
      currentWeek: 11,
      pendingDecisionCount: 3,
    });
    const entry = weeklyGuidanceToDialogueEntry(guidance);

    expect(entry.text).toContain('Must Do: choose or defer 3 pending decisions before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock.');
    expect(entry.contextDetails).toContain('Must Do: choose or defer 3 pending decisions before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock.');
    expect(entry.contextDetails?.join(' ')).not.toMatch(/Must Do:\s*Must Do:/i);
    expect(entry.contextDetails?.join(' ')).not.toMatch(/Urgent:/i);
    expect(entry.contextDetails?.join(' ')).toContain('Deadline:');
    expect(entry.contextDetails?.join(' ')).not.toMatch(/\btriage\b/i);
    expect(entry.contextDetails?.join(' ')).toContain('Consequence: Ignored decisions expire');
    expect(entry.contextDetails?.join(' ')).toContain('cut owner patience');
    expect(entry.contextDetails?.join(' ')).toContain('lock weaker starter, backup, cap, lineup, or morale choices');
    expect(entry.contextDetails?.join(' ')).not.toContain('owner trust');
    expect(entry.contextDetails?.join(' ')).not.toContain('carry into the sim');
    expect(entry.contextDetails?.join(' ')).not.toMatch(/\bcap room\b/i);
    expect(entry.contextDetails?.join(' ')).not.toMatch(/flagged decision/i);
    expect(entry.contextDetails?.join(' ')).not.toMatch(/waiting decision screen|unanswered items|unanswered choices|change what Advance Week locks in/i);
  });

  it('surfaces postgame copy for completed-game events', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'cleanWin',
      currentWeek: 8,
      eventTrigger: 'gameComplete',
      opponentName: 'Omaha Railmen',
    });

    expect(guidance.whatChanged).toBe('Final whistle, Week 8: strong win; open Roster and Depth Chart for injury flags before changing starters.');
    expect(guidance.topAction).toBe('Must Do: open Postgame Recap before Advance Week. Where: Post-Week Command Deck, then Roster, Depth Chart, Game Plan. Consequence: next week uses unfixed injuries, morale, and matchup calls.');
    expect(guidance.whyItMatters).toContain('Final score is locked');
    expect(guidance.whyItMatters).toContain('Recap names injuries, morale swings, and matchup misses before you prep for Omaha Railmen');
    expect(guidance.recommended).toContain('Open Recap notes');
    expect(guidance.recommended).toContain('fix the Game Plan call, Depth Chart order, or roster role Recap names');
    expect(guidance.recommended).toContain('before lower-impact moves');
    expect(guidance.recommended).not.toContain('adjust only');
    expect(guidance.where).toContain('Post-Week Command Deck');
    expect(guidance.where).toContain('Roster, Depth Chart, and Game Plan');
    expect(guidance.deadline).toContain('Open Postgame Recap before Advance Week');
    expect(guidance.deadline).toContain('next week uses the injuries, morale, and matchup plan');
    expect(guidance.canWait).toContain('awards, records, and history after you fix or accept the roster role, depth-chart order, or Game Plan call Recap names');
    expect(guidance.canWait).toContain('do not change the next game');
    expect(guidance.risk).toContain('Skipping Recap leaves injuries');
    expect(guidance.risk).toContain('matchup notes unseen before the next Game Plan locks');
    expect(guidance.risk).toContain('unseen');
    expect(guidance.risk).not.toContain('Skipping the recap');
    expect(guidance.risk).not.toContain('unverified');
    expect(guidance.risk).not.toContain('can hide');
    expect(weeklyGuidanceToDialogueEntry(guidance).contextDetails?.join(' ')).toContain('Optional later: Open awards, records, and history after you fix or accept the roster role, depth-chart order, or Game Plan call Recap names');
    expect(weeklyGuidanceToDialogueEntry(guidance).contextDetails?.join(' ')).not.toContain('Later:');
  });

  it('keeps three-loss guidance explicit about owner-pressure consequences', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'threeLossStreak',
      currentWeek: 6,
      record: '1-5',
    });

    expect(guidance.risk).toContain('owner patience');
    expect(guidance.risk).toContain('morale');
    expect(guidance.risk).toContain('same lineup or plan miss');
    expect(guidance.risk).not.toContain('unprepared week');
    expect(guidance.risk).not.toContain('raises owner pressure');
    expect(guidance.risk).not.toContain('loose week');
  });

  it('uses cap-space terminology in opponent and low-cap guidance', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'midseason',
      currentWeek: 7,
      opponentName: 'Memphis Kings',
      capSpace: 4,
    });

    expect(guidance.whyItMatters).toContain('cap space');
    expect(guidance.recommended).toContain('Memphis Kings');
    expect(guidance.recommended).toContain('cap space');
    expect(guidance.recommended).toContain('Scout Memphis Kings for injuries, backup order, cap space, and matchup calls');
    expect(guidance.recommended).toContain('make any legal roster, cap, market, staff, or matchup move whose gain beats the cost');
    expect(guidance.recommended).not.toContain('team-building move');
    expect(guidance.whatChanged).toContain('open Standings, Roster, and cap space before deadline moves');
    expect(JSON.stringify(guidance)).not.toMatch(/use standings|check standings/i);
    expect(guidance.recommended).not.toMatch(/\bworth\b/i);
    expect(guidance.recommended).not.toContain('only for injuries');
    expect(guidance.risk).toContain('Cap space is tight');
    expect(guidance.risk).toContain('Contracts or Cap Lab');
    expect(guidance.risk).toContain('injury replacements, extensions, or next-offseason moves');
    expect(guidance.risk).toContain('new money blocks');
    expect(guidance.risk).not.toContain('future cap years');
    expect(JSON.stringify(guidance)).not.toMatch(/\bcap room\b/i);
  });

  it('surfaces season-ledger copy for season-end events without changing the weekly id shape', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'championship',
      currentWeek: 1,
      eventTrigger: 'seasonEnd',
      record: '14-3',
    });

    expect(guidance.id).toBe('chip.weekly.guidance.1');
    expect(guidance.whatChanged).toBe('Season closed: offseason; open Contracts and Staff for expiring starters before spending, record 14-3.');
    expect(guidance.topAction).toBe('Must Do: open Season Recap before bids. Where: Season Recap, Contracts, Staff, Cap Lab, Free Agency. Consequence: rushed bids spend cap space on unneeded roles, miss extensions, or leave staff seats empty.');
    expect(guidance.whyItMatters).toContain('Offseason spending locks fast');
    expect(guidance.whyItMatters).toContain('expiring starters, open staff seats, aging positions, and cap space');
    expect(guidance.whyItMatters).toContain('draft roles');
    expect(guidance.optional).toContain('Open awards, records, and history after Season Recap');
    expect(guidance.optional).toContain('those screens do not fix extensions, bids, or empty staff seats');
    expect(guidance.optional).not.toContain('only after');
    expect(guidance.optional).not.toContain('cosmetic screens');
    expect(guidance.recommended).toContain('Contracts, Staff, Cap Lab, and Free Agency');
    expect(guidance.recommended).toContain('expiring starters, open staff seats, aging positions, and cap space');
    expect(guidance.where).toContain('Season Recap');
    expect(guidance.where).toContain('Staff, Cap Lab, and Free Agency');
    expect(guidance.deadline).toBe('Before bidding, open Season Recap, Contracts, Staff, Cap Lab, and Free Agency; rushed bids miss extensions or leave staff seats empty.');
    expect(guidance.canWait).toContain('Open awards, records, and history after Season Recap, Contracts, Staff, Cap Lab, and the first free-agent plan');
    expect(guidance.canWait).toContain("do not change next season's roster plan");
    expect(guidance.canWait).not.toContain('shape next season');
    expect(guidance.risk).toContain('Bidding before Season Recap, Contracts, Staff, and Cap Lab decisions');
    expect(guidance.risk).toContain('wastes cap space on a veteran role the roster does not need');
    expect(guidance.risk).toContain('misses an extension');
    expect(guidance.risk).toContain('leaves a staff vacancy slowing prep');
    expect(guidance.risk).not.toContain('verifications');
    expect(guidance.risk).not.toContain('staff holes');
    expect(guidance.risk).not.toContain('can hide');
    expect(JSON.stringify(guidance)).not.toMatch(/read Season Recap|review contracts before spending|The year is closed|free-agent commitments|unchecked before free-agent spending|only after|first-bid plan are clear/i);
  });

  it('labels dark-moment guidance with an action instead of vague mood copy', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'darkMoment',
      currentWeek: 9,
    });

    expect(guidance.whatChanged).toContain('lopsided loss; open Recap before roster or Game Plan changes');
    expect(guidance.whatChanged).not.toContain('a bad night');
    expect(guidance.risk).not.toContain('stale game plan');
  });

  it('keeps generated weekly guidance free of vague screen shorthand', () => {
    const examples = [
      buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 2 }),
      buildWeeklyGuidance({ outcome: 'loss', currentWeek: 4, pendingDecisionCount: 2 }),
      buildWeeklyGuidance({ outcome: 'cleanWin', currentWeek: 8, eventTrigger: 'gameComplete', opponentName: 'Omaha Railmen' }),
      buildWeeklyGuidance({ outcome: 'championship', currentWeek: 1, eventTrigger: 'seasonEnd', record: '14-3' }),
    ];

    const copy = JSON.stringify(examples);
    expect(copy).not.toMatch(/a strong win|a win with warning signs|a blowout loss|playoff pressure|a championship reset|bad loss; review Recap|preseason setup[^;]|Monday Briefing checks before Advance Week/i);
    expect(copy).toContain('strong win; open Roster and Depth Chart for injury flags before changing starters');
    expect(buildWeeklyGuidance({ outcome: 'uglyWin', currentWeek: 5 }).whatChanged).toContain('close win; open Recap for injuries, backup order, and Game Plan miss');
    expect(copy).toContain('offseason; open Contracts and Staff for expiring starters before spending');
    expect(copy).not.toMatch(/team-building screens|cosmetic screens|safely wait|next plan locks|game-plan adjustment|roster health|depth risk|plan risks|bad depth unresolved|unchanged game plan|roster, plan/i);
    expect(copy).not.toMatch(/weekly priorities|weekly review before Advance Week|Skipping the weekly review|Skipping the review can carry|Review history and awards after|when they are legal|aging, contract, and staff pressure/i);
    expect(copy).not.toMatch(/Read the result|Review recap before preparing|Review recap before choosing prep/i);
    expect(copy).not.toMatch(/read Monday Briefing before Advance Week|Read Monday Briefing first|Read the briefing/i);
    expect(copy).not.toMatch(/open Monday Briefing and resolve Action Center|open Postgame Recap and verify injuries|route badges?|route-badge|open Season Recap, Contracts, Staff, and cap space before the first free-agent bid/i);
    expect(copy).toContain('highlighted screen badges');
    expect(copy).not.toContain('Must Do: open Inbox, Action Center, or highlighted screen badges');
    expect(copy).toContain('Must Do: choose or defer 2 pending decisions before Advance Week');
    expect(copy).not.toMatch(/yes, no, or later|decision screen flagged by the badge|future cap years/i);
    expect(copy).toContain('Roster, Depth Chart, Training Camp, Game Plan, Contracts, Cap Lab');
    expect(copy).toContain('Contracts, Staff, Cap Lab');
    expect(copy).toContain('Season Recap, Contracts, Staff, Cap Lab, Free Agency');
    expect(copy).toContain('awards, records, and history do not change');
    expect(copy).not.toContain('only after');
    expect(copy).not.toContain('can wait');
    expect(copy).not.toContain('Can wait');
    expect(copy).toContain('prioritize moves that change lineup, cap space, market offer, staff plan, recovery, or matchup');
    expect(copy).not.toMatch(/screen deadline|screen's deadline|current plan/i);
    expect(copy).not.toMatch(/warning signs|based on its warnings|weaker moves later|same matchup problem, injuries, or starter mistakes into kickoff/i);
    expect(copy).not.toMatch(/roster issue|Game Plan issue|draft need|draft needs|weaker roster/i);
    expect(copy).toContain('Action Center, then any legal football-ops screen');
    expect(copy).not.toContain('Open Monday Briefing and Action Center first');
    expect(copy).not.toMatch(/open Roster, Depth Chart, Cap Lab, or Game Plan only when a named issue changes this week|only for a named injury, backup, cap, or matchup fix/i);
    expect(copy).not.toMatch(/Open Monday Briefing, then check Roster, Depth Chart, and Game Plan before Advance Week|Check injuries, backup order, cap space, and Game Plan before kickoff/i);
    expect(copy).not.toMatch(/check injury flags|check injuries, backup order|check expiring starters|read Recap before roster|check Recap, Roster|check Action Center|check injuries, morale|unchecked/i);
    expect(copy).not.toMatch(/\b(verif(?:y|ies|ied|ication|ications)|confirm|unverified)\b/i);
    expect(copy).not.toMatch(/adjust only/i);
  });

  it('keeps every generated top action explicit about where and consequence', () => {
    const examples = [
      buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 2 }),
      buildWeeklyGuidance({ outcome: 'loss', currentWeek: 4, pendingDecisionCount: 2 }),
      buildWeeklyGuidance({ outcome: 'cleanWin', currentWeek: 8, eventTrigger: 'gameComplete' }),
      buildWeeklyGuidance({ outcome: 'championship', currentWeek: 1, eventTrigger: 'seasonEnd' }),
      buildWeeklyGuidance({ outcome: 'loss', currentWeek: 4, injuryCount: 3 }),
    ];

    for (const guidance of examples) {
      expect(guidance.topAction).toMatch(/^Must Do:/);
      expect(guidance.topAction, guidance.topAction).toContain('Where:');
      expect(guidance.topAction, guidance.topAction).toContain('Consequence:');
      expect(guidance.topAction, guidance.topAction).not.toMatch(/check|review|verify|triage|context|cap room/i);
    }
  });

  it('keeps every generated weekly dialogue text inside the bubble budget', () => {
    const examples = [
      buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 2 }),
      buildWeeklyGuidance({ outcome: 'loss', currentWeek: 4, pendingDecisionCount: 2 }),
      buildWeeklyGuidance({ outcome: 'cleanWin', currentWeek: 8, eventTrigger: 'gameComplete', opponentName: 'Omaha Railmen' }),
      buildWeeklyGuidance({ outcome: 'championship', currentWeek: 1, eventTrigger: 'seasonEnd' }),
      buildWeeklyGuidance({ outcome: 'loss', currentWeek: 4, injuryCount: 3 }),
      buildWeeklyGuidance({ outcome: 'threeLossStreak', currentWeek: 6, record: '1-5' }),
      buildWeeklyGuidance({ outcome: 'playoffs', currentWeek: 19 }),
      buildWeeklyGuidance({ outcome: 'preseason', currentWeek: 1 }),
    ];

    for (const guidance of examples) {
      const entry = weeklyGuidanceToDialogueEntry(guidance);
      expect(entry.text.length, entry.text).toBeLessThanOrEqual(MAX_CHIP_DIALOGUE_CHARS);
      expect(entry.text, entry.id).toContain('Must Do:');
      // The why survives inside the context details even when the visible
      // bubble text must be trimmed to the Must Do action.
      expect(entry.contextDetails).toContain(`Why: ${guidance.whyItMatters}`);
    }
  });

  it('composes dialogue text without truncating the Must Do action', () => {
    const shortWhy = 'Short reason.';
    expect(composeWeeklyDialogueText('Must Do: open Recap. Where: Recap. Consequence: misses repeat.', shortWhy))
      .toBe('Must Do: open Recap. Where: Recap. Consequence: misses repeat. Short reason.');

    const longAction = 'Must Do: choose or defer 2 pending decisions before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock.';
    const longWhy = 'Monday Briefing names injuries, backup gaps, morale drops, or uncovered protection, coverage, or run-defense calls before Advance Week locks the next game.';
    expect(composeWeeklyDialogueText(longAction, longWhy)).toBe(longAction);
    expect(composeWeeklyDialogueText(longAction, longWhy).length).toBeLessThanOrEqual(MAX_CHIP_DIALOGUE_CHARS);
  });

  it('attaches a deterministic sideline note and rotates it for seeded dynasties', () => {
    const unseeded = buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 2 });
    expect(unseeded.sidelineNote.length).toBeGreaterThan(0);

    const seededA = buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 2, dynastySeed: 42 });
    const seededB = buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 2, dynastySeed: 42 });
    expect(seededA.sidelineNote).toBe(seededB.sidelineNote);

    const weekRotation = new Set(
      Array.from({ length: 12 }, (_, index) =>
        buildWeeklyGuidance({ outcome: 'cleanWin', currentWeek: index + 1, dynastySeed: 42 }).sidelineNote),
    );
    expect(weekRotation.size).toBeGreaterThan(1);

    const entry = weeklyGuidanceToDialogueEntry(seededA);
    expect(entry.contextDetails?.some((detail) => detail.startsWith('Sideline note: '))).toBe(true);
    expect(entry.contextDetails?.some((detail) => detail.endsWith(seededA.sidelineNote))).toBe(true);
  });

  it('ties the tight-cap risk threshold to difficulty', () => {
    const legendTight = buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 7, capSpace: 9, difficulty: 'legend' });
    expect(legendTight.risk).toContain('Cap space is tight');

    const rookieComfortable = buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 7, capSpace: 9, difficulty: 'rookie' });
    expect(rookieComfortable.risk).not.toContain('Cap space is tight');

    const legendComfortable = buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 7, capSpace: 20, difficulty: 'legend' });
    expect(legendComfortable.risk).toContain('Higher difficulty punishes');

    const standardTight = buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 7, capSpace: 6 });
    expect(standardTight.risk).toContain('Cap space is tight');
  });

  it('acknowledges repeat outcomes with a continuity detail after two straight weeks', () => {
    const skid = buildWeeklyGuidance({ outcome: 'loss', currentWeek: 6, consecutiveOutcomeWeeks: 3 });
    expect(skid.continuityNote).toContain('3 straight weeks on the wrong side of the table');
    const skidEntry = weeklyGuidanceToDialogueEntry(skid);
    expect(skidEntry.contextDetails?.some((detail) => detail.startsWith('Continuity: '))).toBe(true);

    const heater = buildWeeklyGuidance({ outcome: 'cleanWin', currentWeek: 8, consecutiveOutcomeWeeks: 4 });
    expect(heater.continuityNote).toContain('4 straight weeks in the win column');

    const steady = buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 8, consecutiveOutcomeWeeks: 2 });
    expect(steady.continuityNote).toContain('2 straight weeks with the same assignment');

    const fresh = buildWeeklyGuidance({ outcome: 'loss', currentWeek: 6, consecutiveOutcomeWeeks: 1 });
    expect(fresh.continuityNote).toBeUndefined();
    expect(weeklyGuidanceToDialogueEntry(fresh).contextDetails?.some((detail) => detail.startsWith('Continuity: '))).toBe(false);

    const unknown = buildWeeklyGuidance({ outcome: 'loss', currentWeek: 6 });
    expect(unknown.continuityNote).toBeUndefined();
  });

  it('keeps the canonical generic recommended/optional lines byte-identical for unseeded callers (B3)', () => {
    const guidance = buildWeeklyGuidance({ outcome: 'midseason', currentWeek: 7 });
    expect(guidance.recommended).toBe(GENERIC_RECOMMENDED_LINES[0]);
    expect(guidance.optional).toBe(GENERIC_OPTIONAL_LINES[0]);
    expect(GENERIC_RECOMMENDED_LINES[0]).toContain('Open Action Center for current notes');
    expect(GENERIC_OPTIONAL_LINES[0]).toContain('Make any legal roster, depth chart, training');
  });

  it('rotates generic recommended/optional lines deterministically for seeded dynasties (B3)', () => {
    const seenRecommended = new Set<string>();
    const seenOptional = new Set<string>();
    for (let week = 1; week <= 18; week += 1) {
      const input = { outcome: 'midseason' as const, currentWeek: week, dynastySeed: 42 };
      const first = buildWeeklyGuidance(input);
      const replay = buildWeeklyGuidance(input);
      expect(replay.recommended).toBe(first.recommended);
      expect(replay.optional).toBe(first.optional);
      expect(GENERIC_RECOMMENDED_LINES).toContain(first.recommended);
      expect(GENERIC_OPTIONAL_LINES).toContain(first.optional);
      seenRecommended.add(first.recommended);
      seenOptional.add(first.optional);
    }
    expect(seenRecommended.size).toBeGreaterThan(1);
    expect(seenOptional.size).toBeGreaterThan(1);
  });

  it('threads morale and owner patience into the sideline note (A5)', () => {
    const hurting = buildWeeklyGuidance({
      outcome: 'cleanWin',
      currentWeek: 5,
      dynastySeed: 42,
      averageMorale: 30,
    });
    expect(hurting.sidelineNote).toMatch(
      /The room is hurting; steady it\.|Protect the room first\.|Heads are down; lift the room\./,
    );
    const healthy = buildWeeklyGuidance({
      outcome: 'cleanWin',
      currentWeek: 5,
      dynastySeed: 42,
      averageMorale: 80,
      ownerPatience: 90,
    });
    expect(healthy.sidelineNote).not.toMatch(
      /The room is hurting; steady it\.|Protect the room first\.|Heads are down; lift the room\./,
    );
    expect(healthy.sidelineNote).not.toMatch(
      /Upstairs patience is thin\.|The owner wants answers\.|Patience upstairs runs short\./,
    );
  });
});

describe('B5 avoidFlavorLine passthrough', () => {
  it('rotates the sideline note when the remembered line would repeat', () => {
    // Scan for a week whose deterministic pick comes from the pool (not an
    // easter egg), then pass that served line back as the one to avoid.
    for (let week = 1; week <= 18; week += 1) {
      const base = buildWeeklyGuidance({ outcome: 'loss', currentWeek: week, dynastySeed: 42 });
      const avoided = buildWeeklyGuidance({
        outcome: 'loss',
        currentWeek: week,
        dynastySeed: 42,
        avoidFlavorLine: base.sidelineNote,
      });
      if (avoided.sidelineNote === base.sidelineNote) continue; // easter-egg week
      // The rotation only changes the pool line; guidance structure is intact.
      expect(avoided.topAction).toBe(base.topAction);
      expect(avoided.whyItMatters).toBe(base.whyItMatters);
      return;
    }
    throw new Error('expected a non-easter-egg week in the scan');
  });

  it('keeps the deterministic note when nothing is remembered', () => {
    const base = buildWeeklyGuidance({ outcome: 'cleanWin', currentWeek: 9, dynastySeed: 42 });
    const same = buildWeeklyGuidance({ outcome: 'cleanWin', currentWeek: 9, dynastySeed: 42, avoidFlavorLine: undefined });
    expect(same.sidelineNote).toBe(base.sidelineNote);
  });
});
