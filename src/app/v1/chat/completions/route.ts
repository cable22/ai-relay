// ============================================================
// AI API Relay — /v1/chat/completions Route Handler
// ============================================================

import { NextRequest } from 'next/server';
import { validateAuth, relayRequest } from '@/lib/relay';
import { RelayError } from '@/lib/errors';
import { KVUsageStorage } from '@/lib/usage';

export const runtime = 'edge';

const usageStorage = new KVUsageStorage();

/**
 * Wrap a streaming SSE response to intercept and track token usage.
 * OpenAI-compatible APIs return usage in the final SSE chunk when
 * `stream_options.include_usage: true` is set.
 */
function wrapStreamWithUsageTracking(
  upstreamBody: ReadableStream<Uint8Array>,
  apiKeyHash: string,
  providerName: string,
  model: string,
  startTime: number
): ReadableStream<Uint8Array> {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null;

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        // Stream ended — record usage from the last chunk that had it
        if (lastUsage) {
          const latencyMs = Date.now() - startTime;
          const event = (await import('@/lib/usage/sdk')).createUsageEvent({
            provider: providerName,
            model,
            apiKeyHash,
            statusCode: 200,
            promptTokens: lastUsage.prompt_tokens || 0,
            completionTokens: lastUsage.completion_tokens || 0,
            latencyMs,
            isStream: true,
          });
          usageStorage.record(event).catch(() => {});
        }
        controller.close();
        return;
      }

      // Pass through the chunk unchanged
      controller.enqueue(value);

      // Also parse SSE lines to find usage data
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.usage) {
            lastUsage = parsed.usage;
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    },
  });
}

/**
 * POST /v1/chat/completions
 *
 * OpenAI-compatible chat completions endpoint.
 * Routes requests to the appropriate upstream provider based on model prefix.
 */
export async function POST(request: NextRequest) {
  // 1. Validate authentication
  if (!validateAuth(request)) {
    return new Response(
      JSON.stringify({
        error: {
          message: 'Invalid API key. Provide a valid key in the Authorization header.',
          type: 'authentication_error',
          code: 401,
        },
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          message: 'Invalid JSON in request body.',
          type: 'invalid_request_error',
          code: 400,
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Validate required fields
  if (!body.model) {
    return new Response(
      JSON.stringify({
        error: {
          message: 'Missing required field: model.',
          type: 'invalid_request_error',
          code: 400,
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(
      JSON.stringify({
        error: {
          message: 'Missing or empty required field: messages.',
          type: 'invalid_request_error',
          code: 400,
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3.5. Check rate limits (quota)
  const quota = await usageStorage.checkQuota();
  if (!quota.allowed) {
    return new Response(
      JSON.stringify({
        error: {
          message: `Rate limit exceeded. Daily: ${quota.dailyUsed}/${quota.dailyLimit}, Monthly: ${quota.monthlyUsed}/${quota.monthlyLimit}. Retry after ${quota.retryAfter}s.`,
          type: 'rate_limit_error',
          code: 429,
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(quota.retryAfter || 60),
        },
      }
    );
  }

  // 4. Relay the request
  try {
    const { response, provider, apiKey } = await relayRequest(body);

    // 5. Stream or return the response
    if (body.stream) {
      // Inject stream_options.include_usage so upstream returns usage in final SSE chunk
      const startTime = Date.now();
      const wrappedBody = wrapStreamWithUsageTracking(
        response.body!,
        apiKey.hash,
        provider.name,
        body.model,
        startTime
      );
      return new Response(wrappedBody, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Relay-Provider': provider.name,
          'X-Relay-Key': apiKey.hash,
        },
      });
    } else {
      const responseBody = await response.text();
      return new Response(responseBody, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'X-Relay-Provider': provider.name,
          'X-Relay-Key': apiKey.hash,
        },
      });
    }
  } catch (error) {
    if (error instanceof RelayError) {
      return error.toResponse();
    }

    console.error('Relay error:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: 'Internal relay error.',
          type: 'server_error',
          code: 500,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
