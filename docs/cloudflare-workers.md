# Cloudflare Workers — deployment reference

Two scenarios for this repo. Scenario A is scaffolded; Scenario B is
for later, if the design moves to Webflow.

---

## Scenario A — host royeyal.com on Cloudflare (scaffolded)

Vite already cache-busts (hashed asset names are written into
`index.html` on every build), so **no stable-URL worker logic is
needed** — just static hosting with a Workers Assets binding.

### Files (already in the repo)

[`wrangler.jsonc`](../wrangler.jsonc) — JSONC is the current
recommended format (TOML still works, but newer Wrangler features are
JSON-only, and JSON has no equivalent to TOML's "keys after a
`[section]` silently nest" footgun):

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "royeyal-com",
  "main": "worker/index.js",
  "compatibility_date": "2026-07-30",
  "account_id": "<YOUR_ACCOUNT_ID>",
  "workers_dev": true,
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": false,
  },
  "observability": { "enabled": true },
}
```

[`worker/index.js`](../worker/index.js) — minimal passthrough (only
needed if we want custom headers/redirects later; with
`run_worker_first: false` Workers Assets could technically run
without a worker at all, but keeping one gives us a place to add
logic without a config migration):

```js
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
```

### Fill in before deploying

`wrangler.jsonc` still has a placeholder:

```
"account_id": "<YOUR_ACCOUNT_ID>"
```

Get the real value from the Cloudflare dashboard (top-right account
dropdown) or `npx wrangler whoami`.

### Secrets

`.env` (gitignored — already created, NEVER commit):

```
CLOUDFLARE_API_TOKEN=<token with Workers Scripts:Edit permission>
```

### package.json script (already added)

```json
"deploy": "export $(grep -v '^#' .env | xargs) && npm run build && wrangler deploy"
```

Always build before deploy — never ship a stale `dist/`.
No `.env` value set? Fallback: `wrangler login` once, then
`npm run deploy` (the empty `.env` line is simply ignored).

Sanity-check any config change with a dry run before a real deploy:

```bash
npx wrangler deploy --dry-run
```

### Domain

Cloudflare dashboard → the Worker → Settings → Domains & Routes →
add `royeyal.com`. The zone is already on this account (royeyal.com
is registered via Cloudflare Registrar), so this is a same-account
dashboard action — no external DNS/nameserver changes needed.

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

1. Set the real `account_id` in `wrangler.jsonc` before deploying —
   dry-run doesn't catch a missing/placeholder value.
2. Build before every deploy (Scenario B's worker imports the
   manifest, so a stale `dist/` means a stale — or broken — deploy).
3. `run_worker_first: true` whenever the worker must intercept paths
   that also exist as files in `dist/` (required for Scenario B).
4. `.env` and `.wrangler/` stay gitignored; the API token never
   enters the repo.
