import { createHash, timingSafeEqual } from 'crypto';
import { db, TABLE } from './registry';

/** Origins allowed to call the API from a browser. Extra ones come from ALLOWED_ORIGINS (comma-separated). */
const ORIGIN_RULES: RegExp[] = [
  /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/,
  /^https:\/\/([a-z0-9-]+\.)*dimau-fintech\.com$/,
  /^https:\/\/([a-z0-9-]+\.)*dimauventures\.com$/,
  /^https:\/\/([a-z0-9-]+\.)*fijihistory\.com$/,
  /^https:\/\/([a-z0-9-]+\.)*fijilearn\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
];

export function corsHeaders(origin: string | null): Record<string, string> {
  const extra = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = origin && (extra.includes(origin) || ORIGIN_RULES.some((r) => r.test(origin)));
  return {
    'Access-Control-Allow-Origin': ok ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-api-key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function sameSecret(a: string, b: string) {
  const x = Buffer.from(sha256(a));
  const y = Buffer.from(sha256(b));
  return timingSafeEqual(x, y);
}

/** True when the key is the studio admin key (STUDIO_ADMIN_KEY env). */
export function isAdminKey(key: string | null): boolean {
  const admin = process.env.STUDIO_ADMIN_KEY;
  return !!(key && admin && sameSecret(key, admin));
}

/** Check an app's API key against the hashed keys table. The admin key is always accepted. */
export async function checkApiKey(key: string | null): Promise<{ ok: boolean; app?: string }> {
  if (!key) return { ok: false };
  if (isAdminKey(key)) return { ok: true, app: 'studio' };
  const sb = db();
  if (!sb) return { ok: false };
  const { data } = await sb
    .from(TABLE.keys)
    .select('id, app_name')
    .eq('key_hash', sha256(key))
    .is('revoked_at', null)
    .maybeSingle();
  if (!data) return { ok: false };
  void sb.from(TABLE.keys).update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return { ok: true, app: data.app_name };
}

/** Small per-instance rate limit for the public render route (Vercel's CDN cache absorbs repeats). */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimited(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  h.n += 1;
  return h.n > limit;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}
