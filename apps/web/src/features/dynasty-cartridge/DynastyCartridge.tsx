import { useState, useCallback, useMemo } from 'react';
import {
  MfdPanel, MfdBadge,
} from '@mfd/design-system/components';
import {
  Save, Upload, Download, Trash2,
  Clock, HardDrive, FileText, CheckCircle,
} from 'lucide-react';
import { buildCartridge, parseCartridge, generateFileName } from '@mfd/engine';
import {
  useGameStore, selectUserTeam, selectWeek, selectYear,
} from '../../app/store/game-store';

export function DynastyCartridge() {
  const game = useGameStore((s) => s.game);
  const team = useGameStore(selectUserTeam);
  const week = useGameStore(selectWeek);
  const year = useGameStore(selectYear);
  const { loadGame } = useGameStore((s) => s.actions);

  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const teamName = team ? `${team.city} ${team.name}` : 'Unknown';
  const meta = { teamName, season: year, week };
  const fileName = team ? generateFileName(meta) : 'save.mfd';

  const handleExport = useCallback(() => {
    if (!game) return;
    const result = buildCartridge(game, meta);
    if (result.ok) {
      navigator.clipboard.writeText(result.json).then(() => {
        setExportStatus(`${fileName} exported to clipboard`);
        setTimeout(() => setExportStatus(null), 3000);
      });
    }
  }, [game, meta, fileName]);

  const handleDownload = useCallback(() => {
    if (!game) return;
    const result = buildCartridge(game, meta);
    if (result.ok) {
      const blob = new Blob([result.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`${fileName} downloaded`);
      setTimeout(() => setExportStatus(null), 3000);
    }
  }, [game, meta, fileName]);

  const handleImport = useCallback(() => {
    if (!importText.trim()) return;
    setImportError(null);
    const result = parseCartridge(importText.trim());
    if (result.ok) {
      loadGame(result.save as import('@mfd/engine').GameState);
      setImportText('');
      setExportStatus('Save loaded successfully');
      setTimeout(() => setExportStatus(null), 3000);
    } else {
      setImportError(result.error);
    }
  }, [importText, loadGame]);

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
          Save, load, and export your dynasty
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)' }}>
        <ActionButton label="Export to Clipboard" icon={<Download size={14} />} color="var(--mfd-cyan)" onClick={handleExport} />
        <ActionButton label="Download .mfd" icon={<Save size={14} />} color="var(--mfd-green)" onClick={handleDownload} />
      </div>

      {/* Export Status */}
      {exportStatus && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)',
          padding: 'var(--mfd-sp-sm) var(--mfd-sp-md)',
          background: 'color-mix(in srgb, var(--mfd-green) 12%, transparent)',
          border: '1px solid var(--mfd-green)',
          borderRadius: 'var(--mfd-rad-md)',
        }}>
          <CheckCircle size={14} style={{ color: 'var(--mfd-green)' }} />
          <span style={{
            fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
            color: 'var(--mfd-green)',
          }}>{exportStatus}</span>
        </div>
      )}

      {/* Current Save Info */}
      {game && team && (
        <MfdPanel title="Current Dynasty" icon={<HardDrive size={14} />}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
            padding: 'var(--mfd-sp-md)',
            background: 'var(--mfd-bg-2)',
            border: '1px solid var(--mfd-gold)',
            borderRadius: 'var(--mfd-rad-md)',
          }}>
            <FileText size={16} style={{ color: 'var(--mfd-gold)' }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--mfd-font-sans)', fontSize: '0.875rem',
                fontWeight: 600, color: 'var(--mfd-text)',
              }}>{teamName}</div>
              <div style={{
                fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                color: 'var(--mfd-text-dim)', marginTop: 2,
              }}>
                Season {year} // Week {week} // {team.wins}-{team.losses} // Seed: {game.seed}
              </div>
            </div>
            <MfdBadge variant="gold">{game.phase}</MfdBadge>
          </div>
        </MfdPanel>
      )}

      {/* Import Zone */}
      <MfdPanel title="Import Dynasty" icon={<Upload size={14} />}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--mfd-sp-md)',
          padding: 'var(--mfd-sp-xl)',
          border: '2px dashed var(--mfd-border)',
          borderRadius: 'var(--mfd-rad-md)',
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
              width: '100%', maxWidth: 400, height: 80,
              padding: 'var(--mfd-sp-sm)',
              fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
              color: 'var(--mfd-text)', background: 'var(--mfd-bg)',
              border: '1px solid var(--mfd-border)',
              borderRadius: 'var(--mfd-rad-md)',
              resize: 'vertical',
            }}
          />
          {importError && (
            <div style={{
              fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
              color: 'var(--mfd-red)',
            }}>
              {importError}
            </div>
          )}
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            style={{
              padding: '8px 24px', fontSize: '0.8125rem',
              fontFamily: 'var(--mfd-font-sans)', fontWeight: 600,
              color: 'var(--mfd-bg)',
              background: importText.trim() ? 'var(--mfd-amber)' : 'var(--mfd-bg-3)',
              border: 'none', borderRadius: 'var(--mfd-rad-md)',
              cursor: importText.trim() ? 'pointer' : 'default',
            }}
          >
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
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 16px', fontSize: '0.8125rem',
        fontFamily: 'var(--mfd-font-sans)', fontWeight: 600,
        color: 'var(--mfd-bg)', background: color,
        border: 'none', borderRadius: 'var(--mfd-rad-md)',
        cursor: 'pointer',
      }}
    >
      {icon} {label}
    </button>
  );
}
