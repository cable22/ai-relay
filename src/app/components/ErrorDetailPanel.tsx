'use client';

// ============================================================
// AI API Relay — Error Detail Panel
// ============================================================
//
// DESIGN-SPEC.md §3.3 — embedded in page content flow (not a modal).
// - Default collapsed: shows one-line summary
// - Expand: shows error code, provider, timestamp, trace ID
// - Action buttons: retry / switch provider / docs
// - Collapse animation: max-height transition 200ms

import { useState } from 'react';
import { getErrorMapping, type ErrorAction, type ErrorSeverity } from '@/lib/errors/error-codes';

interface ErrorDetailProps {
  statusCode: number;
  message: string;
  provider?: string;
  traceId?: string;
  timestamp?: string;
  onRetry?: () => void;
  onSwitchProvider?: () => void;
}

const SEVERITY_COLORS: Record<ErrorSeverity, string> = {
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const SEVERITY_BG: Record<ErrorSeverity, string> = {
  error: '#1a0a0a',
  warning: '#1a1500',
  info: '#0a0a1a',
};

export function ErrorDetailPanel({
  statusCode,
  message,
  provider,
  traceId,
  timestamp,
  onRetry,
  onSwitchProvider,
}: ErrorDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const mapping = getErrorMapping(statusCode);
  const color = SEVERITY_COLORS[mapping.severity];
  const bg = SEVERITY_BG[mapping.severity];

  const handleAction = (action: ErrorAction) => {
    switch (action.kind) {
      case 'retry':
        onRetry?.();
        break;
      case 'switch':
        onSwitchProvider?.();
        break;
      case 'docs':
        if (action.url) window.open(action.url, '_blank');
        break;
      case 'dismiss':
        break;
    }
  };

  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}33`,
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      {/* Header — always visible, clickable to expand */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.875rem 1rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          color,
          flexShrink: 0,
        }}>
          {mapping.severity === 'error' ? '✕' : mapping.severity === 'warning' ? '!' : 'i'}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e0e0e0' }}>
            {mapping.title}
            <span style={{
              marginLeft: '0.5rem',
              fontSize: '0.7rem',
              color: '#555570',
              fontWeight: 400,
            }}>
              HTTP {statusCode}
            </span>
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: '#8888aa',
            marginTop: '0.2rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {message}
          </div>
        </div>

        <span style={{
          color: '#555570',
          fontSize: '0.75rem',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 200ms',
        }}>
          ▼
        </span>
      </div>

      {/* Expandable content */}
      <div style={{
        maxHeight: expanded ? '400px' : '0',
        overflow: 'hidden',
        transition: 'max-height 200ms ease-in-out',
      }}>
        <div style={{
          padding: '0 1rem 1rem 1rem',
          borderTop: `1px solid ${color}15`,
        }}>
          {/* Error details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.4rem 1rem',
            padding: '0.75rem 0',
            fontSize: '0.8rem',
          }}>
            <span style={{ color: '#555570' }}>状态码</span>
            <span style={{ color: '#e0e0e0', fontFamily: 'monospace' }}>{statusCode}</span>

            {provider && (
              <>
                <span style={{ color: '#555570' }}>Provider</span>
                <span style={{ color: '#e0e0e0' }}>{provider}</span>
              </>
            )}

            {traceId && (
              <>
                <span style={{ color: '#555570' }}>Trace ID</span>
                <span style={{ color: '#8888aa', fontFamily: 'monospace', fontSize: '0.75rem' }}>{traceId}</span>
              </>
            )}

            {timestamp && (
              <>
                <span style={{ color: '#555570' }}>时间</span>
                <span style={{ color: '#8888aa' }}>{new Date(timestamp).toLocaleString('zh-CN')}</span>
              </>
            )}
          </div>

          {/* User-friendly message */}
          <p style={{
            margin: '0.5rem 0',
            padding: '0.75rem',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#8888aa',
            lineHeight: 1.5,
          }}>
            {mapping.message}
          </p>

          {/* Action buttons — §3.4 */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '0.75rem',
            flexWrap: 'wrap',
          }}>
            {mapping.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleAction(action)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: action.kind === 'switch'
                    ? `1px solid ${color}60`
                    : '1px solid rgba(255,255,255,0.08)',
                  background: action.kind === 'switch' ? `${color}15` : 'transparent',
                  color: action.kind === 'switch' ? color : action.kind === 'docs' ? '#8888aa' : '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  textDecoration: action.kind === 'docs' ? 'underline' : 'none',
                  textUnderlineOffset: '2px',
                }}
              >
                {action.kind === 'retry' && '🔄 '}
                {action.kind === 'switch' && '🔀 '}
                {action.kind === 'docs' && '📄 '}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
