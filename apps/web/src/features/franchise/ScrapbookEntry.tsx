import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getTeamContent } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { StoredScrapbookEntry } from '../../lib/scrapbook-store';
import { SeasonRecapCard } from '../season/SeasonRecapCard';
import { exportRecapAsPng } from '../season/recap-share';
import { autoGrid, display, monoSm } from '../shared/pixelUi';
import { PlayoffLoreCardView } from '../playoffs/PlayoffLoreCard';

function playoffLabel(playoffResult: StoredScrapbookEntry['recap']['playoffResult']): string {
  switch (playoffResult) {
    case 'champion':
      return 'Champion';
    case 'championship-loss':
      return 'Championship Loss';
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

function scrapbookThemeVars(teamId: string): CSSProperties {
  const content = getTeamContent(teamId);
  return {
    '--mfd-scrapbook-primary': content?.primaryColor ?? 'var(--mfd-gold)',
    '--mfd-scrapbook-secondary': content?.secondaryColor ?? 'var(--mfd-cyan)',
    '--mfd-scrapbook-tertiary': content?.tertiaryColor ?? 'var(--mfd-green)',
  } as CSSProperties;
}

function importanceAccent(importance: StoredScrapbookEntry['notableMoments'][number]['importance']) {
  if (importance === 'breaking') return 'gold' as const;
  if (importance === 'major') return 'cyan' as const;
  return 'default' as const;
}

function playoffAccent(playoffResult: StoredScrapbookEntry['recap']['playoffResult']) {
  if (playoffResult === 'champion') return 'gold' as const;
  if (playoffResult === 'missed') return 'red' as const;
  return 'cyan' as const;
}

interface ScrapbookEntryCardProps {
  entry: StoredScrapbookEntry;
  defaultExpanded?: boolean;
  exportNode?: HTMLElement | null;
}

export async function exportScrapbookEntryAsPng(
  target: HTMLElement,
  entry: StoredScrapbookEntry,
): Promise<string> {
  const dataUrl = await exportRecapAsPng(target);
  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${entry.recap.teamAbbr}-${entry.year}-scrapbook.png`;
    link.click();
  }
  return dataUrl;
}

export function ScrapbookEntryCard({
  entry,
  defaultExpanded = false,
  exportNode,
}: ScrapbookEntryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [status, setStatus] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const themeVars = scrapbookThemeVars(entry.recap.teamId);
  const playoffLoreCards = entry.playoffLoreCards ?? [];

  const handleExport = async () => {
    const target = exportNode ?? cardRef.current;
    if (!target) return;

    await exportScrapbookEntryAsPng(target, entry);
    setStatus('PNG export ready.');
  };

  return (
    <section
      ref={exportNode ? undefined : cardRef}
      style={{
        ...themeVars,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        border: '3px solid var(--mfd-scrapbook-secondary)',
        background: 'var(--mfd-bg-2)',
        boxShadow: '0 0 0 2px var(--mfd-scrapbook-primary) inset',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ ...display, fontSize: '24px', color: 'var(--mfd-text)', lineHeight: 1 }}>
              {entry.year}
            </div>
            <PixelBadge variant="cyan">{entry.eraTag}</PixelBadge>
            <PixelBadge variant={playoffAccent(entry.recap.playoffResult)}>
              {playoffLabel(entry.recap.playoffResult)}
            </PixelBadge>
            {playoffLoreCards.length > 0 ? (
              <PixelBadge variant="gold">{playoffLoreCards.length} PLAYOFF CARDS</PixelBadge>
            ) : null}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
            {entry.recap.teamCity} {entry.recap.teamName} // {entry.recap.record}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            {entry.seasonHighlightLine}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <PixelButton accent="default" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Hide Details' : 'View Details'}
          </PixelButton>
        </div>
      </div>

      {expanded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <PixelButton accent="gold" onClick={() => { void handleExport(); }}>
              Export as PNG
            </PixelButton>
            {status ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{status}</div>
            ) : null}
          </div>

          <SeasonRecapCard recap={entry.recap} />

          <div style={autoGrid(260)}>
            {playoffLoreCards.length > 0 ? (
              <PixelPanel title="Playoff Lore" accent="gold">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {playoffLoreCards.map((card) => (
                    <PlayoffLoreCardView key={card.gameId} card={card} />
                  ))}
                </div>
              </PixelPanel>
            ) : null}
            <PixelPanel title="Notable Moments" accent="cyan">
              {entry.notableMoments.length === 0 ? (
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
                  No notable moments recorded for this season.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {entry.notableMoments.map((moment, index) => (
                    <div
                      key={`${entry.year}-${moment.headline}-${index}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '10px',
                        border: '2px solid var(--mfd-border)',
                        background: 'var(--mfd-bg-3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{moment.headline}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <PixelBadge variant={importanceAccent(moment.importance)}>{moment.importance.toUpperCase()}</PixelBadge>
                          {moment.week !== null ? <PixelBadge variant="default">WEEK {moment.week}</PixelBadge> : null}
                        </div>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                        {moment.detail}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PixelPanel>
          </div>
        </div>
      ) : null}
    </section>
  );
}
