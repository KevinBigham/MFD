import { useMemo, useRef, useState } from 'react';
import type { HallOfFameEntry } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { useGameStore } from '../../app/store/game-store';
import { deriveDynastyId } from '../../lib/career-meta';
import { syncHallOfFameArchiveSnapshot } from '../../lib/hall-of-fame-archive-sync';
import {
  exportHallOfFameArchiveJson,
  importHallOfFameArchiveJson,
  listDynastiesByStartYear,
  readHallOfFameArchive,
  summarizeHallOfFameArchive,
  topHallOfFamerByScore,
  type HallOfFameArchiveDynasty,
} from '../../lib/hall-of-fame-archive';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
  teamThemeVars,
} from '../shared/pixelUi';
import { HallOfFamerDetailModal } from './HallOfFamerDetailModal';
import { createExportFrame } from '../season/export-frame';

type SortMode = 'induction' | 'peakOvr' | 'careerScore' | 'name';
type FilterMode = 'all' | 'homegrown' | 'current';
type GroupMode = 'flat' | 'era';

interface HallOfFameDirectoryExportOptions {
  sort: SortMode;
  filter: FilterMode;
  exportedAt?: Date;
  entryCount?: number;
  teamId?: string | null;
}

const SORT_MODES: Array<{ id: SortMode; label: string }> = [
  { id: 'induction', label: 'Induction ↓' },
  { id: 'peakOvr', label: 'Peak OVR ↓' },
  { id: 'careerScore', label: 'Career Score ↓' },
  { id: 'name', label: 'Name A-Z' },
];

const FILTER_MODES: Array<{ id: FilterMode; label: string }> = [
  { id: 'all', label: 'All Dynasties' },
  { id: 'homegrown', label: 'Homegrown Only' },
  { id: 'current', label: 'Current Dynasty' },
];

const GROUP_MODES: Array<{ id: GroupMode; label: string }> = [
  { id: 'flat', label: 'Flat' },
  { id: 'era', label: 'By Era' },
];

function sortEntries(entries: HallOfFameEntry[], mode: SortMode): HallOfFameEntry[] {
  const copy = [...entries];
  switch (mode) {
    case 'peakOvr':
      return copy.sort((left, right) => right.peakOvr - left.peakOvr || left.name.localeCompare(right.name));
    case 'careerScore':
      return copy.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
    case 'name':
      return copy.sort((left, right) => left.name.localeCompare(right.name));
    case 'induction':
    default:
      return copy.sort(
        (left, right) => right.inductionYear - left.inductionYear || right.peakOvr - left.peakOvr || left.name.localeCompare(right.name),
      );
  }
}

function applyFilter(
  entries: HallOfFameEntry[],
  dynastyTeamId: string,
  filter: FilterMode,
): HallOfFameEntry[] {
  if (filter === 'homegrown') {
    return entries.filter((entry) => entry.teams[0] === dynastyTeamId);
  }
  return entries;
}

function inductionDecade(entry: HallOfFameEntry): number {
  return Math.floor(entry.inductionYear / 10) * 10;
}

function groupEntriesByEra(entries: HallOfFameEntry[]): Array<{
  decade: number;
  entries: HallOfFameEntry[];
}> {
  const buckets = new Map<number, HallOfFameEntry[]>();
  for (const entry of entries) {
    const decade = inductionDecade(entry);
    const bucket = buckets.get(decade);
    if (bucket) {
      bucket.push(entry);
      continue;
    }
    buckets.set(decade, [entry]);
  }

  return [...buckets.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([decade, groupedEntries]) => ({
      decade,
      entries: groupedEntries,
    }));
}

function hallOfFameDirectoryExportDate(exportedAt: Date): string {
  return exportedAt.toISOString().slice(0, 10).replace(/-/g, '');
}

function hallOfFameDirectoryFileName({ sort, filter, exportedAt = new Date() }: HallOfFameDirectoryExportOptions): string {
  return `hall-of-fame-${sort}-${filter}-${hallOfFameDirectoryExportDate(exportedAt)}.png`;
}

