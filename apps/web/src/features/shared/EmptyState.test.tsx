import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders reason and next-step text', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Test Title" reason="Test reason" nextStep="Test step" />,
    );
    expect(html).toContain('Test reason');
    expect(html).toContain('Test step');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it('renders action button when actionLabel and actionRoute provided', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Test Title"
        reason="Test reason"
        nextStep="Test step"
        actionLabel="Go Fix"
        actionRoute="/fix"
      />,
    );
    expect(html).toContain('Go Fix');
  });
});
