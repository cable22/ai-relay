// ============================================================
// AI API Relay — Admin Usage Trend API (/api/admin/usage-trend)
// ============================================================

import { NextRequest } from 'next/server';
import { getRelayApiKeys } from '@/lib/relay';
import { KVUsageStorage } from '@/lib/usage';

export const runtime = 'nodejs';
export const maxDuration = 30;

const usageStorage = new KVUsageStorage();

/** Valid range options per granularity */
const VALID_RANGES: Record<string, string[]> = {
  day: ['7d', '30d'],
  week: ['4w', '12w'],
  month: ['6m', '12m'],
};

const DEFAULT_RANGES: Record<string, string> = {
  day: '7d',
  week: '4w',
  month: '6m',
};

/**
 * GET /api/admin/usage-trend?granularity=day|week|month&range=7d|30d|4w|12w|6m|12m
 *
 * Returns token consumption trend data at the requested granularity.
 */
export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || '';
  const validKeys = getRelayApiKeys();

  if (!token || !validKeys.includes(token)) {
    return Response.json(
      { error: { message: 'Unauthorized. Use Bearer token.', code: 401 } },
      { status: 401 }
    );
  }

  // Parse parameters
  const { searchParams } = new URL(request.url);
  const granularity = (searchParams.get('granularity') || 'day') as 'day' | 'week' | 'month';

  if (!['day', 'week', 'month'].includes(granularity)) {
    return Response.json(
      { error: { message: 'Invalid granularity. Use day|week|month.', code: 400 } },
      { status: 400 }
    );
  }

  const rangeParam = searchParams.get('range') || DEFAULT_RANGES[granularity];
  const validRange = VALID_RANGES[granularity];
  const range = validRange.includes(rangeParam) ? rangeParam : DEFAULT_RANGES[granularity];

  const trend = await usageStorage.getUsageTrend(range, granularity);

  return Response.json({
    range,
    granularity,
    ...trend,
  });
}
