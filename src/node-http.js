// Runs the web-standard handler on Node's http module.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { handle } from './http.js';

/** Node IncomingMessage -> web Request. */
function toRequest(req, host) {
  const url = new URL(req.url, `http://${req.headers.host || host}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, { method: req.method, headers, body: hasBody ? Readable.toWeb(req) : undefined, duplex: 'half' });
}

export function serve(port, host = '127.0.0.1') {
  const server = createServer(async (req, res) => {
    try {
      const response = await handle(toRequest(req, `${host}:${port}`), process.env);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) {
        for await (const chunk of response.body) res.write(chunk);
      }
      res.end();
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    }
  });
  server.listen(port, host, () => console.error(`Plagx MCP listening on http://${host}:${port}/mcp`));
  return server;
}
