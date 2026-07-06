import { useEffect, useState } from 'react';
import { PixelBadge, PixelButton, PixelModal } from '@mfd/design-system/components';
import {
  getApologyTourBeat,
  type ApologyTourBeatContent,
  type ApologyTourBeatKey,
  type ApologyTourThread,
} from '@mfd/engine';
import { monoSm } from '../shared/pixelUi';

const BEAT_ORDER: readonly ApologyTourBeatKey[] = ['fan_letter', 'beat_column', 'owner_email', 'resolution'];

const BEAT_DAY_OFFSETS: Record<ApologyTourBeatKey, number> = {
  fan_letter: 1,
  beat_column: 2,
  owner_email: 3,
  resolution: 7,
};

const BEAT_LABELS: Record<ApologyTourBeatKey, string> = {
  fan_letter: 'Fan Letter',
  beat_column: 'Beat Writer Column',
  owner_email: 'Owner Email',
  resolution: 'Resolution',
};

type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';
type ApologyTourContentKey = Parameters<typeof getApologyTourBeat>[0];

const BEAT_ACCENTS: Record<ApologyTourBeatKey, Accent> = {
  fan_letter: 'red',
  beat_column: 'gold',
  owner_email: 'cyan',
  resolution: 'green',
};

export interface ApologyTourModalProps {
  thread: ApologyTourThread | null;
  teamName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function interpolate(template: string, thread: ApologyTourThread, teamName: string): string {
  return template
    .replaceAll('{namedGameName}', thread.namedGameName)
    .replaceAll('{teamName}', teamName);
}

function resolveBeatContentKey(beat: ApologyTourBeatKey, thread: ApologyTourThread): ApologyTourContentKey {
  return beat === 'resolution'
    ? thread.status === 'escalated'
      ? 'resolution_escalated'
      : 'resolution_resolved'
    : beat;
}

function resolveBeatContent(beat: ApologyTourBeatKey, thread: ApologyTourThread): ApologyTourBeatContent {
  const key = resolveBeatContentKey(beat, thread);
  return getApologyTourBeat(key);
}

function resolveBeatAccent(beat: ApologyTourBeatKey, thread: ApologyTourThread): Accent {
  if (beat !== 'resolution') return BEAT_ACCENTS[beat];
  return thread.status === 'escalated' ? 'red' : 'green';
}

interface ApologyTourModalViewProps extends ApologyTourModalProps {
  initialBeatIndex?: number;
}

interface ApologyTourSourceRow {
  label: string;
  badge: string;
  detail: string;
  accent: Accent;
}

export function buildApologyTourSourceRows(
  thread: ApologyTourThread,
  beat: ApologyTourBeatKey,
  contentKey: ApologyTourContentKey,
): ApologyTourSourceRow[] {
  const deliveredBeats = new Set(thread.beatsDelivered);
  const deliveredCount = deliveredBeats.size;
  const beatDelivered = deliveredBeats.has(beat);

  return [
    {
      label: 'Saved thread',
      badge: `Y${thread.startedYear} W${thread.startedWeek}`,
      detail: 'Saved apologyTourThreads owns gameId, teamId, status, and beatsDelivered; opening this replay does not edit the thread.',
      accent: 'cyan',
    },
    {
      label: 'Authored beat',
      badge: contentKey,
      detail: `getApologyTourBeat ${contentKey} supplies from/title/body copy, then the modal interpolates the saved named game and team name.`,
      accent: beat === 'resolution' ? resolveBeatAccent(beat, thread) : BEAT_ACCENTS[beat],
    },
    {
      label: 'Replay state',
      badge: 'modal local',
      detail: 'Back and Next only change modal-local beatIndex. Close Tour only calls onOpenChange(false).',
      accent: 'green',
    },
    {
      label: 'Delivery ledger',
      badge: `${deliveredCount}/${BEAT_ORDER.length} delivered`,
      detail: `${BEAT_LABELS[beat]} is ${beatDelivered ? 'present in' : 'not present in'} beatsDelivered; replaying does not add delivered beats, mark messages read, resolve threads, schedule weeks, or write a sidecar.`,
      accent: beatDelivered ? 'green' : 'gold',
    },
  ];
}

export function ApologyTourModalView({
  thread,
  teamName,
  open,
  onOpenChange,
  initialBeatIndex = 0,
}: ApologyTourModalViewProps) {
  const [beatIndex, setBeatIndex] = useState(initialBeatIndex);

  // Reset to the first beat whenever the modal opens against a new thread
  // so a user replaying a different tour starts from Day +1.
  useEffect(() => {
    if (!thread) return;
    setBeatIndex(initialBeatIndex);
  }, [thread, initialBeatIndex]);

  if (!thread) return null;

  const beat = BEAT_ORDER[Math.min(Math.max(0, beatIndex), BEAT_ORDER.length - 1)] ?? BEAT_ORDER[0]!;
  const contentKey = resolveBeatContentKey(beat, thread);
  const content = resolveBeatContent(beat, thread);
  const accent = resolveBeatAccent(beat, thread);
  const dayOffset = BEAT_DAY_OFFSETS[beat];
  const isFinal = beatIndex >= BEAT_ORDER.length - 1;
  const isFirst = beatIndex <= 0;
  const interpolatedTitle = interpolate(content.title, thread, teamName);
  const interpolatedBody = interpolate(content.body, thread, teamName);
  const sourceRows = buildApologyTourSourceRows(thread, beat, contentKey);

  return (
    <PixelModal
      open={open}
      onOpenChange={onOpenChange}
      title={`${thread.namedGameName} — The Tour`}
      description={`A four-beat narrative thread following ${thread.namedGameName}.`}
      accent={accent}
      width={620}
    >
      <div data-testid="apology-tour-modal" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          {BEAT_ORDER.map((step, idx) => {
            const isActive = idx === beatIndex;
            const isComplete = idx < beatIndex;
            return (
              <span
                key={step}
                aria-label={`${BEAT_LABELS[step]}${isActive ? ' (current)' : isComplete ? ' (read)' : ''}`}
                data-testid={`apology-tour-progress-${step}${isActive ? '-active' : ''}`}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  border: `3px solid ${isActive ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                  background: isActive
                    ? 'var(--mfd-gold)'
                    : isComplete
                      ? 'var(--mfd-cyan)'
                      : 'transparent',
                }}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <PixelBadge variant={accent}>{BEAT_LABELS[beat]}</PixelBadge>
            <PixelBadge variant="default">Day +{dayOffset}</PixelBadge>
            {beat === 'resolution' ? (
              <PixelBadge variant={thread.status === 'escalated' ? 'red' : thread.status === 'resolved' ? 'green' : 'gold'}>
                {thread.status === 'escalated'
                  ? 'ESCALATED'
                  : thread.status === 'resolved'
                    ? 'RESOLVED'
                    : 'ACTIVE'}
              </PixelBadge>
            ) : null}
          </div>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            From: {content.from}
          </span>
        </div>

        <div style={{ ...monoSm, color: '#fff', fontSize: '13px' }}>
          {interpolatedTitle}
        </div>

        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {interpolatedBody}
        </div>

        <div
          data-testid="apology-tour-sources"
          aria-label="Apology tour sources"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '10px',
            border: '2px solid var(--mfd-border)',
            background: 'var(--mfd-bg-2)',
          }}
        >
          <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', textTransform: 'uppercase' }}>
            Tour Sources
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '10px',
          }}
          >
            {sourceRows.map((row) => (
              <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', textTransform: 'uppercase' }}>{row.label}</span>
                  <PixelBadge variant={row.accent}>{row.badge}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{row.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <PixelButton
            accent="default"
            disabled={isFirst}
            onClick={() => setBeatIndex((idx) => Math.max(0, idx - 1))}
            data-testid="apology-tour-back"
          >
            Back
          </PixelButton>
          {isFinal ? (
            <PixelButton accent="gold" onClick={() => onOpenChange(false)} data-testid="apology-tour-close">
              Close Tour
            </PixelButton>
          ) : (
            <PixelButton
              accent="cyan"
              onClick={() => setBeatIndex((idx) => Math.min(BEAT_ORDER.length - 1, idx + 1))}
              data-testid="apology-tour-next"
            >
              Next ({BEAT_LABELS[BEAT_ORDER[Math.min(BEAT_ORDER.length - 1, beatIndex + 1)]!]})
            </PixelButton>
          )}
        </div>
      </div>
    </PixelModal>
  );
}

export function ApologyTourModal(props: ApologyTourModalProps) {
  return <ApologyTourModalView {...props} />;
}
