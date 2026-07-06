import { describe, expect, it } from 'vitest';
import {
  buildDecisionImpactExplanation,
  decisionImpactToConsequenceItems,
} from './decisionImpact';

describe('decision impact explanations', () => {
  it('frames week advance risk across immediate, season, future, and uncertainty windows', () => {
    const impact = buildDecisionImpactExplanation({
      surface: 'week-advance',
      label: 'Week advance',
      issueCount: 2,
      difficulty: 'legend',
    });

    expect(impact.severity).toBe('high');
    expect(impact.immediateImpact).toContain('Must Do: fix 2 listed Advance Week items');
    expect(impact.immediateImpact).toContain('before Advance Week or choose to accept each one');
    expect(impact.immediateImpact).toContain('next game uses the saved injury status, first backups, cap choices, and matchup calls');
    expect(impact.immediateImpact).not.toMatch(/listed Advance Week issues?|unresolved issues/i);
    expect(impact.immediateImpact).not.toMatch(/readiness issues?/i);
    expect(impact.immediateImpact).not.toContain('accept them before Advance Week');
    expect(impact.immediateImpact).not.toContain('travel straight into Sunday');
    expect(impact.thisSeasonImpact).toContain('After Advance Week');
    expect(impact.thisSeasonImpact).toContain('injury reports');
    expect(impact.thisSeasonImpact).not.toContain('injury fallout');
    expect(impact.futureImpact).toContain('listed items unchanged');
    expect(impact.futureImpact).toContain('injury-report chances, morale loss, standings damage');
    expect(impact.futureImpact).toContain('lower owner patience');
    expect(impact.futureImpact).not.toMatch(/unresolved issues/i);
    expect(impact.futureImpact).not.toContain('owner pressure');
    expect(impact.futureImpact).not.toContain('Dead-cap pressure');
    expect(impact.risk).toContain('Higher difficulty makes injuries, morale swings, and matchup misses less forgiving');
    expect(impact.risk).toContain('Roster, Depth Chart, Contracts, or Game Plan before locking the week');
    expect(impact.risk).toContain('injury flag, unassigned first backup, tight cap choice, or uncovered matchup call');
    expect(impact.risk).not.toMatch(/wrong first backup|wrong call/i);
    expect(impact.risk).toContain('saved game result');
    expect(impact.risk).not.toContain('hidden injuries');
    expect(impact.risk).not.toContain('bad matchup plan');
    expect(impact.risk).not.toContain('Injuries, morale, and matchup results');
    expect(impact.risk).not.toContain('stay open until Advance Week');
    expect(impact.risk).not.toContain('sim resolves');
    expect(impact.risk).not.toContain('not final until Advance Week plays the game');
    expect(decisionImpactToConsequenceItems(impact).map((item) => item.label)).toEqual([
      'Now',
      'This season',
      'Future',
      'If ignored',
    ]);
  });

  it('keeps clean week advance and roster copy concrete instead of using filler metaphors', () => {
    const cleanAdvance = buildDecisionImpactExplanation({
      surface: 'week-advance',
      label: 'Week advance',
      issueCount: 0,
    });
    const roster = buildDecisionImpactExplanation({
      surface: 'roster',
      label: 'Roster',
    });

    expect(cleanAdvance.immediateImpact).toContain('Must Do: none right now.');
    expect(cleanAdvance.immediateImpact).toContain('Recommended: open Monday Briefing.');
    expect(cleanAdvance.immediateImpact).toContain('Where: Action Center, then any legal team screen');
    expect(cleanAdvance.immediateImpact).toContain('roster, depth chart, training, Game Plan, contracts, Cap Lab, trades, waivers, practice squad, free agency, scouting, coaching, facility, or medical');
    expect(cleanAdvance.immediateImpact).toContain('Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls');
    expect(cleanAdvance.immediateImpact).not.toContain('Recommended: open Monday Briefing first');
    expect(cleanAdvance.immediateImpact).not.toContain('cap changes');
    expect(cleanAdvance.immediateImpact).not.toContain('Recommended: use Monday Briefing first');
    expect(cleanAdvance.immediateImpact).not.toContain('Check injuries, backups, and Game Plan');
    expect(cleanAdvance.immediateImpact).not.toContain('only if injuries, backup order, cap space, or matchup calls need a change');
    expect(cleanAdvance.immediateImpact).not.toContain('only if you accept any remaining next-game risk');
    expect(cleanAdvance.immediateImpact).not.toContain('can wait');
    expect(cleanAdvance.immediateImpact).not.toContain('No readiness issue is flagged');
    expect(cleanAdvance.immediateImpact).not.toContain('No required issue is flagged');
    expect(roster.immediateImpact).toContain('Recommended: open Roster and Depth Chart before Advance Week');
    expect(roster.immediateImpact).toContain('if injuries, fatigue, or roles changed');
    expect(roster.immediateImpact).not.toContain('verify starters');
    expect(roster.immediateImpact).not.toContain('game snaps');
    expect(roster.immediateImpact).not.toContain('real snaps');
    expect(roster.thisSeasonImpact).toContain('Backup groups with too few playable players');
    expect([
      cleanAdvance.immediateImpact,
      cleanAdvance.futureImpact,
      roster.thisSeasonImpact,
      roster.futureImpact,
      roster.risk,
    ].join(' ')).not.toMatch(/desk fires|thin rooms|Readiness is clean|normal matchup risk|acquisition window|ratings screen can hide|role clusters/i);
    expect(roster.futureImpact).toContain('Aging starters, expiring contracts, and crowded roles');
    expect(roster.futureImpact).toContain('which draft, trade, or free-agent move is needed next');
    expect(roster.risk).toContain('If opponent protection, coverage, or first-backup order is missing');
    expect(roster.risk).toContain('next game exposes an uncovered backup job after Advance Week');
    expect(roster.risk).not.toContain('thin depth');
    expect(roster.risk).not.toContain('matchup help');
    expect(roster.risk).not.toContain('Sunday exposes it');
  });

  it('uses trade-specific consequence language', () => {
    const impact = buildDecisionImpactExplanation({
      surface: 'trade',
      label: 'Trade package',
      outgoingAssets: 2,
      incomingAssets: 1,
      valueDelta: -4,
    });

    expect(impact.immediateImpact).toContain('This posts now: send 2 assets');
    expect(impact.thisSeasonImpact).toContain('Depth chart order');
    expect(impact.thisSeasonImpact).toContain('morale');
    expect(impact.immediateImpact).toContain('then open Depth Chart before Advance Week');
    expect(impact.thisSeasonImpact).toContain('set the lineup before Advance Week');
    expect(impact.thisSeasonImpact).not.toContain('verify the lineup before Advance Week');
    expect(impact.thisSeasonImpact).not.toContain('chemistry');
    expect(impact.thisSeasonImpact).not.toContain('ratings screen explains');
    expect(impact.futureImpact).toContain('Lost picks');
    expect(impact.futureImpact).toContain('extensions');
    expect(impact.futureImpact).not.toContain('future roster-building decisions');
    expect(impact.risk).toContain('Pay that price for a starter or first-backup deadline fix');
    expect(impact.risk).toContain('otherwise keep the picks, players, and cap space');
    expect(impact.risk).not.toMatch(/high price needs|hold the assets/i);
    expect(impact.risk).not.toMatch(/market|roster hole|new hole/i);
    expect(impact.risk).not.toMatch(/accept only when|only if|only when/i);

    const discountedImpact = buildDecisionImpactExplanation({
      surface: 'trade',
      label: 'Discounted trade',
      outgoingAssets: 1,
      incomingAssets: 1,
      valueDelta: 2,
    });
    expect(discountedImpact.risk).toContain('even a discounted trade removes depth from another backup group');
    expect(discountedImpact.risk).not.toMatch(/discounted trade weakens/i);
    expect(discountedImpact.risk).not.toContain('discounted trade can weaken');
  });

  it('uses concrete cap-space language for Cap Lab consequences', () => {
    const impact = buildDecisionImpactExplanation({
      surface: 'cap-lab',
      label: 'Cap Lab batch',
      queuedMoves: 2,
      netCapChange: 6.5,
    });

    expect(impact.immediateImpact).toContain("today's cap space");
    expect(impact.immediateImpact).toContain('when applied');
    expect(impact.immediateImpact).not.toContain('when confirmed');
    expect(impact.immediateImpact).not.toContain("today's room");
    expect(impact.immediateImpact).not.toContain('cap ledger');
    expect(impact.thisSeasonImpact).toContain('injury replacements');
    expect(impact.thisSeasonImpact).toContain('late-season roster fixes');
    expect(impact.thisSeasonImpact).not.toMatch(/\bcap room\b/i);
    expect(impact.futureImpact).toContain("next spring's extensions");
    expect(impact.futureImpact).toContain('free agents');
    expect(impact.risk).toContain('If the cap space does not protect a starter, first backup, injury replacement, or extension before Advance Week');
    expect(impact.risk).toContain('leave the preview unapplied');
    expect(impact.risk).not.toMatch(/does not solve a roster, injury, or extension need/i);
    expect(impact.risk).not.toContain('leave the preview unconfirmed');
    expect(impact.risk).not.toContain('sandbox lowers risk');

    const emptyImpact = buildDecisionImpactExplanation({
      surface: 'cap-lab',
      label: 'Cap Lab batch',
    });
    expect(emptyImpact.immediateImpact).toContain('saved roster or cap space');
    expect(emptyImpact.immediateImpact).not.toContain('cap ledger');
  });

  it('points game-plan consequences at the week-advance decision instead of sim shorthand', () => {
    const impact = buildDecisionImpactExplanation({
      surface: 'game-plan',
      label: 'Game Plan',
    });

    expect(impact.immediateImpact).toContain("Recommended: set this week's offensive approach");
    expect(impact.immediateImpact).toContain('before Advance Week if the matchup changed');
    expect(impact.immediateImpact).not.toContain('next sim');
    expect(impact.futureImpact).toContain('protection');
    expect(impact.futureImpact).toContain('coverage depth');
    expect(impact.futureImpact).toContain('a fix aimed at the unused cause wastes roster moves or practice reps');
    expect(impact.thisSeasonImpact).toContain('preventable losses');
    expect(impact.thisSeasonImpact).not.toContain('pattern losses');
    expect(impact.futureImpact).not.toContain('which roster fixes matter');
    expect(impact.futureImpact).not.toContain('traits are missing');
    expect(impact.futureImpact).not.toContain('Repeated misses identify the fix');
    expect(impact.futureImpact).not.toContain('guessing wrong');
    expect(impact.futureImpact).not.toMatch(/identity/i);
    expect(impact.risk).toContain('If the plan does not answer the opponent pass rush, coverage stress, run game, and your available starters');
    expect(impact.risk).toContain('missed protection turns into sacks');
    expect(impact.risk).toContain('uncovered receivers get easy throws');
    expect(impact.risk).toContain('backup snaps arrive without help');
    expect(impact.risk).not.toMatch(/opponent strengths|current starters do not match the plan|backup plans get exposed/i);
    expect(impact.risk).not.toContain('bad protection');
    expect(impact.risk).not.toContain('roster fit');
    expect(impact.risk).not.toContain('weak starters or backups');
    expect(impact.risk).not.toContain('variance');
  });
});
