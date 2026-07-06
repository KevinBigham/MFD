import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { LombardiTrophy, getTrophyStripeCount } from './lombardiTrophy';
import {
  TrophyRoomView,
  filterChampionships,
  type TrophyRoomChampionship,
} from './TrophyRoom';

const championships: TrophyRoomChampionship[] = [
  {
    year: 2034,
    opponent: 'New York Knights',
    score: '31-20',
    mvp: 'Cole Stone',
    ceremonyId: 'ceremony-2034',
    record: '14-3',
  },
  {
    year: 2032,
    opponent: 'Miami Sharks',
    score: '27-24',
    mvp: 'Jace North',
    record: '13-4',
  },
  {
    year: 2030,
    opponent: 'Seattle Orcas',
    score: '24-17',
    mvp: 'Mara Vale',
    record: '12-5',
  },
  {
    year: 2020,
    opponent: 'Denver Peaks',
    score: '21-17',
    mvp: 'Rex Holt',
    record: '11-6',
  },
];

function renderTrophyRoom(
  overrides: Partial<Parameters<typeof TrophyRoomView>[0]> = {},
) {
  return renderToStaticMarkup(
    <TrophyRoomView
      championships={championships}
      ceremonies={[]}
      currentYear={2035}
      filterMode="all"
      onFilterChange={() => undefined}
      onTrophySelect={() => undefined}
      {...overrides}
    />,
  );
}

function flattenText(children: unknown): string {
  if (Array.isArray(children)) return children.map((child) => flattenText(child)).join('');
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (typeof children === 'object' && 'props' in children) {
    return flattenText((children as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}

function findButtonByLabel(node: unknown, label: string): { props?: { onClick?: () => void; 'aria-label'?: string; children?: unknown } } | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButtonByLabel(child, label);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  const element = node as { type?: unknown; props?: { children?: unknown; onClick?: () => void; 'aria-label'?: string } };
  if (typeof element.type === 'function') {
    return findButtonByLabel(element.type(element.props ?? {}), label);
  }
  if (element.props?.['aria-label'] === label) {
    return element;
  }

  const children = element.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findButtonByLabel(child, label);
      if (found) return found;
    }
    return null;
  }

  return findButtonByLabel(children, label);
}

describe('TrophyRoom', () => {
  it('renders the Trophy Room header', () => {
    const markup = renderTrophyRoom();

    expect(markup).toContain('TROPHY ROOM');
    expect(markup).toContain('Every banner. Every ring. Every parade.');
  });

  it('renders the empty state when no championships are archived', () => {
    const markup = renderTrophyRoom({ championships: [] });

    expect(markup).toContain('No championships yet. The trophy case is empty.');
    expect(markup).toContain('data-chip-pose="idle"');
    expect(markup).toContain('VIEW PLAYOFF LORE');
    expect(markup).toContain('FIRST BANNER CHASE');
    expect(markup).toContain('Standings');
    expect(markup).toContain('Schedule');
    expect(markup).toContain('Game Plan');
  });

  it('renders trophy source context and no-write boundaries', () => {
    const markup = renderTrophyRoom();

    expect(markup).toContain('TROPHY SOURCES');
    expect(markup).toContain('SAVE MEMORY');
    expect(markup).toContain('game.franchiseHistory');
    expect(markup).toContain('selectCeremonies');
    expect(markup).toContain('buildTrophyRoomChampionships');
    expect(markup).toContain('filterMode');
    expect(markup).toContain('Opening Trophy Room does not award championships');
    expect(markup).toContain('generate ceremonies');
    expect(markup).toContain('change the live save');
    expect(markup).toContain('play scheduled games');
  });

  it('links the trophy archive back into the current banner chase', () => {
    const markup = renderTrophyRoom();

    expect(markup).toContain('NEXT BANNER CHASE');
    expect(markup).toContain('check the race');
    expect(markup).toContain('Standings');
    expect(markup).toContain('Schedule');
    expect(markup).toContain('Game Plan');
  });

  it('renders one Lombardi SVG per championship in props', () => {
    const markup = renderTrophyRoom();

    expect(markup.match(/data-lombardi-trophy="true"/g)).toHaveLength(championships.length);
  });

  it('filters Recent to championships within the last 10 simulated years', () => {
    const recent = filterChampionships(championships, 'recent', 2035);

    expect(recent.map((championship) => championship.year)).toEqual([2034, 2032, 2030]);
  });

  it('filters Dynasty Run to title years inside a 3-in-5 window', () => {
    const dynastyRun = filterChampionships(championships, 'dynasty', 2035);

    expect(dynastyRun.map((championship) => championship.year)).toEqual([2034, 2032, 2030]);
  });

  it('trophy card click invokes onTrophySelect with the correct year', () => {
    const onTrophySelect = vi.fn();
    const tree = TrophyRoomView({
      championships,
      ceremonies: [],
      currentYear: 2035,
      filterMode: 'all',
      onFilterChange: () => undefined,
      onTrophySelect,
    }) as ReactElement;
    const button = findButtonByLabel(tree, 'Open 2034 championship trophy');

    button?.props?.onClick?.();

    expect(onTrophySelect).toHaveBeenCalledWith(championships[0]);
  });

  it('stripe count on trophy SVG matches championship era tier', () => {
    expect(getTrophyStripeCount(1)).toBe(1);
    expect(getTrophyStripeCount(2)).toBe(2);
    expect(getTrophyStripeCount(5)).toBe(3);

    const markup = renderToStaticMarkup(<LombardiTrophy championshipCount={5} title="Five title tier" />);
    expect(markup).toContain('data-stripe-count="3"');
  });
});
