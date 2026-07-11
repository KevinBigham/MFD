import { describe, expect, it } from 'vitest';
import {
  buildWeeklyGuidance,
  weeklyGuidanceToDialogueEntry,
} from './weeklyGuidance';

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
    expect(guidance.where).toBe('Action Center, then any legal football-ops screen: Roster, Depth Chart, Training, Game Plan, Contracts, Cap Lab, Trades, Waivers, Practice Squad, Free Agency, Scouting, Coaching, Facility, or Medical.');
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

  it('surfaces a weekly memory callback in dialogue text and details', () => {
    const guidance = buildWeeklyGuidance({
      outcome: 'midseason',
      currentWeek: 7,
      memoryCallbacks: ['2 seasons ago: The Fog Bowl. Your defense survived the last drive.'],
    });
    const entry = weeklyGuidanceToDialogueEntry(guidance);

    expect(guidance.memoryCallbacks).toEqual([
      '2 seasons ago: The Fog Bowl. Your defense survived the last drive.',
    ]);
    expect(entry.text).toContain('2 seasons ago: The Fog Bowl');
    expect(entry.contextDetails).toContain('Memory: 2 seasons ago: The Fog Bowl. Your defense survived the last drive.');
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
    expect(copy).toContain('Roster, Depth Chart, Training, Game Plan, Contracts, Cap Lab');
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
});
