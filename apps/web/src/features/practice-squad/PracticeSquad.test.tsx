import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PracticeSquad, PracticeSquadActionReceiptPanel, buildPracticeSquadActionReceipt } from './PracticeSquad';

function createMockState() {
  return {
    userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze', capSpace: 11.2 },
    userTeamId: 'team-1',
    scenarioState: null as any,
    practiceSquadLimit: 16,
    practiceSquad: [
      { playerId: 'ps-1', elevationsUsed: 3, maxElevations: 3, isElevated: false },
      { playerId: 'ps-2', elevationsUsed: 1, maxElevations: 3, isElevated: false },
    ],
    practiceSquadRows: [
      {
        playerId: 'ps-1',
        name: 'Jay Reed',
        pos: 'WR',
        ovr: 68,
        age: 23,
        elevationsUsed: 3,
        maxElevations: 3,
        isElevated: false,
        canElevate: false,
        statusLabel: 'Elevation maxed',
      },
      {
        playerId: 'ps-2',
        name: 'Luke Vale',
        pos: 'LB',
        ovr: 66,
        age: 24,
        elevationsUsed: 1,
        maxElevations: 3,
        isElevated: false,
        canElevate: true,
        statusLabel: 'Practice squad',
      },
    ],
    roster: [
      { id: 'ps-1', name: 'Jay Reed', pos: 'WR', ovr: 68, age: 23, ratings: { speed: 88 } },
      { id: 'ps-2', name: 'Luke Vale', pos: 'LB', ovr: 66, age: 24, ratings: { speed: 77 } },
    ],
    practiceSquadCandidates: [
      {
        id: 'fa-1',
        name: 'Drew Moss',
        pos: 'WR',
        ovr: 64,
        age: 22,
        source: 'free_agent',
        availability: 'eligible',
        canAdd: true,
        actionLabel: 'Add',
        statusLabel: 'Practice-squad eligible',
        helpText: 'Available now from the free-agent pool.',
      },
      {
        id: 'waiver-1',
        name: 'Cole Penn',
        pos: 'CB',
        ovr: 63,
        age: 24,
        source: 'waiver',
        availability: 'blocked_on_waivers',
        canAdd: false,
        actionLabel: 'Waiver Hold',
        statusLabel: 'Blocked on waivers',
        helpText: 'Submit a waiver claim or wait for clearance before adding.',
      },
    ],
    actions: {
      elevatePSPlayer: () => Promise.resolve(),
      releasePSPlayer: () => Promise.resolve(),
      addToPracticeSquad: () => Promise.resolve(),
    },
  };
}

let mockState = createMockState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectScenarioState: (state: typeof mockState) => state.scenarioState,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
  selectPracticeSquad: (state: typeof mockState) => state.practiceSquad,
  selectPracticeSquadLimit: (state: typeof mockState) => state.practiceSquadLimit,
  selectRoster: (state: typeof mockState) => state.roster,
  selectPracticeSquadRows: (state: typeof mockState) => state.practiceSquadRows,
  selectPracticeSquadCandidates: (state: typeof mockState) => state.practiceSquadCandidates,
}));

