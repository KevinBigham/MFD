import { useMemo, useState } from 'react';
import { getAchievementProgress, type Achievement, type AchievementCategory, type AchievementProgress } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar } from '@mfd/design-system/components';
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

function thresholdLabel(achievement: Achievement): string {
  return String(achievement.condition.threshold);
}

function readableCriteria(achievement: Achievement): string {
  const target = thresholdLabel(achievement);
  switch (achievement.condition.type) {
    case 'championships':
      return `Win ${target} championship${target === '1' ? '' : 's'}`;
    case 'consecutive_championships':
      return `Win ${target} championships in a row`;
    case 'perfect_season':
      return 'Finish a title season without a loss';
    case 'worst_to_first':
      return 'Follow a losing season with a playoff breakthrough';
    case 'full_house':
      return 'Fill the active roster and practice squad under current league rules';
    case 'average_roster_age_under':
      return `Keep roster average age under ${target}`;
    case 'average_roster_ovr':
      return `Reach ${target} average roster OVR`;
    case 'cap_wizard':
      return 'Stay cap-legal with contender-level roster talent';
    case 'cinderella_story':
      return 'Win the title from seed 7 or lower';
    case 'playoff_comebacks':
      return `Win ${target} playoff comeback games in one postseason`;
    default:
      return `Reach ${target} ${achievement.condition.type.replaceAll('_', ' ')}`;
  }
}

function criteriaText(achievement: Achievement, progress?: AchievementProgress | null): string {
  if (achievement.category === 'hidden' && achievement.unlockedYear === null) {
    return 'Criteria hidden until unlocked.';
  }
  if (achievement.unlockedYear === null && progress && !progress.hidden) {
    return `Progress: ${progress.label}`;
  }
  return `Goal: ${readableCriteria(achievement)}`;
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
  progressById,
  initialFilter = 'all',
  initialSort = 'recent',
}: {
  achievements: Achievement[];
  progressById?: Record<string, AchievementProgress | null>;
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
          const hiddenLocked = achievement.category === 'hidden' && !unlocked;
          const progress = progressById?.[achievement.id] ?? null;
          const title = hiddenLocked ? '???' : achievement.title;
          const description = hiddenLocked ? 'A hidden achievement waits behind a mystery run.' : achievement.description;
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
              <AchievementMedalSvg tier={achievement.tier} locked={!unlocked} title={`${title} medal`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={tierVariant(achievement.tier)}>{achievement.tier}</PixelBadge>
                  <PixelBadge variant="default">{categoryLabel(achievement.category)}</PixelBadge>
                  {unlocked ? <PixelBadge variant="gold">Unlocked</PixelBadge> : <PixelBadge variant="default">Locked</PixelBadge>}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', fontWeight: 700, fontSize: '13px', lineHeight: 1.4 }}>
                  {title}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                  {description}
                </div>
                <div style={{ ...monoSm, color: unlocked ? 'var(--mfd-cyan)' : 'var(--mfd-text-faint)', lineHeight: 1.5 }}>
                  {criteriaText(achievement, progress)}
                </div>
                {!unlocked && progress && !progress.hidden ? (
                  <PixelProgressBar
                    value={progress.percentage}
                    accent={tierVariant(achievement.tier)}
                    label={progress.label}
                    valueLabel={`${progress.percentage}%`}
                  />
                ) : null}
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
  const game = useGameStore((state) => state.game);
  const progressById = useMemo(() => {
    if (!game) return undefined;
    return Object.fromEntries(
      achievements.map((achievement) => [achievement.id, getAchievementProgress(game, achievement.id)]),
    );
  }, [achievements, game]);
  return <AchievementsGalleryView achievements={achievements} progressById={progressById} />;
}
