/**
 * Cloudflare Pages Function — reverse proxy for the MAHORAGA API.
 *
 * The dashboard calls relative `/api/*` (Vite proxies this in local dev). On
 * Pages there is no dev proxy, so this function forwards /api/* to the deployed
 * Worker's /agent/* path. Keeping the browser on the same origin avoids CORS
 * entirely and lets the client send its own Authorization header.
 *
 * Deploy with the dashboard as a Pages project named "mahoraga-dashboard".
 */

interface Env {
  /** Override the upstream worker origin (defaults to the deployed worker). */
  MAHORAGA_API_ORIGIN?: string;
}

const DEFAULT_ORIGIN = "https://mahoraga.timonjagi.workers.dev";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;
  const url = new URL(request.url);

  const origin = (env.MAHORAGA_API_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, "");

  // /api/status -> /agent/status ; preserve query string
  const pathParam = Array.isArray(params.path) ? params.path.join("/") : params.path;
  const upstreamPath = `/agent/${pathParam ?? ""}`;

  const upstream = new URL(origin + upstreamPath);
  upstream.search = url.search;

  // Clone the request, rewriting only the URL. Body, method and headers
  // (notably Authorization) are forwarded untouched.
  const proxied = new Request(upstream.toString(), request);

  let response: Response;
  try {
    response = await fetch(proxied);
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: `Upstream fetch failed: ${String(error)}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Re-wrap so we can attach headers without mutating the origin response.
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};
