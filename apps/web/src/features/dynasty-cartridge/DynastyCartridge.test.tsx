import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mockState = {
  game: {
    version: 37,
    seed: 42,
    phase: 'regular_season',
    week: 5,
    year: 2026,
    teams: {
      'team-1': {
        id: 'team-1',
        city: 'Chicago',
        name: 'Bears',
        abbr: 'CHI',
        wins: 3,
        losses: 2,
        ownerId: 'owner-1',
        capSpace: 25,
        roster: [],
        staff: { hc: null },
        owner: null,
        fatigueState: {},
        practiceSquad: [],
        mentoringPairs: [],
        trainingAssignments: {},
      },
    },
    userTeamId: 'team-1',
    players: {},
    lastPortableExportYear: null,
  },
  actions: {
    loadGame: vi.fn(),
    recordPortableExport: vi.fn(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.game.teams['team-1'],
  selectWeek: (state: typeof mockState) => state.game.week,
  selectYear: (state: typeof mockState) => state.game.year,
}));

vi.mock('../../app/store/persistence', () => ({
  listSaveSlots: vi.fn().mockResolvedValue([]),
  saveDynastyToSlot: vi.fn().mockResolvedValue(undefined),
  loadSaveSlot: vi.fn().mockResolvedValue(null),
  deleteSaveSlot: vi.fn().mockResolvedValue(undefined),
  loadImportedCartridge: vi.fn(),
  loadImportedCartridgeFile: vi.fn(),
}));

vi.mock('@mfd/engine', () => ({
  SAVE_VERSION: 37,
  buildCartridge: vi.fn().mockReturnValue({ ok: true, json: '{}', sizeBytes: 2048 }),
  generateFileName: vi.fn().mockReturnValue('CHI_S2026_W5.mfd'),
  validateGameState: vi.fn().mockReturnValue({ ok: true }),
}));

import { DynastyCartridge } from './DynastyCartridge';

describe('DynastyCartridge', () => {
  it('renders screen header with Dynasty Cartridge title', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('DYNASTY CARTRIDGE');
  });

  it('renders save/load related UI elements', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('Create Save Slot');
    expect(markup).toContain('Copy Cartridge');
    expect(markup).toContain('Copy Challenge Seed');
    expect(markup).toContain('Download .mfd');
    expect(markup).toContain('IMPORT CARTRIDGE');
    expect(markup).toContain('LOCAL SAVE SLOTS');
  });

  it('promotes portable backup messaging', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('portable backup');
  });

  it('renders an upload backup action', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('Upload .mfd Backup');
  });

  it('renders paste-backup fallback copy', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('Paste backup code');
  });

  it('renders the save health meter', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('SAVE HEALTH METER');
    expect(markup).toContain('Cartridge Size');
    expect(markup).toContain('Integrity');
    expect(markup).toContain('Manual Export');
  });
});
