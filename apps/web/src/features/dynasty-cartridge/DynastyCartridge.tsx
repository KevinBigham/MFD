import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelTable,
} from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import { buildCartridge, generateFileName, type GameState } from '@mfd/engine';
import {
  deleteSaveSlot,
  listSaveSlots,
  autosaveDynasty,
  loadImportedCartridge,
  loadImportedCartridgeFile,
  loadSaveSlot,
  saveDynastyToSlot,
} from '../../app/store/persistence';
import type { SaveSlot } from '../../lib/db';
import {
  DYNASTY_COMBINED_BACKUP_KIND,
  exportDynastyCombinedBackupJson,
  parseDynastyCombinedBackupJson,
} from '../../lib/dynasty-combined-backup';
import {
  DYNASTY_SIDECAR_ARCHIVE_KIND,
  DYNASTY_SIDECAR_STORE_LABELS,
  exportDynastySidecarArchiveJson,
  importDynastySidecarArchiveJson,
  parseDynastySidecarArchiveJson,
  readDynastySidecarArchivePayload,
  summarizeDynastySidecarArchive,
  type DynastySidecarArchiveImportResult,
  type DynastySidecarArchivePayload,
  type DynastySidecarArchiveSummary,
} from '../../lib/dynasty-sidecar-archive';
import { importCombinedBackupAtomically } from '../../lib/combined-import-journal';
import {
  useGameStore, selectUserTeam, selectWeek, selectYear,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { ConfirmDialog } from '../shared/ConfirmDialog';

const slotColumns: ColumnDef<SaveSlot & { label: string }, unknown>[] = [
  {
    accessorKey: 'label',
    header: 'Slot',
    cell: ({ row }) => <span style={{ color: '#fff', fontWeight: 600 }}>{row.original.label}</span>,
  },
  {
    accessorKey: 'isAutosave',
    header: 'Type',
    cell: ({ getValue }) => (
      <PixelBadge variant={(getValue() as boolean) ? 'cyan' : 'gold'}>
        {(getValue() as boolean) ? 'AUTO' : 'MANUAL'}
      </PixelBadge>
    ),
  },
  {
    accessorKey: 'timestamp',
    header: 'Updated',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>
        {new Date(getValue() as number).toLocaleString()}
      </span>
    ),
  },
];

export function portableCopyFallbackMessage(fileName: string): string {
  return `Clipboard blocked. Use Advanced: Download .mfd for ${fileName}.`;
}

export function importFailureMessage(): string {
  return 'That file does not look like a valid MFD save, or it could not be written to local saves. Your current dynasty was not changed. Try exporting again or choose a different file.';
}

export function combinedBackupCopyFallbackMessage(): string {
  return 'Clipboard blocked. Use Download Combined Backup.';
}

export function combinedImportFailureMessage(): string {
  return 'That file does not look like a valid combined dynasty backup, or it could not be written to local saves. Your current dynasty was not changed. Try exporting again or choose a different file.';
}

export function DynastyStatusPanel({ status }: { status: string }) {
  return (
    <PixelPanel title="Broadcast" accent="green">
      <span role="status" aria-live="polite" style={{ ...monoSm, color: 'var(--mfd-green)' }}>{status}</span>
    </PixelPanel>
  );
}

export function DynastyImportError({ message }: { message: string }) {
  return (
    <span role="alert" aria-live="assertive" style={{ ...monoSm, color: 'var(--mfd-red)' }}>{message}</span>
  );
}

function sidecarArchiveFileName(exportedAt: Date = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 10).replace(/-/g, '');
  return `mfd-dynasty-sidecars-${stamp}.json`;
}

function combinedBackupFileName(cartridgeFileName: string, exportedAt: Date = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 10).replace(/-/g, '');
  return `${cartridgeFileName.replace(/\.mfd$/i, '')}-combined-${stamp}.json`;
}

type SuccessfulSidecarImport = Extract<DynastySidecarArchiveImportResult, { ok: true }>;

interface PendingCombinedImport {
  loaded: GameState;
  sidecarPayload: DynastySidecarArchivePayload;
  summary: DynastySidecarArchiveSummary;
}

