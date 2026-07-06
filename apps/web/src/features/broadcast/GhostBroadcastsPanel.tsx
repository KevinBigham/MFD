import { useCallback, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import {
  createDefaultGhostBroadcastPrefs,
  readGhostBroadcastPrefs,
  resolveGhostBroadcastStorage,
  setGhostBroadcastEnabled,
  type GhostBroadcastPrefs,
} from './ghostBroadcastPrefs';
import { monoSm } from '../shared/pixelUi';

export interface GhostBroadcastLineSummary {
  commentatorName: string;
  commentary: string;
  trigger: string;
  source?: 'hof' | 'callout';
}

export interface GhostBroadcastsPanelProps {
  /** Lines from the latest broadcast — typically `broadcast.ghostLines`. */
  lines?: readonly GhostBroadcastLineSummary[];
  /** Storage override for tests / SSR. Falls back to localStorage in the browser. */
  storage?: Storage | null;
  /** Initial pref (lets parents pre-load if they read storage themselves). */
  initialPrefs?: GhostBroadcastPrefs;
  /** Optional title override; defaults to "Ghost Broadcasts". */
  title?: string;
}

const MAX_LINES_SHOWN = 6;

function describeTrigger(trigger: string): string {
  return trigger.replaceAll('_', ' ');
}

export function GhostBroadcastsPanel({
  lines = [],
  storage,
  initialPrefs,
  title = 'Ghost Broadcasts',
}: GhostBroadcastsPanelProps) {
  const backingStorage = storage === undefined ? resolveGhostBroadcastStorage() : storage;
  const [prefs, setPrefs] = useState<GhostBroadcastPrefs>(() =>
    initialPrefs ?? (backingStorage === null
      ? createDefaultGhostBroadcastPrefs()
      : readGhostBroadcastPrefs(backingStorage)),
  );

  const toggleEnabled = useCallback(() => {
    const next = setGhostBroadcastEnabled(backingStorage, !prefs.enabled);
    setPrefs(next);
  }, [backingStorage, prefs.enabled]);

  const hofLines = lines.filter((line) => line.source === 'hof' || (!line.source && line.commentatorName !== 'Booth Alert'));
  const calloutLines = lines.filter((line) => line.source === 'callout' || (!line.source && line.commentatorName === 'Booth Alert'));
  const visibleHof = hofLines.slice(0, MAX_LINES_SHOWN);
  const visibleCallouts = calloutLines.slice(0, MAX_LINES_SHOWN);
  const moreHof = hofLines.length - visibleHof.length;
  const moreCallouts = calloutLines.length - visibleCallouts.length;

  return (
    <PixelPanel title={title} accent={prefs.enabled ? 'gold' : 'default'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ ...monoSm, color: '#fff' }}>
              Retired Hall of Famers narrating live broadcasts.
            </span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Toggle is per-device. Engine still emits lines while disabled — flip back on to see them again.
            </span>
          </div>
          <PixelButton
            accent={prefs.enabled ? 'green' : 'red'}
            onClick={toggleEnabled}
            data-testid="ghost-broadcasts-toggle"
            aria-pressed={prefs.enabled}
          >
            {prefs.enabled ? 'Commentary: ON' : 'Commentary: OFF'}
          </PixelButton>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <PixelBadge variant="gold">broadcast.ghostLines</PixelBadge>
            <PixelBadge variant="cyan">mfd.broadcast.ghost.v1</PixelBadge>
            <PixelBadge variant="default">Read-only lines</PixelBadge>
          </div>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Source: latest broadcast ghost lines split into HOF voices and Booth Alert callouts, with legacy
            unsourced lines classified by commentator name. The toggle writes only this device's display
            preference; opening this panel does not generate commentary, alter broadcast payloads, write
            GameState, play scheduled games, or reroll saved outcomes.
          </span>
        </div>

        {prefs.enabled ? (
          lines.length === 0 ? (
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              No ghost commentary in the latest broadcast. Lines will surface here when retired legends call into MFSN.
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {visibleHof.length > 0 ? (
                <div data-testid="ghost-hof-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <PixelBadge variant="gold">HALL OF FAME VOICES</PixelBadge>
                    <PixelBadge variant="default">{hofLines.length} line{hofLines.length === 1 ? '' : 's'}</PixelBadge>
                  </div>
                  {visibleHof.map((line, index) => (
                    <div
                      key={`hof-${line.commentatorName}-${index}`}
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '10px', borderLeft: '3px solid var(--mfd-gold)' }}
                    >
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <PixelBadge variant="gold">{line.commentatorName.toUpperCase()}</PixelBadge>
                        <PixelBadge variant="default">{describeTrigger(line.trigger)}</PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{line.commentary}</div>
                    </div>
                  ))}
                  {moreHof > 0 ? (
                    <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>+{moreHof} more in the broadcast.</span>
                  ) : null}
                </div>
              ) : null}

              {visibleCallouts.length > 0 ? (
                <div data-testid="ghost-callout-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <PixelBadge variant="cyan">BOOTH ALERTS</PixelBadge>
                    <PixelBadge variant="default">{calloutLines.length} line{calloutLines.length === 1 ? '' : 's'}</PixelBadge>
                  </div>
                  {visibleCallouts.map((line, index) => (
                    <div
                      key={`callout-${line.commentatorName}-${index}`}
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '10px', borderLeft: '3px solid var(--mfd-cyan)' }}
                    >
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <PixelBadge variant="cyan">{line.commentatorName.toUpperCase()}</PixelBadge>
                        <PixelBadge variant="default">{describeTrigger(line.trigger)}</PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{line.commentary}</div>
                    </div>
                  ))}
                  {moreCallouts > 0 ? (
                    <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>+{moreCallouts} more callouts.</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        ) : (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            Ghost commentary is hidden on this device. Click "Commentary: OFF" above to bring retired legends back into the booth.
          </div>
        )}
      </div>
    </PixelPanel>
  );
}
