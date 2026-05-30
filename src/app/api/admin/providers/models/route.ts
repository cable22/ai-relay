// ============================================================
// AI API Relay — Admin: Discover Provider Models
// POST /api/admin/providers/models
// ============================================================

import { NextRequest } from 'next/server';
import { requireAdminAuth, getManagedKeys, tryDecodeBase64 } from '@/lib/admin';
import { hashKey } from '@/lib/relay';
import { getAllProviders } from '@/lib/providers';
import { buildHeaders } from '@/lib/relay/transform';
import type { ModelInfo, ProviderConfig } from '@/lib/providers/types';

export const runtime = 'nodejs';
export const maxDuration = 15;

type DiscoverModelsBody = {
  provider?: string;
  providerConfig?: ProviderConfig;
  key?: string;
  hash?: string;
};

function getModelsUrl(provider: ProviderConfig): string {
  const customBase = provider.envBaseUrlField ? process.env[provider.envBaseUrlField] : undefined;
  let base = (customBase || provider.baseUrl || '').trim().replace(/\/+$/, '');

  base = base
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/messages$/i, '');

  return `${base}/models`;
}

function normalizeModel(raw: any): ModelInfo | null {
  const id = typeof raw === 'string' ? raw : raw?.id;
  if (!id || typeof id !== 'string') return null;
  return {
    id,
    displayName: typeof raw?.displayName === 'string' ? raw.displayName : id,
    contextWindow: Number(raw?.contextWindow || raw?.context_window || raw?.context_length || 128000),
    maxOutput: Number(raw?.maxOutput || raw?.max_output || raw?.max_tokens || 4096),
    supportsStream: raw?.supportsStream ?? raw?.supports_stream ?? true,
    supportsVision: raw?.supportsVision ?? raw?.supports_vision ?? false,
    supportsTools: raw?.supportsTools ?? raw?.supports_tools ?? false,
    pricing: raw?.pricing || { input: 0, output: 0 },
  };
}

function extractModels(payload: any): ModelInfo[] {
  const source: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.models)
        ? payload.models
        : [];

  const seen = new Set<string>();
  const normalized = source
    .map(normalizeModel)
    .filter((model): model is ModelInfo => Boolean(model));

  return normalized
    .filter((model: ModelInfo) => {
      if (seen.has(model.id)) return false;
      seen.add(model.id);
      return true;
    })
    .sort((a: ModelInfo, b: ModelInfo) => a.id.localeCompare(b.id));
}

async function resolveProviderFromBody(body: DiscoverModelsBody): Promise<ProviderConfig | null> {
  if (body.providerConfig?.name) return body.providerConfig;
  if (body.provider) {
    const providers = await getAllProviders(true);
    return providers[body.provider] || null;
  }
  return null;
}

async function resolveKeyFromBody(provider: ProviderConfig, body: DiscoverModelsBody): Promise<string> {
  if (body.key && typeof body.key === 'string' && body.key.trim()) {
    return tryDecodeBase64(body.key.trim());
  }

  const managed = await getManagedKeys(provider.name);
  const envKeys = provider.envKeyField
    ? (process.env[provider.envKeyField] || '').split(',').map((k) => k.trim()).filter(Boolean)
    : [];
  const currentKeys = managed ?? envKeys;

  if (body.hash && typeof body.hash === 'string' && body.hash.trim()) {
    const matched = currentKeys.find((key) => hashKey(key) === body.hash);
    if (!matched) throw new Error(`No key found with hash: ${body.hash}`);
    return matched;
  }

  if (currentKeys[0]) return currentKeys[0];
  throw new Error(`No configured API keys found for provider: ${provider.displayName}`);
}

async function readUpstreamError(response: Response): Promise<string> {
  try {
    const json = await response.json();
    return json.error?.message || json.error || JSON.stringify(json);
  } catch {
    return await response.text();
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAdminAuth(request);
  if (authErr) return authErr;

  let body: DiscoverModelsBody;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: 'Invalid JSON body', code: 400 } },
      { status: 400 }
    );
  }

  const provider = await resolveProviderFromBody(body);
  if (!provider) {
    return Response.json(
      { error: { message: 'Provider config is required', code: 400 } },
      { status: 400 }
    );
  }

  let apiKey: string;
  try {
    apiKey = await resolveKeyFromBody(provider, body);
  } catch (err: any) {
    return Response.json(
      { error: { message: err.message || 'No API key available', code: 400 } },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(getModelsUrl(provider), {
      method: 'GET',
      headers: buildHeaders(provider.headerFormat, apiKey, false),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const message = await readUpstreamError(response);
      return Response.json(
        { error: { message: message || response.statusText, code: response.status } },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const models = extractModels(payload);
    return Response.json({ success: true, models, count: models.length, upstream: getModelsUrl(provider) });
  } catch (err: any) {
    clearTimeout(timeoutId);
    return Response.json(
      { error: { message: err.name === 'AbortError' ? 'Timeout (10s)' : err.message, code: 502 } },
      { status: 502 }
    );
  }
}
