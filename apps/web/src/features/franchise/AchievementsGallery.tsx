import { useMemo, useState } from 'react';
import type { Achievement, AchievementCategory } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { selectAchievements, useGameStore } from '../../app/store/game-store';
import {
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { AchievementMedalSvg } from './achievementMedalSvg';

type GalleryFilter = 'all' | 'unlocked' | 'locked' | AchievementCategory;
type GallerySort = 'recent' | 'tier' | 'category';

const FILTERS: Array<{ id: GalleryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unlocked', label: 'Unlocked' },
  { id: 'locked', label: 'Locked' },
  { id: 'dynasty', label: 'Dynasty' },
  { id: 'roster', label: 'Roster' },
  { id: 'draft', label: 'Draft' },
  { id: 'financial', label: 'Financial' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'narrative', label: 'Narrative' },
  { id: 'records', label: 'Records' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'hidden', label: 'Hidden' },
];

const SORTS: Array<{ id: GallerySort; label: string }> = [
  { id: 'recent', label: 'Recently Unlocked' },
  { id: 'tier', label: 'Tier Gold to Bronze' },
  { id: 'category', label: 'Category' },
];

const TIER_ORDER: Record<Achievement['tier'], number> = {
  platinum: 0,
  gold: 1,
  silver: 2,
  bronze: 3,
};

function isUnlocked(achievement: Achievement): boolean {
  return achievement.unlockedYear !== null;
}

function filterAchievements(achievements: Achievement[], filter: GalleryFilter): Achievement[] {
  if (filter === 'all') return achievements;
  if (filter === 'unlocked') return achievements.filter(isUnlocked);
  if (filter === 'locked') return achievements.filter((achievement) => !isUnlocked(achievement));
  return achievements.filter((achievement) => achievement.category === filter);
}

function sortAchievements(achievements: Achievement[], sort: GallerySort): Achievement[] {
  const copy = [...achievements];
  if (sort === 'tier') {
    return copy.sort((left, right) => TIER_ORDER[left.tier] - TIER_ORDER[right.tier] || left.title.localeCompare(right.title));
  }
  if (sort === 'category') {
    return copy.sort((left, right) => left.category.localeCompare(right.category) || left.title.localeCompare(right.title));
  }
  return copy.sort((left, right) => {
    const rightYear = right.unlockedYear ?? Number.MIN_SAFE_INTEGER;
    const leftYear = left.unlockedYear ?? Number.MIN_SAFE_INTEGER;
    if (rightYear !== leftYear) return rightYear - leftYear;
    const rightWeek = right.unlockedWeek ?? Number.MIN_SAFE_INTEGER;
    const leftWeek = left.unlockedWeek ?? Number.MIN_SAFE_INTEGER;
    if (rightWeek !== leftWeek) return rightWeek - leftWeek;
    return left.title.localeCompare(right.title);
  });
}

function criteriaText(achievement: Achievement): string {
  const type = achievement.condition.type.replaceAll('_', ' ');
  return `Criteria: ${type} ${achievement.condition.threshold}`;
}

function tierVariant(tier: Achievement['tier']): 'gold' | 'cyan' | 'green' | 'default' {
  if (tier === 'platinum' || tier === 'gold') return 'gold';
  if (tier === 'silver') return 'cyan';
  if (tier === 'bronze') return 'green';
  return 'default';
}

function categoryLabel(category: AchievementCategory): string {
  return category.replaceAll('_', ' ');
}

export function AchievementsGalleryView({
  achievements,
  initialFilter = 'all',
  initialSort = 'recent',
}: {
  achievements: Achievement[];
  initialFilter?: GalleryFilter;
  initialSort?: GallerySort;
}) {
  const [filter, setFilter] = useState<GalleryFilter>(initialFilter);
  const [sort, setSort] = useState<GallerySort>(initialSort);
  const unlockedCount = achievements.filter(isUnlocked).length;
  const visibleAchievements = useMemo(
    () => sortAchievements(filterAchievements(achievements, filter), sort),
    [achievements, filter, sort],
  );

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Achievements"
        subtitle="Every milestone earned, every banner raised."
        badges={(
          <>
            <PixelBadge variant="gold">{`${unlockedCount} of ${achievements.length} unlocked`}</PixelBadge>
            <PixelBadge variant="cyan">Medal Gallery</PixelBadge>
          </>
        )}
      />

      {unlockedCount === 0 ? (
        <PixelPanel title="No medals raised" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            No achievements yet. Build something legendary.
          </div>
        </PixelPanel>
      ) : null}

      <PixelPanel title="Filters" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FILTERS.map((entry) => (
              <PixelButton key={entry.id} accent={filter === entry.id ? 'gold' : 'default'} onClick={() => setFilter(entry.id)}>
                {entry.label}
              </PixelButton>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {SORTS.map((entry) => (
              <PixelButton key={entry.id} accent={sort === entry.id ? 'cyan' : 'default'} onClick={() => setSort(entry.id)}>
                {entry.label}
              </PixelButton>
            ))}
          </div>
        </div>
      </PixelPanel>

      <div style={autoGrid(320)}>
        {visibleAchievements.map((achievement) => {
          const unlocked = isUnlocked(achievement);
          return (
            <article
              key={achievement.id}
              data-achievement-card={achievement.id}
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                minHeight: '188px',
                padding: '14px',
                border: `2px solid ${unlocked ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                background: 'var(--mfd-bg-2)',
                filter: unlocked ? 'none' : 'grayscale(0.55)',
              }}
            >
              <AchievementMedalSvg tier={achievement.tier} locked={!unlocked} title={`${achievement.title} medal`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={tierVariant(achievement.tier)}>{achievement.tier}</PixelBadge>
                  <PixelBadge variant="default">{categoryLabel(achievement.category)}</PixelBadge>
                  {unlocked ? <PixelBadge variant="gold">Unlocked</PixelBadge> : <PixelBadge variant="default">Locked</PixelBadge>}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', fontWeight: 700, fontSize: '13px', lineHeight: 1.4 }}>
                  {achievement.title}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                  {achievement.description}
                </div>
                <div style={{ ...monoSm, color: unlocked ? 'var(--mfd-cyan)' : 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
                  {criteriaText(achievement)}
                </div>
                {unlocked ? (
                  <div style={{ ...monoSm, color: 'var(--mfd-gold)' }}>
                    Year {achievement.unlockedYear}{achievement.unlockedWeek !== null ? ` // Week ${achievement.unlockedWeek}` : ''}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function AchievementsGallery() {
  const achievements = useGameStore(selectAchievements);
  return <AchievementsGalleryView achievements={achievements} />;
}
