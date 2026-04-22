import type { CSSProperties } from 'react';
import type { ChronicleEventType } from '../../lib/dynasty-chronicle';
import { listChronicleEventTypes } from '../../lib/dynasty-chronicle-filter';
import { monoSm, pixelSm } from '../shared/pixelUi';

const EVENT_TYPE_LABEL: Record<ChronicleEventType, string> = {
  championship_win: 'Titles',
  hof_induction: 'Hall of Fame',
  playoff_round: 'Playoffs',
  season_end: 'Season',
  coach_championship: 'Coach Title',
  coach_hire: 'Coach Hire',
  coach_retire: 'Retirement',
  scrapbook_note: 'Scrapbook',
};

type FilterAccent = 'default' | 'gold' | 'cyan' | 'green';

const EVENT_TYPE_ACCENT: Record<ChronicleEventType, FilterAccent> = {
  championship_win: 'gold',
  hof_induction: 'gold',
  playoff_round: 'cyan',
  season_end: 'default',
  coach_championship: 'green',
  coach_hire: 'green',
  coach_retire: 'green',
  scrapbook_note: 'default',
};

function accentColor(accent: FilterAccent): string {
  switch (accent) {
    case 'gold':
      return 'var(--mfd-gold)';
    case 'cyan':
      return 'var(--mfd-cyan)';
    case 'green':
      return 'var(--mfd-green)';
    default:
      return 'var(--mfd-text-dim)';
  }
}

function chipStyle(active: boolean, accent: FilterAccent): CSSProperties {
  const accentVar = accentColor(accent);
  return {
    appearance: 'none',
    border: `2px solid ${active ? accentVar : 'var(--mfd-border)'}`,
    background: active ? 'var(--mfd-bg-elevated)' : 'transparent',
    color: active ? accentVar : 'var(--mfd-text-dim)',
    padding: '6px 10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    opacity: active ? 1 : 0.5,
    ...pixelSm,
  };
}

const resetChipStyle: CSSProperties = {
  appearance: 'none',
  border: '1px dashed var(--mfd-border)',
  background: 'transparent',
  color: 'var(--mfd-text-dim)',
  padding: '6px 10px',
  cursor: 'pointer',
  ...pixelSm,
};

interface ChronicleFiltersProps {
  counts: Record<ChronicleEventType, number>;
  active: ReadonlySet<ChronicleEventType>;
  onToggle: (type: ChronicleEventType) => void;
  onReset: () => void;
}

export function ChronicleFilters({ counts, active, onToggle, onReset }: ChronicleFiltersProps) {
  const types = listChronicleEventTypes();
  return (
    <div
      data-testid="chronicle-filters"
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '8px 0',
      }}
    >
      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>FILTER //</span>
      {types.map((type) => {
        const isActive = active.has(type);
        const count = counts[type] ?? 0;
        const accent = EVENT_TYPE_ACCENT[type];
        return (
          <button
            key={type}
            type="button"
            data-testid="chronicle-filter-chip"
            data-filter-type={type}
            data-filter-active={isActive ? 'true' : 'false'}
            data-filter-count={count}
            data-filter-accent={accent}
            aria-pressed={isActive}
            aria-label={`Toggle ${EVENT_TYPE_LABEL[type]} events`}
            onClick={() => onToggle(type)}
            style={chipStyle(isActive, accent)}
          >
            <span>{EVENT_TYPE_LABEL[type]}</span>
            <span data-testid="chronicle-filter-count">{count}</span>
          </button>
        );
      })}
      <button
        type="button"
        data-testid="chronicle-filter-reset"
        aria-label="Reset filters"
        onClick={onReset}
        style={resetChipStyle}
      >
        RESET
      </button>
    </div>
  );
}
