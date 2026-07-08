import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelNav, PixelPanel } from '@mfd/design-system/components';
import { selectLeagueNews, selectTeamNews, selectTeams, selectUserTeamId, useGameStore } from '../../app/store/game-store';
import {
  PixelScreenHeader,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

type NewsFilter = 'all' | 'my-team' | 'trades' | 'injuries' | 'records' | 'coaching';

function importanceAccent(importance: string): 'gold' | 'cyan' | 'default' {
  if (importance === 'breaking') return 'gold';
  if (importance === 'major') return 'cyan';
  return 'default';
}

export function LeagueNews() {
  const leagueNews = useGameStore(selectLeagueNews);
  const teamNews = useGameStore(selectTeamNews);
  const teams = useGameStore(selectTeams);
  const userTeamId = useGameStore(selectUserTeamId);
  const [filter, setFilter] = useState<NewsFilter>('all');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const filteredNews = useMemo(() => {
    const source = filter === 'my-team' ? teamNews : leagueNews;
    if (filter === 'all' || filter === 'my-team') return source;
    return source.filter((item) => {
      if (filter === 'trades') return item.type === 'trade';
      if (filter === 'injuries') return item.type === 'injury' || item.type === 'waiver';
      if (filter === 'records') return item.type === 'record' || item.type === 'milestone' || item.type === 'rivalry';
      return item.type === 'coaching';
    });
  }, [filter, leagueNews, teamNews]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="League News"
        subtitle="Ticker feed of the league-wide broadcast wire, newest stories first."
        badges={(
          <>
            <PixelBadge variant="gold">{filteredNews.length} stories</PixelBadge>
            {userTeamId ? <PixelBadge variant="cyan">My Team Ready</PixelBadge> : null}
          </>
        )}
      />

      <PixelNav
        activeKey={filter}
        wrap
        items={[
          { key: 'all', label: 'All' },
          { key: 'my-team', label: 'My Team' },
          { key: 'trades', label: 'Trades' },
          { key: 'injuries', label: 'Injuries' },
          { key: 'records', label: 'Records' },
          { key: 'coaching', label: 'Coaching' },
        ]}
        onSelect={(value) => setFilter(value as NewsFilter)}
      />

      <PixelPanel title="Wire Source" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <PixelBadge variant="gold">Saved leagueNews</PixelBadge>
            <PixelBadge variant="cyan">Route-local filters</PixelBadge>
            <PixelBadge variant="default">Ticker separate</PixelBadge>
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            This route reads the saved league wire newest-first through selectors. Filters and expanded stories
            are local to this screen; the app-shell ticker and full-screen Breaking News interrupts are separate
            surfaces and are not consumed or dismissed here.
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="League Wire" accent={filteredNews[0]?.importance === 'breaking' ? 'gold' : 'cyan'}>
        {filteredNews.length === 0 ? (
          <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
            No stories match this filter right now.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredNews.map((item) => {
              const expanded = expandedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    border: `3px solid ${item.importance === 'breaking' ? 'var(--mfd-gold)' : item.importance === 'major' ? 'var(--mfd-cyan)' : 'var(--mfd-border)'}`,
                    background: 'var(--mfd-bg-3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                      {item.headline.toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <PixelBadge variant={importanceAccent(item.importance)}>{item.importance}</PixelBadge>
                      <PixelBadge variant="default">{`Y${item.year} W${item.week}`}</PixelBadge>
                    </div>
                  </div>

                  <div style={{ ...monoSm, color: '#ccc', lineHeight: 1.7 }}>
                    {expanded ? item.body : `${item.body.slice(0, 140)}${item.body.length > 140 ? '...' : ''}`}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="cyan">{item.type}</PixelBadge>
                      {item.teamIds.map((teamId) => (
                        <PixelBadge key={`${item.id}-${teamId}`} variant={teamId === userTeamId ? 'gold' : 'default'}>
                          {teams?.[teamId] ? `${teams[teamId]!.city} ${teams[teamId]!.name}` : teamId}
                        </PixelBadge>
                      ))}
                    </div>
                    <PixelButton
                      accent="default"
                      onClick={() => {
                        setExpandedIds((current) => (
                          current.includes(item.id)
                            ? current.filter((entry) => entry !== item.id)
                            : [...current, item.id]
                        ));
                      }}
                    >
                      {expanded ? 'Collapse' : 'Expand'}
                    </PixelButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PixelPanel>
    </div>
  );
}
