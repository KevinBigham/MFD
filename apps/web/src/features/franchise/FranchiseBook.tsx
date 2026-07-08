/**
 * Sprint 47 "The Franchise Book" — the crown-jewel reader view.
 *
 * Route: /franchise/book
 *
 * Renders a scrollable, chapter-paginated book view of the user team's
 * dynasty. Engine `buildFranchiseBook` produces structured era chapters;
 * this component composes narrative prose from `era-templates.json` and
 * AGM margin commentary from `book-commentary.json` to give each chapter
 * a distinct voice.
 *
 * Desktop (≥1024px): sticky TOC sidebar left, chapter stream right.
 * Mobile (<1024px): collapsible TOC top sheet, stacked chapters.
 * Print: `@media print` strips chrome and enforces chapter page breaks
 * so browser Save-as-PDF produces a clean dynasty book for sharing.
 */
import { useMemo, useState } from 'react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import {
  buildFranchiseBook,
  type EraArcType,
  type EraChapter,
  type FranchiseBook,
} from '@mfd/engine';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import {
  PixelScreenHeader,
  display,
  mono,
  monoSm,
  pixel,
  pixelSm,
  screenStackStyle,
  teamThemeVars,
} from '../shared/pixelUi';
import eraTemplates from '../../../../../packages/content/narrative/era-templates.json';
import bookCommentary from '../../../../../packages/content/agm/book-commentary.json';

// ── Template helpers ────────────────────────────────────────────────

interface EraTemplateSection {
  openings: string[];
  signature: string[];
  closers: string[];
}

interface EraTemplates {
  schemaVersion: number;
  description: string;
  eras: Record<EraArcType, EraTemplateSection>;
  milestone_coda: Record<string, string>;
}

interface BookCommentary {
  schemaVersion: number;
  byArcType: Record<EraArcType, string[]>;
  byMilestoneFlag: Record<string, string>;
  byTrigger: Record<string, string>;
}

const templates = eraTemplates as EraTemplates;
const commentary = bookCommentary as BookCommentary;

function fillTemplate(
  raw: string,
  vars: Record<string, string>,
): string {
  return raw.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

// Deterministic picker — same chapter always gets the same template line.
function pickDeterministic<T>(list: T[], seed: string): T | null {
  if (list.length === 0) return null;
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % list.length;
  return list[idx] ?? null;
}

function eraVars(book: FranchiseBook, chapter: EraChapter): Record<string, string> {
  const topPlayer = chapter.signaturePlayers[0]?.name ?? 'the core';
  const winPct = (chapter.record.winPct * 100).toFixed(0);
  return {
    teamName: book.teamName,
    teamCity: book.teamCity,
    headCoach: chapter.headCoachName ?? 'the head coach',
    startYear: String(chapter.startYear),
    endYear: String(chapter.endYear),
    wins: String(chapter.record.wins),
    losses: String(chapter.record.losses),
    winPct: `${winPct}%`,
    titles: String(chapter.championships),
    seasons: String(chapter.record.seasons),
    topPlayer,
  };
}

// ── Arc presentation ────────────────────────────────────────────────

const ARC_LABELS: Record<EraArcType, string> = {
  ascent: 'Ascent',
  peak: 'Peak',
  golden: 'Golden Era',
  valley: 'Valley',
  rebuild: 'Rebuild',
  turbulent: 'Turbulent',
  steady: 'Steady',
};

const ARC_ACCENT: Record<EraArcType, 'gold' | 'cyan' | 'green' | 'red' | 'default'> = {
  ascent: 'cyan',
  peak: 'gold',
  golden: 'gold',
  valley: 'red',
  rebuild: 'cyan',
  turbulent: 'red',
  steady: 'default',
};

// ── Styles ──────────────────────────────────────────────────────────

const printStyles = `
@media print {
  body { background: white !important; color: black !important; }
  .mfd-franchise-book-toc,
  .mfd-franchise-book-header-kicker,
  .mfd-franchise-book-source-panel,
  .mfd-franchise-book-toc-toggle,
  nav, header, footer,
  button { display: none !important; }
  .mfd-franchise-book-chapter {
    break-inside: avoid;
    page-break-after: always;
    background: white !important;
    color: black !important;
    border: 1px solid #333 !important;
  }
  .mfd-franchise-book-narrative p {
    color: black !important;
    font-family: 'Georgia', serif !important;
    font-size: 12pt !important;
    line-height: 1.55 !important;
  }
  .mfd-franchise-book-margin {
    color: #555 !important;
    border-left: 2px solid #999 !important;
  }
}
`;

// ── Sub-components ──────────────────────────────────────────────────

function TocItem({
  chapter,
  active,
  onClick,
}: {
  chapter: EraChapter;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 10px',
        background: active ? 'var(--mfd-surface-elevated)' : 'transparent',
        border: `1px solid ${active ? 'var(--mfd-gold)' : 'var(--mfd-border-subtle)'}`,
        color: active ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)',
        cursor: 'pointer',
        marginBottom: '4px',
      }}
    >
      <div style={{ ...pixelSm, marginBottom: '2px' }}>
        CH.{chapter.chapterNumber} · {ARC_LABELS[chapter.arcType]}
      </div>
      <div style={{ ...monoSm, color: 'inherit' }}>{chapter.startYear}–{chapter.endYear}</div>
    </button>
  );
}

