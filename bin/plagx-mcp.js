#!/usr/bin/env node
// Plagx Cite + Preflight MCP server.
//   plagx-mcp                 stdio (Claude Desktop, Cursor, VS Code, …)
//   plagx-mcp --http [port]   Streamable HTTP on http://localhost:<port>/mcp (default 3000, or $PORT)
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, VERSION } from '../src/server.js';

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log(VERSION);
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: plagx-mcp [--http [port]]\n\nRuns the Plagx Cite + Preflight MCP server over stdio, or over Streamable HTTP with --http.');
} else if (args.includes('--http')) {
  const { serve } = await import('../src/node-http.js');
  const portArg = args[args.indexOf('--http') + 1];
  const port = Number(portArg && /^\d+$/.test(portArg) ? portArg : process.env.PORT || 3000);
  serve(port, process.env.HOST || '127.0.0.1');
} else {
  await createServer().connect(new StdioServerTransport());
}
