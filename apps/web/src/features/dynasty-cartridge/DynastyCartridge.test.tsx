import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mockState = {
  game: {
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
  autosaveDynasty: vi.fn().mockResolvedValue(1),
  saveDynastyToSlot: vi.fn().mockResolvedValue(undefined),
  loadSaveSlot: vi.fn().mockResolvedValue(null),
  deleteSaveSlot: vi.fn().mockResolvedValue(undefined),
  loadImportedCartridge: vi.fn(),
  loadImportedCartridgeFile: vi.fn(),
}));

vi.mock('@mfd/engine', () => ({
  RIVALRIES_SCHEMA_VERSION: 1,
  buildCartridge: vi.fn().mockReturnValue({ ok: true, json: '{}' }),
  generateFileName: vi.fn().mockReturnValue('CHI_S2026_W5.mfd'),
}));

import {
  DynastyCartridge,
  DynastyImportPreview,
  DynastyImportError,
  DynastyStatusPanel,
  combinedBackupCopyFallbackMessage,
  combinedImportFailureMessage,
  importFailureMessage,
  portableCopyFallbackMessage,
} from './DynastyCartridge';

describe('DynastyCartridge', () => {
  it('renders screen header with Dynasty Cartridge title', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('DYNASTY CARTRIDGE');
  });

  it('renders save/load related UI elements', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('Create Save Slot');
    expect(markup).toContain('Advanced: Copy .mfd');
    expect(markup).toContain('Advanced: Download .mfd');
    expect(markup).toContain('Download Combined Backup');
    expect(markup).toContain('ADVANCED .MFD CARTRIDGE');
    expect(markup).toContain('LOCAL SAVE SLOTS');
    expect(markup).toContain('Rivalries');
  });

  it('promotes portable backup messaging', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('Portable backup exports');
    expect(markup).toContain('strip generated broadcast commentary payloads');
    expect(markup).toContain('Scores, stats, standings, records, and dynasty history all export normally');
    expect(markup).toContain('data-spotlight-target="chip.route.dynasty-save-load.beat-1"');
  });

  it('renders an upload backup action', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('Advanced: Upload .mfd');
    expect(markup).toContain('Upload Combined Backup');
  });

  it('renders one-click combined backup copy and import controls', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('ONE-CLICK COMBINED BACKUP');
    expect(markup).toContain('mfd.dynastyCombinedBackup.v1');
    expect(markup).toContain('.mfd cartridge');
    expect(markup).toContain('Complete sidecars');
    expect(markup).toContain('Old .mfd import unchanged');
    expect(markup).toContain('Paste combined backup JSON');
    expect(markup).toContain('Preview Combined Backup');
  });

  it('renders paste-backup fallback copy', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('Paste current-save-only .mfd code');
    expect(markup).toContain('data-spotlight-target="chip.route.dynasty-save-load.beat-2"');
  });

  it('labels classic .mfd import/export as advanced current-save-only recovery', () => {
    const markup = renderToStaticMarkup(<DynastyCartridge />);

    expect(markup).toContain('Combined Backup is the primary portable path');
    expect(markup).toContain('Classic .mfd import/export is current-save-only');
    expect(markup).toContain('excludes Hall of Fame archive');
  });

  it('renders import preview counts, missing-store warnings, and explicit confirmation controls', () => {
    const markup = renderToStaticMarkup(
      <DynastyImportPreview
        title="Combined Backup Import Preview"
        confirmLabel="Confirm Combined Import"
        summary={{
          dynasties: 2,
          hallOfFameInductees: 3,
          scrapbookEntries: 4,
          pendingPlayoffLoreCards: 1,
          rookieOfYearEntries: 2,
          rosterContinuityDynasties: 1,
          careerMetaDynasties: 2,
          rivalryTeams: 0,
          rivalryRecords: 0,
          dynastyIds: ['dynasty-a', 'dynasty-b'],
          includedStores: ['hallOfFame', 'scrapbook', 'rookieOfYear', 'rosterContinuity', 'careerMeta'],
          missingStores: ['rivalries'],
        }}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain('COMBINED BACKUP IMPORT PREVIEW');
    expect(markup).toContain('dynasty-a, dynasty-b');
    expect(markup).toContain('Rivalry heat missing');
    expect(markup).toContain('existing local data for missing stores will not be replaced');
    expect(markup).toContain('Cancel Import');
    expect(markup).toContain('Confirm Combined Import');
  });

  it('renders per-dynasty selective checkboxes, NEW/OVERWRITE badges, and zero-selection lockout', () => {
    const markup = renderToStaticMarkup(
      <DynastyImportPreview
        title="Selective Sidecar Import Preview"
        confirmLabel="Import Selected Dynasty Sidecars"
        summary={{
          dynasties: 2,
          hallOfFameInductees: 1,
          scrapbookEntries: 2,
          pendingPlayoffLoreCards: 0,
          rookieOfYearEntries: 1,
          rosterContinuityDynasties: 1,
          careerMetaDynasties: 2,
          rivalryTeams: 0,
          rivalryRecords: 0,
          dynastyIds: ['dynasty-new', 'dynasty-existing'],
          includedStores: ['hallOfFame', 'scrapbook'],
          missingStores: [],
        }}
        mergePlan={{
          incomingDynastyIds: ['dynasty-new', 'dynasty-existing'],
          selectedDynastyIds: ['dynasty-new', 'dynasty-existing'],
          unknownSelectedDynastyIds: [],
          canApply: true,
          dynastyStatuses: [
            { dynastyId: 'dynasty-new', status: 'new', hasIncomingHallOfFame: true, hasIncomingScrapbook: true, hasIncomingRookieOfYear: false, hasIncomingRosterContinuity: false, hasIncomingCareerMeta: true },
            { dynastyId: 'dynasty-existing', status: 'overwrite', hasIncomingHallOfFame: true, hasIncomingScrapbook: true, hasIncomingRookieOfYear: false, hasIncomingRosterContinuity: false, hasIncomingCareerMeta: true },
          ],
          totalAddedDynasties: 1,
          totalOverwrittenDynasties: 1,
        }}
        selectedDynastyIds={['dynasty-new', 'dynasty-existing']}
        onToggleDynasty={() => undefined}
        onSelectAllDynasties={() => undefined}
        onDeselectAllDynasties={() => undefined}
        onConfirm={() => undefined}
        onCancel={() => undefined}
        onFullReplacement={() => undefined}
      />,
    );

    expect(markup).toContain('SELECTIVE SIDECAR IMPORT PREVIEW');
    expect(markup).toContain('NEW');
    expect(markup).toContain('OVERWRITE');
    expect(markup).toContain('Select All');
    expect(markup).toContain('Deselect All');
    expect(markup).toContain('Replace Entire Sidecar Archive');
    expect(markup).toContain('Unselected local dynasties are preserved.');
  });

  it('points blocked clipboard exports to the download fallback', () => {
    expect(portableCopyFallbackMessage('CHI_S2026_W5.mfd')).toBe(
      'Clipboard blocked. Use Advanced: Download .mfd for CHI_S2026_W5.mfd.',
    );
    expect(combinedBackupCopyFallbackMessage()).toBe('Clipboard blocked. Use Download Combined Backup.');
  });

  it('keeps invalid import errors player-facing and save-safe', () => {
    expect(importFailureMessage()).toBe(
      'That file does not look like a valid MFD save, or it could not be written to local saves. Your current dynasty was not changed. Try exporting again or choose a different file.',
    );
    expect(combinedImportFailureMessage()).toBe(
      'That file does not look like a valid combined dynasty backup, or it could not be written to local saves. Your current dynasty was not changed. Try exporting again or choose a different file.',
    );
  });

  it('announces save/import success status politely', () => {
    const markup = renderToStaticMarkup(<DynastyStatusPanel status="Manual save slot created" />);

    expect(markup).toContain('Manual save slot created');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
  });

  it('announces import failures assertively', () => {
    const markup = renderToStaticMarkup(<DynastyImportError message={importFailureMessage()} />);

    expect(markup).toContain('That file does not look like a valid MFD save');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-live="assertive"');
  });
});
