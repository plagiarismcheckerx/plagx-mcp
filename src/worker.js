// Cloudflare Workers entry for the hosted endpoint: https://<worker>/mcp
import { handle } from './http.js';

export default { fetch: (request) => handle(request) };
