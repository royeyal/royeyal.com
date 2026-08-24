# Cloudflare Workers — deployment reference

How royeyal.com is hosted. This is the live setup, not a plan.

---

## Hosting royeyal.com on Cloudflare

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

## Gotcha recap

1. Set the real `account_id` in `wrangler.jsonc` before deploying —
   dry-run doesn't catch a missing/placeholder value.
2. Build before every deploy; a stale `dist/` means a stale deploy.
   `npm run deploy` does both in order for exactly this reason.
3. `run_worker_first: true` whenever the worker must intercept paths
   that also exist as files in `dist/`. It is currently `false`, which
   is correct while the worker serves static assets and nothing else.
4. `.env` and `.wrangler/` stay gitignored; the API token never
   enters the repo.
