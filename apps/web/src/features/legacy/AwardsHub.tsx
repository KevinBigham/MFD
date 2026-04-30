import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { AwardsHistoryEntry } from '@mfd/engine';
import { selectAwardsHistory, useGameStore } from '../../app/store/game-store';
import {
  PixelScreenHeader,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

type AwardsHubCategoryId = 'mvp' | 'opoy' | 'dpoy' | 'comeback_player' | 'oroy' | 'droy';
type AwardsHubAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

interface AwardsHubCategory {
  id: AwardsHubCategoryId;
  label: string;
  shortLabel: string;
  accent: AwardsHubAccent;
}

export const AWARDS_HUB_CATEGORY_IDS: AwardsHubCategoryId[] = [
  'mvp',
  'opoy',
  'dpoy',
  'comeback_player',
  'oroy',
  'droy',
];

const AWARD_CATEGORIES: AwardsHubCategory[] = [
  { id: 'mvp', label: 'MVP', shortLabel: 'MVP', accent: 'gold' },
  { id: 'opoy', label: 'Offensive Player of the Year', shortLabel: 'OPOY', accent: 'green' },
  { id: 'dpoy', label: 'Defensive Player of the Year', shortLabel: 'DPOY', accent: 'red' },
  { id: 'comeback_player', label: 'Comeback Player of the Year', shortLabel: 'CPOY', accent: 'gold' },
  { id: 'oroy', label: 'Offensive Rookie of the Year', shortLabel: 'OROY', accent: 'cyan' },
  { id: 'droy', label: 'Defensive Rookie of the Year', shortLabel: 'DROY', accent: 'cyan' },
];

type AwardResult = AwardsHistoryEntry['awards'][number];

function sortAwardsHistory(history: AwardsHistoryEntry[]): AwardsHistoryEntry[] {
  return [...history].sort((a, b) => b.year - a.year);
}

export function getAdjacentAwardYear(
  history: AwardsHistoryEntry[],
  currentYear: number,
  direction: 'newer' | 'older',
): number {
  const years = sortAwardsHistory(history).map((entry) => entry.year);
  const index = years.indexOf(currentYear);
  if (index === -1) return years[0] ?? currentYear;

  const nextIndex = direction === 'newer'
    ? Math.max(0, index - 1)
    : Math.min(years.length - 1, index + 1);

  return years[nextIndex] ?? currentYear;
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function votingMargin(award: AwardResult): string | null {
  const runnerUp = award.runnersUp[0];
  if (!runnerUp) return null;
  const margin = Math.max(0, award.score - runnerUp.score);
  return `Margin +${formatScore(Math.round(margin * 10) / 10)}`;
}

function AwardCard({
  award,
  category,
}: {
  award: AwardResult | null;
  category: AwardsHubCategory;
}) {
  const margin = award ? votingMargin(award) : null;

  return (
    <div data-award-card={category.id}>
      <PixelPanel title={award?.label ?? category.label} accent={category.accent}>
        {award ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>
                  {award.label}
                </span>
                <span style={{ ...monoSm, color: 'var(--mfd-text)', fontSize: '14px' }}>
                  {award.winnerName}
                </span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                  {award.narrative}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <PixelBadge variant={category.accent}>{category.shortLabel}</PixelBadge>
                <PixelBadge variant="default">{award.winnerPosition}</PixelBadge>
                <PixelBadge variant="cyan">{award.winnerTeam}</PixelBadge>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="green">Score {formatScore(award.score)}</PixelBadge>
              {margin ? <PixelBadge variant="gold">{margin}</PixelBadge> : null}
            </div>

            {award.runnersUp.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>RUNNERS-UP</span>
                {award.runnersUp.slice(0, 3).map((runner) => (
                  <div
                    key={runner.entityId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      border: '2px solid var(--mfd-border)',
                      background: 'var(--mfd-bg-3)',
                      padding: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{runner.name}</span>
                    <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      {runner.teamName} // Score {formatScore(runner.score)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No winner recorded.
          </span>
        )}
      </PixelPanel>
    </div>
  );
}

export function AwardsHub() {
  const awardsHistory = useGameStore(selectAwardsHistory);
  const sortedHistory = useMemo(() => sortAwardsHistory(awardsHistory), [awardsHistory]);
  const [selectedYear, setSelectedYear] = useState<number | null>(sortedHistory[0]?.year ?? null);
  const selectedEntry = sortedHistory.find((entry) => entry.year === selectedYear) ?? sortedHistory[0] ?? null;
  const activeYear = selectedEntry?.year ?? null;
  const hasNewer = activeYear !== null && getAdjacentAwardYear(sortedHistory, activeYear, 'newer') !== activeYear;
  const hasOlder = activeYear !== null && getAdjacentAwardYear(sortedHistory, activeYear, 'older') !== activeYear;

  if (!selectedEntry || activeYear === null) {
    return (
      <div style={screenStackStyle}>
        <div data-spotlight-target="chip.route.awards-hub.beat-1">
          <PixelScreenHeader
            title="Awards Hub"
            subtitle="League honors archive for completed seasons."
            badges={<PixelBadge variant="gold">AWARDS</PixelBadge>}
          />
        </div>
        <PixelPanel title="Awards Archive" accent="default">
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No award classes archived yet.
          </span>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <div data-spotlight-target="chip.route.awards-hub.beat-1">
        <PixelScreenHeader
          title="Awards Hub"
          subtitle="Season-by-season MVP races, rookie breakouts, and league honors."
          badges={(
            <>
              <PixelBadge variant="gold">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Trophy size={14} aria-hidden="true" />
                  {sortedHistory.length} classes
                </span>
              </PixelBadge>
              <PixelBadge variant="cyan">{activeYear}</PixelBadge>
            </>
          )}
        />
      </div>

      <PixelPanel title="Season Scrubber" accent="gold">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <PixelButton
            accent="cyan"
            disabled={!hasNewer}
            onClick={() => setSelectedYear(getAdjacentAwardYear(sortedHistory, activeYear, 'newer'))}
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Newer
          </PixelButton>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {sortedHistory.map((entry) => (
              <PixelButton
                key={entry.year}
                accent={entry.year === activeYear ? 'gold' : 'default'}
                aria-pressed={entry.year === activeYear}
                onClick={() => setSelectedYear(entry.year)}
              >
                {entry.year}
              </PixelButton>
            ))}
          </div>
          <PixelButton
            accent="cyan"
            disabled={!hasOlder}
            onClick={() => setSelectedYear(getAdjacentAwardYear(sortedHistory, activeYear, 'older'))}
          >
            Older
            <ChevronRight size={14} aria-hidden="true" />
          </PixelButton>
        </div>
      </PixelPanel>

      <PixelPanel title={selectedEntry.ceremony.headline} accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
            {selectedEntry.ceremony.headline}
          </span>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            {selectedEntry.ceremony.intro}
          </span>
        </div>
      </PixelPanel>

      <div style={autoGrid(320)}>
        {AWARD_CATEGORIES.map((category) => (
          <AwardCard
            key={category.id}
            category={category}
            award={selectedEntry.awards.find((entry) => entry.awardId === category.id) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
