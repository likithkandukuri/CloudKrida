import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Krida] Rendering error caught by boundary:', error.message)
    console.error('[Krida] Component stack:', info?.componentStack)
    this.setState({ errorInfo: info })
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || 'An unexpected error occurred.'
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 40, textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: 'var(--cc-text, #ede5d5)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>⚠</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: 'var(--cc-warn, #f87171)' }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 14, color: 'var(--cc-sub, #a09880)', marginBottom: 8, maxWidth: 420, lineHeight: 1.65 }}>
            {msg}
          </div>
          <div style={{ fontSize: 12, color: 'var(--cc-muted, #606870)', marginBottom: 28 }}>
            Check the browser console for details.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => this.setState({ error: null, errorInfo: null })}
              style={{
                padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                background: 'var(--cc-sel, rgba(212,163,54,0.18))',
                border: '1px solid var(--cc-border2, rgba(212,163,54,0.28))',
                color: 'var(--cc-gold, #f0c060)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                background: 'var(--cc-surface, rgba(212,163,54,0.05))',
                border: '1px solid var(--cc-border, rgba(212,163,54,0.16))',
                color: 'var(--cc-sub, #a09880)', fontFamily: 'inherit', fontSize: 14,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
