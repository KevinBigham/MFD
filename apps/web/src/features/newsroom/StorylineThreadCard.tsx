import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { StorylineArchetype, StorylineStatus, StorylineThread } from '@mfd/engine';
import { useGameStore, selectTeams, selectUserTeamId } from '../../app/store/game-store';
import { display, monoSm, pixelSm } from '../shared/pixelUi';

type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

const ARCHETYPE_LABELS: Record<StorylineArchetype, string> = {
  'hot-seat-coach': 'COACH HOT SEAT',
  'qb-controversy': 'QB CONTROVERSY',
  'rookie-of-year-chase': 'ROOKIE OF THE YEAR',
  'records-chase': 'RECORDS CHASE',
  'comeback-player': 'COMEBACK PLAYER',
};

const ARCHETYPE_ACCENTS: Record<StorylineArchetype, Accent> = {
  'hot-seat-coach': 'red',
  'qb-controversy': 'gold',
  'rookie-of-year-chase': 'green',
  'records-chase': 'gold',
  'comeback-player': 'cyan',
};

const STATUS_ACCENTS: Record<StorylineStatus, Accent> = {
  active: 'cyan',
  closed: 'green',
};

interface StorylineReceiptRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: Accent;
}

function heatBlock(heat: number): string {
  const clamped = Math.max(0, Math.min(100, heat));
  const cells = Math.round(clamped / 10);
  return '█'.repeat(cells).padEnd(10, '░');
}

function weekLabel(year: number, week: number): string {
  return `Y${year} W${week}`;
}

function pluralizeBeat(count: number): string {
  return `${count} beat${count === 1 ? '' : 's'}`;
}

export function buildStorylineReceiptRows(thread: StorylineThread): StorylineReceiptRow[] {
  const latestBeat = thread.beats[thread.beats.length - 1] ?? null;
  return [
    {
      id: 'source',
      label: 'Saved Source',
      value: 'storylineThreads',
      detail: `${ARCHETYPE_LABELS[thread.archetype]} // ${thread.key}`,
      accent: 'cyan',
    },
    {
      id: 'timeline',
      label: 'Thread Clock',
      value: `${weekLabel(thread.startYear, thread.startWeek)} -> ${weekLabel(thread.updatedYear, thread.updatedWeek)}`,
      detail: `${thread.weeksActive} weeks active // ${thread.status}`,
      accent: thread.status === 'active' ? 'gold' : 'green',
    },
    {
      id: 'beats',
      label: 'Beat Ledger',
      value: pluralizeBeat(thread.beats.length),
      detail: latestBeat ? `Latest: ${latestBeat.label}` : 'No saved beat rows yet.',
      accent: 'green',
    },
    {
      id: 'lifecycle',
      label: 'Lifecycle Owner',
      value: 'week advance',
      detail: 'advanceStorylineThreads -> closeCompletedThreads -> seedThreadsForWeek after completed regular-season weeks.',
      accent: 'default',
    },
    {
      id: 'boundary',
      label: 'Just viewing',
      value: 'no thread writes',
      detail: 'This card does not advance, close, seed, write news, or change storyline metadata.',
      accent: 'default',
    },
  ];
}

interface StorylineThreadCardProps {
  thread: StorylineThread;
  onOpen?: (thread: StorylineThread) => void;
}

/**
 * Compact card summarizing a multi-week storyline: archetype kicker, heat meter,
 * last beat, next-beat hint, and affected team/player chips. Designed to grid into
 * FranchiseHub at 280px minmax.
 *
 * When `onOpen` is provided, the card is clickable and routes into a detail view.
 * Otherwise it renders as a static tile.
 */
export function StorylineThreadCard({ thread, onOpen }: StorylineThreadCardProps) {
  const teams = useGameStore(selectTeams);
  const userTeamId = useGameStore(selectUserTeamId);

  const archetypeLabel = ARCHETYPE_LABELS[thread.archetype];
  const archetypeAccent = ARCHETYPE_ACCENTS[thread.archetype];
  const statusAccent = STATUS_ACCENTS[thread.status];
  const involvesUser = thread.teamIds.includes(userTeamId ?? '__none__');
  const latestBeat = thread.beats[thread.beats.length - 1] ?? null;
  const receiptRows = buildStorylineReceiptRows(thread);

  const teamChips = thread.teamIds.slice(0, 3).map((teamId) => {
    const team = teams?.[teamId];
    return {
      teamId,
      label: team ? team.abbr : teamId,
      isUser: teamId === userTeamId,
    };
  });

  const isButton = typeof onOpen === 'function';
  const containerProps = isButton
    ? {
      role: 'button' as const,
      tabIndex: 0,
      onClick: () => onOpen?.(thread),
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.(thread);
        }
      },
    }
    : {};

  return (
    <div
      {...containerProps}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px',
        border: `3px solid ${involvesUser ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
        background: 'var(--mfd-bg-3)',
        cursor: isButton ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <PixelBadge variant={archetypeAccent}>{archetypeLabel}</PixelBadge>
        <PixelBadge variant={statusAccent}>{thread.status.toUpperCase()}</PixelBadge>
      </div>

      <div style={{ ...display, fontSize: '22px', color: 'var(--mfd-text)', lineHeight: 1.1 }}>
        {thread.title.toUpperCase()}
      </div>

      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
        {thread.summary}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>HEAT</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '13px', color: 'var(--mfd-gold)', letterSpacing: '2px' }}>
            {heatBlock(thread.heat)}
          </div>
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '12px', color: 'var(--mfd-text-dim)' }}>
            {Math.max(0, Math.min(100, Math.round(thread.heat)))}
          </div>
        </div>
      </div>

      {latestBeat ? (
        <PixelPanel title={`WEEK ${latestBeat.weekNumber} BEAT`} accent={archetypeAccent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1.2 }}>
              {latestBeat.label.toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              {latestBeat.summary}
            </div>
          </div>
        </PixelPanel>
      ) : null}

      {thread.nextBeatHint ? (
        <div style={{ ...monoSm, color: 'var(--mfd-cyan)', lineHeight: 1.6 }}>
          Next: {thread.nextBeatHint}
        </div>
      ) : null}

      <PixelPanel title="Thread Receipt" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {receiptRows.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '112px minmax(0, 1fr)',
                gap: '8px',
                alignItems: 'start',
              }}
            >
              <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.35 }}>
                  {row.value}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  {row.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PixelPanel>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <PixelBadge variant="default">{`${thread.weeksActive}W`}</PixelBadge>
        {teamChips.map((chip) => (
          <PixelBadge key={`${thread.id}-${chip.teamId}`} variant={chip.isUser ? 'gold' : 'cyan'}>
            {chip.label}
          </PixelBadge>
        ))}
        {thread.teamIds.length > 3 ? (
          <PixelBadge variant="default">{`+${thread.teamIds.length - 3}`}</PixelBadge>
        ) : null}
      </div>
    </div>
  );
}
