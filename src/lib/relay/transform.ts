// ============================================================
// AI API Relay — Request Transformation
// ============================================================

import type { ChatCompletionRequest } from '../types';

/**
 * Transform OpenAI-format request to Anthropic format.
 */
export function transformToAnthropic(body: ChatCompletionRequest): Record<string, unknown> {
  const { messages, model, max_tokens, temperature, top_p, stream, stop } = body;

  // Extract system message
  const systemMsg = messages.find((m) => m.role === 'system');
  const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

  const anthropicBody: Record<string, unknown> = {
    model,
    max_tokens: max_tokens || 4096,
    messages: nonSystemMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || '',
    })),
  };

  if (systemMsg?.content) {
    anthropicBody.system = systemMsg.content;
  }
  if (temperature !== undefined) anthropicBody.temperature = temperature;
  if (top_p !== undefined) anthropicBody.top_p = top_p;
  if (stream !== undefined) anthropicBody.stream = stream;
  if (stop) anthropicBody.stop_sequences = Array.isArray(stop) ? stop : [stop];

  return anthropicBody;
}

/**
 * Default User-Agent presented to upstream when the client's own UA is
 * missing or belongs to a generic scripting library that some upstreams
 * block (e.g. `python-requests`, `curl`). Overridable via env.
 */
const DEFAULT_UPSTREAM_USER_AGENT = `ai-relay/${process.env.npm_package_version ?? '2.9.0'}`;

/**
 * Lowercased prefixes/substrings of generic scripting-client User-Agents that
 * some upstream providers reject outright. These carry no useful identity, so
 * we replace them with the relay's own UA rather than forwarding them.
 */
const BLOCKED_USER_AGENT_PATTERNS = [
  'python-requests',
  'python-httpx',
  'python-urllib',
  'aiohttp',
  'go-http-client',
  'curl/',
  'wget/',
  'okhttp',
  'node-fetch',
  'axios/',
  'undici',
  'java/',
  'libwww-perl',
];

/**
 * Decide which User-Agent to present to the upstream provider.
 *
 * A legitimate client UA (e.g. `claude-cli/1.2.3`) is forwarded unchanged so
 * the upstream sees the real caller. A missing UA, or one belonging to a
 * generic scripting library known to be blocked, is replaced with a neutral
 * relay UA so the request is not rejected before it reaches the model.
 */
export function resolveUpstreamUserAgent(clientUserAgent?: string): string {
  const ua = clientUserAgent?.trim();
  if (!ua) return relayDefaultUserAgent();

  const lower = ua.toLowerCase();
  if (BLOCKED_USER_AGENT_PATTERNS.some(p => lower.includes(p))) {
    return relayDefaultUserAgent();
  }
  return ua;
}

function relayDefaultUserAgent(): string {
  return process.env.RELAY_DEFAULT_USER_AGENT?.trim() || DEFAULT_UPSTREAM_USER_AGENT;
}

/**
 * Build upstream request headers based on provider format.
 */
export function buildHeaders(
  headerFormat: 'openai' | 'anthropic' | 'azure',
  apiKey: string,
  isStream: boolean,
  userAgent?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (headerFormat === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else if (headerFormat === 'azure') {
    headers['api-key'] = apiKey;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (isStream) {
    headers['Accept'] = 'text/event-stream';
  }

  headers['User-Agent'] = resolveUpstreamUserAgent(userAgent);

  return headers;
}
