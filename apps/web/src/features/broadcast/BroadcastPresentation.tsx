/**
 * Broadcast Presentation — cinematic replay of the last game's
 * top beats. Pairs each beat with score/context overlays and a
 * big chyron title so the viewer reads the game as a story.
 */
import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { buildBroadcastPresentation, buildHalftimeDecisionReceipt } from '@mfd/engine';
import type { BroadcastBeat, BroadcastBeatKind } from '@mfd/engine';
import { selectGameDayPackageByBroadcastGameId, selectLatestBroadcast, useGameStore } from '../../app/store/game-store';
import {
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

// ── Helpers ────────────────────────────────────────────

const KIND_COLOR: Record<BroadcastBeatKind, 'green' | 'gold' | 'red' | 'cyan' | 'default'> = {
  opening: 'default',
  'big-play': 'cyan',
  'momentum-swing': 'gold',
  'turning-point': 'red',
  clutch: 'red',
  final: 'green',
};

const KIND_LABEL: Record<BroadcastBeatKind, string> = {
  opening: 'KICKOFF',
  'big-play': 'BIG PLAY',
  'momentum-swing': 'MOMENTUM',
  'turning-point': 'TURNING POINT',
  clutch: 'CLUTCH',
  final: 'FINAL',
};

function kindVariant(kind: BroadcastBeatKind): 'green' | 'gold' | 'red' | 'default' {
  const c = KIND_COLOR[kind];
  if (c === 'green' || c === 'gold' || c === 'red') return c;
  return 'default';
}

type PresentationSourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';

interface PresentationSourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: PresentationSourceAccent;
}

export function buildBroadcastPresentationSourceRows({
  hasBroadcast,
  hasGameDayPackage,
  hasHalftimeReceipt,
  beatCount,
  activeBeatLabel,
}: {
  hasBroadcast: boolean;
  hasGameDayPackage: boolean;
  hasHalftimeReceipt: boolean;
  beatCount: number;
  activeBeatLabel: string;
}): PresentationSourceRow[] {
  return [
    {
      id: 'latest-broadcast',
      label: 'Latest broadcast',
      value: hasBroadcast ? 'Latest result' : 'No broadcast',
      detail: 'The connected /presentation route reads selectLatestBroadcast, matching /play-by-play and /game-flow rather than the transient selected-game /broadcast context.',
      accent: hasBroadcast ? 'green' : 'default',
    },
    {
      id: 'presentation-helper',
      label: 'Presentation helper',
      value: `${beatCount} beats`,
      detail: 'buildBroadcastPresentation curates replay beats from the saved GameResult and BroadcastOutput with maxHighlights: 6. It does not change the source broadcast.',
      accent: beatCount > 0 ? 'cyan' : 'default',
    },
    {
      id: 'halftime-receipt',
      label: 'Halftime receipt',
      value: hasHalftimeReceipt ? 'Saved receipt' : hasGameDayPackage ? 'Package only' : 'No package',
      detail: 'selectGameDayPackageByBroadcastGameId(null) matches the latest broadcast result to saved recentPackages; buildHalftimeDecisionReceipt only parses saved activeEffectSummaries.',
      accent: hasHalftimeReceipt ? 'gold' : hasGameDayPackage ? 'cyan' : 'default',
    },
    {
      id: 'beat-state',
      label: 'Beat state',
      value: activeBeatLabel,
      detail: 'Prev/Next controls and timeline dots only update route-local beatIndex state. They do not rewrite presentation beats or the underlying broadcast.',
      accent: beatCount > 0 ? 'gold' : 'default',
    },
    {
      id: 'render-boundary',
      label: 'Just viewing',
      value: 'Read only',
      detail: 'Opening the route does not append game-day packages, change broadcasts, persist replay beats, advance the week, or change results.',
      accent: 'red',
    },
  ];
}

