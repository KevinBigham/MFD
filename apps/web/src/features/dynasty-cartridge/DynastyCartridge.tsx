import { useState } from 'react';
import {
  MfdPanel, MfdBadge,
} from '@mfd/design-system/components';
import {
  Save, Upload, Download, Trash2,
  Clock, HardDrive, FileText, CheckCircle,
} from 'lucide-react';

// ── Mock Save Slots ───────────────────────────────────

interface SaveSlot {
  id: string;
  name: string;
  teamName: string;
  season: number;
  week: number;
  savedAt: string;
  sizeKb: number;
  isAutoSave: boolean;
}

const MOCK_SAVES: SaveSlot[] = [
  {
    id: 's1', name: 'Auto-Save', teamName: 'Chicago Bears',
    season: 2026, week: 8, savedAt: '2 minutes ago', sizeKb: 142, isAutoSave: true,
  },
  {
    id: 's2', name: 'Before Trade Deadline', teamName: 'Chicago Bears',
    season: 2026, week: 7, savedAt: '1 day ago', sizeKb: 138, isAutoSave: false,
  },
  {
    id: 's3', name: 'Season Start', teamName: 'Chicago Bears',
    season: 2026, week: 1, savedAt: '3 weeks ago', sizeKb: 128, isAutoSave: false,
  },
  {
    id: 's4', name: 'Dynasty — Year 2', teamName: 'Chicago Bears',
    season: 2025, week: 17, savedAt: '2 months ago', sizeKb: 155, isAutoSave: false,
  },
];

export function DynastyCartridge() {
  const [selectedSave, setSelectedSave] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

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
        {[
          { label: 'Quick Save', icon: <Save size={14} />, color: 'var(--mfd-green)' },
          { label: 'Export .mfd', icon: <Download size={14} />, color: 'var(--mfd-cyan)' },
          { label: 'Import .mfd', icon: <Upload size={14} />, color: 'var(--mfd-amber)' },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => {
              if (action.label === 'Export .mfd') {
                setExportStatus('Bears-S2026-W8.mfd exported to clipboard');
                setTimeout(() => setExportStatus(null), 3000);
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', fontSize: '0.8125rem',
              fontFamily: 'var(--mfd-font-sans)', fontWeight: 600,
              color: 'var(--mfd-bg)', background: action.color,
              border: 'none', borderRadius: 'var(--mfd-rad-md)',
              cursor: 'pointer',
            }}
          >
            {action.icon} {action.label}
          </button>
        ))}
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

      {/* Save Slots */}
      <MfdPanel title="Save Slots" icon={<HardDrive size={14} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
          {MOCK_SAVES.map((save) => (
            <button
              key={save.id}
              onClick={() => setSelectedSave(save.id === selectedSave ? null : save.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
                padding: 'var(--mfd-sp-md)',
                background: selectedSave === save.id ? 'var(--mfd-bg-3)' : 'var(--mfd-bg-2)',
                border: `1px solid ${selectedSave === save.id ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                borderRadius: 'var(--mfd-rad-md)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div style={{
                color: save.isAutoSave ? 'var(--mfd-cyan)' : 'var(--mfd-gold)',
                flexShrink: 0,
              }}>
                {save.isAutoSave ? <Clock size={16} /> : <FileText size={16} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
                  <span style={{
                    fontFamily: 'var(--mfd-font-sans)', fontSize: '0.875rem',
                    fontWeight: 600, color: 'var(--mfd-text)',
                  }}>{save.name}</span>
                  {save.isAutoSave && <MfdBadge variant="info">Auto</MfdBadge>}
                </div>
                <div style={{
                  fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                  color: 'var(--mfd-text-dim)', marginTop: 2,
                }}>
                  {save.teamName} // S{save.season} W{save.week} // {save.sizeKb}KB // {save.savedAt}
                </div>
              </div>

              {selectedSave === save.id && (
                <div style={{ display: 'flex', gap: 'var(--mfd-sp-xs)' }}>
                  <ActionBtn label="Load" icon={<Upload size={12} />} color="var(--mfd-green)" />
                  <ActionBtn label="Export" icon={<Download size={12} />} color="var(--mfd-cyan)" />
                  {!save.isAutoSave && (
                    <ActionBtn label="Delete" icon={<Trash2 size={12} />} color="var(--mfd-red)" />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </MfdPanel>

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
            Drop a <code style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-cyan)' }}>.mfd</code> file here
            or paste cartridge JSON
          </p>
          <textarea
            placeholder="Paste cartridge JSON here..."
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
          <button style={{
            padding: '8px 24px', fontSize: '0.8125rem',
            fontFamily: 'var(--mfd-font-sans)', fontWeight: 600,
            color: 'var(--mfd-bg)', background: 'var(--mfd-amber)',
            border: 'none', borderRadius: 'var(--mfd-rad-md)',
            cursor: 'pointer',
          }}>
            Import Save
          </button>
        </div>
      </MfdPanel>
    </div>
  );
}

function ActionBtn({ label, icon, color }: { label: string; icon: React.ReactNode; color: string }) {
  return (
    <button
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', fontSize: '0.6875rem',
        fontFamily: 'var(--mfd-font-mono)',
        color, background: 'var(--mfd-bg)',
        border: `1px solid ${color}`,
        borderRadius: 'var(--mfd-rad-sm)',
        cursor: 'pointer',
      }}
    >
      {icon} {label}
    </button>
  );
}
