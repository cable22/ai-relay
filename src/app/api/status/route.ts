// ============================================================
// AI API Relay — Status API (/api/status)
// ============================================================

import { NextRequest } from 'next/server';
import { getKeyPoolStats, initAllKeyPools, getConcurrencyStats } from '@/lib/relay';
import { getRateLimiterStats } from '@/lib/relay/rate-limiter';
import { createUsageStorage } from '@/lib/usage/factory';
import { getAllProviders } from '@/lib/providers';

export const runtime = 'nodejs';


let cachedStatus: { expiresAt: number; response: unknown } | null = null;

export async function GET(request: NextRequest) {
  const usageStorage = createUsageStorage();
  const url = new URL(request.url);
  const showDetails = url.searchParams.get('detail') === '1';

  if (!showDetails && cachedStatus && Date.now() < cachedStatus.expiresAt) {
    return Response.json(cachedStatus.response);
  }

  const allProviders = await getAllProviders();
  await initAllKeyPools(allProviders);
  const providerStats = getKeyPoolStats();
  const rateLimiterStats = getRateLimiterStats();
  const globalUsage = await usageStorage.getGlobalUsage();

  const providers = Object.entries(allProviders).map(([name, config]) => {
    const stats = providerStats[name];
    const rl = rateLimiterStats[name];
    return {
      name: config.displayName,
      keyCount: stats?.total || 0,
      availableKeys: stats?.available || 0,
      configured: config.envKeyField ? (!!process.env[config.envKeyField] || (stats?.total ? stats.total > 0 : false)) : (stats?.total ? stats.total > 0 : false),
      circuit: rl?.circuit || { state: 'closed', consecutiveFailures: 0, cooldownRemainingMs: 0 },
      tokenBucket: rl?.tokenBucket || { tokens: 60, capacity: 60 },
    };
  });

  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers,
    usage: globalUsage || { requests: 0, tokens: 0 },
  };

  if (!showDetails) {
    cachedStatus = { response: payload, expiresAt: Date.now() + 30_000 };
  }

  return Response.json(payload);
}
