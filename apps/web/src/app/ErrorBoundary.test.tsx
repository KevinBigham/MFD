import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    const markup = renderToStaticMarkup(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(markup).toContain('All good');
    expect(markup).not.toContain('TECHNICAL TIMEOUT');
  });

  it('getDerivedStateFromError returns error state', () => {
    const error = new Error('Test failure');
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
  });

  it('renders fallback UI when state has error', () => {
    // Directly instantiate and set error state to verify fallback rendering.
    // Error boundaries only catch in client-side React, so we test the render
    // output by constructing the component with error state pre-set.
    const instance = new ErrorBoundary({ children: null });
    instance.state = {
      hasError: true,
      error: new Error('Something broke'),
    };
    const element = instance.render();
    const markup = renderToStaticMarkup(element as React.ReactElement);

    expect(markup).toContain('TECHNICAL TIMEOUT');
    expect(markup).toContain('Something broke');
  });

  it('fallback contains RETRY button', () => {
    const instance = new ErrorBoundary({ children: null });
    instance.state = {
      hasError: true,
      error: new Error('Crash'),
    };
    const element = instance.render();
    const markup = renderToStaticMarkup(element as React.ReactElement);

    expect(markup).toContain('RETRY');
    expect(markup).toContain('error-retry-button');
  });

  it('fallback contains RETURN TO BRIEFING button', () => {
    const instance = new ErrorBoundary({ children: null });
    instance.state = {
      hasError: true,
      error: new Error('Crash'),
    };
    const element = instance.render();
    const markup = renderToStaticMarkup(element as React.ReactElement);

    expect(markup).toContain('RETURN TO BRIEFING');
    expect(markup).toContain('error-return-button');
  });

  it('fallback includes current route and save version context', () => {
    vi.stubGlobal('window', {
      location: { hash: '#/faq', pathname: '/MFD/' },
    });
    try {
      const instance = new ErrorBoundary({ children: null });
      instance.state = {
        hasError: true,
        error: new Error('Crash'),
      };
      const element = instance.render();
      const markup = renderToStaticMarkup(element as React.ReactElement);

      expect(markup).toContain('/faq');
      expect(markup).toContain('SAVE VERSION');
      expect(markup).toContain('35');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fallback includes the last five dev log messages when present', () => {
    vi.stubGlobal('window', {
      location: { hash: '#/settings', pathname: '/MFD/' },
      __MFD_DEV_LOGS__: ['log-1', 'log-2', 'log-3', 'log-4', 'log-5', 'log-6'],
    });
    try {
      const instance = new ErrorBoundary({ children: null });
      instance.state = {
        hasError: true,
        error: new Error('Crash'),
      };
      const element = instance.render();
      const markup = renderToStaticMarkup(element as React.ReactElement);

      expect(markup).not.toContain('log-1');
      expect(markup).toContain('log-2');
      expect(markup).toContain('log-6');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fallback handles missing dev logs explicitly', () => {
    vi.stubGlobal('window', {
      location: { hash: '', pathname: '/MFD/' },
    });
    try {
      const instance = new ErrorBoundary({ children: null });
      instance.state = {
        hasError: true,
        error: new Error('Crash'),
      };
      const element = instance.render();
      const markup = renderToStaticMarkup(element as React.ReactElement);

      expect(markup).toContain('No dev logs captured.');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
