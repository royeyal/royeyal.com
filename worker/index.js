/*
 * Static passthrough for royeyal.com.
 *
 * Cache busting is already handled by Vite (hashed filenames written into
 * index.html on every build), so this worker has nothing to do but hand
 * every request to the Workers Assets binding. See docs/cloudflare-workers.md
 * for the stable-URL variant this becomes if the site ever moves to Webflow.
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
