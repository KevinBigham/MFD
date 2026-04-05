import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

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
    marginBottom: '1.5rem',
  },
  header: {
    fontFamily: 'var(--mfd-font-pixel)',
    fontSize: '1.5rem',
    color: 'var(--mfd-gold)',
    marginBottom: '1rem',
    letterSpacing: '0.05em',
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
      return (
        <div style={styles.container} data-testid="error-boundary-fallback">
          <AlertTriangle size={48} style={styles.icon} />
          <h1 style={styles.header}>TECHNICAL TIMEOUT</h1>
          <p style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
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
      );
    }

    return this.props.children;
  }
}