function BroadcastPresentationSources({ rows }: { rows: PresentationSourceRow[] }) {
  return (
    <PixelPanel title="Presentation Sources" accent="cyan">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>{row.label.toUpperCase()}</div>
              <PixelBadge variant={row.accent}>{row.value.toUpperCase()}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{row.detail}</div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

// ── Sub-components ─────────────────────────────────────

function BeatStage({ beat, total }: { beat: BroadcastBeat; total: number }) {
  return (
    <div
      data-testid={`beat-stage-${beat.index}`}
      style={{
        border: '2px solid var(--mfd-cyan)',
        padding: '24px 20px',
        backgroundColor: 'var(--mfd-surface-raised)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: '260px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PixelBadge variant={kindVariant(beat.kind)}>{KIND_LABEL[beat.kind]}</PixelBadge>
        <span style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>
          BEAT {beat.index + 1} / {total}
        </span>
      </div>

      <div
        style={{
          fontFamily: 'var(--mfd-font-display)',
          fontSize: '32px',
          letterSpacing: '1.5px',
          color: 'var(--mfd-text)',
          lineHeight: 1.1,
        }}
      >
        {beat.chyron}
      </div>

      <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.4 }}>
        {beat.commentary}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>HOME</div>
          <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '28px', color: 'var(--mfd-cyan)' }}>
            {beat.homeScore}
          </div>
        </div>
        <div>
          <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>AWAY</div>
          <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '28px', color: 'var(--mfd-red)' }}>
            {beat.awayScore}
          </div>
        </div>
        <div>
          <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>QUARTER</div>
          <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '28px', color: 'var(--mfd-gold)' }}>
            Q{beat.quarter}
          </div>
        </div>
        {beat.play && (
          <div>
            <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>INTENSITY</div>
            <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '28px', color: 'var(--mfd-text)' }}>
              {Math.round(beat.intensity)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BeatTimeline({
  beats,
  activeIndex,
  onSelect,
}: {
  beats: BroadcastBeat[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      data-testid="beat-timeline"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${beats.length}, minmax(48px, 1fr))`,
        gap: '4px',
      }}
    >
      {beats.map((beat) => {
        const isActive = beat.index === activeIndex;
        return (
          <button
            key={beat.index}
            type="button"
            data-testid={`beat-dot-${beat.index}`}
            onClick={() => onSelect(beat.index)}
            style={{
              padding: '4px 2px',
              border: `1px solid ${isActive ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
              backgroundColor: isActive ? 'var(--mfd-surface-raised)' : 'transparent',
              color: isActive ? 'var(--mfd-gold)' : 'var(--mfd-muted)',
              cursor: 'pointer',
              ...pixelSm,
            }}
          >
            {KIND_LABEL[beat.kind].slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

// ── Connected screen ───────────────────────────────────

export function BroadcastPresentation() {
  const broadcast = useGameStore(selectLatestBroadcast);
  const gameDayPackage = useGameStore(useMemo(() => selectGameDayPackageByBroadcastGameId(null), []));
  const [beatIndex, setBeatIndex] = useState(0);

  const presentation = useMemo(() => {
    if (!broadcast) return null;
    return buildBroadcastPresentation(broadcast.gameResult, broadcast.broadcast, { maxHighlights: 6 });
  }, [broadcast]);
  const halftimeReceipt = buildHalftimeDecisionReceipt(gameDayPackage?.activeEffectSummaries ?? []);
  const sourceRows = buildBroadcastPresentationSourceRows({
    hasBroadcast: Boolean(broadcast),
    hasGameDayPackage: Boolean(gameDayPackage),
    hasHalftimeReceipt: Boolean(halftimeReceipt),
    beatCount: presentation?.beats.length ?? 0,
    activeBeatLabel: presentation && presentation.beats.length > 0
      ? `Beat ${Math.min(Math.max(0, beatIndex), presentation.beats.length - 1) + 1}`
      : 'No beats',
  });

  if (!broadcast || !presentation) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="BROADCAST PRESENTATION" subtitle="No broadcast data available." />
        <PixelPanel title="AWAITING GAME" accent="default">
          <div style={monoSm}>Play a game to unlock the cinematic replay.</div>
        </PixelPanel>
        <BroadcastPresentationSources rows={sourceRows} />
      </div>
    );
  }

  const safeIndex = Math.min(Math.max(0, beatIndex), presentation.beats.length - 1);
  const beat = presentation.beats[safeIndex] ?? null;
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < presentation.beats.length - 1;

  const homeTeamName = broadcast.homeTeam.name.toUpperCase();
  const awayTeamName = broadcast.awayTeam.name.toUpperCase();

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="BROADCAST PRESENTATION"
        subtitle={`${awayTeamName} @ ${homeTeamName} · WK${broadcast.gameResult.week} · ${presentation.broadcastNetwork}`}
      />
      <BroadcastPresentationSources rows={sourceRows} />

      <div style={autoGrid(160)}>
        <div
          data-testid="final-score-summary"
          style={{
            border: '1px solid var(--mfd-border)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>FINAL</div>
          <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', color: 'var(--mfd-text)' }}>
            {broadcast.gameResult.homeScore}-{broadcast.gameResult.awayScore}
          </div>
        </div>
        <div
          style={{
            border: '1px solid var(--mfd-border)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>BEATS</div>
          <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', color: 'var(--mfd-text)' }}>
            {presentation.totalBeats}
          </div>
        </div>
        <div
          style={{
            border: '1px solid var(--mfd-border)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>RUNTIME</div>
          <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', color: 'var(--mfd-text)' }}>
            {presentation.totalDurationSec}s
          </div>
        </div>
        <div
          style={{
            border: '1px solid var(--mfd-border)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>NETWORK</div>
          <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', color: 'var(--mfd-gold)' }}>
            {presentation.broadcastNetwork}
          </div>
        </div>
      </div>

      {beat && <BeatStage beat={beat} total={presentation.beats.length} />}

      {halftimeReceipt ? (
        <PixelPanel title="HALFTIME RECEIPT" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">SAVED DECISION</PixelBadge>
              <PixelBadge variant="cyan">GAME DAY PACKAGE</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>
              {halftimeReceipt.broadcastLine}
            </div>
          </div>
        </PixelPanel>
      ) : null}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <PixelButton
          accent="cyan"
          disabled={!canPrev}
          onClick={() => setBeatIndex((i) => Math.max(0, i - 1))}
        >
          PREV
        </PixelButton>
        <span style={{ ...monoSm, color: 'var(--mfd-muted)' }}>
          {safeIndex + 1} / {presentation.beats.length}
        </span>
        <PixelButton
          accent="cyan"
          disabled={!canNext}
          onClick={() => setBeatIndex((i) => Math.min(presentation.beats.length - 1, i + 1))}
        >
          NEXT
        </PixelButton>
      </div>

      <BeatTimeline beats={presentation.beats} activeIndex={safeIndex} onSelect={setBeatIndex} />

      <PixelPanel title="FINAL NARRATIVE" accent="gold">
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>
          {presentation.finalNarrative || 'A game for the ages.'}
        </div>
      </PixelPanel>
    </div>
  );
}

export default BroadcastPresentation;
