import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { SAVE_VERSION } from '@mfd/engine';
import { PixelScreenHeader, monoSm } from '../features/shared/pixelUi';
import { resolveCurrentAppRoute } from './currentAppRoute';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--mfd-bg)',
    color: 'var(--mfd-text)',
    padding: '2rem',
    textAlign: 'center' as const,
  },
  icon: {
    color: 'var(--mfd-red)',
    marginBottom: '0.5rem',
  },
  message: {
    fontFamily: 'var(--mfd-font-mono)',
    fontSize: '0.875rem',
    color: 'var(--mfd-text-dim)',
    maxWidth: '600px',
    marginBottom: '2rem',
    lineHeight: 1.6,
    wordBreak: 'break-word' as const,
  },
  content: {
    width: 'min(760px, 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  contextGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    textAlign: 'left' as const,
  },
  contextItem: {
    border: '1px solid var(--mfd-border)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  button: {
    fontFamily: 'var(--mfd-font-pixel)',
    fontSize: '0.75rem',
    padding: '0.75rem 1.5rem',
    border: '2px solid var(--mfd-gold)',
    backgroundColor: 'transparent',
    color: 'var(--mfd-gold)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s',
  },
} as const;

type DevLogWindow = typeof window & { __MFD_DEV_LOGS__?: unknown };

export function getCurrentErrorRoute(): string {
  if (typeof window === 'undefined') return 'server-render';
  return resolveCurrentAppRoute(window.location);
}

export function getRecentDevLogMessages(): string[] {
  if (typeof window === 'undefined') return [];
  const logs = (window as DevLogWindow).__MFD_DEV_LOGS__;
  if (!Array.isArray(logs)) return [];
  return logs.slice(-5).map((entry) => String(entry));
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[MFD] Uncaught error:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleReturn = (): void => {
    window.location.hash = '#/';
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const route = getCurrentErrorRoute();
      const logs = getRecentDevLogMessages();

      return (
        <div style={styles.container} data-testid="error-boundary-fallback">
          <div style={styles.content}>
            <AlertTriangle size={48} style={styles.icon} />
            <PixelScreenHeader
              title="Technical Timeout"
              subtitle="The app hit an unrecoverable render error."
              badges={<PixelBadge variant="red">SAVE v{SAVE_VERSION}</PixelBadge>}
            />
            <p style={styles.message}>
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>

            <PixelPanel title="Error Context" accent="red">
              <div style={styles.contextGrid}>
                <div style={styles.contextItem}>
                  <span style={{ ...monoSm, color: 'var(--mfd-muted)' }}>ROUTE</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{route}</span>
                </div>
                <div style={styles.contextItem}>
                  <span style={{ ...monoSm, color: 'var(--mfd-muted)' }}>SAVE VERSION</span>
                  <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{SAVE_VERSION}</span>
                </div>
              </div>
            </PixelPanel>

            <PixelPanel title="Recent Dev Logs" accent="default">
              {logs.length > 0 ? (
                <ol style={{ margin: 0, paddingLeft: '18px', ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7, textAlign: 'left' }}>
                  {logs.map((log, index) => (
                    <li key={`${index}-${log}`}>{log}</li>
                  ))}
                </ol>
              ) : (
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', textAlign: 'left' }}>
                  No dev logs captured.
                </div>
              )}
            </PixelPanel>

            <div style={styles.buttonRow}>
              <button
                style={styles.button}
                onClick={this.handleRetry}
                data-testid="error-retry-button"
              >
                <RotateCcw size={14} />
                RETRY
              </button>
              <button
                style={styles.button}
                onClick={this.handleReturn}
                data-testid="error-return-button"
              >
                <Home size={14} />
                RETURN TO BRIEFING
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
