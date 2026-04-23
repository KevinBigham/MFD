import { useMemo, useState } from 'react';
import type { NewsItem, PowerRanking } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import {
  useGameStore,
  selectLeagueNews,
  selectPowerRankings,
  selectUserPowerRanking,
  selectUserTeam,
} from '../../app/store/game-store';
import { EmptyState } from '../shared/EmptyState';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  pixelSm,
  screenStackStyle,
  teamThemeVars,
} from '../shared/pixelUi';
import { HeadlineModal } from './HeadlineModal';
import { PowerRankingsTicker } from './PowerRankingsTicker';
import { StorylineThreadCard } from './StorylineThreadCard';
import type { StorylineThread } from './types';

type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

/**
 * Ranking of a story's editorial weight. Breaking outranks major outranks minor;
 * within a bucket, newer items (higher year * 100 + week) outrank older.
 */
function storyWeight(item: NewsItem): number {
  const bucket = item.importance === 'breaking' ? 2_000_000 : item.importance === 'major' ? 1_000_000 : 0;
  return bucket + item.year * 100 + item.week;
}

function pickLeadStory(news: NewsItem[]): NewsItem | null {
  if (news.length === 0) return null;
  return [...news].sort((a, b) => storyWeight(b) - storyWeight(a))[0] ?? null;
}

function pickSubHeadlines(news: NewsItem[], lead: NewsItem | null, count: number): NewsItem[] {
  return [...news]
    .filter((item) => item.id !== lead?.id)
    .sort((a, b) => storyWeight(b) - storyWeight(a))
    .slice(0, count);
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `UP ${delta}`;
  if (delta < 0) return `DOWN ${Math.abs(delta)}`;
  return 'EVEN';
}

function deltaAccent(delta: number): Accent {
  if (delta > 0) return 'green';
  if (delta < 0) return 'red';
  return 'default';
}

function importanceAccent(importance: NewsItem['importance']): Accent {
  if (importance === 'breaking') return 'gold';
  if (importance === 'major') return 'cyan';
  return 'default';
}

interface NewsroomDigestProps {
  /**
   * Injected by tests and also used by the route wrapper once Codex's
   * engine storyline selector lands. When undefined, the digest reads from the
   * store via `selectStorylineThreads` (optional chain — defaults to empty).
   */
  storylines?: StorylineThread[];
}

/**
 * Weekly editorial digest aggregating the league-news wire + power rankings +
 * active storyline threads into a single broadcast page. Designed as a standalone
 * route at `/newsroom`, with a loading-friendly empty state when no team or game
 * is loaded.
 *
 * Storyline data is optional — if the engine module has not yet shipped, the
 * storyline panel renders a "no active threads" note instead of breaking.
 */