function ChapterView({
  chapter,
  book,
  index,
}: {
  chapter: EraChapter;
  book: FranchiseBook;
  index: number;
}) {
  const vars = eraVars(book, chapter);
  const section = templates.eras[chapter.arcType] ?? null;
  const seed = `${book.teamId}-${chapter.id}`;

  const opening = section ? pickDeterministic(section.openings, `${seed}-open`) : null;
  const signature = section ? pickDeterministic(section.signature, `${seed}-sig`) : null;
  const closer = section ? pickDeterministic(section.closers, `${seed}-close`) : null;
  const agmLine = pickDeterministic(commentary.byArcType[chapter.arcType] ?? [], `${seed}-agm`);
  const triggerLine = commentary.byTrigger[chapter.trigger] ?? null;

  const milestoneCodas = chapter.milestoneFlags
    .map((flag) => templates.milestone_coda[flag])
    .filter((s): s is string => typeof s === 'string');
  const milestoneAgmLines = chapter.milestoneFlags
    .map((flag) => commentary.byMilestoneFlag[flag])
    .filter((s): s is string => typeof s === 'string');

  return (
    <article
      id={`chapter-${chapter.chapterNumber}`}
      className="mfd-franchise-book-chapter"
      style={{
        border: '1px solid var(--mfd-gold)',
        padding: '20px',
        marginBottom: '24px',
        background: 'var(--mfd-surface)',
        boxShadow: '0 0 0 2px var(--mfd-bg), 0 0 0 3px var(--mfd-border)',
      }}
    >
      <header style={{ marginBottom: '16px', borderBottom: '1px solid var(--mfd-border-subtle)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...pixelSm, color: 'var(--mfd-gold)', marginBottom: '6px' }}>
              CHAPTER {chapter.chapterNumber}
            </div>
            <h2 style={{ ...display, fontSize: '28px', margin: 0, color: 'var(--mfd-text)' }}>
              {chapter.title.replace(/^Chapter \d+ · /, '').toUpperCase()}
            </h2>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
              {chapter.subtitle}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <PixelBadge variant={ARC_ACCENT[chapter.arcType]}>{ARC_LABELS[chapter.arcType]}</PixelBadge>
            {chapter.championships > 0 && (
              <PixelBadge variant="gold">{chapter.championships}× CHAMP</PixelBadge>
            )}
            {chapter.playoffAppearances > 0 && (
              <PixelBadge variant="cyan">{chapter.playoffAppearances} PLAYOFFS</PixelBadge>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 240px)', gap: '24px' }} className="mfd-franchise-book-body">
        <div className="mfd-franchise-book-narrative" style={{ minWidth: 0 }}>
          {opening && (
            <p style={{ ...mono, color: 'var(--mfd-text)', lineHeight: 1.6, marginTop: 0 }}>
              {fillTemplate(opening, vars)}
            </p>
          )}
          {signature && (
            <p style={{ ...mono, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
              {fillTemplate(signature, vars)}
            </p>
          )}
          {milestoneCodas.map((line, i) => (
            <p key={`coda-${i}`} style={{ ...mono, color: 'var(--mfd-gold)', lineHeight: 1.6, fontStyle: 'italic' }}>
              {fillTemplate(line, vars)}
            </p>
          ))}
          {closer && (
            <p style={{ ...mono, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              {fillTemplate(closer, vars)}
            </p>
          )}

          {chapter.signaturePlayers.length > 0 && (
            <section style={{ marginTop: '20px' }}>
              <h3 style={{ ...pixelSm, color: 'var(--mfd-cyan)', marginBottom: '10px' }}>
                SIGNATURE PLAYERS
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {chapter.signaturePlayers.map((player) => (
                  <li key={player.playerId} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', ...monoSm }}>
                    <span style={{ color: 'var(--mfd-text)' }}>{player.name}</span>
                    <span style={{ color: 'var(--mfd-text-dim)' }}>
                      {player.role.replace(/_/g, ' ')} · peak {player.peakOvr} · {player.yearsInEra}y
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {chapter.definingMoments.length > 0 && (
            <section style={{ marginTop: '20px' }}>
              <h3 style={{ ...pixelSm, color: 'var(--mfd-cyan)', marginBottom: '10px' }}>
                DEFINING MOMENTS
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {chapter.definingMoments.slice(0, 8).map((moment, i) => (
                  <li key={`${moment.sourceEventId ?? 'synth'}-${i}`} style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                    <span style={{ color: 'var(--mfd-gold)' }}>{moment.year}</span>
                    {' · '}
                    <span style={{ color: 'var(--mfd-text-dim)' }}>{moment.kind.replace(/_/g, ' ')}</span>
                    {' · '}
                    {moment.headline}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside
          className="mfd-franchise-book-margin"
          style={{
            borderLeft: '2px solid var(--mfd-border-subtle)',
            paddingLeft: '14px',
            minWidth: 0,
          }}
        >
          <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)', marginBottom: '10px' }}>
            FROM THE DESK
          </div>
          {agmLine && (
            <p style={{ ...mono, color: 'var(--mfd-text-dim)', lineHeight: 1.55, marginTop: 0, fontStyle: 'italic' }}>
              "{agmLine}"
            </p>
          )}
          {triggerLine && (
            <p style={{ ...mono, color: 'var(--mfd-text-dim)', lineHeight: 1.55, fontStyle: 'italic', fontSize: '11px' }}>
              — {triggerLine}
            </p>
          )}
          {milestoneAgmLines.map((line, i) => (
            <p key={`ms-${i}`} style={{ ...mono, color: 'var(--mfd-gold)', lineHeight: 1.55, fontStyle: 'italic', fontSize: '11px', marginTop: '8px' }}>
              "{line}"
            </p>
          ))}

          <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '6px', ...monoSm, color: 'var(--mfd-text-dim)' }}>
            <div><strong style={{ color: 'var(--mfd-text)' }}>RECORD</strong> {chapter.record.wins}-{chapter.record.losses}{chapter.record.ties > 0 ? `-${chapter.record.ties}` : ''}</div>
            <div><strong style={{ color: 'var(--mfd-text)' }}>WIN %</strong> {(chapter.record.winPct * 100).toFixed(1)}%</div>
            <div><strong style={{ color: 'var(--mfd-text)' }}>PT DIFF</strong> {chapter.record.pointDifferential >= 0 ? '+' : ''}{chapter.record.pointDifferential}</div>
            <div><strong style={{ color: 'var(--mfd-text)' }}>COACH</strong> {chapter.headCoachName ?? '—'}</div>
            <div><strong style={{ color: 'var(--mfd-text)' }}>TRIGGER</strong> {chapter.trigger.replace(/_/g, ' ')}</div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function FranchiseBookSourcesPanel() {
  return (
    <PixelPanel title="Franchise Book Sources" accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="cyan">BOOK READ MODEL</PixelBadge>
          <PixelBadge variant="gold">PRINT CONTROL ONLY</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
          This reader calls <strong>buildFranchiseBook(game, userTeam.id)</strong>. Era chapters are derived from saved <strong>game.franchiseHistory</strong> and <strong>game.userDynastyEras</strong>, with defining moments from <strong>game.dynastyTimeline</strong>.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Signature players read <strong>game.playerArchive</strong> and <strong>game.playerSeasonHistory</strong>; the coach label is a best-effort read from current team staff. Prose comes from authored <strong>era-templates.json</strong> and <strong>book-commentary.json</strong> through deterministic template selection.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          TOC selection and <strong>PRINT / SAVE PDF</strong> are route-local/browser controls. Opening Franchise Book does not write dynasty events, start or name eras, update franchise history, change player records, write news, change saves, or play scheduled games.
        </div>
      </div>
    </PixelPanel>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function FranchiseBookScreen() {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);

  const book = useMemo<FranchiseBook | null>(() => {
    if (!game || !userTeam) return null;
    return buildFranchiseBook(game, userTeam.id);
  }, [game, userTeam]);

  if (!game || !userTeam || !book) {
    return (
      <div style={{ ...screenStackStyle, ...teamThemeVars(userTeam?.id) }}>
        <PixelScreenHeader
          title="FRANCHISE BOOK"
          subtitle="The definitive dynasty reader"
          kicker="MFD BROADCAST"
        />
        <PixelPanel title="NO FRANCHISE LOADED">
          <div style={{ ...mono, color: 'var(--mfd-text-dim)', padding: '16px' }}>
            Load or start a dynasty to read your franchise book.
          </div>
        </PixelPanel>
      </div>
    );
  }

  if (book.eras.length === 0) {
    return (
      <div style={{ ...screenStackStyle, ...teamThemeVars(userTeam?.id) }}>
        <PixelScreenHeader
          title={`${book.teamCity} ${book.teamName}`.toUpperCase()}
          subtitle="The Franchise Book"
          kicker="MFD BROADCAST"
        />
        <PixelPanel title="A BLANK PAGE">
          <div style={{ ...mono, color: 'var(--mfd-text-dim)', padding: '16px', lineHeight: 1.6 }}>
            Every book begins with a single season. Play a year — wins, losses, parades, and collapses —
            and the first chapter will write itself here.
          </div>
        </PixelPanel>
      </div>
    );
  }

  const scrollToChapter = (id: string) => {
    setActiveChapterId(id);
    setTocOpen(false);
    const el = document.getElementById(`chapter-${id.split('-era-')[0]?.length ? book.eras.find((e) => e.id === id)?.chapterNumber : ''}`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ ...screenStackStyle, ...teamThemeVars(userTeam.id) }}>
      <style>{printStyles}</style>
      <PixelScreenHeader
        title={`${book.teamCity} ${book.teamName}`.toUpperCase()}
        subtitle={`The Franchise Book · ${book.firstYear}–${book.lastYear}`}
        kicker="MFD BROADCAST"
        badges={(
          <>
            <PixelBadge variant="gold">{book.totals.championships} TITLES</PixelBadge>
            <PixelBadge variant="cyan">{book.totals.seasons} SEASONS</PixelBadge>
            <PixelBadge variant="default">{book.eras.length} CHAPTERS</PixelBadge>
          </>
        )}
      />

      <div className="mfd-franchise-book-source-panel">
        <FranchiseBookSourcesPanel />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }} className="mfd-franchise-book-layout">
        <aside
          className="mfd-franchise-book-toc"
          style={{
            position: 'sticky',
            top: '80px',
            maxHeight: 'calc(100vh - 100px)',
            overflow: 'auto',
            padding: '12px',
            border: '1px solid var(--mfd-border)',
            background: 'var(--mfd-surface)',
          }}
        >
          <div style={{ ...pixel, color: 'var(--mfd-gold)', marginBottom: '10px' }}>TABLE OF CONTENTS</div>
          {book.eras.map((era) => (
            <TocItem
              key={era.id}
              chapter={era}
              active={activeChapterId === era.id}
              onClick={() => scrollToChapter(era.id)}
            />
          ))}

          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--mfd-border-subtle)' }}>
            <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)', marginBottom: '6px' }}>TOTALS</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
              {book.totals.wins}–{book.totals.losses}{book.totals.ties > 0 ? `–${book.totals.ties}` : ''}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              {book.totals.championships} title{book.totals.championships === 1 ? '' : 's'} · {book.totals.playoffAppearances} playoff trips
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              marginTop: '14px',
              width: '100%',
              padding: '8px 10px',
              background: 'var(--mfd-surface-elevated)',
              border: '1px solid var(--mfd-gold)',
              color: 'var(--mfd-gold)',
              cursor: 'pointer',
              ...pixelSm,
            }}
          >
            PRINT / SAVE PDF
          </button>
        </aside>

        <main style={{ minWidth: 0 }}>
          {book.eras.map((era, i) => (
            <ChapterView key={era.id} chapter={era} book={book} index={i} />
          ))}
          <footer style={{ textAlign: 'center', padding: '24px', ...pixelSm, color: 'var(--mfd-text-dim)' }}>
            — END OF CHRONICLE · COMPILED {book.generatedAt} —
          </footer>
        </main>
      </div>

      {/* Mobile TOC overlay — hidden on desktop via CSS */}
      <button
        type="button"
        className="mfd-franchise-book-toc-toggle"
        onClick={() => setTocOpen(!tocOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          zIndex: 100,
          padding: '10px 14px',
          background: 'var(--mfd-gold)',
          color: 'var(--mfd-bg)',
          border: 'none',
          cursor: 'pointer',
          ...pixelSm,
        }}
      >
        {tocOpen ? 'CLOSE TOC' : 'CHAPTERS'}
      </button>

      <style>{`
        @media (max-width: 1023px) {
          .mfd-franchise-book-layout {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .mfd-franchise-book-toc {
            position: static !important;
            max-height: none !important;
            display: ${tocOpen ? 'block' : 'none'};
          }
          .mfd-franchise-book-toc-toggle {
            display: block !important;
          }
          .mfd-franchise-book-body {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .mfd-franchise-book-margin {
            border-left: none !important;
            border-top: 1px solid var(--mfd-border-subtle) !important;
            padding-left: 0 !important;
            padding-top: 14px !important;
            margin-top: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default FranchiseBookScreen;
