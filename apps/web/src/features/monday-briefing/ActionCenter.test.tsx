import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { mulberry32, startScenario } from '@mfd/engine';
import { createSeedGameState } from '../../app/store/seed';
import { ActionCenter } from './ActionCenter';

// The weekly board's copy now lives in two places: presentation and AGM wording
// stay in the component, task copy moved to the canonical ledger (WP-09a). The
// copy guards below apply to both, so an extraction cannot smuggle a reword past
// them.
const source = [
  readFileSync(new URL('./ActionCenter.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../../ui/tasks/task-ledger.ts', import.meta.url), 'utf8'),
].join('\n');
const RESTRICTIVE_ACTION_CENTER_COPY =
  /\b(?:open|use|worth using)\b[^.!?;]*(?:only if|only when)\b|Required only when|Optional (?:before Advance Week )?unless|unresolved roles may expose backups|You can click Advance Week anyway|Offers can expire|can cut owner patience|changes can alter/i;

/**
 * The accent a card actually renders with.
 *
 * WP-09a replaced per-item accent literals with a severity -> accent mapping in
 * the component. Nothing else in the suite fails if a ledger severity flips, so
 * this reads the colour straight off the rendered card that contains the given
 * "What" text.
 */
function renderedAccent(html: string, whatText: string): string | null {
  const at = html.indexOf(whatText);
  if (at < 0) return null;
  const borders = [...html.slice(0, at).matchAll(/border:1px solid var\(--mfd-([a-z-]+)\)/g)];
  return borders.at(-1)?.[1] ?? null;
}