export function NewsroomDigest({ storylines }: NewsroomDigestProps = {}) {
  const team = useGameStore(selectUserTeam);
  const leagueNews = useGameStore(selectLeagueNews);
  const rankings = useGameStore(selectPowerRankings);
  const userRanking = useGameStore(selectUserPowerRanking);
  const [selectedStory, setSelectedStory] = useState<NewsItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const lead = useMemo(() => pickLeadStory(leagueNews), [leagueNews]);
  const subHeadlines = useMemo(() => pickSubHeadlines(leagueNews, lead, 4), [leagueNews, lead]);

  const topRanked: PowerRanking | null = rankings[0] ?? null;
  const biggestMover = useMemo(() =>
    [...rankings].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.rank - b.rank)[0] ?? null,
  [rankings]);

  const threads = storylines ?? [];
  const activeThreads = threads.filter((thread) => thread.status === 'active');

  if (!team) {
    return (
      <EmptyState
        title="Newsroom"
        reason="No active franchise is loaded."
        nextStep="Start or load a dynasty to pull the weekly digest."
      />
    );
  }

  const openStory = (item: NewsItem) => {
    setSelectedStory(item);
    setModalOpen(true);
  };

  return (
    <div
      style={{
        ...screenStackStyle,
        ...teamThemeVars(team.id),
        borderTop: '3px solid var(--mfd-team-primary)',
        paddingTop: '8px',
      }}
    >
      <PixelScreenHeader
        title="Newsroom"
        subtitle="Weekly broadcast digest — editorial pick of the wire, rankings movement, and live storylines."
        badges={(
          <>
            <PixelBadge variant="gold">{leagueNews.length} stories</PixelBadge>
            {userRanking ? <PixelBadge variant="cyan">YOU #{userRanking.rank}</PixelBadge> : null}
            {activeThreads.length > 0 ? (
              <PixelBadge variant="green">{activeThreads.length} storylines</PixelBadge>
            ) : null}
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="Lead Story"
          value={lead ? lead.importance.toUpperCase() : 'QUIET'}
          accent={lead ? importanceAccent(lead.importance) : 'default'}
          detail={lead?.headline ?? 'Wire is quiet this week.'}
          badge={lead ? <PixelBadge variant={importanceAccent(lead.importance)}>{lead.type}</PixelBadge> : null}
        />
        <PixelMetricCard
          label="No. 1 Team"
          value={topRanked ? `#${topRanked.rank}` : 'N/A'}
          accent="gold"
          detail={topRanked ? `${topRanked.teamName} // ${topRanked.record}` : 'No rankings yet.'}
          badge={topRanked ? <PixelBadge variant="gold">{topRanked.record}</PixelBadge> : null}
        />
        <PixelMetricCard
          label="Biggest Mover"
          value={biggestMover ? biggestMover.teamName : 'N/A'}
          accent={biggestMover ? deltaAccent(biggestMover.delta) : 'default'}
          detail={biggestMover ? `Rank #${biggestMover.rank} // ${deltaLabel(biggestMover.delta)}` : 'No movement this week.'}
          badge={biggestMover ? (
            <PixelBadge variant={deltaAccent(biggestMover.delta)}>{deltaLabel(biggestMover.delta)}</PixelBadge>
          ) : null}
        />
        <PixelMetricCard
          label="Your Position"
          value={userRanking ? `#${userRanking.rank}` : 'UNRANKED'}
          accent={userRanking ? 'cyan' : 'default'}
          detail={userRanking?.blurb ?? 'Advance a regular-season week to enter the table.'}
          badge={userRanking ? (
            <PixelBadge variant={deltaAccent(userRanking.delta)}>{deltaLabel(userRanking.delta)}</PixelBadge>
          ) : null}
        />
      </div>

      <PixelPanel title="Top of the Wire" accent={lead ? importanceAccent(lead.importance) : 'cyan'}>
        {lead ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ ...display, fontSize: '32px', color: 'var(--mfd-text)', lineHeight: 1.1 }}>
                {lead.headline.toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <PixelBadge variant={importanceAccent(lead.importance)}>{lead.importance.toUpperCase()}</PixelBadge>
                <PixelBadge variant="default">{`Y${lead.year} W${lead.week}`}</PixelBadge>
                <PixelBadge variant="cyan">{lead.type}</PixelBadge>
              </div>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.8 }}>
              {lead.body}
            </div>
            <div>
              <PixelButton accent="gold" onClick={() => openStory(lead)}>
                Open Story
              </PixelButton>
            </div>
          </div>
        ) : (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No breaking or major stories hit the wire this cycle.
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="Rest of the Wire" accent="cyan">
        {subHeadlines.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            Nothing else broke this week.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {subHeadlines.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => openStory(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openStory(item);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '10px 12px',
                  border: `2px solid ${item.importance === 'breaking' ? 'var(--mfd-gold)' : item.importance === 'major' ? 'var(--mfd-cyan)' : 'var(--mfd-border)'}`,
                  background: 'var(--mfd-bg-2)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ ...display, fontSize: '20px', color: 'var(--mfd-text)', lineHeight: 1.1 }}>
                    {item.headline.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <PixelBadge variant={importanceAccent(item.importance)}>{item.importance}</PixelBadge>
                    <PixelBadge variant="default">{`Y${item.year} W${item.week}`}</PixelBadge>
                  </div>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                  {item.body.length > 160 ? `${item.body.slice(0, 160)}...` : item.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="Rankings Movement" accent="gold">
        <PowerRankingsTicker limit={12} />
      </PixelPanel>

      <PixelPanel title="Active Storylines" accent="green">
        {activeThreads.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ ...pixelSm, color: 'var(--mfd-green)' }}>NO ACTIVE THREADS</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Storyline threads unlock after two consecutive weeks of related wire activity
              (QB benchings, locker-room friction, coach hot seats, rivalry revenge arcs).
            </div>
          </div>
        ) : (
          <div style={autoGrid(280)}>
            {activeThreads.map((thread) => (
              <StorylineThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        )}
      </PixelPanel>

      <HeadlineModal item={selectedStory} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
