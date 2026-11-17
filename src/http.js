// Streamable HTTP endpoint (stateless, JSON responses) using web-standard Request/Response,
// so the same handler runs on Node, Cloudflare Workers, Deno or Bun.
//   POST /mcp   MCP requests
//   POST /poe   Poe server bot (needs POE_ACCESS_KEY)
//   GET  /.well-known/openai-apps-challenge   ChatGPT domain check (OPENAI_APPS_CHALLENGE)
//   GET  /      short description, for people who open the URL
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer, NAME, VERSION } from './server.js';
import { handlePoe } from './poe.js';

const MAX_BODY = 1_000_000;
const HOME = 'https://github.com/plagiarismcheckerx/plagx-mcp';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id',
  'access-control-expose-headers': 'mcp-session-id, mcp-protocol-version',
};

const withCors = (res) => {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

/** Handle one HTTP request. `env` holds the optional POE_ACCESS_KEY and OPENAI_APPS_CHALLENGE. */
export async function handle(request, env = {}) {
  const { pathname } = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (pathname === '/mcp') {
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) {
      return withCors(json({ jsonrpc: '2.0', error: { code: -32600, message: 'Request too large.' }, id: null }, 413));
    }
    const server = createServer();
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
      return withCors(await transport.handleRequest(request));
    } finally {
      // JSON responses are complete once returned, so the per-request server can close.
      server.close().catch(() => {});
    }
  }

  if (pathname === '/' && request.method === 'GET') {
    return withCors(json({
      name: NAME,
      version: VERSION,
      description: 'Plagx Cite + Preflight MCP: free citation, reference list and draft checks by Plagiarism Checker X.',
      mcp: new URL('/mcp', request.url).href,
      source: HOME,
    }));
  }
  if (pathname === '/poe') return handlePoe(request, env);
  if (pathname === '/.well-known/openai-apps-challenge' && env.OPENAI_APPS_CHALLENGE) {
    return new Response(env.OPENAI_APPS_CHALLENGE, { headers: { 'content-type': 'text/plain' } });
  }
  if (pathname === '/privacy') return Response.redirect(`${HOME}/blob/main/PRIVACY.md`, 302);
  if (pathname === '/health') return withCors(json({ ok: true }));
  return withCors(json({ error: 'Not found' }, 404));
}
