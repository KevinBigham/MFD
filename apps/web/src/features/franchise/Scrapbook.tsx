import { useRef, useState } from 'react';
import { summarizeScrapbook, type ScrapbookEntry } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { useGameStore, selectUserTeam } from '../../app/store/game-store';
import { deriveDynastyId } from '../../lib/career-meta';
import { readScrapbookForDynasty } from '../../lib/scrapbook-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
  teamThemeVars,
} from '../shared/pixelUi';
import { ScrapbookEntryCard } from './ScrapbookEntry';

function compareEntriesNewestFirst(left: ScrapbookEntry, right: ScrapbookEntry): number {
  return right.year - left.year
    || right.recap.seasonYear - left.recap.seasonYear
    || left.recap.teamId.localeCompare(right.recap.teamId);
}

function bestRecordLabel(entry: ReturnType<typeof summarizeScrapbook>['bestSingleSeasonRecord']): string {
  if (!entry) return 'N/A';
  return `${entry.record} (${entry.year})`;
}

function slugifyDynastyName(dynastyName: string): string {
  const slug = dynastyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'dynasty-scrapbook';
}

export async function exportFullScrapbookAsPng(target: HTMLElement, dynastyName: string): Promise<string> {
  const { exportRecapAsPng } = await import('../season/recap-share');
  const dataUrl = await exportRecapAsPng(target);
  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${slugifyDynastyName(dynastyName)}-scrapbook.png`;
    link.click();
  }
  return dataUrl;
}

function ScrapbookSourcesPanel() {
  return (
    <PixelPanel title="Scrapbook Sources" accent="cyan">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">mfd.scrapbook.v1</PixelBadge>
          <PixelBadge variant="cyan">year-rollover writer</PixelBadge>
          <PixelBadge variant="default">browser export only</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Source: `deriveDynastyId(game)` selects the dynasty bucket, `readScrapbookForDynasty`
          reads the browser-local scrapbook sidecar, and `summarizeScrapbook` derives the metric row.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Completed-season entries are written by app-shell year rollover through
          `syncScrapbookAtYearRollover`, `buildSeasonRecap`, `buildScrapbookEntry`, and
          `appendScrapbookEntry`; pending playoff-lore cards merge into the matching season bucket there.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Opening this route does not write the scrapbook sidecar, clear pending playoff lore, rebuild
          season recaps, update `GameState`, generate media posts, detect eras, award achievements, or create
          new game outcomes. The export button only creates a browser PNG download and route-local status.
        </div>
      </div>
    </PixelPanel>
  );
}

export function Scrapbook() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const [status, setStatus] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const dynastyId = game ? deriveDynastyId(game) : 'unknown-dynasty';
  const entries = readScrapbookForDynasty(dynastyId).sort(compareEntriesNewestFirst);
  const summary = summarizeScrapbook(entries);
  const dynastyName = team ? `${team.city} ${team.name}` : 'Current Dynasty';

  const handleExport = async () => {
    if (!timelineRef.current) return;
    await exportFullScrapbookAsPng(timelineRef.current, dynastyName);
    setStatus('PNG export ready.');
  };

  return (
    <div style={{ ...screenStackStyle, ...teamThemeVars(team?.id) }}>
      <PixelScreenHeader
        title="Dynasty Scrapbook"
        subtitle={`${dynastyName} archive across every completed season.`}
        badges={<PixelBadge variant="gold">SCRAPBOOK</PixelBadge>}
      />

      <PixelPanel title="Archive Controls" accent="cyan">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            Export the full dynasty timeline as one shareable PNG image.
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelButton accent="gold" disabled={entries.length === 0} onClick={() => { void handleExport(); }}>
              Export Full Scrapbook
            </PixelButton>
            {status ? <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{status}</div> : null}
          </div>
        </div>
      </PixelPanel>

      <ScrapbookSourcesPanel />

      <div ref={timelineRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={autoGrid(180)}>
          <PixelMetricCard label="Total Seasons" value={summary.totalSeasons} accent="gold" detail="Completed seasons saved to this dynasty" />
          <PixelMetricCard label="Championships" value={summary.totalChampionships} accent="green" detail="Titles captured in the archive" />
          <PixelMetricCard label="Winning Streak" value={summary.longestWinStreak} accent="cyan" detail="Consecutive winning seasons" />
          <PixelMetricCard label="Best Record" value={bestRecordLabel(summary.bestSingleSeasonRecord)} accent="default" detail="Best single-season mark" />
          <PixelMetricCard label="Breakouts" value={summary.totalBreakouts} accent="gold" detail="Unique breakout players recorded" />
        </div>

        {entries.length === 0 ? (
          <PixelPanel title="Timeline" accent="default">
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              No seasons recorded yet. Complete a season to start your scrapbook.
            </div>
          </PixelPanel>
        ) : (
          <PixelPanel title="Timeline" accent="gold">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {entries.map((entry) => (
                <ScrapbookEntryCard key={`${entry.recap.teamId}-${entry.year}`} entry={entry} />
              ))}
            </div>
          </PixelPanel>
        )}
      </div>
    </div>
  );
}
