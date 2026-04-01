import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MfdPanel, MfdBadge,
} from '@mfd/design-system/components';
import {
  Save, Upload, Download, Trash2,
  HardDrive, FileText, CheckCircle,
} from 'lucide-react';
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

export function DynastyCartridge() {
  const game = useGameStore((s) => s.game);
  const team = useGameStore(selectUserTeam);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const { loadGame } = useGameStore((s) => s.actions);

  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const teamName = team ? `${team.city} ${team.name}` : 'Unknown';
  const meta = { teamName, season: year, week };
  const fileName = team ? generateFileName(meta) : 'save.mfd';

  const refreshSlots = useCallback(async () => {
    setSlots(await listSaveSlots());
  }, []);

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  const handleExport = useCallback(() => {
    if (!game) return;
    const result = buildCartridge(game, meta);
    if (!result.ok) return;
    navigator.clipboard.writeText(result.json).then(() => {
      setStatus(`${fileName} exported to clipboard`);
      setTimeout(() => setStatus(null), 3000);
    });
  }, [fileName, game, meta]);

  const handleDownload = useCallback(() => {
    if (!game) return;
    const result = buildCartridge(game, meta);
    if (!result.ok) return;
    const blob = new Blob([result.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`${fileName} downloaded`);
    setTimeout(() => setStatus(null), 3000);
  }, [fileName, game, meta]);

  const handleManualSave = useCallback(async () => {
    if (!game) return;
    await saveDynastyToSlot(game, `${teamName} S${year}W${week}`);
    await refreshSlots();
    setStatus('Manual save slot created');
    setTimeout(() => setStatus(null), 3000);
  }, [game, refreshSlots, teamName, week, year]);

  const handleLoadSlot = useCallback(async (id: number) => {
    const loaded = await loadSaveSlot(id);
    if (!loaded) return;
    loadGame(loaded);
    setStatus('Save slot loaded');
    setTimeout(() => setStatus(null), 3000);
  }, [loadGame]);

  const handleDeleteSlot = useCallback(async (id: number) => {
    await deleteSaveSlot(id);
    await refreshSlots();
  }, [refreshSlots]);

  const handleImport = useCallback(() => {
    if (!importText.trim()) return;
    setImportError(null);
    try {
      const loaded = loadImportedCartridge(importText.trim());
      loadGame(loaded);
      setImportText('');
      setStatus('Save loaded successfully');
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed.');
    }
  }, [importText, loadGame]);

  const slotSummary = useMemo(() => slots.map((slot) => ({
    ...slot,
    label: `${slot.teamName} // S${slot.year} W${slot.week}`,
  })), [slots]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
          fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
        }}>Dynasty Cartridge</h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)', margin: '4px 0 0',
        }}>
          Local slots + cartridge export/import
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', flexWrap: 'wrap' }}>
        <ActionButton label="Create Save Slot" icon={<Save size={14} />} color="var(--mfd-gold)" onClick={handleManualSave} />
        <ActionButton label="Export to Clipboard" icon={<Download size={14} />} color="var(--mfd-cyan)" onClick={handleExport} />
        <ActionButton label="Download .mfd" icon={<Save size={14} />} color="var(--mfd-green)" onClick={handleDownload} />
      </div>

      {status && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)',
          padding: 'var(--mfd-sp-sm) var(--mfd-sp-md)',
          background: 'color-mix(in srgb, var(--mfd-green) 12%, transparent)',
          border: '1px solid var(--mfd-green)',
          borderRadius: 'var(--mfd-rad-md)',
        }}>
          <CheckCircle size={14} style={{ color: 'var(--mfd-green)' }} />
          <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-green)' }}>{status}</span>
        </div>
      )}

      {game && team && (
        <MfdPanel title="Current Dynasty" icon={<HardDrive size={14} />}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
            padding: 'var(--mfd-sp-md)', background: 'var(--mfd-bg-2)',
            border: '1px solid var(--mfd-gold)', borderRadius: 'var(--mfd-rad-md)',
          }}>
            <FileText size={16} style={{ color: 'var(--mfd-gold)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.875rem', fontWeight: 600 }}>{teamName}</div>
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)', marginTop: 2 }}>
                Season {year} // Week {week} // {team.wins}-{team.losses} // Seed: {game.seed}
              </div>
            </div>
            <MfdBadge variant="gold">{game.phase}</MfdBadge>
          </div>
        </MfdPanel>
      )}

      <MfdPanel title="Local Save Slots" icon={<HardDrive size={14} />}>
        {slotSummary.length === 0 ? (
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
            No local slots yet. Autosaves appear after weekly simulation.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {slotSummary.map((slot) => (
              <div key={slot.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
                padding: 'var(--mfd-sp-sm)', background: 'var(--mfd-bg-2)',
                border: '1px solid var(--mfd-border)', borderRadius: 'var(--mfd-rad-md)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    {slot.label}
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)', marginTop: 2 }}>
                    {slot.isAutosave ? 'Autosave' : 'Manual'} // {new Date(slot.timestamp).toLocaleString()}
                  </div>
                </div>
                <MfdBadge variant={slot.isAutosave ? 'info' : 'default'}>
                  {slot.isAutosave ? 'AUTO' : 'MANUAL'}
                </MfdBadge>
                <button onClick={() => void handleLoadSlot(slot.id!)} style={iconButtonStyle}>
                  Load
                </button>
                <button onClick={() => void handleDeleteSlot(slot.id!)} style={iconButtonStyle}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </MfdPanel>

      <MfdPanel title="Import Dynasty" icon={<Upload size={14} />}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--mfd-sp-md)', padding: 'var(--mfd-sp-xl)',
          border: '2px dashed var(--mfd-border)', borderRadius: 'var(--mfd-rad-md)',
        }}>
          <Upload size={24} style={{ color: 'var(--mfd-text-dim)' }} />
          <p style={{
            fontFamily: 'var(--mfd-font-sans)', fontSize: '0.875rem',
            color: 'var(--mfd-text-dim)', margin: 0, textAlign: 'center',
          }}>
            Paste cartridge JSON below to load a save
          </p>
          <textarea
            placeholder="Paste cartridge JSON here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            style={{
              width: '100%', maxWidth: 440, height: 90,
              padding: 'var(--mfd-sp-sm)', resize: 'vertical',
              fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
              color: 'var(--mfd-text)', background: 'var(--mfd-bg)',
              border: '1px solid var(--mfd-border)', borderRadius: 'var(--mfd-rad-md)',
            }}
          />
          {importError && (
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-red)' }}>
              {importError}
            </div>
          )}
          <button onClick={handleImport} disabled={!importText.trim()} style={primaryButtonStyle(importText.trim())}>
            Import Save
          </button>
        </div>
      </MfdPanel>
    </div>
  );
}

function ActionButton({ label, icon, color, onClick }: {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 16px', fontSize: '0.8125rem',
      fontFamily: 'var(--mfd-font-sans)', fontWeight: 600,
      color: 'var(--mfd-bg)', background: color,
      border: 'none', borderRadius: 'var(--mfd-rad-md)', cursor: 'pointer',
    }}>
      {icon} {label}
    </button>
  );
}

const iconButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '6px 10px',
  background: 'var(--mfd-bg-3)',
  color: 'var(--mfd-text)',
  border: '1px solid var(--mfd-border)',
  borderRadius: 'var(--mfd-rad-md)',
  cursor: 'pointer',
};

function primaryButtonStyle(enabled: string): React.CSSProperties {
  return {
    padding: '8px 24px',
    fontSize: '0.8125rem',
    fontFamily: 'var(--mfd-font-sans)',
    fontWeight: 600,
    color: 'var(--mfd-bg)',
    background: enabled ? 'var(--mfd-amber)' : 'var(--mfd-bg-3)',
    border: 'none',
    borderRadius: 'var(--mfd-rad-md)',
    cursor: enabled ? 'pointer' : 'default',
  };
}
