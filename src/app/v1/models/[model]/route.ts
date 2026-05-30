// ============================================================
// AI API Relay — GET /v1/models/:model
//
// Returns info about a specific model in OpenAI-compatible format.
// Spec: https://platform.openai.com/docs/api-reference/models/retrieve
// ============================================================

import { NextRequest } from 'next/server';
import { getAllProviders } from '@/lib/providers';
import { getKeyPoolStats, initAllKeyPools, getRelayApiKeys } from '@/lib/relay';
import { resolveProvider } from '@/lib/providers';
import type { ModelInfo } from '@/lib/providers/types';

export const runtime = 'nodejs';

const RELAY_CREATED = Math.floor(Date.now() / 1000);

/**
 * Find a specific model by ID across all providers.
 */
async function findModel(modelId: string): Promise<(ModelInfo & { owned_by: string; configured: boolean }) | null> {
  const allProviders = await getAllProviders();
  await initAllKeyPools(allProviders);
  const poolStats = getKeyPoolStats();

  for (const [providerId, config] of Object.entries(allProviders)) {
    const configured = config.envKeyField ? (!!process.env[config.envKeyField] || (poolStats[providerId]?.total > 0)) : (poolStats[providerId]?.total > 0);
    const hasKeys = (poolStats[providerId]?.available || 0) > 0;

    if (config.models) {
      const found = config.models.find((m) => m.id === modelId);
      if (found) {
        return {
          ...found,
          owned_by: providerId,
          configured: configured && hasKeys,
        };
      }
    }
  }

  return null;
}

/**
 * GET /v1/models/:model
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { model: string } }
) {
  const modelId = decodeURIComponent(params.model);

  // Optional auth
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || '';
  if (token) {
    const validKeys = getRelayApiKeys();
    if (!validKeys.includes(token)) {
      return Response.json(
        { error: { message: 'Invalid API key.', type: 'invalid_request_error', code: 401 } },
        { status: 401 }
      );
    }
  }

  const model = await findModel(modelId);
  if (!model) {
    return Response.json(
      {
        error: {
          message: `The model '${modelId}' does not exist.`,
          type: 'invalid_request_error',
          code: 'model_not_found',
        },
      },
      { status: 404 }
    );
  }

  return Response.json({
    id: model.id,
    object: 'model',
    created: RELAY_CREATED,
    owned_by: model.owned_by,
    display_name: model.displayName,
    context_window: model.contextWindow,
    max_output: model.maxOutput || null,
    supports_stream: model.supportsStream ?? true,
    supports_vision: model.supportsVision ?? false,
    supports_tools: model.supportsTools ?? false,
    pricing: model.pricing || null,
    configured: model.configured,
  });
}
