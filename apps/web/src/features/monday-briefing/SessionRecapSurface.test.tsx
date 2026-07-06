import { Children, isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SessionRecapSurface } from './MondayBriefing';
import type { SessionRecap } from '../../lib/session-recap';

const recap: SessionRecap = {
  stakesLine: 'Austin Armadillos is next with #1 AFC playoff seed.',
  sourceRefs: ['weekSummary:summary-2029-12', 'leagueNews:news-2029-12'],
  beats: [
    {
      id: 'session-recap:left-off:summary-2029-12',
      kind: 'LEFT_OFF',
      label: 'Where you left off',
      text: 'You left off at 8-4 after a strong win.',
      sourceRefs: ['weekSummary:summary-2029-12'],
    },
    {
      id: 'session-recap:just-happened:news:news-2029-12',
      kind: 'JUST_HAPPENED',
      label: 'What just happened',
      text: 'Deadline move paid off.',
      sourceRefs: ['leagueNews:news-2029-12'],
    },
    {
      id: 'session-recap:this-week:opponent:2029:13:team-2',
      kind: 'THIS_WEEK',
      label: "What's at stake",
      text: 'Week 13: home vs Austin Armadillos.',
      sourceRefs: ['schedule:2029:13:team-2'],
    },
  ],
};

function findDismissControl(node: ReactNode): { props: { onClick?: () => void } } | null {
  if (!isValidElement(node)) return null;
  const props = node.props as { children?: ReactNode; [key: string]: unknown };
  if (props['data-session-recap-dismiss']) {
    return node as unknown as { props: { onClick?: () => void } };
  }

  for (const child of Children.toArray(props.children)) {
    const found = findDismissControl(child);
    if (found) return found;
  }

  return null;
}

describe('SessionRecapSurface', () => {
  it('renders the Chip path when Chip is enabled', () => {
    const markup = renderToStaticMarkup(
      <SessionRecapSurface recap={recap} visible chipEnabled reducedMotion onDismiss={() => undefined} />,
    );

    expect(markup).toContain('data-session-recap-surface="chip"');
    expect(markup).toContain('Previously on your dynasty');
    expect(markup).toContain('Chip opener');
    expect(markup).toContain('WHERE YOU LEFT OFF');
    expect(markup).toContain('Browser-local convenience state');
    expect(markup).toContain('outside the dynasty archive');
  });

  it('renders the Pixel fallback when Chip is disabled', () => {
    const markup = renderToStaticMarkup(
      <SessionRecapSurface recap={recap} visible chipEnabled={false} onDismiss={() => undefined} />,
    );

    expect(markup).toContain('data-session-recap-surface="fallback"');
    expect(markup).toContain('PREVIOUSLY ON YOUR DYNASTY');
    expect(markup).toContain('Session recap');
    expect(markup).toContain('Dismiss Recap');
  });

  it('hides when dismissed or missing recap data', () => {
    expect(renderToStaticMarkup(
      <SessionRecapSurface recap={recap} visible={false} chipEnabled onDismiss={() => undefined} />,
    )).toBe('');
    expect(renderToStaticMarkup(
      <SessionRecapSurface recap={null} visible chipEnabled onDismiss={() => undefined} />,
    )).toBe('');
  });

  it('wires the one-tap dismiss control', () => {
    const onDismiss = vi.fn();
    const element = SessionRecapSurface({ recap, visible: true, chipEnabled: true, onDismiss });
    const dismissControl = findDismissControl(element);

    expect(dismissControl).not.toBeNull();
    dismissControl?.props.onClick?.();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
