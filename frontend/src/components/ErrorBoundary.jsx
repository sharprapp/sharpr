import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Component error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 24, background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16,
          textAlign: 'center', color: '#ef4444', fontSize: 13,
        }}>
          Something went wrong loading this section.
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              display: 'block', margin: '12px auto 0',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '6px 14px', color: '#ef4444', cursor: 'pointer', fontSize: 12,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
