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

function playoffLabel(playoffResult: ScrapbookEntry['recap']['playoffResult']): string {
  switch (playoffResult) {
    case 'champion':
      return 'Champion';
    case 'championship-loss':
      return 'Final Loss';
    case 'conf-loss':
      return 'Conference Loss';
    case 'division-loss':
      return 'Division Loss';
    case 'wild-card-loss':
      return 'Wild Card Loss';
    case 'missed':
    default:
      return 'Missed Playoffs';
  }
}

export function Scrapbook() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const dynastyId = game ? deriveDynastyId(game) : 'unknown-dynasty';
  const entries = readScrapbookForDynasty(dynastyId).sort(compareEntriesNewestFirst);
  const summary = summarizeScrapbook(entries);
  const dynastyName = team ? `${team.city} ${team.name}` : 'Current Dynasty';

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Dynasty Scrapbook"
        subtitle={`${dynastyName} archive across every completed season.`}
        badges={<PixelBadge variant="gold">SCRAPBOOK</PixelBadge>}
      />

      <div style={autoGrid(180)}>
        <PixelMetricCard label="Total Seasons" value={summary.totalSeasons} accent="gold" detail="Completed seasons saved to this dynasty" />
        <PixelMetricCard label="Championships" value={summary.totalChampionships} accent="green" detail="Titles captured in the archive" />
        <PixelMetricCard label="Winning Streak" value={summary.longestWinStreak} accent="cyan" detail="Consecutive winning seasons" />
        <PixelMetricCard label="Best Record" value={bestRecordLabel(summary.bestSingleSeasonRecord)} accent="default" detail="Best single-season mark" />
        <PixelMetricCard label="Breakouts" value={summary.totalBreakouts} accent="gold" detail="Unique breakout players recorded" />
      </div>

      <PixelPanel title="Archive Controls" accent="cyan">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            Export Full Scrapbook unlocks in the next slice. The timeline is already being assembled in newest-first order.
          </div>
          <PixelButton accent="gold" disabled>
            Export Full Scrapbook
          </PixelButton>
        </div>
      </PixelPanel>

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
  );
}
