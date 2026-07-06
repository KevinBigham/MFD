import { useRef } from 'react';
import type { CareerEpilogue, HallOfFameEntry } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelModal, PixelPanel } from '@mfd/design-system/components';
import { PixelMetricCard, autoGrid, display, monoSm, teamThemeVars } from '../shared/pixelUi';
import { createExportFrame } from '../season/export-frame';

interface HallOfFamerDetailModalProps {
  entry: HallOfFameEntry | null;
  open: boolean;
  onClose: () => void;
  teams: Record<string, { abbr?: string }>;
  dynastyTeamId?: string | null;
  isPantheon?: boolean;
}

function slugifyHallOfFamerName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

function isDisplayableCareerEpilogue(epilogue: unknown): epilogue is CareerEpilogue {
  if (!epilogue || typeof epilogue !== 'object') return false;
  const candidate = epilogue as Partial<Record<keyof CareerEpilogue, unknown>>;
  return typeof candidate.headline === 'string'
    && candidate.headline.trim().length > 0
    && typeof candidate.story === 'string'
    && candidate.story.trim().length > 0
    && typeof candidate.category === 'string'
    && candidate.category.trim().length > 0;
}

function formatEpilogueCategory(category: string): string {
  return category
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

async function exportHallOfFamerAsPng(target: HTMLElement, entry: HallOfFameEntry): Promise<string> {
  const { exportRecapAsPng } = await import('../season/recap-share');
  const { frame, cleanup } = createExportFrame(target, {
    title: entry.name,
    subtitle: `${entry.inductionYear} Hall of Fame profile`,
    footer: `${entry.inductionYear} • Hall of Fame • MFD`,
    themeVars: teamThemeVars(entry.teams[0]),
  });
  try {
    const dataUrl = await exportRecapAsPng(frame);
    if (typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `hof-${slugifyHallOfFamerName(entry.name)}-${entry.inductionYear}.png`;
      link.click();
    }
    return dataUrl;
  } finally {
    cleanup();
  }
}

export function HallOfFamerDetailModal({
  entry,
  open,
  onClose,
  teams,
  dynastyTeamId = null,
  isPantheon = false,
}: HallOfFamerDetailModalProps) {
  const exportRef = useRef<HTMLDivElement | null>(null);

  if (!open || !entry) return null;

  const isHomegrown = entry.teams[0] === dynastyTeamId;
  const epilogue = isDisplayableCareerEpilogue(entry.epilogue) ? entry.epilogue : null;

  const handleExport = async () => {
    if (!exportRef.current) return;
    await exportHallOfFamerAsPng(exportRef.current, entry);
  };

  return (
    <PixelModal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title="Hall of Famer"
      accent="gold"
      width={700}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div ref={exportRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...display, fontSize: '34px', color: 'var(--mfd-text)', lineHeight: 1 }}>
              {entry.name.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <PixelBadge variant="default">{entry.position}</PixelBadge>
              <PixelBadge variant="gold">{entry.inductionYear}</PixelBadge>
              {isPantheon ? <PixelBadge variant="gold">PANTHEON</PixelBadge> : null}
              {isHomegrown ? <PixelBadge variant="cyan">HOMEGROWN</PixelBadge> : null}
            </div>
          </div>

          <div style={autoGrid(160)}>
            <PixelMetricCard label="Peak OVR" value={entry.peakOvr} accent="gold" />
            <PixelMetricCard label="Career Years" value={entry.careerYears} accent="cyan" />
            <PixelMetricCard label="Career Score" value={Math.round(entry.score)} accent="green" />
            <PixelMetricCard label="Championships" value={entry.awards.championships} accent="default" />
            <PixelMetricCard label="MVPs" value={entry.awards.mvps} accent="gold" />
            <PixelMetricCard label="All-Pros" value={entry.awards.allPros} accent="cyan" />
            <PixelMetricCard label="Pro Bowls" value={entry.awards.proBowls} accent="green" />
          </div>

          <PixelPanel title="Team Chronology" accent="default">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {entry.teams.map((teamId, index) => (
                <PixelBadge key={`${teamId}-${index}`} variant="default">
                  {index + 1}. {teams[teamId]?.abbr ?? teamId}
                </PixelBadge>
              ))}
            </div>
          </PixelPanel>

          {epilogue ? (
            <PixelPanel title="Career Epilogue" accent="gold">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <PixelBadge variant="gold">SAVED EPILOGUE</PixelBadge>
                  <PixelBadge variant="default">{formatEpilogueCategory(epilogue.category)}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6, fontWeight: 700 }}>
                  {epilogue.headline}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                  {epilogue.story}
                </div>
              </div>
            </PixelPanel>
          ) : null}

          {entry.highlights.length > 0 ? (
            <PixelPanel title="Highlights" accent="cyan">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entry.highlights.map((highlight, index) => (
                  <div key={`${highlight}-${index}`} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                    {highlight}
                  </div>
                ))}
              </div>
            </PixelPanel>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <PixelButton accent="gold" onClick={() => { void handleExport(); }}>
            Export PNG
          </PixelButton>
          <PixelButton accent="default" onClick={onClose}>
            Close
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
