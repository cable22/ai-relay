// ============================================================
// AI API Relay — Environment Variable Configuration & Audit
// ============================================================

/**
 * Centralized env var access with type safety.
 * All environment variables used by the application are documented here.
 *
 * === ENVIRONMENT VARIABLE AUDIT ===
 *
 * [Required]
 *   RELAY_API_KEY        — Comma-separated API keys for relay auth (also used for admin auth)
 *
 * [Provider Keys] (at least one required)
 *   OPENAI_KEYS                — Comma-separated OpenAI API keys
 *   CLAUDE_KEYS                — Comma-separated Anthropic API keys
 *   DEEPSEEK_KEYS              — Comma-separated DeepSeek API keys
 *   XIAOMIMIMO_SGP_CODING_KEYS — Comma-separated Xiaomi MiMo SGP Coding API keys
 *   XIAOMI_KEYS                — Comma-separated Xiaomi MiMo CN API keys (legacy compat)
 *   XIAOMI_CODING_KEYS         — Comma-separated Xiaomi MiMo CN Coding API keys
 *
 * [Provider Base URLs] (optional — override defaults)
 *   OPENAI_BASE_URL            — Custom OpenAI API base URL
 *   CLAUDE_BASE_URL            — Custom Anthropic API base URL
 *   DEEPSEEK_BASE_URL          — Custom DeepSeek API base URL
 *   XIAOMIMIMO_SGP_CODING_BASE_URL — Custom Xiaomi MiMo SGP Coding API base URL
 *   XIAOMI_BASE_URL            — Custom Xiaomi MiMo CN API base URL
 *   XIAOMI_CODING_BASE_URL     — Custom Xiaomi MiMo CN Coding API base URL
 *
 * [Vercel KV] (optional — graceful degradation if missing)
 *   KV_REST_API_URL      — Vercel KV REST API URL
 *   KV_REST_API_TOKEN    — Vercel KV REST API token
 *
 * [Rate Limiting] (optional)
 *   RELAY_DAILY_LIMIT    — Max requests per day (0 = unlimited)
 *   RELAY_MONTHLY_LIMIT  — Max requests per month (0 = unlimited)
 *
 * [Upstream Request] (optional)
 *   RELAY_DEFAULT_USER_AGENT — User-Agent presented to upstream when the client
 *                              UA is missing or a blocked generic script UA
 *                              (e.g. python-requests). Defaults to ai-relay/<version>.
 *
 * [Postgres] (optional — for S1+ when Drizzle is active)
 *   DATABASE_URL         — Postgres connection string (e.g. postgres://user:pass@host:5432/db)
 *
 * [Vercel Auto-injected]
 *   VERCEL               — "1" when running on Vercel
 *   VERCEL_ENV           — "production" | "preview" | "development"
 *   VERCEL_REGION        — Deployment region (e.g. "iad1")
 */

// ── Config Accessor ──────────────────────────────────────────

export function getEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

export function getEnvRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getEnvInt(key: string, fallback: number = 0): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? fallback : parsed;
}

// ── Typed Config ─────────────────────────────────────────────

export interface RelayConfig {
  apiKeys: string[];
  dailyLimit: number;
  monthlyLimit: number;
  vercelEnv: string | undefined;
  vercelRegion: string | undefined;
}

export function getRelayConfig(): RelayConfig {
  const rawKeys = process.env.RELAY_API_KEY || '';
  return {
    apiKeys: rawKeys.split(',').map(k => k.trim()).filter(Boolean),
    dailyLimit: getEnvInt('RELAY_DAILY_LIMIT'),
    monthlyLimit: getEnvInt('RELAY_MONTHLY_LIMIT'),
    vercelEnv: getEnv('VERCEL_ENV'),
    vercelRegion: getEnv('VERCEL_REGION'),
  };
}

// ── Provider Key Config ──────────────────────────────────────

export interface ProviderEnvConfig {
  keys: string[];
  baseUrl?: string;
}

export const PROVIDER_ENV_MAP: Record<string, { keyField: string; baseUrlField: string }> = {
  openai: { keyField: 'OPENAI_KEYS', baseUrlField: 'OPENAI_BASE_URL' },
  anthropic: { keyField: 'CLAUDE_KEYS', baseUrlField: 'CLAUDE_BASE_URL' },
  deepseek: { keyField: 'DEEPSEEK_KEYS', baseUrlField: 'DEEPSEEK_BASE_URL' },
  xiaomi_sgp_coding: { keyField: 'XIAOMIMIMO_SGP_CODING_KEYS', baseUrlField: 'XIAOMIMIMO_SGP_CODING_BASE_URL' },
  xiaomi: { keyField: 'XIAOMI_KEYS', baseUrlField: 'XIAOMI_BASE_URL' },
  xiaomi_coding: { keyField: 'XIAOMI_CODING_KEYS', baseUrlField: 'XIAOMI_CODING_BASE_URL' },
};

export function getProviderEnv(providerName: string): ProviderEnvConfig | null {
  const mapping = PROVIDER_ENV_MAP[providerName];
  if (!mapping) return null;

  const rawKeys = process.env[mapping.keyField];
  if (!rawKeys) return null;

  return {
    keys: rawKeys.split(',').map(k => k.trim()).filter(Boolean),
    baseUrl: getEnv(mapping.baseUrlField),
  };
}

// ── Database Config ──────────────────────────────────────────

export function getDatabaseUrl(): string | undefined {
  return getEnv('DATABASE_URL');
}

export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

// ── KV Config ────────────────────────────────────────────────

export function hasKv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
