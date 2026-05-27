import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Forward error to parent window
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: 'REACT_ERROR',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }, '*');
    }

    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: '#ff6b6b',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '14px',
          padding: '20px',
          overflow: 'auto',
          zIndex: 99999,
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: '#ff6b6b', fontSize: '24px', marginBottom: '16px' }}>
              ❌ Runtime Error
            </h1>
            <div style={{
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid #ff6b6b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>
                {error?.message || 'Unknown error'}
              </div>
              {error?.stack && (
                <pre style={{
                  color: '#aaa',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}>
                  {error.stack}
                </pre>
              )}
            </div>
            {errorInfo?.componentStack && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '16px',
              }}>
                <div style={{ color: '#888', marginBottom: '8px' }}>Component Stack:</div>
                <pre style={{
                  color: '#666',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}>
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#ff6b6b',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
