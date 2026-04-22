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
import { PixelScreenHeader, monoSm, screenStackStyle, teamThemeVars } from '../shared/pixelUi';
import { ChronicleFilters } from './ChronicleFilters';
import { createExportFrame } from '../season/export-frame';

function titleCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function chronicleAccent(event: ChronicleEvent): 'default' | 'gold' | 'cyan' | 'green' {
  switch (event.type) {
    case 'championship_win':
    case 'hof_induction':
      return 'gold';
    case 'playoff_round':
      return 'cyan';
    case 'coach_championship':
    case 'coach_hire':
    case 'coach_retire':
      return 'green';
    case 'season_end':
    case 'scrapbook_note':
    default:
      return 'default';
  }
}

function chronicleTitle(event: ChronicleEvent): string {
  switch (event.type) {
    case 'championship_win':
      return 'Championship Won';
    case 'hof_induction':
      return 'Hall of Fame';
    case 'playoff_round':
      return `${titleCase(event.round)} Round`;
    case 'season_end':
      return 'Season End';
    case 'coach_championship':
      return 'Coach Championship';
    case 'coach_hire':
      return 'Coach Hire';
    case 'coach_retire':
      return 'Coach Retirement';
    case 'scrapbook_note':
    default:
      return 'Scrapbook Note';
  }
}

function chronicleBody(event: ChronicleEvent): string {
  switch (event.type) {
    case 'championship_win':
      return `${event.teamAbbr} finished ${event.record} and closed the year with a title.`;
    case 'hof_induction':
      return `${event.playerName} entered the Hall of Fame as a ${event.position}.`;
    case 'playoff_round':
      return `${titleCase(event.outcome)} // ${event.finalScore} // ${event.headline}`;
    case 'season_end':
      return `${event.teamAbbr} wrapped the season at ${event.record} with a ${titleCase(event.playoffFinish)} finish.`;
    case 'coach_championship':
      return `${event.coachName} guided the franchise to a championship season.`;
    case 'coach_hire':
      return `${event.coachName} took over the sideline.`;
    case 'coach_retire':
      return `${event.coachName} closed the coaching run.`;
    case 'scrapbook_note':
    default:
      return event.headline;
  }
}

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
                    <div
                      key={event.id}
                      data-testid="chronicle-event"
                      data-chronicle-kind={event.type}
                      data-chronicle-accent={accent}
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
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