describe('PracticeSquad', () => {
  beforeEach(() => {
    mockState = createMockState();
  });

  it('renders squad slots, elevation usage, and available additions', () => {
    const markup = renderToStaticMarkup(<PracticeSquad />);

    expect(markup).toContain('PRACTICE SQUAD');
    expect(markup).toContain('Jay Reed');
    expect(markup).toContain('3 / 3');
    expect(markup).toContain('Elevation maxed');
    expect(markup).toContain('Drew Moss');
    expect(markup).toContain('Practice-squad eligible');
    expect(markup).toContain('Cole Penn');
    expect(markup).toContain('Blocked on waivers');
    expect(markup).toContain('Waiver Hold');
    expect(markup).toContain('16 SLOT GRID');
    expect(markup).not.toContain('PRACTICE SQUAD ACTION RECEIPT');
  });

  it('renders the configured practice squad limit instead of a fixed 16-slot grid', () => {
    mockState.practiceSquadLimit = 12;

    const markup = renderToStaticMarkup(<PracticeSquad />);

    expect(markup).toContain('2/12');
    expect(markup).toContain('12 SLOT GRID');
    expect(markup).toContain('Slot 12');
    expect(markup).not.toContain('Slot 13');
  });

  it('renders scenario lock guidance when free-agent acquisitions block practice-squad adds', () => {
    mockState.scenarioState = {
      activeScenario: {
        id: 'savant',
        name: 'The Savant',
        constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: false },
      },
    };

    const markup = renderToStaticMarkup(<PracticeSquad />);

    expect(markup).toContain('SCENARIO LOCK');
    expect(markup).toContain('The Savant');
    expect(markup).toContain('PRACTICE-SQUAD ADDS BLOCKED');
    expect(markup).toContain('Add buttons are disabled here');
    expect(markup).toContain('Existing practice-squad releases and elevations remain roster-management actions.');
    expect(markup).toContain('saved scenarioState.activeScenario.constraints.blockFreeAgency');
    expect(markup).toContain('blocked practice-squad additions');
    expect(markup).toContain('ADDS LOCKED');
    expect(markup).toContain('Scenario Locked');
    expect(markup).toContain('data-mfd-button-state="disabled"');
  });

  it('builds practice-squad add, elevation, and release receipts from existing commit paths', () => {
    const addReceipt = buildPracticeSquadActionReceipt({
      action: 'add',
      playerId: 'fa-1',
      playerName: 'Drew Moss',
      playerPos: 'WR',
      teamName: 'Chicago Blaze',
      helpText: 'Available now from the free-agent pool.',
      slotUsage: '2/16 slots before add',
    });
    const elevateReceipt = buildPracticeSquadActionReceipt({
      action: 'elevate',
      playerId: 'ps-2',
      playerName: 'Luke Vale',
      playerPos: 'LB',
      teamName: 'Chicago Blaze',
      statusLabel: 'Practice squad',
      elevationsUsed: 1,
      maxElevations: 3,
    });
    const releaseReceipt = buildPracticeSquadActionReceipt({
      action: 'release',
      playerId: 'ps-1',
      playerName: 'Jay Reed',
      playerPos: 'WR',
      teamName: 'Chicago Blaze',
      statusLabel: 'Elevation maxed',
    });

    expect(addReceipt).toMatchObject({
      id: 'practice-squad:add:fa-1',
      title: 'Practice Squad Add Processed',
      accent: 'green',
    });
    expect(addReceipt.result).toContain('2/16 slots before add');
    expect(addReceipt.stateTouched).toContain('game.freeAgents');
    expect(addReceipt.source).toContain('actions.addToPracticeSquad -> addToPracticeSquadEngine -> commitGame');
    expect(addReceipt.boundary).toContain('does not add another player');
    expect(addReceipt.boundary).toContain('reroll saved outcomes');

    expect(elevateReceipt).toMatchObject({
      id: 'practice-squad:elevate:ps-2:1',
      title: 'Practice Squad Elevation Processed',
      accent: 'cyan',
    });
    expect(elevateReceipt.result).toContain('1/3');
    expect(elevateReceipt.stateTouched).toContain('elevationsUsed/isElevated/elevatedWeek');
    expect(elevateReceipt.source).toContain('actions.elevatePSPlayer -> elevateFromPracticeSquadEngine -> commitGame');
    expect(elevateReceipt.boundary).toContain('does not elevate another player');

    expect(releaseReceipt).toMatchObject({
      id: 'practice-squad:release:ps-1',
      title: 'Practice Squad Release Processed',
      accent: 'red',
    });
    expect(releaseReceipt.result).toContain('returned to the free-agent pool');
    expect(releaseReceipt.stateTouched).toContain('active-roster reference cleanup');
    expect(releaseReceipt.source).toContain('actions.releasePSPlayer -> removeFromPracticeSquadEngine -> commitGame');
    expect(releaseReceipt.boundary).toContain('does not release another player');
  });

  it('renders practice-squad action receipt source copy and no-extra-write boundary', () => {
    const receipt = buildPracticeSquadActionReceipt({
      action: 'elevate',
      playerId: 'ps-2',
      playerName: 'Luke Vale',
      playerPos: 'LB',
      teamName: 'Chicago Blaze',
      statusLabel: 'Practice squad',
      elevationsUsed: 1,
      maxElevations: 3,
    });

    const markup = renderToStaticMarkup(<PracticeSquadActionReceiptPanel receipt={receipt} />);

    expect(markup).toContain('PRACTICE SQUAD ACTION RECEIPT');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Luke Vale // LB // Chicago Blaze');
    expect(markup).toContain('Changed now');
    expect(markup).toContain('roster-state refresh');
    expect(markup).toContain('Action used');
    expect(markup).toContain('actions.elevatePSPlayer -&gt; elevateFromPracticeSquadEngine -&gt; commitGame');
    expect(markup).toContain('Did not also');
    expect(markup).toContain('This confirmation does not elevate another player');
  });
});
