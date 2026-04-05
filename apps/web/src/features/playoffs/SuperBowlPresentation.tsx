/**
 * Super Bowl Presentation Screen
 *
 * Championship matchup card, halftime show, MVP award, parade details.
 * Accessible after Super Bowl resolves.
 */

import type {
  SuperBowlContext,
  HalftimeShow,
  SuperBowlMVPAward,
  ChampionParade,
} from '@mfd/engine';
import { PixelPanel, PixelBadge } from '@mfd/design-system/components';
import {
  selectPlayoffBracket,
  selectTeams,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';

/* ── Shared styles ──────────────────────────────────────── */
const pixel = { fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px' } as const;
const display = { fontFamily: 'var(--mfd-font-display)' } as const;
const mono = { fontFamily: 'var(--mfd-font-mono)', fontSize: '12px' } as const;
const monoSm = { fontFamily: 'var(--mfd-font-mono)', fontSize: '11px' } as const;

/* ── Sub-components ─────────────────────────────────────── */

function MatchupCard({ context }: { context: SuperBowlContext }) {
  return (
    <PixelPanel title={`Super Bowl ${context.number}`} accent="gold">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ ...display, fontSize: '22px', color: '#fff', letterSpacing: '1px' }}>
          {context.matchup}
        </div>
        <div style={{ ...monoSm, color: '#999' }}>
          {context.venue}
        </div>
        {context.storylines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {context.storylines.map((s, i) => (
              <div key={i} style={{ ...monoSm, color: '#ccc', lineHeight: 1.5 }}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </PixelPanel>
  );
}

function HalftimeShowCard({ show }: { show: HalftimeShow }) {
  const stars = Array.from({ length: 5 }, (_, i) => (i < show.rating ? '*' : '-')).join('');
  return (
    <PixelPanel title="Halftime Show" accent="cyan">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...display, fontSize: '18px', color: '#fff' }}>
            {show.performer}
          </div>
          <PixelBadge variant="cyan">{show.genre.toUpperCase()}</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: '#ccc', lineHeight: 1.5 }}>
          {show.description}
        </div>
        <div style={{ ...pixel, color: 'var(--mfd-gold)' }}>
          RATING: {stars}
        </div>
      </div>
    </PixelPanel>
  );
}

function MVPCard({ mvp }: { mvp: SuperBowlMVPAward }) {
  return (
    <PixelPanel title="Super Bowl MVP" accent="gold">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...display, fontSize: '20px', color: '#fff' }}>
            {mvp.playerName}
          </div>
          <PixelBadge variant="gold">{mvp.pos}</PixelBadge>
        </div>
        <div style={{ ...mono, color: 'var(--mfd-cyan)' }}>
          {mvp.stats}
        </div>
        <div style={{ ...monoSm, color: '#ccc', lineHeight: 1.5 }}>
          {mvp.narrative}
        </div>
      </div>
    </PixelPanel>
  );
}

function ParadeCard({ parade }: { parade: ChampionParade }) {
  return (
    <PixelPanel title="Championship Parade" accent="green">
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ ...display, fontSize: '18px', color: '#fff' }}>
          {parade.headline}
        </div>
        <div style={{ ...monoSm, color: '#999' }}>
          Attendance: {(parade.attendance / 1000000).toFixed(1)}M
        </div>
        {parade.highlights.map((h, i) => (
          <div key={i} style={{ ...monoSm, color: '#ccc', lineHeight: 1.5 }}>
            {h}
          </div>
        ))}
        <div style={{
          ...monoSm,
          color: 'var(--mfd-gold)',
          borderTop: '1px solid #333',
          paddingTop: '8px',
          marginTop: '4px',
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}>
          {parade.mvpSpeech}
        </div>
      </div>
    </PixelPanel>
  );
}

/* ── Exported View ──────────────────────────────────────── */

export interface SuperBowlPresentationViewProps {
  context: SuperBowlContext | null;
  halftimeShow: HalftimeShow | null;
  mvp: SuperBowlMVPAward | null;
  parade: ChampionParade | null;
  championName: string | null;
  narrative: string | null;
}

export function SuperBowlPresentationView({
  context,
  halftimeShow,
  mvp,
  parade,
  championName,
  narrative,
}: SuperBowlPresentationViewProps) {
  if (!context) {
    return (
      <PixelPanel title="Super Bowl" accent="gold">
        <div style={{ ...pixel, color: '#999', padding: '12px', lineHeight: 2 }}>
          The Super Bowl has not yet been played. Advance through the playoffs to see the championship presentation.
        </div>
      </PixelPanel>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <MatchupCard context={context} />
      {narrative && (
        <PixelPanel title="Championship Recap" accent="gold">
          <div style={{ ...monoSm, color: '#ccc', padding: '12px', lineHeight: 1.6 }}>
            {narrative}
          </div>
        </PixelPanel>
      )}
      {halftimeShow && <HalftimeShowCard show={halftimeShow} />}
      {mvp && <MVPCard mvp={mvp} />}
      {parade && <ParadeCard parade={parade} />}
    </div>
  );
}

/* ── Connected Screen ───────────────────────────────────── */

export function SuperBowlPresentation() {
  const bracket = useGameStore(selectPlayoffBracket);
  const teams = useGameStore(selectTeams);
  const _year = useGameStore(selectYear);

  // Extract Super Bowl data from bracket
  const sbMatchup = bracket?.matchups.find((m) => m.round === 'super_bowl');
  const sbResult = sbMatchup?.result;
  const championId = bracket?.championTeamId;
  const champion = championId && teams ? teams[championId] : null;
  const championName = champion ? `${champion.city} ${champion.name}` : null;

  // These would be stored on GameState in a full integration
  // For now, return the view with available data
  return (
    <SuperBowlPresentationView
      context={null}
      halftimeShow={null}
      mvp={null}
      parade={null}
      championName={championName}
      narrative={sbResult ? `Championship game final.` : null}
    />
  );
}
