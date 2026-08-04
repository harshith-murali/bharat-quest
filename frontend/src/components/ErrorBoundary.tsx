import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Canvas Error Boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '0.5rem',
            background: 'rgba(20, 25, 40, 0.9)',
            color: 'var(--color-gold)',
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>🐶</span>
          <span>BHARAT COMPANION</span>
        </div>
      );
    }

    return this.props.children;
  }
}
