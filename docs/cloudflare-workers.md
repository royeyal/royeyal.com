# Cloudflare Workers — deployment reference

Two scenarios for this repo. Neither is set up yet; this doc is the
checklist for when we do.

---

## Scenario A — host royeyal.com on Cloudflare (this site, now)

Vite already cache-busts (hashed asset names are written into
`index.html` on every build), so **no stable-URL worker logic is
needed** — just static hosting with a Workers Assets binding.

### Files to add

`wrangler.toml`:

```toml
name = "royeyal-com"
main = "worker/index.js"
compatibility_date = "2026-07-30"

# ⚠️ account_id MUST be top-level, BEFORE any [section] header.
# Placed after [build] or [assets] it silently becomes a nested key,
# Wrangler ignores it, and non-interactive deploys fail with no
# useful error.
account_id = "<YOUR_ACCOUNT_ID>"

workers_dev = true # until the royeyal.com route/domain is attached

[assets]
directory = "./dist"
binding = "ASSETS"
run_worker_first = false # static site: let assets serve directly
```

`worker/index.js` (minimal passthrough — only needed if we want
custom headers/redirects later; with `run_worker_first = false` and
no special routes, Workers Assets can even run without it):

```js
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
```

### Secrets

`.env` (gitignored — NEVER commit):

```
CLOUDFLARE_API_TOKEN=<token with Workers Scripts:Edit permission>
```

### package.json script

```json
"deploy": "export $(grep -v '^#' .env | xargs) && npm run build && wrangler deploy"
```

Always build before deploy — never ship a stale `dist/`.
No `.env`? Fallback: `wrangler login` once, then `npm run deploy`.

### Domain

Cloudflare dashboard → the Worker → Settings → Domains & Routes →
add `royeyal.com` (the zone must already be on this account).

---

## Scenario B — Webflow custom-code pivot (later)

When the design moves to Webflow, Webflow hardcodes the
`<script>`/`<link>` URLs, so hashed filenames break every deploy.
That's when the **stable-URL worker** pattern from the project
scaffold applies:

- Worker statically imports `dist/.vite/manifest.json`
  (set `build.manifest: true` in `vite.config.js` first).
- `GET /main.js` and `GET /main.css` look up the current hashed
  file in the manifest and serve it with
  `Cache-Control: public, no-cache` (browser revalidates, CF serves
  fast, deploys are instant).
- Everything else falls through to `env.ASSETS.fetch(request)`.
- `OPTIONS *` answered with `Access-Control-Allow-Origin: *` —
  required because Webflow pages load these cross-origin.
- `GET /health` → 200 for monitoring.
- **`run_worker_first = true` becomes REQUIRED** — without it,
  requests matching a literal file in `./dist` bypass the worker
  and never get CORS headers.

### Webflow side

In Site settings → Custom code, reference the stable URLs:

```html
<link rel="stylesheet" href="https://<worker>.workers.dev/main.css" />
<script defer src="https://<worker>.workers.dev/main.js"></script>
```

And remember the standing rule: remove the bundled GSAP import and
use Webflow's global instead — never ship two copies.

---

## Gotcha recap (both scenarios)

1. `account_id` above every `[section]` in `wrangler.toml`.
2. Build before every deploy (the worker may import the manifest).
3. `run_worker_first = true` whenever the worker must intercept
   paths that also exist as files in `dist/`.
4. `.env` stays gitignored; the API token never enters the repo.