interface PendingSidecarImport {
  payload: DynastySidecarArchivePayload;
  summary: DynastySidecarArchiveSummary;
}

function sidecarStoreList(stores: DynastySidecarArchiveSummary['missingStores']): string {
  return stores.map((store) => DYNASTY_SIDECAR_STORE_LABELS[store]).join(', ');
}

function dynastyCoverage(summary: DynastySidecarArchiveSummary): string {
  if (summary.dynastyIds.length === 0) {
    return 'No dynasty-specific archive rows.';
  }
  const shownDynasties = summary.dynastyIds.slice(0, 4).join(', ');
  const hiddenCount = summary.dynastyIds.length - 4;
  return hiddenCount > 0 ? `${shownDynasties}, +${hiddenCount} more` : shownDynasties;
}

export function DynastyImportPreview({
  title,
  summary,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  summary: DynastySidecarArchiveSummary;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const missingStoreCopy = summary.missingStores.length > 0
    ? `${sidecarStoreList(summary.missingStores)} missing; existing local data for missing stores will not be replaced.`
    : 'All sidecar stores are present in this backup.';

  return (
    <PixelPanel title={title} accent={summary.missingStores.length > 0 ? 'gold' : 'green'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={autoGrid(140)}>
          <PixelMetricCard label="Dynasties" value={summary.dynasties} accent="gold" detail={dynastyCoverage(summary)} />
          <PixelMetricCard label="HOFers" value={summary.hallOfFameInductees} accent="cyan" detail="Archive entries" />
          <PixelMetricCard label="Scrapbook" value={summary.scrapbookEntries} accent="green" detail={`${summary.pendingPlayoffLoreCards} pending lore`} />
          <PixelMetricCard label="Rivalries" value={summary.rivalryRecords} accent="red" detail={`${summary.rivalryTeams} teams`} />
        </div>
        <span
          role={summary.missingStores.length > 0 ? 'alert' : 'status'}
          aria-live={summary.missingStores.length > 0 ? 'assertive' : 'polite'}
          style={{ ...monoSm, color: summary.missingStores.length > 0 ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)' }}
        >
          {missingStoreCopy}
        </span>
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          Confirming replaces only the sidecar stores carried by this archive. Previewing does not autosave, load a dynasty, or overwrite browser-local history.
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <PixelButton type="button" accent="default" onClick={onCancel}>Cancel Import</PixelButton>
          <PixelButton type="button" accent="green" onClick={onConfirm}>{confirmLabel}</PixelButton>
        </div>
      </div>
    </PixelPanel>
  );
}

export function DynastyCartridge() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const { loadGame, recordPortableExport } = useGameStore((state) => state.actions);

  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [combinedImportText, setCombinedImportText] = useState('');
  const [combinedImportError, setCombinedImportError] = useState<string | null>(null);
  const [sidecarImportText, setSidecarImportText] = useState('');
  const [sidecarImportError, setSidecarImportError] = useState<string | null>(null);
  const [pendingCombinedImport, setPendingCombinedImport] = useState<PendingCombinedImport | null>(null);
  const [pendingSidecarImport, setPendingSidecarImport] = useState<PendingSidecarImport | null>(null);
  const [sidecarRevision, setSidecarRevision] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'load' | 'delete'; slotId: number; label: string } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const combinedImportFileRef = useRef<HTMLInputElement>(null);

  const teamName = team ? `${team.city} ${team.name}` : 'Unknown';
  const meta = useMemo(() => ({ teamName, season: year, week }), [teamName, week, year]);
  const fileName = team ? generateFileName(meta) : 'save.mfd';
  const sidecarSummary = useMemo(() => {
    void sidecarRevision;
    return summarizeDynastySidecarArchive(readDynastySidecarArchivePayload());
  }, [sidecarRevision]);

  const refreshSlots = useCallback(async () => {
    setSlots(await listSaveSlots());
  }, []);

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  const setTransientStatus = useCallback((message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(null), 3000);
  }, []);

  const handleExport = useCallback(() => {
    if (!game) return;
    const result = buildCartridge(game, meta);
    if (!result.ok) return;

    if (!navigator.clipboard?.writeText) {
      setTransientStatus(portableCopyFallbackMessage(fileName));
      return;
    }

    navigator.clipboard.writeText(result.json).then(() => {
      void recordPortableExport().catch((err) => {
        console.error('Failed to persist portable export receipt:', err);
      });
      setTransientStatus(`${fileName} copied to clipboard`);
    }).catch(() => {
      setTransientStatus(portableCopyFallbackMessage(fileName));
    });
  }, [fileName, game, meta, recordPortableExport, setTransientStatus]);

  const handleDownload = useCallback(() => {
    if (!game) return;
    const result = buildCartridge(game, meta);
    if (!result.ok) return;
    const blob = new Blob([result.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    void recordPortableExport().catch((err) => {
      console.error('Failed to persist portable export receipt:', err);
    });
    setTransientStatus(`${fileName} downloaded`);
  }, [fileName, game, meta, recordPortableExport, setTransientStatus]);

  const buildCombinedBackupJson = useCallback(() => {
    if (!game) return null;
    const result = buildCartridge(game, meta);
    if (!result.ok) return null;
    return exportDynastyCombinedBackupJson(result.json, readDynastySidecarArchivePayload());
  }, [game, meta]);

  const handleCopyCombinedBackup = useCallback(() => {
    const json = buildCombinedBackupJson();
    if (!json) return;

    if (!navigator.clipboard?.writeText) {
      setTransientStatus(combinedBackupCopyFallbackMessage());
      return;
    }

    navigator.clipboard.writeText(json).then(() => {
      void recordPortableExport().catch((err) => {
        console.error('Failed to persist combined backup export receipt:', err);
      });
      setTransientStatus('Combined dynasty backup copied');
    }).catch(() => {
      setTransientStatus(combinedBackupCopyFallbackMessage());
    });
  }, [buildCombinedBackupJson, recordPortableExport, setTransientStatus]);

  const handleDownloadCombinedBackup = useCallback(() => {
    const json = buildCombinedBackupJson();
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = combinedBackupFileName(fileName);
    anchor.click();
    URL.revokeObjectURL(url);
    void recordPortableExport().catch((err) => {
      console.error('Failed to persist combined backup export receipt:', err);
    });
    setTransientStatus('Combined dynasty backup downloaded');
  }, [buildCombinedBackupJson, fileName, recordPortableExport, setTransientStatus]);

  const handleManualSave = useCallback(async () => {
    if (!game) return;
    await saveDynastyToSlot(game, `${teamName} S${year}W${week}`);
    await refreshSlots();
    setTransientStatus('Manual save slot created');
  }, [game, refreshSlots, setTransientStatus, teamName, week, year]);

  const handleLoadSlot = useCallback(async (id: number) => {
    const loaded = await loadSaveSlot(id);
    if (!loaded) return;
    loadGame(loaded);
    setTransientStatus('Save slot loaded');
  }, [loadGame, setTransientStatus]);

  const handleDeleteSlot = useCallback(async (id: number) => {
    await deleteSaveSlot(id);
    setSelectedSlotId((current) => (current === id ? null : current));
    await refreshSlots();
  }, [refreshSlots]);

  const handleImport = useCallback(async () => {
    if (!importText.trim()) return;
    setImportError(null);
    try {
      const loaded = loadImportedCartridge(importText.trim());
      await autosaveDynasty(loaded);
      loadGame(loaded);
      setImportText('');
      await refreshSlots();
      setTransientStatus('Imported dynasty loaded');
    } catch {
      setImportError(importFailureMessage());
    }
  }, [importText, loadGame, refreshSlots, setTransientStatus]);

  const handleImportFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);

    try {
      const loaded = await loadImportedCartridgeFile(file);
      await autosaveDynasty(loaded);
      loadGame(loaded);
      setImportText('');
      await refreshSlots();
      setTransientStatus('Imported dynasty loaded');
    } catch {
      setImportError(importFailureMessage());
    } finally {
      event.target.value = '';
    }
  }, [loadGame, refreshSlots, setTransientStatus]);

  const stageCombinedBackupImport = useCallback((raw: string) => {
    setCombinedImportError(null);
    setPendingCombinedImport(null);
    const parsed = parseDynastyCombinedBackupJson(raw);
    if (!parsed.ok) {
      setCombinedImportError(parsed.reason);
      return;
    }

    try {
      const loaded = loadImportedCartridge(parsed.cartridgeText);
      setPendingCombinedImport({
        loaded,
        sidecarPayload: parsed.sidecarPayload,
        summary: parsed.summary,
      });
    } catch {
      setCombinedImportError(combinedImportFailureMessage());
    }
  }, []);

  const confirmCombinedBackupImport = useCallback(async () => {
    if (!pendingCombinedImport) return;
    setCombinedImportError(null);

    try {
      const { loaded, sidecarPayload } = pendingCombinedImport;
      const sidecarResult = await importCombinedBackupAtomically(loaded, sidecarPayload);
      if (!sidecarResult.ok) {
        throw new Error(sidecarResult.reason);
      }

      loadGame(loaded);
      setCombinedImportText('');
      setPendingCombinedImport(null);
      setSidecarRevision((current) => current + 1);
      await refreshSlots();
      setTransientStatus(`Imported combined backup with sidecars for ${sidecarResult.summary.dynasties} dynasties`);
    } catch {
      setCombinedImportError(combinedImportFailureMessage());
    }
  }, [loadGame, pendingCombinedImport, refreshSlots, setTransientStatus]);

  const handleImportCombinedBackup = useCallback(async () => {
    if (!combinedImportText.trim()) return;
    stageCombinedBackupImport(combinedImportText.trim());
  }, [combinedImportText, stageCombinedBackupImport]);

  const handleImportCombinedBackupFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      stageCombinedBackupImport(await file.text());
    } finally {
      event.target.value = '';
    }
  }, [stageCombinedBackupImport]);

  const handleCopySidecars = useCallback(() => {
    const json = exportDynastySidecarArchiveJson();
    if (!navigator.clipboard?.writeText) {
      setTransientStatus('Clipboard blocked. Use Download Sidecar Archive.');
      return;
    }

    navigator.clipboard.writeText(json).then(() => {
      setTransientStatus('Complete dynasty sidecar archive copied');
    }).catch(() => {
      setTransientStatus('Clipboard blocked. Use Download Sidecar Archive.');
    });
  }, [setTransientStatus]);

  const handleDownloadSidecars = useCallback(() => {
    const json = exportDynastySidecarArchiveJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = sidecarArchiveFileName();
    anchor.click();
    URL.revokeObjectURL(url);
    setTransientStatus('Complete dynasty sidecar archive downloaded');
  }, [setTransientStatus]);

  const stageSidecarImport = useCallback((raw: string) => {
    setSidecarImportError(null);
    setPendingSidecarImport(null);
    const result = parseDynastySidecarArchiveJson(raw);
    if (!result.ok) {
      setSidecarImportError(result.reason);
      return;
    }

    setPendingSidecarImport({
      payload: result.payload,
      summary: result.summary,
    });
  }, []);

  const handleImportSidecars = useCallback(() => {
    if (!sidecarImportText.trim()) return;
    stageSidecarImport(sidecarImportText.trim());
  }, [sidecarImportText, stageSidecarImport]);

  const confirmSidecarImport = useCallback(() => {
    if (!pendingSidecarImport) return;
    setSidecarImportError(null);
    const result: SuccessfulSidecarImport | { ok: false; reason: string } = importDynastySidecarArchiveJson(
      exportDynastySidecarArchiveJson(pendingSidecarImport.payload),
    );
    if (!result.ok) {
      setSidecarImportError(result.reason);
      return;
    }

    setSidecarImportText('');
    setPendingSidecarImport(null);
    setSidecarRevision((current) => current + 1);
    setTransientStatus(`Imported sidecars for ${result.summary.dynasties} dynasties`);
  }, [pendingSidecarImport, setTransientStatus]);

  const slotSummary = useMemo(() => slots.map((slot) => ({
    ...slot,
    label: `${slot.teamName} // S${slot.year} W${slot.week}`,
  })), [slots]);

  const selectedSlot = slotSummary.find((slot) => slot.id === selectedSlotId) ?? null;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Dynasty Cartridge"
        subtitle="Combined Backup is the primary portable path; classic .mfd is current-save-only advanced recovery."
        badges={(
          <>
            <PixelBadge variant="gold">{slotSummary.length} local slots</PixelBadge>
            <PixelBadge variant="cyan">{fileName.replace('.mfd', '')}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Current Season" value={year} accent="gold" detail={`Week ${week} checkpoint`} />
        <PixelMetricCard label="Team" value={team?.abbr ?? 'N/A'} accent="cyan" detail={teamName} />
        <PixelMetricCard label="Autosaves" value={slotSummary.filter((slot) => slot.isAutosave).length} accent="green" detail="Rotating save protection" />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <PixelButton type="button" accent="gold" onClick={handleDownloadCombinedBackup}>Download Combined Backup</PixelButton>
        <PixelButton type="button" accent="cyan" onClick={() => combinedImportFileRef.current?.click()}>Upload Combined Backup</PixelButton>
        <PixelButton type="button" accent="gold" onClick={() => void handleManualSave()}>Create Save Slot</PixelButton>
        <PixelButton type="button" accent="default" onClick={handleExport}>Advanced: Copy .mfd</PixelButton>
        <PixelButton type="button" accent="default" onClick={handleDownload}>Advanced: Download .mfd</PixelButton>
        <PixelButton type="button" accent="default" onClick={() => importFileRef.current?.click()}>Advanced: Upload .mfd</PixelButton>
      </div>
      <input
        ref={importFileRef}
        type="file"
        accept=".mfd,.json,application/json"
        onChange={(event) => { void handleImportFile(event); }}
        style={{ display: 'none' }}
      />
      <input
        ref={combinedImportFileRef}
        type="file"
        accept=".json,application/json"
        onChange={(event) => { void handleImportCombinedBackupFile(event); }}
        style={{ display: 'none' }}
      />

      {status ? <DynastyStatusPanel status={status} /> : null}

      {game && team ? (
        <PixelPanel title="Current Dynasty" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{teamName}</PixelBadge>
              <PixelBadge variant="cyan">{game.phase}</PixelBadge>
              <PixelBadge variant="default">SEED {game.seed}</PixelBadge>
            </div>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Season {year} // Week {week} // Record {team.wins}-{team.losses}
            </span>
          </div>
        </PixelPanel>
      ) : null}

      <div data-spotlight-target="chip.route.dynasty-save-load.beat-1">
        <PixelPanel title="Portable Backup" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
              Portable backup exports survive browser storage loss. Local save slots are convenient, but only copied or downloaded backup files protect a dynasty outside this machine.
            </span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Use Download Combined Backup when you want the current .mfd cartridge plus browser-local history in one file.
              Use Advanced .mfd actions only when you need the old current-save-only cartridge format.
            </span>
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="One-Click Combined Backup" accent="green">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="green">{DYNASTY_COMBINED_BACKUP_KIND}</PixelBadge>
            <PixelBadge variant="gold">.mfd cartridge</PixelBadge>
            <PixelBadge variant="cyan">Complete sidecars</PixelBadge>
            <PixelBadge variant="default">Old .mfd import unchanged</PixelBadge>
          </div>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Combined backup downloads one JSON package with the current .mfd cartridge and the complete sidecar archive:
            Hall of Fame, scrapbook, GM career, roster continuity, Rookie of the Year history, and rivalry heat.
            Import validates the .mfd cartridge and every sidecar payload before loading the dynasty.
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelButton type="button" accent="cyan" onClick={handleCopyCombinedBackup}>Copy Combined Backup</PixelButton>
            <PixelButton type="button" accent="gold" onClick={handleDownloadCombinedBackup}>Download Combined Backup</PixelButton>
            <PixelButton type="button" accent="green" onClick={() => combinedImportFileRef.current?.click()}>Upload Combined Backup</PixelButton>
          </div>
          <label
            htmlFor="dynasty-combined-import"
            style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}
          >
            Paste combined backup JSON
          </label>
          <textarea
            id="dynasty-combined-import"
            value={combinedImportText}
            onChange={(event) => {
              setCombinedImportText(event.target.value);
              setPendingCombinedImport(null);
            }}
            placeholder="Paste combined dynasty backup JSON here..."
            style={{
              minHeight: '120px',
              padding: '10px',
              background: 'var(--mfd-bg)',
              border: '3px solid var(--mfd-border)',
              color: 'var(--mfd-text)',
              fontFamily: 'var(--mfd-font-mono)',
              fontSize: '12px',
              resize: 'vertical',
            }}
          />
          {combinedImportError ? <DynastyImportError message={combinedImportError} /> : null}
          {pendingCombinedImport ? (
            <DynastyImportPreview
              title="Combined Backup Import Preview"
              summary={pendingCombinedImport.summary}
              confirmLabel="Confirm Combined Import"
              onConfirm={() => { void confirmCombinedBackupImport(); }}
              onCancel={() => setPendingCombinedImport(null)}
            />
          ) : null}
          <PixelButton type="button" accent="green" disabled={!combinedImportText.trim()} onClick={() => { void handleImportCombinedBackup(); }}>
            Preview Combined Backup
          </PixelButton>
        </div>
      </PixelPanel>

      <PixelPanel title="Complete Dynasty Sidecars" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="gold">{DYNASTY_SIDECAR_ARCHIVE_KIND}</PixelBadge>
            <PixelBadge variant="cyan">HOF</PixelBadge>
            <PixelBadge variant="cyan">Scrapbook</PixelBadge>
            <PixelBadge variant="cyan">Rookie History</PixelBadge>
            <PixelBadge variant="cyan">Continuity</PixelBadge>
            <PixelBadge variant="cyan">GM Career</PixelBadge>
            <PixelBadge variant="cyan">Rivalry Heat</PixelBadge>
            <PixelBadge variant="default">GameState untouched</PixelBadge>
          </div>
          <div style={autoGrid(150)}>
            <PixelMetricCard label="Dynasties" value={sidecarSummary.dynasties} accent="gold" detail="Across sidecars" />
            <PixelMetricCard label="HOFers" value={sidecarSummary.hallOfFameInductees} accent="cyan" detail="Archive entries" />
            <PixelMetricCard label="Scrapbook" value={sidecarSummary.scrapbookEntries} accent="green" detail={`${sidecarSummary.pendingPlayoffLoreCards} pending lore`} />
            <PixelMetricCard label="Rookies" value={sidecarSummary.rookieOfYearEntries} accent="gold" detail="ROY snapshots" />
            <PixelMetricCard label="Career" value={sidecarSummary.careerMetaDynasties} accent="cyan" detail="GM summaries" />
            <PixelMetricCard label="Rivalries" value={sidecarSummary.rivalryRecords} accent="red" detail={`${sidecarSummary.rivalryTeams} teams`} />
          </div>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Complete sidecar archives carry browser-local dynasty history that .mfd cartridges do not: Hall of Fame archive,
            scrapbook and playoff-lore buckets, Rookie of the Year history, roster-continuity snapshots, GM career meta,
            and derived rivalry heat from mfd.rivalries.v1.
            Import validates the entire archive before replacing sidecars. It does not load a save slot, write GameState,
            autosave, alter the current .mfd cartridge, or change old .mfd import compatibility.
            Older archives that do not carry rivalry heat leave the existing local rivalry store untouched.
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelButton type="button" accent="cyan" onClick={handleCopySidecars}>Copy Sidecar Archive</PixelButton>
            <PixelButton type="button" accent="gold" onClick={handleDownloadSidecars}>Download Sidecar Archive</PixelButton>
          </div>
          <label
            htmlFor="dynasty-sidecar-import"
            style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}
          >
            Paste sidecar archive JSON
          </label>
          <textarea
            id="dynasty-sidecar-import"
            value={sidecarImportText}
            onChange={(event) => {
              setSidecarImportText(event.target.value);
              setPendingSidecarImport(null);
            }}
            placeholder="Paste complete dynasty sidecar archive JSON here..."
            style={{
              minHeight: '120px',
              padding: '10px',
              background: 'var(--mfd-bg)',
              border: '3px solid var(--mfd-border)',
              color: 'var(--mfd-text)',
              fontFamily: 'var(--mfd-font-mono)',
              fontSize: '12px',
              resize: 'vertical',
            }}
          />
          {sidecarImportError ? <DynastyImportError message={sidecarImportError} /> : null}
          {pendingSidecarImport ? (
            <DynastyImportPreview
              title="Sidecar Archive Import Preview"
              summary={pendingSidecarImport.summary}
              confirmLabel="Confirm Sidecar Import"
              onConfirm={confirmSidecarImport}
              onCancel={() => setPendingSidecarImport(null)}
            />
          ) : null}
          <PixelButton type="button" accent="gold" disabled={!sidecarImportText.trim()} onClick={handleImportSidecars}>
            Preview Sidecar Archive
          </PixelButton>
        </div>
      </PixelPanel>

      <div data-spotlight-target="chip.route.dynasty-save-load.beat-2" style={autoGrid(340)}>
        <PixelPanel title="Local Save Slots" accent="cyan">
          {slotSummary.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              No save slots yet. Weekly simulation autosaves will start filling this board.
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PixelTable
                data={slotSummary}
                columns={slotColumns}
                accent="cyan"
                onRowClick={(row) => setSelectedSlotId(row.id ?? null)}
              />
              {selectedSlot ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelButton type="button" accent="green" onClick={() => setConfirmAction({ type: 'load', slotId: selectedSlot.id!, label: selectedSlot.label })}>
                    Load Selected
                  </PixelButton>
                  <PixelButton type="button" accent="red" onClick={() => setConfirmAction({ type: 'delete', slotId: selectedSlot.id!, label: selectedSlot.label })}>
                    Delete Selected
                  </PixelButton>
                </div>
              ) : null}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Advanced .mfd Cartridge" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Classic .mfd import/export is current-save-only. It excludes Hall of Fame archive,
              scrapbook, GM career, roster continuity, Rookie of the Year history, and rivalry heat.
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelButton type="button" accent="green" onClick={() => importFileRef.current?.click()}>
                Advanced: Upload .mfd
              </PixelButton>
            </div>
            <label
              htmlFor="dynasty-backup-import"
              style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}
            >
              Paste current-save-only .mfd code
            </label>
            <textarea
              id="dynasty-backup-import"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste current-save-only .mfd code here..."
              style={{
                minHeight: '160px',
                padding: '10px',
                background: 'var(--mfd-bg)',
                border: '3px solid var(--mfd-border)',
                color: 'var(--mfd-text)',
                fontFamily: 'var(--mfd-font-mono)',
                fontSize: '12px',
                resize: 'vertical',
              }}
            />
            {importError ? <DynastyImportError message={importError} /> : null}
            <PixelButton type="button" accent="green" disabled={!importText.trim()} onClick={handleImport}>
              Import .mfd Only
            </PixelButton>
          </div>
        </PixelPanel>
      </div>

      <ConfirmDialog
        open={confirmAction?.type === 'load'}
        title="Load Save Slot"
        message={`Load "${confirmAction?.label ?? ''}"? Your current unsaved progress will be replaced.`}
        confirmLabel="Load"
        accent="green"
        onConfirm={() => {
          if (confirmAction) void handleLoadSlot(confirmAction.slotId);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction?.type === 'delete'}
        title="Delete Save Slot"
        message={`Permanently delete "${confirmAction?.label ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        accent="red"
        onConfirm={() => {
          if (confirmAction) void handleDeleteSlot(confirmAction.slotId);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