describe('ActionCenter', () => {
  it('renders game plan needed action during regular season', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={false}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    expect(html).toContain('Set your game plan');
    expect(html).toContain('Must Do');
    expect(html).toContain('Advance Week sends you to Game Plan until a prep plan is saved for this matchup.');
  });

  it('renders ready to advance when all clear', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    expect(html).toContain('Ready for Advance Week');
    expect(html).toContain('Must Do: none right now.');
    expect(html).toContain('Optional');
    expect(html).toContain('Advance Week is available. Make roster, depth, cap, market, staff, or matchup changes before Advance Week, offer expiration, or phase rules lock them.');
    expect(html).toContain('Optional roster, cap, staff, and matchup moves');
    expect(html).not.toContain('Extra team-building moves');
  });

  it('renders trade offer action', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={3}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    expect(html).toContain('3 pending trade offers');
  });

  it('renders depth chart warning when starters < 22', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={15}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    expect(html).toContain('15/22 starters');
  });

  it('maps every ledger severity onto the accent the card has always rendered', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={false}
        starterCount={15}
        tradeOfferCount={2}
        ownerApproval={30}
        injuredCount={4}
      />,
    );

    expect(renderedAccent(html, 'Set your game plan')).toBe('red');
    expect(renderedAccent(html, 'Fill depth chart (15/22 starters)')).toBe('gold');
    expect(renderedAccent(html, '2 pending trade offers')).toBe('gold');
    expect(renderedAccent(html, 'Owner patience is dropping')).toBe('red');
    // The Recommended lane shows three; injuries are fourth in ledger order and
    // are cut. That slice is legacy behaviour and is pinned here on purpose.
    expect(renderedAccent(html, '4 injured players')).toBeNull();
    expect(renderedAccent(html, 'Roster, weekly training, and medical roster calls')).toBe('cyan');
    expect(renderedAccent(html, 'Tune game-plan and prep changes')).toBe('gold');
    expect(renderedAccent(html, 'Save slot and backup export')).toBe('green');
  });

  it('renders the all-clear card green and the blocked panel red', () => {
    const clear = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    const blocked = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={false}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );

    expect(renderedAccent(clear, 'Ready for Advance Week')).toBe('green');
    expect(renderedAccent(blocked, 'Set your game plan')).toBe('red');
  });

  it('separates the living week plan into must do, recommended, and optional lanes', () => {
    const game = createSeedGameState(42, 0, 'pro');

    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={false}
        starterCount={15}
        tradeOfferCount={2}
        ownerApproval={42}
        injuredCount={1}
        game={game}
      />,
    );

    expect(html).toContain('Living week action plan');
    expect(html).toContain('Must Do');
    expect(html).toContain('Recommended');
    expect(html).toContain('Optional');
    expect(html).toContain('What');
    expect(html).toContain('Why');
    expect(html).toContain('Consequence / deadline');
    expect(html).toContain('Where');
    expect(html).toContain('Stops or redirects Advance Week: injuries, missing starters, expiring offers, promises, or phase rules.');
    expect(html).toContain('Open alerts for injuries, cap, depth, owner patience, job security, and matchup calls before Advance Week locks the next game.');
    expect(html).toContain('Open injury, cap, depth, or matchup fixes before Advance Week');
    expect(html).toContain('Show AGM advice');
    expect(html).not.toContain('What should I do?');
    expect(html).toContain('Prioritize roster, depth, cap, market, staff, and backup choices that alter lineup, cap, offer, staff plan, or matchup before Advance Week.');
    expect(source).toContain('Recommended before Advance Week for lineup, cap space, or matchup changes.');
    expect(source).not.toMatch(RESTRICTIVE_ACTION_CENTER_COPY);
    expect(source).not.toContain('What should I do?');
    expect(source).not.toContain("review this if it changes this week's lineup");
    expect(source).not.toContain('Open alerts that can change injuries');
    expect(html).toContain('Recommended names choices to fix or accept');
    expect(html).toContain('Optional shows legal roster, depth, cap, market, staff, and backup moves');
    expect(html).toContain('Make those changes before Advance Week, offer expiration, market windows, or phase rules lock them.');
    expect(html).not.toContain('Extra team-building moves');
    expect(html).toContain('Any legal roster, depth-chart, training, game-plan, cap, trade, waiver, practice-squad, free-agency, scouting, coaching, facility, or medical change remains available');
    expect(html).toContain('from its normal screen until Advance Week, offer expiration, market window, or phase rule locks that action');
    expect(html).toContain('Roster, weekly training, and medical roster calls');
    expect(html).toContain('Set starter and reserve order before Advance Week');
    expect(html).toContain('the next game uses the saved depth chart when you press Advance Week');
    expect(html).toContain('Prioritize role changes that fix the current lineup, injury return, or training plan before those choices lock.');
    expect(html).toContain('applied moves immediately change dead money, cap space, and extension money');
    expect(html).not.toContain('confirmed moves immediately change dead money, cap space, and extension money');
    expect(html).not.toContain('Verify roster status');
    expect(html).toContain('Trades, trade block, waiver, practice-squad, and free-agency paths');
    expect(html).toContain('after immediate injuries, depth, cap, or matchup calls are covered');
    expect(html).toContain('Staff, facility, or medical changes alter scouting reports, player growth, or injury recovery after the week advances.');
    expect(source).not.toContain('matchup risk');
    expect(source).not.toMatch(/Optional moves matter when|It matters when|Prioritize those moves when|when it changes/i);
    expect(html).toContain('Save slot and backup export');
    expect(html).toContain('before irreversible trades, cuts, imports, or multi-week advances');
    expect(html).toContain('Skipping it leaves no restore point before irreversible trades, cuts, imports, or multi-week advances.');
    expect(html).toContain('multi-week advances');
    expect(html).not.toContain('Optional, but useful');
    expect(source).not.toMatch(/Recommended names risks|clean backup|Use scouting, coaching/i);
    expect(html).not.toMatch(/next sim|long sim runs|Legal freedom remains|Extra team-building moves|optional team-building routes are still open|longer-horizon team-building|trying risky team-building moves/i);
  });

  it('refreshes must-do required items from current props instead of saved checklist state', () => {
    const blockedHtml = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={false}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );
    const clearHtml = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
      />,
    );

    expect(blockedHtml).toContain('1 required item');
    expect(blockedHtml).toContain('Set your game plan');
    expect(clearHtml).toContain('0 required items');
    expect(clearHtml).not.toContain('Set your game plan');
    expect(clearHtml).toContain('Ready for Advance Week');
  });

  it('offers explicit close controls and hides cards already closed this week', () => {
    const game = createSeedGameState(42, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const openHtml = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={false}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
        game={game}
        onCloseAction={() => undefined}
      />,
    );
    expect(openHtml).toContain('aria-label="Close Set your game plan"');

    game.leagueEvents ??= [];
    game.leagueEvents.push({
      id: `action-center-closed:${game.year}:${game.week}:${userTeam.id}:must-game-plan`,
      seasonWeek: { year: game.year, week: game.week },
      type: 'legacy',
      actors: { teamIds: [userTeam.id], playerIds: [], staffIds: [] },
      payload: {
        source: 'action_center.closed',
        cardId: 'must-0-/game-plan',
        lane: 'must_do',
        label: 'Set your game plan',
        route: '/game-plan',
      },
      causeIds: [],
    });
    const closedHtml = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={false}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
        game={game}
        onCloseAction={() => undefined}
      />,
    );
    expect(closedHtml).not.toContain('aria-label="Close Set your game plan"');
    expect(closedHtml).toContain('0 required items');
  });

  it('renders active scenario locks in the command queue without changing actions', () => {
    const baseGame = createSeedGameState(42, 0, 'pro');
    const game = startScenario('the_savant', baseGame, mulberry32(99));

    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
        game={game}
      />,
    );

    expect(html).toContain('Scenario locks active');
    expect(html).toContain('TRADE ACTIONS');
    expect(html).toContain('OFFSEASON FREE AGENCY');
    expect(html).toContain('Trade, deadline, and draft-day trade attempts will not take effect.');
    expect(html).toContain('Bids, street signings, waiver claims, and practice-squad adds will not take effect.');
    expect(html).toContain('Buttons still open those screens');
    expect(html).toContain('Open Guide');
    expect(html).toContain('Ready for Advance Week');
    expect(html).not.toContain('right room');
  });

  it('keeps living-week guidance plain and consequence focused', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={1}
        ownerApproval={80}
        injuredCount={0}
      />,
    );

    expect(html).toContain('Offers expire or get more expensive');
    expect(html).toContain('Must Do stops or redirects Advance Week');
    expect(html).toContain('Recommended names choices to fix or accept');
    expect(html).toContain('Optional shows legal roster, depth, cap, market, staff, and backup moves');
    expect(html).toContain('Make those changes before Advance Week, offer expiration, market windows, or phase rules lock them.');
    expect(html).toContain('Advance Week is available. Make roster, depth, cap, market, staff, or matchup changes before Advance Week, offer expiration, or phase rules lock them.');
    expect(source).not.toMatch(/job pressure|owner pressure|screen deadline|screen's deadline|current plan|before that screen/i);
    expect(source).not.toMatch(/Extra team-building moves|optional team-building routes are still open|no required concern|Review optional team-building|Review top recommendations|Review risks from current alerts|AGM concern blocks|still open before you click it|longer-horizon team-building|trying risky team-building moves|Optional lists roster/i);
    expect(source).not.toMatch(/before their deadline|their deadline locks/i);
    expect(source).not.toMatch(/Optional moves matter when|It matters when|Prioritize those moves when|when it changes/i);
    expect(source).toContain('Optional: handle lineup, cap space, market offer, staff plan, or matchup changes before Advance Week, offer expiration, market windows, or phase rules lock them.');
    expect(source).not.toMatch(/'URGENT'|'HIGH'|'MEDIUM'|'LOW'/);
    expect(source).toContain("urgent: 'Recommended'");
    expect(source).toContain('Advance Week remains available when no Must Do item stops it.');
    expect(source).toContain('Advance Week remains available, but unresolved roles expose backups or delay IR decisions.');
    expect(html).not.toMatch(/lose leverage|weekly board|right room|above the line|selectors|each render|uncommitted|commit button|owning screens|hard Advance Week block|advance blocker|true Advance Week blockers|true blockers|No true blocker|No required action is stopping/i);
  });

  it('keeps the empty AGM recommendation modal specific about optional action timing', () => {
    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
        game={createSeedGameState(42, 0, 'pro')}
      />,
    );

    expect(source).toContain('No AGM alert needs action before Advance Week.');
    expect(source).toContain('Prioritize optional roster, depth, cap, market, or staff moves before Advance Week, offer expiration, or a phase rule locks them.');
    expect(html).toContain('Open injury, cap, depth, or matchup fixes before Advance Week');
    expect(source).not.toMatch(/No required AGM concern blocks Advance Week|Review top recommendations before Advance Week/i);
  });

  it('renders a saved post-week result from the shared command-deck helper', () => {
    const game = createSeedGameState(42, 0, 'pro');
    const userTeamId = Object.values(game.teams).find((team) => team.isUser)?.id ?? 'afce1';
    game.weekSummaries.push({
      id: 'weekly-2028-7-afce1',
      year: 2028,
      week: 7,
      phase: 'regular_season',
      teamId: userTeamId,
      opponentTeamId: 'nfcn1',
      opponentName: 'Detroit Motors',
      result: 'loss',
      teamScore: 17,
      opponentScore: 24,
      record: '4-3',
      headline: 'Chicago Blaze drop division game',
      ownerDelta: -3,
      injuries: [{ playerId: 'qb-1', playerName: 'Jay Stone', severity: 'out', gamesOut: 2, type: 'ankle_sprain' }],
      mvpPlayerId: null,
      notes: ['Red-zone stalls kept the game within reach but never flipped it.'],
    });

    const html = renderToStaticMarkup(
      <ActionCenter
        phase="regular_season"
        hasGamePlan={true}
        starterCount={22}
        tradeOfferCount={0}
        ownerApproval={80}
        injuredCount={0}
        game={game}
      />,
    );

    expect(html).toContain('Last week result');
    expect(html).toContain('CHICAGO BLAZE DROP DIVISION GAME');
    expect(html).toContain('4-3');
    expect(html).toContain('17-24');
    expect(html).toContain('Depth Chart');
    expect(html).toContain('Set first backups before Advance Week; injured starters put an unassigned player on the field.');
    expect(html).toContain('This result is already saved.');
    expect(html).toContain('does not click Advance Week, create new media, or edit reports');
    expect(html).not.toMatch(/advance the week|change media/i);
    expect(html).toContain('Open Advance Week');
  });
});
