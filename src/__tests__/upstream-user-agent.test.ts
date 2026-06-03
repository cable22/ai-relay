// ============================================================
// Upstream User-Agent sanitization
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveUpstreamUserAgent, buildHeaders } from '@/lib/relay/transform';

describe('resolveUpstreamUserAgent', () => {
  const originalOverride = process.env.RELAY_DEFAULT_USER_AGENT;

  beforeEach(() => {
    delete process.env.RELAY_DEFAULT_USER_AGENT;
  });

  afterEach(() => {
    if (originalOverride === undefined) {
      delete process.env.RELAY_DEFAULT_USER_AGENT;
    } else {
      process.env.RELAY_DEFAULT_USER_AGENT = originalOverride;
    }
  });

  it('forwards a legitimate client UA unchanged', () => {
    expect(resolveUpstreamUserAgent('claude-cli/1.2.3 (external)')).toBe(
      'claude-cli/1.2.3 (external)'
    );
  });

  it('forwards a browser-like UA unchanged', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    expect(resolveUpstreamUserAgent(ua)).toBe(ua);
  });

  it('replaces python-requests UA with the relay default', () => {
    const resolved = resolveUpstreamUserAgent('python-requests/2.32.5');
    expect(resolved).not.toContain('python-requests');
    expect(resolved).toMatch(/^ai-relay\//);
  });

  it('replaces curl UA with the relay default', () => {
    const resolved = resolveUpstreamUserAgent('curl/8.4.0');
    expect(resolved).toMatch(/^ai-relay\//);
  });

  it('matches blocked patterns case-insensitively', () => {
    const resolved = resolveUpstreamUserAgent('Python-Requests/2.32.5');
    expect(resolved).toMatch(/^ai-relay\//);
  });

  it('replaces a missing UA with the relay default', () => {
    expect(resolveUpstreamUserAgent(undefined)).toMatch(/^ai-relay\//);
  });

  it('replaces an empty/whitespace UA with the relay default', () => {
    expect(resolveUpstreamUserAgent('   ')).toMatch(/^ai-relay\//);
  });

  it('honors RELAY_DEFAULT_USER_AGENT override for blocked UAs', () => {
    process.env.RELAY_DEFAULT_USER_AGENT = 'my-proxy/9.9';
    expect(resolveUpstreamUserAgent('python-requests/2.32.5')).toBe('my-proxy/9.9');
  });

  it('does not let the override affect legitimate client UAs', () => {
    process.env.RELAY_DEFAULT_USER_AGENT = 'my-proxy/9.9';
    expect(resolveUpstreamUserAgent('claude-cli/1.0')).toBe('claude-cli/1.0');
  });
});

describe('buildHeaders User-Agent integration', () => {
  it('always sets a User-Agent header even when client UA is absent', () => {
    const headers = buildHeaders('openai', 'sk-test', false, undefined);
    expect(headers['User-Agent']).toMatch(/^ai-relay\//);
  });

  it('sanitizes a blocked client UA in the built headers', () => {
    const headers = buildHeaders('anthropic', 'sk-test', true, 'python-requests/2.32.5');
    expect(headers['User-Agent']).not.toContain('python-requests');
  });

  it('forwards a legitimate client UA through buildHeaders', () => {
    const headers = buildHeaders('openai', 'sk-test', false, 'claude-cli/1.2.3');
    expect(headers['User-Agent']).toBe('claude-cli/1.2.3');
  });
});
