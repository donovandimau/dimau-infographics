# Not yet on Cloudflare

Moved from `vercel.json` on 22 Nov 2026, when that file was deleted (Vercel is retired).

The Cloudflare Worker `dimau-infographics` (`wrangler.jsonc`) serves only the static template library in `public/`. Its response headers are in `public/_headers`, which already matched `vercel.json`.

The Next.js part of this repo (the studio pages and the render API under `src/app/api/*`) ran only on Vercel and is not on Cloudflare yet. What `vercel.json` set for it:

- `"framework": "nextjs"` and `"buildCommand": "npm run build"` (`prebuild` runs `build:seed` and `build:sdk` first).
- The same headers as `public/_headers`, applied to every Next.js response too:
  - `/v1/*`: `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=300, stale-while-revalidate=86400`, `Cross-Origin-Resource-Policy: cross-origin`
  - `/catalog.json`: `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=300`
  - every path: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

When the studio and API are ported (for example with OpenNext on Workers, as Dimau-Fintech does), carry these over. Also note `src/lib/http.ts` still allows any `*.vercel.app` origin for CORS; drop that in the port.
