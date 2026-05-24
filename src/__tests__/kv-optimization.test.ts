import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryMockKV, getManagedKeys, getManagedKeysVersion, setManagedKeys } from '../lib/admin/admin-config';
import { KVUsageStorage } from '../lib/usage/storage/kv-storage';
import { createUsageEvent } from '../lib/usage';
import { kvKeys } from '../lib/usage/storage/kv-keys';

function installMockKV() {
  const mock = createMemoryMockKV();
  (global as any)._mockKVInstance = mock;
  (global as any)._mockKVInstance._isMock = true;
  return mock;
}

function usageEvent(overrides: Partial<Parameters<typeof createUsageEvent>[0]> = {}) {
  return createUsageEvent({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKeyHash: 'keyhash1',
    statusCode: 200,
    promptTokens: 10,
    completionTokens: 15,
    isStream: false,
    ...overrides,
  });
}

describe('KV command optimization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    installMockKV();
  });

  it('writes aggregate usage counters immediately via the storage command', async () => {
    const kv = installMockKV();
    const storage = new KVUsageStorage();

    await storage.record(usageEvent());
    await storage.record(usageEvent({ completionTokens: 5 }));

    const date = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(await kv.hgetall(kvKeys.usageDaily(date))).toMatchObject({
      requests: 2,
      tokens: 40,
      promptTokens: 20,
      completionTokens: 20,
    });
    expect(await kv.hgetall(kvKeys.usageProviderDaily('openai', date))).toMatchObject({
      requests: 2,
      tokens: 40,
    });
  });

  it('does not write per-key usage by default, but keeps history readable', async () => {
    const kv = installMockKV();
    const storage = new KVUsageStorage();
    const date = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await storage.record(usageEvent());

    expect(await kv.hgetall(kvKeys.legacyKeyDaily('keyhash1', date))).toBeNull();

    await kv.hset(kvKeys.legacyKeyDaily('keyhash1', date), { requests: '3', tokens: '99' });
    await kv.hset(kvKeys.legacyKeyTotal('keyhash1'), { requests: '10', tokens: '500' });

    await expect(storage.getKeyUsage('keyhash1')).resolves.toEqual({
      daily: { requests: 3, tokens: 99 },
      total: { requests: 10, tokens: 500 },
    });
  });

  it('supports full per-key usage mode when explicitly enabled', async () => {
    const kv = installMockKV();
    vi.stubEnv('RELAY_KV_KEY_USAGE_MODE', 'full');
    const storage = new KVUsageStorage();
    const date = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await storage.record(usageEvent());

    expect(await kv.hgetall(kvKeys.legacyKeyDaily('keyhash1', date))).toMatchObject({
      requests: 1,
      tokens: 25,
    });
    expect(await kv.hgetall(kvKeys.legacyKeyTotal('keyhash1'))).toMatchObject({
      requests: 1,
      tokens: 25,
    });
  });

  it('reserves quota atomically when requested', async () => {
    installMockKV();
    vi.stubEnv('RELAY_DAILY_LIMIT', '1');
    vi.stubEnv('RELAY_MONTHLY_LIMIT', '10');
    const storage = new KVUsageStorage();

    await expect(storage.checkQuota(true)).resolves.toMatchObject({
      allowed: true,
      dailyUsed: 1,
      monthlyUsed: 1,
    });
    await expect(storage.checkQuota(true)).resolves.toMatchObject({
      allowed: false,
      dailyUsed: 1,
      monthlyUsed: 1,
    });
  });

  it('increments managed-key versions when keys change', async () => {
    installMockKV();

    await setManagedKeys('openai', ['sk-a']);
    const v1 = await getManagedKeysVersion('openai');
    await setManagedKeys('openai', ['sk-a', 'sk-b']);
    const v2 = await getManagedKeysVersion('openai');

    expect(v1).toBeGreaterThan(0);
    expect(v2).toBe(v1 + 1);
  });

  it('can bypass managed-key cache after another instance changes the version', async () => {
    const kv = installMockKV();

    await setManagedKeys('openai', ['sk-a']);
    await expect(getManagedKeys('openai')).resolves.toEqual(['sk-a']);

    await kv.set('admin:keys:openai', JSON.stringify(['sk-b']));
    await kv.incr('admin:keys:version:openai');

    await expect(getManagedKeys('openai')).resolves.toEqual(['sk-a']);
    await expect(getManagedKeys('openai', true)).resolves.toEqual(['sk-b']);
  });
});