function hallOfFameArchiveJsonFileName(exportedAt: Date = new Date()): string {
  return `hall-of-fame-archive-${hallOfFameDirectoryExportDate(exportedAt)}.json`;
}

export async function exportHallOfFameDirectoryAsPng(
  target: HTMLElement,
  options: HallOfFameDirectoryExportOptions,
): Promise<{ dataUrl: string; fileName: string }> {
  const { exportRecapAsPng } = await import('../season/recap-share');
  const { frame, cleanup } = createExportFrame(target, {
    title: 'Hall of Fame Directory',
    subtitle: `Filtered export // ${options.entryCount ?? 0} inductees`,
    footer: `${hallOfFameDirectoryExportDate(options.exportedAt ?? new Date())} • Hall of Fame • MFD`,
    themeVars: teamThemeVars(options.teamId ?? undefined),
  });
  const fileName = hallOfFameDirectoryFileName(options);

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

interface HallOfFamerRowProps {
  entry: HallOfFameEntry;
  dynastyTeamId: string;
  isPantheon?: boolean;
  onSelect: (selection: {
    entry: HallOfFameEntry;
    dynastyTeamId: string;
    isPantheon: boolean;
  }) => void;
}

function HallOfFamerRow({ entry, dynastyTeamId, isPantheon = false, onSelect }: HallOfFamerRowProps) {
  const isHomegrown = entry.teams[0] === dynastyTeamId;
  return (
    <button
      type="button"
      aria-label={`View Hall of Famer ${entry.name}`}
      onClick={() => onSelect({ entry, dynastyTeamId, isPantheon })}
      style={{
        appearance: 'none',
        width: '100%',
        margin: 0,
        padding: 0,
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px',
          borderLeft: '3px solid var(--mfd-team-primary)',
          background: 'var(--mfd-bg-elevated)',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...monoSm, color: '#fff', fontWeight: 700 }}>{entry.name}</span>
            <PixelBadge variant="default">{entry.position}</PixelBadge>
            <PixelBadge variant="gold">{entry.inductionYear}</PixelBadge>
            {isPantheon ? <PixelBadge variant="gold">PANTHEON</PixelBadge> : null}
            {isHomegrown ? <PixelBadge variant="cyan">HOMEGROWN</PixelBadge> : null}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Peak {entry.peakOvr} OVR // {entry.careerYears} seasons // score {Math.round(entry.score)}
          </div>
          {entry.awards.championships > 0 || entry.awards.mvps > 0 || entry.awards.allPros > 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              {entry.awards.championships ? `${entry.awards.championships}x Champ` : null}
              {entry.awards.championships && (entry.awards.mvps || entry.awards.allPros) ? ' // ' : null}
              {entry.awards.mvps ? `${entry.awards.mvps}x MVP` : null}
              {entry.awards.mvps && entry.awards.allPros ? ' // ' : null}
              {entry.awards.allPros ? `${entry.awards.allPros}x All-Pro` : null}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

interface DynastySectionProps {
  dynasty: HallOfFameArchiveDynasty;
  sort: SortMode;
  filter: FilterMode;
  groupMode: GroupMode;
  isCurrent: boolean;
  onSelect: (selection: {
    entry: HallOfFameEntry;
    dynastyTeamId: string;
    isPantheon: boolean;
  }) => void;
}

function DynastySection({ dynasty, sort, filter, groupMode, isCurrent, onSelect }: DynastySectionProps) {
  const entries = useMemo(
    () => sortEntries(applyFilter(dynasty.entries, dynasty.teamId, filter), sort),
    [dynasty.entries, dynasty.teamId, filter, sort],
  );
  const eraGroups = useMemo(() => groupEntriesByEra(entries), [entries]);
  const topEntry = useMemo(() => topHallOfFamerByScore(dynasty), [dynasty]);

  if (entries.length === 0) return null;

  return (
    <div style={teamThemeVars(dynasty.teamId)}>
      <PixelPanel title={`${dynasty.teamCity} ${dynasty.teamName}`} accent="gold">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            borderTop: '2px solid var(--mfd-team-secondary)',
            paddingTop: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelBadge variant="gold">{dynasty.teamAbbr}</PixelBadge>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Dynasty started {dynasty.startYear} // last synced {dynasty.lastSyncedYear}
            </span>
            {isCurrent ? <PixelBadge variant="cyan">ACTIVE</PixelBadge> : null}
          </div>
          {groupMode === 'era' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {eraGroups.map((group, index) => (
                <div
                  key={`${dynasty.dynastyId}-${group.decade}`}
                  style={index === 0 ? undefined : {
                    borderTop: '2px solid var(--mfd-team-secondary)',
                    paddingTop: '8px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <PixelBadge variant="gold">{group.decade}s</PixelBadge>
                    <PixelBadge variant="default">
                      {group.entries.length} HOFer{group.entries.length === 1 ? '' : 's'}
                    </PixelBadge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.entries.map((entry) => (
                      <HallOfFamerRow
                        key={`${dynasty.dynastyId}-${entry.playerId}-${entry.inductionYear}`}
                        entry={entry}
                        dynastyTeamId={dynasty.teamId}
                        isPantheon={entry.playerId === topEntry?.playerId}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {entries.map((entry) => (
                <HallOfFamerRow
                  key={`${dynasty.dynastyId}-${entry.playerId}-${entry.inductionYear}`}
                  entry={entry}
                  dynastyTeamId={dynasty.teamId}
                  isPantheon={entry.playerId === topEntry?.playerId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      </PixelPanel>
    </div>
  );
}

export function HallOfFameDirectory({
  initialGroupMode = 'flat',
}: {
  initialGroupMode?: GroupMode;
} = {}) {
  const game = useGameStore((state) => state.game);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [sort, setSort] = useState<SortMode>('induction');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [groupMode, setGroupMode] = useState<GroupMode>(initialGroupMode);
  const [selectedEntry, setSelectedEntry] = useState<{
    entry: HallOfFameEntry;
    dynastyTeamId: string;
    isPantheon: boolean;
  } | null>(null);
  const [archiveRevision, setArchiveRevision] = useState(0);
  const [archiveImportText, setArchiveImportText] = useState('');
  const [archiveTransferStatus, setArchiveTransferStatus] = useState<string | null>(null);
  const [archiveTransferError, setArchiveTransferError] = useState<string | null>(null);

  const payload = useMemo(() => {
    void archiveRevision;
    return readHallOfFameArchive();
  }, [archiveRevision]);
  const summary = summarizeHallOfFameArchive(payload);
  const currentDynastyId = game ? deriveDynastyId(game) : null;
  const currentUserTeamId = Object.values(game?.teams ?? {}).find((team) => team.isUser)?.id ?? null;
  const currentSnapshot = currentDynastyId ? payload.dynastiesById[currentDynastyId] ?? null : null;
  const currentSaveInducteeCount = game?.hallOfFame?.length ?? 0;
  const currentSnapshotInducteeCount = currentSnapshot?.entries.length ?? 0;
  const allDynasties = listDynastiesByStartYear(payload);
  const dynasties = filter === 'current' && currentDynastyId
    ? allDynasties.filter((dynasty) => dynasty.dynastyId === currentDynastyId)
    : allDynasties;

  const hasAnyEntries = summary.totalInductees > 0;
  const visibleEntryCount = dynasties.reduce(
    (total, dynasty) => total + applyFilter(dynasty.entries, dynasty.teamId, filter).length,
    0,
  );
  const canSyncCurrentSnapshot = Boolean(game && currentUserTeamId && currentSaveInducteeCount > 0);

  const handleSyncCurrentSnapshot = () => {
    const wrote = syncHallOfFameArchiveSnapshot(game, currentUserTeamId);
    if (!wrote) return;
    setArchiveRevision((revision) => revision + 1);
  };

  const handleExport = async () => {
    if (!exportRef.current || visibleEntryCount === 0) return;
    await exportHallOfFameDirectoryAsPng(exportRef.current, {
      sort,
      filter,
      entryCount: visibleEntryCount,
      teamId: currentUserTeamId,
    });
  };

  const handleExportArchiveJson = () => {
    const exportedAt = new Date();
    const json = exportHallOfFameArchiveJson(payload, exportedAt);

    if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
      setArchiveTransferStatus('Archive JSON is ready, but this browser cannot start a download.');
      setArchiveTransferError(null);
      return;
    }

    const href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = hallOfFameArchiveJsonFileName(exportedAt);
    link.click();
    URL.revokeObjectURL(href);
    setArchiveTransferStatus(`Exported ${summary.totalInductees} HOFers from ${Object.keys(payload.dynastiesById).length} dynasties.`);
    setArchiveTransferError(null);
  };

  const handleImportArchiveJson = () => {
    const result = importHallOfFameArchiveJson(archiveImportText);
    if (!result.ok) {
      setArchiveTransferError(result.reason);
      setArchiveTransferStatus(null);
      return;
    }

    setArchiveRevision((revision) => revision + 1);
    setArchiveImportText('');
    setArchiveTransferStatus(`Imported ${result.inductees} HOFers from ${result.dynasties} dynasties into mfd.hallOfFame.v1.`);
    setArchiveTransferError(null);
  };

  return (
    <div style={screenStackStyle}>
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
            title="Hall of Fame Directory"
            subtitle="Browser-local cross-dynasty snapshots for every archived Hall of Fame class on this device."
            badges={(
              <>
                <PixelBadge variant="gold">CANTON</PixelBadge>
                <PixelBadge variant="cyan">BROWSER ARCHIVE</PixelBadge>
              </>
            )}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <PixelButton accent="gold" onClick={() => { void handleExport(); }} disabled={visibleEntryCount === 0}>
            Export Hall of Fame
          </PixelButton>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Exports all {visibleEntryCount} inductees matching current filter.
          </div>
        </div>
      </div>

      <div style={autoGrid(180)}>
        <PixelMetricCard label="Total HOFers" value={summary.totalInductees} accent="gold" detail="Across all dynasties" />
        <PixelMetricCard label="Homegrown" value={summary.totalHomegrown} accent="cyan" detail="First team was yours" />
        <PixelMetricCard label="Championships" value={summary.totalChampionships} accent="green" detail="Inductee ring totals" />
        <PixelMetricCard label="MVPs" value={summary.totalMvps} accent="red" detail="Inductee MVP totals" />
        <PixelMetricCard label="Dynasties" value={summary.dynastiesRepresented} accent="default" detail="Represented in the Hall" />
      </div>

      <PixelPanel title="Archive Source" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">mfd.hallOfFame.v1</PixelBadge>
            <PixelBadge variant="gold">Year rollover snapshot</PixelBadge>
            <PixelBadge variant={currentDynastyId ? 'green' : 'default'}>
              {currentDynastyId ? 'Current dynasty comparable' : 'No active dynasty'}
            </PixelBadge>
          </div>
          <div style={autoGrid(180)}>
            <PixelMetricCard
              label="Live Save HOFers"
              value={currentSaveInducteeCount}
              accent="gold"
              detail="game.hallOfFame now"
            />
            <PixelMetricCard
              label="Sidecar Snapshot"
              value={currentSnapshotInducteeCount}
              accent="cyan"
              detail={currentSnapshot ? `last synced ${currentSnapshot.lastSyncedYear}` : 'No current snapshot'}
            />
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            This directory reads the browser-local Hall of Fame sidecar through readHallOfFameArchive(). The
            Current Dynasty filter uses the active save only to select the matching deriveDynastyId(game) snapshot
            and compare the live game.hallOfFame count. Opening Hall of Fame does not run
            syncHallOfFameArchiveAtYearRollover, import older snapshots, write GameState, change the sidecar,
            autosave, or play games or reroll saved outcomes.
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelButton
              accent="cyan"
              onClick={handleSyncCurrentSnapshot}
              disabled={!canSyncCurrentSnapshot}
            >
              Sync Current Save
            </PixelButton>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Explicitly writes this current dynasty's saved game.hallOfFame snapshot to mfd.hallOfFame.v1.
            </span>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            Sync Current Save never imports sidecar entries back into GameState, autosaves, changes HOF induction
            logic, or plays games or rerolls saved outcomes. A count mismatch means the sidecar is stale until app-shell year rollover or
            this explicit sync writes the current full snapshot.
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="Archive Portability" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelBadge variant="gold">JSON SIDECAR</PixelBadge>
            <PixelBadge variant="cyan">mfd.hallOfFame.v1 only</PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            Export and import move only the Hall of Fame sidecar archive. They do not create a save cartridge,
            write GameState, import sidecar entries into a live save, autosave, or play games or reroll saved outcomes.
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelButton accent="gold" onClick={handleExportArchiveJson}>
              Export Archive JSON
            </PixelButton>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Downloads the current mfd.hallOfFame.v1 payload in a versioned archive envelope.
            </span>
          </div>
          <textarea
            aria-label="Paste Hall of Fame archive JSON"
            placeholder="Paste Hall of Fame archive JSON"
            value={archiveImportText}
            onChange={(event) => setArchiveImportText(event.target.value)}
            style={{
              minHeight: '96px',
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              background: 'var(--mfd-bg-elevated)',
              color: 'var(--mfd-text)',
              border: '1px solid var(--mfd-border)',
              borderRadius: '4px',
              padding: '10px',
              fontFamily: 'inherit',
              fontSize: '12px',
              lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelButton
              accent="cyan"
              onClick={handleImportArchiveJson}
              disabled={archiveImportText.trim().length === 0}
            >
              Import Archive JSON
            </PixelButton>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Validates the archive before replacing this browser's mfd.hallOfFame.v1 sidecar.
            </span>
          </div>
          {archiveTransferStatus ? (
            <div style={{ ...monoSm, color: 'var(--mfd-accent-green, #53d18a)', lineHeight: 1.6 }}>
              {archiveTransferStatus}
            </div>
          ) : null}
          {archiveTransferError ? (
            <div style={{ ...monoSm, color: 'var(--mfd-accent-red, #ff6b6b)', lineHeight: 1.6 }}>
              {archiveTransferError}
            </div>
          ) : null}
        </div>
      </PixelPanel>

      <PixelPanel title="Controls" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Sort:</span>
            {SORT_MODES.map((mode) => (
              <PixelButton
                key={mode.id}
                accent={mode.id === sort ? 'gold' : 'default'}
                onClick={() => setSort(mode.id)}
              >
                {mode.label}
              </PixelButton>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Filter:</span>
            {FILTER_MODES.map((mode) => (
              <PixelButton
                key={mode.id}
                accent={mode.id === filter ? 'cyan' : 'default'}
                onClick={() => setFilter(mode.id)}
                disabled={mode.id === 'current' && !currentDynastyId}
              >
                {mode.label}
              </PixelButton>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Group:</span>
            {GROUP_MODES.map((mode) => (
              <PixelButton
                key={mode.id}
                accent={mode.id === groupMode ? 'gold' : 'default'}
                onClick={() => setGroupMode(mode.id)}
              >
                {mode.label}
              </PixelButton>
            ))}
          </div>
        </div>
      </PixelPanel>

      {!hasAnyEntries ? (
        <PixelPanel title="Hall of Fame" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No inductees have been archived yet. Complete a season that inducts a Hall of Famer to populate this directory.
          </div>
        </PixelPanel>
      ) : visibleEntryCount === 0 ? (
        <PixelPanel title="Filtered View" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No inductees match the current filter.
          </div>
        </PixelPanel>
      ) : (
        <div ref={exportRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {dynasties.map((dynasty) => (
            <DynastySection
              key={dynasty.dynastyId}
              dynasty={dynasty}
              sort={sort}
              filter={filter}
              groupMode={groupMode}
              isCurrent={dynasty.dynastyId === currentDynastyId}
              onSelect={(selection) => setSelectedEntry(selection)}
            />
          ))}
        </div>
      )}

      <HallOfFamerDetailModal
        entry={selectedEntry?.entry ?? null}
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        teams={game?.teams ?? {}}
        dynastyTeamId={selectedEntry?.dynastyTeamId ?? null}
        isPantheon={selectedEntry?.isPantheon ?? false}
      />
    </div>
  );
}
