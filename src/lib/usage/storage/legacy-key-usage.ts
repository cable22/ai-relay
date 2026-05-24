// ============================================================
// AI API Relay — Legacy per-key usage compatibility
// ============================================================

import { withTimeout } from '@/lib/utils/timeout';
import { kvKeys } from './kv-keys';

export interface LegacyKeyUsage {
  daily: { requests: number; tokens: number };
  total: { requests: number; tokens: number };
}

/**
 * Reads the legacy per-key usage keys. New deployments default to not writing
 * these keys, but existing historical data remains visible through this path.
 */
export async function getLegacyKeyUsage(
  kv: any,
  keyHash: string,
  date: string
): Promise<LegacyKeyUsage> {
  const [dailyRaw, totalRaw] = await withTimeout(
    Promise.all([
      kv.hgetall(kvKeys.legacyKeyDaily(keyHash, date)),
      kv.hgetall(kvKeys.legacyKeyTotal(keyHash)),
    ]),
    1000,
    [null, null] as [Record<string, unknown> | null, Record<string, unknown> | null],
    `getLegacyKeyUsage:${keyHash}`
  );

  return {
    daily: {
      requests: Number(dailyRaw?.requests || 0),
      tokens: Number(dailyRaw?.tokens || 0),
    },
    total: {
      requests: Number(totalRaw?.requests || 0),
      tokens: Number(totalRaw?.tokens || 0),
    },
  };
}
