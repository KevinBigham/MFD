import type { LivingPlayerStory, LivingPlayerStorySource, LivingPlayerStoryStage } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { display, monoSm, pixelSm } from './pixelUi';

type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

const STAGE_LABELS: Record<LivingPlayerStoryStage, string> = {
  mentored: 'Mentored',
  breakout: 'Breakout',
  legacy: 'Legacy',
};

const STAGE_ACCENTS: Record<LivingPlayerStoryStage, Accent> = {
  mentored: 'cyan',
  breakout: 'green',
  legacy: 'gold',
};

const SOURCE_LABELS: Record<LivingPlayerStorySource, string> = {
  mentorship: 'Mentorship',
  storyline: 'Storyline',
  game: 'Game',
  award: 'Award',
};

const SOURCE_ACCENTS: Record<LivingPlayerStorySource, Accent> = {
  mentorship: 'cyan',
  storyline: 'green',
  game: 'red',
  award: 'gold',
};

export function LivingPlayerStoryPanel({
  story,
  title = 'Living Player Story',
  chipLine,
  onOpenProfile,
  onOpenTimeline,
}: {
  story: LivingPlayerStory;
  title?: string;
  chipLine?: string | null;
  onOpenProfile?: () => void;
  onOpenTimeline?: () => void;
}) {
  const visibleChapters = story.chapters.slice(-4);

  return (
    <PixelPanel title={title} accent={STAGE_ACCENTS[story.stage]}>
      <div data-living-player-story={story.playerId} style={{ display: 'grid', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant={STAGE_ACCENTS[story.stage]}>{STAGE_LABELS[story.stage]}</PixelBadge>
            <PixelBadge variant={story.status === 'active' ? 'green' : 'default'}>{story.status}</PixelBadge>
            <PixelBadge variant={story.heat >= 80 ? 'red' : story.heat >= 60 ? 'gold' : 'cyan'}>
              {`${story.heat} heat`}
            </PixelBadge>
          </div>
          <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>
            {`${story.chapters.length} saved chapter${story.chapters.length === 1 ? '' : 's'}`}
          </span>
        </div>

        <div style={{ display: 'grid', gap: '6px' }}>
          <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1.15 }}>{story.headline}</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.65 }}>{story.summary}</div>
          {story.mentor ? (
            <div style={{ ...monoSm, color: 'var(--mfd-cyan)', lineHeight: 1.6 }}>
              {`Mentor: ${story.mentor.name} // ${story.mentor.positionGroup} room // +${story.mentor.bonus} development bonus`}
            </div>
          ) : null}
        </div>

        {chipLine ? (
          <div style={{
            ...monoSm,
            color: 'var(--mfd-gold)',
            lineHeight: 1.65,
            padding: '10px',
            borderLeft: '4px solid var(--mfd-gold)',
            background: 'rgba(255, 215, 0, 0.06)',
          }}
          >
            {chipLine}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: '8px' }}>
          {visibleChapters.map((chapter, index) => (
            <div
              key={chapter.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr)',
                gap: '10px',
                alignItems: 'start',
                padding: '10px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
            >
              <div style={{ display: 'grid', gap: '6px', justifyItems: 'start' }}>
                <PixelBadge variant={SOURCE_ACCENTS[chapter.source]}>{SOURCE_LABELS[chapter.source]}</PixelBadge>
                <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>
                  {chapter.week === null ? chapter.year : `${chapter.year} W${chapter.week}`}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <span style={{ ...pixelSm, color: index === visibleChapters.length - 1 ? 'var(--mfd-gold)' : '#fff' }}>
                  {chapter.label.toUpperCase()}
                </span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.55 }}>
                  {chapter.summary}
                </span>
              </div>
            </div>
          ))}
        </div>

        {story.nextBeatHint ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
            {story.nextBeatHint}
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.55 }}>
            Read-only chain from saved mentorship, storyline, game, and award records.
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onOpenProfile ? (
              <PixelButton accent="cyan" onClick={onOpenProfile}>Open Profile</PixelButton>
            ) : null}
            {onOpenTimeline ? (
              <PixelButton accent="gold" onClick={onOpenTimeline}>Open Timeline</PixelButton>
            ) : null}
          </div>
        </div>
      </div>
    </PixelPanel>
  );
}
