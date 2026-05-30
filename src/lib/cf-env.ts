// ============================================================
// AI API Relay — CF Bindings Helper
// ============================================================
// Provides access to Cloudflare KV and D1 bindings when running
// on Cloudflare Pages. Returns null outside CF environment.
//
// Uses getRequestContext() from @opennextjs/cloudflare so that
// bindings are always request-scoped — no module-level state, no
// race conditions between concurrent requests.
//
// require() is used intentionally (not import) to keep this module
// invisible to TypeScript's global type resolution — a static import
// of @opennextjs/cloudflare would pull in @cloudflare/workers-types
// globally and override DOM types like Response.json() → unknown.

export interface CFEnv {
  KV: import('@cloudflare/workers-types').KVNamespace;
  DB: import('@cloudflare/workers-types').D1Database;
}

export function getCFEnv(): CFEnv | null {
  if (!process.env.CF_PAGES) return null;
  try {
    const { getRequestContext } = require('@opennextjs/cloudflare');
    const ctx = getRequestContext();
    return ctx.env as unknown as CFEnv;
  } catch {
    return null;
  }
}

export function isCloudflare(): boolean {
  return !!process.env.CF_PAGES;
}
