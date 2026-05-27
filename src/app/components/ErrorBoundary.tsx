'use client';

// ============================================================
// AI API Relay — ErrorBoundary Component
// ============================================================
//
// Catches React rendering errors and displays a friendly fallback.
// Includes error detail expansion and action buttons.

import { Component, type ReactNode, type ErrorInfo } from 'react';
import type { ErrorMapping } from '@/lib/errors/error-codes';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  expanded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, expanded: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, expanded: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const mapping: ErrorMapping = {
      title: '页面渲染错误',
      message: this.state.error?.message || '组件渲染过程中发生了错误。',
      severity: 'error',
      actions: [
        { label: '重试', kind: 'retry' },
        { label: '查看详情', kind: 'docs' },
      ],
    };

    return this.props.fallback || (
      <div style={{
        padding: '2rem',
        margin: '1rem',
        background: '#1a0a0a',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem', color: '#ef4444' }}>✕</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#ef4444' }}>
              {mapping.title}
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#8888aa', lineHeight: 1.5 }}>
              {mapping.message}
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                🔄 重试
              </button>
              <button
                onClick={() => this.setState({ expanded: !this.state.expanded })}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: '#8888aa',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                {this.state.expanded ? '收起详情' : '查看详情'}
              </button>
            </div>

            {/* Expandable error detail */}
            <div style={{
              maxHeight: this.state.expanded ? '300px' : '0',
              overflow: 'hidden',
              transition: 'max-height 200ms ease-in-out',
            }}>
              <pre style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#8888aa',
                overflow: 'auto',
                maxHeight: '250px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {this.state.error?.stack || 'No stack trace available'}
                {this.state.errorInfo?.componentStack && `\n\nComponent Stack:${this.state.errorInfo.componentStack}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
