import { useState } from 'react';
import { getAchievementProgress, type Achievement, type AchievementCategory } from '@mfd/engine';
import {
  Chip,
  ChipDialogueBubble,
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelProgressBar,
} from '@mfd/design-system/components';
import {
  selectAchievements,
  useGameStore,
} from '../../app/store/game-store';
import { autoGrid, monoSm } from '../shared/pixelUi';

const CATEGORY_TABS: Array<{ key: AchievementCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'dynasty', label: 'Dynasty' },
  { key: 'roster', label: 'Roster' },
  { key: 'draft', label: 'Draft' },
  { key: 'financial', label: 'Financial' },
  { key: 'coaching', label: 'Coaching' },
  { key: 'narrative', label: 'Narrative' },
  { key: 'records', label: 'Records' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'hidden', label: 'Hidden' },
];

function tierAccent(tier: Achievement['tier']): 'gold' | 'cyan' | 'green' | 'red' | 'default' {
  if (tier === 'platinum') return 'gold';
  if (tier === 'gold') return 'gold';
  if (tier === 'silver') return 'cyan';
  return 'green';
}

function tierBorder(tier: Achievement['tier']): string {
  if (tier === 'platinum') return 'var(--mfd-gold)';
  if (tier === 'gold') return 'var(--mfd-gold)';
  if (tier === 'silver') return 'var(--mfd-cyan)';
  return 'var(--mfd-green)';
}

export function AchievementGallery() {
  const game = useGameStore((state) => state.game);
  const achievements = useGameStore(selectAchievements);
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');

  const unlockedCount = achievements.filter((achievement) => achievement.unlockedYear !== null).length;
  const filtered = achievements.filter((achievement) => activeCategory === 'all' || achievement.category === activeCategory);

  return (
    <PixelPanel title="Hall of Champions" accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
            Mastery milestones across dynasty, roster building, coaching, narrative, and hidden runs.
          </div>
          <PixelBadge variant="gold">{`${unlockedCount}/${achievements.length} unlocked`}</PixelBadge>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CATEGORY_TABS.map((tab) => (
            <PixelButton
              key={tab.key}
              accent={activeCategory === tab.key ? 'gold' : 'default'}
              onClick={() => setActiveCategory(tab.key)}
            >
              {tab.label}
            </PixelButton>
          ))}
        </div>

        <div style={autoGrid(260)}>
          {filtered.map((achievement) => {
            const unlocked = achievement.unlockedYear !== null;
            const hiddenLocked = achievement.category === 'hidden' && !unlocked;
            const progress = game ? getAchievementProgress(game, achievement.id) : null;

            return (
              <div
                key={achievement.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '12px',
                  minHeight: '180px',
                  border: `3px solid ${unlocked ? tierBorder(achievement.tier) : hiddenLocked ? 'var(--mfd-border)' : 'rgba(255,255,255,0.14)'}`,
                  background: unlocked
                    ? 'linear-gradient(180deg, rgba(255,215,0,0.08) 0%, rgba(0,0,0,0.28) 100%)'
                    : hiddenLocked
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.32) 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.26) 100%)',
                  filter: unlocked ? 'none' : 'grayscale(0.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ ...monoSm, color: unlocked ? '#fff' : '#bbb' }}>
                    {hiddenLocked ? '???' : achievement.icon.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <PixelBadge variant={tierAccent(achievement.tier)}>{achievement.tier}</PixelBadge>
                    <PixelBadge variant="default">{achievement.category}</PixelBadge>
                  </div>
                </div>

                <div>
                  <div style={{ ...monoSm, color: '#fff', fontSize: '13px', marginBottom: '6px' }}>
                    {hiddenLocked ? '???' : achievement.title}
                  </div>
                  <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                    {hiddenLocked ? 'A hidden achievement waits behind a mystery run.' : achievement.description}
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unlocked ? (
                    <div style={{ ...monoSm, color: '#ddd' }}>
                      Unlocked in Year {achievement.unlockedYear}
                      {achievement.unlockedWeek !== null ? ` // Week ${achievement.unlockedWeek}` : ''}
                    </div>
                  ) : !hiddenLocked && progress ? (
                    <PixelProgressBar
                      value={progress.percentage}
                      accent={tierAccent(achievement.tier)}
                      label={progress.label}
                      valueLabel={`${progress.percentage}%`}
                    />
                  ) : (
                    <div style={{ ...monoSm, color: '#666' }}>Hidden until unlocked.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PixelPanel>
  );
}

export function AchievementUnlockToast({
  achievement,
}: {
  achievement: Achievement | null;
}) {
  if (!achievement) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '18px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 70,
        width: 'min(560px, calc(100vw - 32px))',
      }}
    >
      <PixelPanel title="Achievement Unlocked" accent="gold">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            data-achievement-chip-host="true"
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto minmax(0, 1fr)',
              gap: '10px',
              alignItems: 'center',
              minWidth: '220px',
              flex: '1 1 280px',
            }}
          >
            <Chip pose="proud" size="sm" reducedMotion ariaLabel="Chip celebrates the unlocked achievement" />
            <ChipDialogueBubble
              text="Hang the receipt. This one goes in the building."
              pose="proud"
              pointer="left"
              reducedMotion
              monoBody
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ ...monoSm, color: '#fff', fontSize: '13px' }}>{achievement.title}</div>
            <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>{achievement.description}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <PixelBadge variant={tierAccent(achievement.tier)}>{achievement.tier}</PixelBadge>
            <PixelBadge variant="gold">{achievement.category}</PixelBadge>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
