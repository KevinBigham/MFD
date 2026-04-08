import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelTable,
} from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import { buildCartridge, generateFileName } from '@mfd/engine';
import {
  deleteSaveSlot,
  listSaveSlots,
  loadImportedCartridge,
  loadSaveSlot,
  saveDynastyToSlot,
} from '../../app/store/persistence';
import type { SaveSlot } from '../../lib/db';
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

export function DynastyCartridge() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const { loadGame } = useGameStore((state) => state.actions);

  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'load' | 'delete'; slotId: number; label: string } | null>(null);

  const teamName = team ? `${team.city} ${team.name}` : 'Unknown';
  const meta = { teamName, season: year, week };
  const fileName = team ? generateFileName(meta) : 'save.mfd';

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

    navigator.clipboard.writeText(result.json).then(() => {
      setTransientStatus(`${fileName} copied to clipboard`);
    });
  }, [fileName, game, meta, setTransientStatus]);

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
    setTransientStatus(`${fileName} downloaded`);
  }, [fileName, game, meta, setTransientStatus]);

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

  const handleImport = useCallback(() => {
    if (!importText.trim()) return;
    setImportError(null);
    try {
      const loaded = loadImportedCartridge(importText.trim());
      loadGame(loaded);
      setImportText('');
      setTransientStatus('Imported dynasty loaded');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed.');
    }
  }, [importText, loadGame, setTransientStatus]);

  const slotSummary = useMemo(() => slots.map((slot) => ({
    ...slot,
    label: `${slot.teamName} // S${slot.year} W${slot.week}`,
  })), [slots]);

  const selectedSlot = slotSummary.find((slot) => slot.id === selectedSlotId) ?? null;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Dynasty Cartridge"
        subtitle="Create local save slots, export portable cartridges, and load a dynasty back into the studio."
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
        <PixelButton type="button" accent="gold" onClick={() => void handleManualSave()}>Create Save Slot</PixelButton>
        <PixelButton type="button" accent="cyan" onClick={handleExport}>Copy Cartridge</PixelButton>
        <PixelButton type="button" accent="green" onClick={handleDownload}>Download .mfd</PixelButton>
      </div>

      {status ? (
        <PixelPanel title="Broadcast" accent="green">
          <span style={{ ...monoSm, color: 'var(--mfd-green)' }}>{status}</span>
        </PixelPanel>
      ) : null}

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

      <div style={autoGrid(340)}>
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

        <PixelPanel title="Import Cartridge" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste cartridge JSON here..."
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
            {importError ? <span style={{ ...monoSm, color: 'var(--mfd-red)' }}>{importError}</span> : null}
            <PixelButton type="button" accent="green" disabled={!importText.trim()} onClick={handleImport}>
              Import Save
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
