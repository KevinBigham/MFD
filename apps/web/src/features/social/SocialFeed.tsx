import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { selectSocialFeed, useGameStore } from '../../app/store/game-store';
import { PixelScreenHeader, monoSm, screenStackStyle } from '../shared/pixelUi';

type FilterMode = 'all' | 'player' | 'fan' | 'analyst' | 'reporter';

const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'player', label: 'Players' },
  { id: 'fan', label: 'Fans' },
  { id: 'analyst', label: 'Analysts' },
  { id: 'reporter', label: 'Reporters' },
];

function authorAccent(source: string): 'default' | 'gold' | 'cyan' | 'green' {
  if (source === 'player') return 'gold';
  if (source === 'analyst') return 'cyan';
  if (source === 'reporter') return 'green';
  return 'default';
}

export function SocialFeed() {
  const feed = useGameStore(selectSocialFeed);
  const [filter, setFilter] = useState<FilterMode>('all');

  const visiblePosts = useMemo(() => {
    const ordered = [...feed].reverse();
    if (filter === 'all') return ordered;
    return ordered.filter((post) => post.source === filter);
  }, [feed, filter]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="MFSN Social Feed"
        subtitle="Players, fans, and analysts reacting to every move that matters."
        badges={<PixelBadge variant="cyan">{feed.length} posts</PixelBadge>}
      />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {FILTERS.map((entry) => (
          <PixelButton key={entry.id} accent={filter === entry.id ? 'gold' : 'default'} onClick={() => setFilter(entry.id)}>
            {entry.label}
          </PixelButton>
        ))}
      </div>

      {visiblePosts.length === 0 ? (
        <PixelPanel title="No Posts Yet" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No posts yet — advance a week to generate buzz.
          </div>
        </PixelPanel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {visiblePosts.map((post) => (
            <div key={post.id} style={{ marginLeft: post.replyTo ? '20px' : 0, position: 'relative' }}>
              {post.replyTo ? (
                <div style={{
                  position: 'absolute',
                  left: '-12px',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: 'var(--mfd-cyan)',
                }}
                />
              ) : null}
              <PixelPanel title={post.authorName} accent={authorAccent(post.source)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <PixelBadge variant={authorAccent(post.source)}>{post.source.toUpperCase()}</PixelBadge>
                    <PixelBadge variant="default">{post.sentiment.toUpperCase()}</PixelBadge>
                    <PixelBadge variant="cyan">WK {post.timestamp}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>{post.content}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    {post.likes.toLocaleString()} likes
                  </div>
                </div>
              </PixelPanel>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
