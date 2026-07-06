import { useMemo, useRef, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import { deriveDynastyId } from '../../lib/career-meta';
import { computeDynastyChronicle, type ChronicleEvent } from '../../lib/dynasty-chronicle';
import {
  countEventsByType,
  createDefaultActiveTypes,
  filterChronicleEvents,
  toggleActiveType,
} from '../../lib/dynasty-chronicle-filter';
import {
  chronicleAccent,
  chronicleBody,
  chronicleTitle,
  titleCase,
} from '../../lib/dynasty-chronicle-presenter';
import { PixelScreenHeader, monoSm, screenStackStyle, teamThemeVars } from '../shared/pixelUi';
import { ChronicleFilters } from './ChronicleFilters';
import { ChronicleEventDetailModal } from './ChronicleEventDetailModal';
import { createExportFrame } from '../season/export-frame';

interface DynastyChronicleExportOptions {
  teamAbbr: string;
  teamCity: string;
  teamName: string;
  teamId?: string | null;
  year: number;
  eventCount: number;
  exportedAt?: Date;
}

function dynastyChronicleExportDate(exportedAt: Date): string {
  return exportedAt.toISOString().slice(0, 10).replace(/-/g, '');
}

function dynastyChronicleFileName(options: DynastyChronicleExportOptions): string {
  const stamp = dynastyChronicleExportDate(options.exportedAt ?? new Date());
  const abbr = options.teamAbbr.toLowerCase();
  return `dynasty-chronicle-${abbr}-${stamp}.png`;
}

export async function exportDynastyChronicleAsPng(
  target: HTMLElement,
  options: DynastyChronicleExportOptions,
): Promise<{ dataUrl: string; fileName: string }> {
  const { exportRecapAsPng } = await import('../season/recap-share');
  const stamp = dynastyChronicleExportDate(options.exportedAt ?? new Date());
  const { frame, cleanup } = createExportFrame(target, {
    title: 'Dynasty Chronicle',
    subtitle: `${options.teamCity} ${options.teamName} // ${options.eventCount} event(s) on the scroll`,
    footer: `${stamp} • Dynasty Chronicle • MFD`,
    themeVars: teamThemeVars(options.teamId ?? undefined),
  });
  const fileName = dynastyChronicleFileName(options);

  try {
    const dataUrl = await exportRecapAsPng(frame);

    if (typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    }

    return { dataUrl, fileName };
  } finally {
    cleanup();
  }
}

function ChronicleSourcesPanel() {
  return (
    <PixelPanel title="Chronicle Sources" accent="cyan">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">saved dynasty memory</PixelBadge>
          <PixelBadge variant="cyan">sidecar archive reads</PixelBadge>
          <PixelBadge variant="default">route-local filters</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Source: `deriveDynastyId(game)` selects the dynasty, and `computeDynastyChronicle`
          combines saved `franchiseHistory`, `hallOfFame`, and `coachingHistory` with scrapbook and
          playoff-lore sidecar reads.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          `countEventsByType`, `filterChronicleEvents`, `chronicleTitle`, `chronicleBody`, and
          `chronicleAccent` only shape the displayed event stream. Filter chips and the detail modal are
          route-local state.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Opening this route does not write franchise history, Hall of Fame entries, coaching history,
          scrapbook entries, playoff-lore cards, ceremonies, records, media posts, achievements, or
          simulation outcomes. Export only creates a browser PNG download.
        </div>
      </div>
    </PixelPanel>
  );
}

export function DynastyChronicle({
  dynastyId: dynastyIdOverride,
}: {
  dynastyId?: string | null;
} = {}) {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const dynastyId = dynastyIdOverride ?? (game ? deriveDynastyId(game) : null);
  const chronicle = useMemo(
    () => (game && dynastyId ? computeDynastyChronicle(game, dynastyId) : []),
    [dynastyId, game],
  );

  const [activeTypes, setActiveTypes] = useState(() => createDefaultActiveTypes());
  const [selectedEvent, setSelectedEvent] = useState<ChronicleEvent | null>(null);
  const counts = useMemo(() => countEventsByType(chronicle), [chronicle]);
  const filteredChronicle = useMemo(
    () => filterChronicleEvents(chronicle, activeTypes),
    [chronicle, activeTypes],
  );
  const years = [...new Set(filteredChronicle.map((event) => event.year))];

  if (!game || !userTeam || !dynastyId) {
    return (
      <div style={{ ...screenStackStyle, ...teamThemeVars(userTeam?.id) }}>
        <PixelScreenHeader title="Dynasty Chronicle" subtitle="No dynasty is loaded." />
      </div>
    );
  }

  const hasEvents = chronicle.length > 0;
  const hasFilteredEvents = filteredChronicle.length > 0;

  const handleExport = async () => {
    if (!exportRef.current || filteredChronicle.length === 0) return;
    await exportDynastyChronicleAsPng(exportRef.current, {
      teamAbbr: userTeam.abbr,
      teamCity: userTeam.city,
      teamName: userTeam.name,
      teamId: userTeam.id,
      year: game.year,
      eventCount: filteredChronicle.length,
    });
  };

  return (
    <div style={{ ...screenStackStyle, ...teamThemeVars(userTeam.id) }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 360px' }}>
          <PixelScreenHeader
            title="Dynasty Chronicle"
            subtitle={`${userTeam.city} ${userTeam.name} // one scroll across every archive`}
            badges={<PixelBadge variant="gold">CHRONICLE</PixelBadge>}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <PixelButton
            accent="gold"
            onClick={() => { void handleExport(); }}
            disabled={filteredChronicle.length === 0}
          >
            Export Chronicle
          </PixelButton>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Exports {filteredChronicle.length} event(s) from the filtered timeline.
          </div>
        </div>
      </div>

      <ChronicleSourcesPanel />

      {hasEvents ? (
        <ChronicleFilters
          counts={counts}
          active={activeTypes}
          onToggle={(type) => setActiveTypes((prev) => toggleActiveType(prev, type))}
          onReset={() => setActiveTypes(createDefaultActiveTypes())}
        />
      ) : null}

      {!hasEvents ? (
        <PixelPanel title="Timeline" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No chronicle events recorded for this dynasty yet. Complete seasons to build the timeline.
          </div>
        </PixelPanel>
      ) : !hasFilteredEvents ? (
        <PixelPanel title="Timeline" accent="default">
          <div
            data-testid="chronicle-filtered-empty"
            style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}
          >
            All event types are filtered out. Toggle a chip on or hit RESET to see the timeline.
          </div>
        </PixelPanel>
      ) : (
        <div ref={exportRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {years.map((year) => (
            <div key={year} data-testid="chronicle-year-boundary" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="gold">{year}</PixelBadge>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {filteredChronicle.filter((event) => event.year === year).length} event(s)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredChronicle.filter((event) => event.year === year).map((event) => {
                  const accent = chronicleAccent(event);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      data-testid="chronicle-event"
                      data-chronicle-kind={event.type}
                      data-chronicle-accent={accent}
                      aria-label={`Open ${chronicleTitle(event)} detail for ${event.year}`}
                      onClick={() => setSelectedEvent(event)}
                      style={{
                        appearance: 'none',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <PixelPanel title={chronicleTitle(event)} accent={accent}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <PixelBadge variant={accent}>{titleCase(event.type)}</PixelBadge>
                          </div>
                          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
                            {chronicleBody(event)}
                          </div>
                        </div>
                      </PixelPanel>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ChronicleEventDetailModal
        event={selectedEvent}
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        teamId={userTeam.id}
      />
    </div>
  );
}
