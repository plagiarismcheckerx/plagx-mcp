import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import { handle } from '../src/http.js';

async function connect() {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([createServer().connect(a), client.connect(b)]);
  return client;
}
const call = async (client, name, args) => {
  const res = await client.callTool({ name, arguments: args });
  return res.isError ? { error: res.content[0].text } : res.structuredContent;
};

const SMITH = { id: 'smith2020', type: 'book', title: 'Writing for university', author: [{ family: 'Smith', given: 'Jane' }], year: 2020, publisher: 'Academic Press' };
const LEE = { id: 'lee2019', type: 'article-journal', title: 'Planning essays', author: [{ family: 'Lee', given: 'Kim' }], year: 2019, 'container-title': 'Writing Studies', volume: 4, page: '1-10' };

test('lists the tools, all annotated read-only', async () => {
  const { tools } = await (await connect()).listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    'bibtex_to_csl', 'check_draft', 'check_references', 'cite_in_text', 'csl_to_bibtex', 'format_references', 'lookup_doi',
  ]);
  for (const t of tools) {
    assert.equal(t.annotations.readOnlyHint, true, t.name);
    assert.ok(t.title && t.description, t.name);
  }
});

test('check_draft finds citation and grammar issues', async () => {
  const text = 'Writing is is a skill (Smith, 2020). Sources matter (Brown, 2018).\n\nReferences\n\nSmith, J. (2020). Writing for university. Academic Press.\n\nLee, K. (2019). Planning essays.';
  const result = await call(await connect(), 'check_draft', { text, minWords: 50 });
  const codes = result.issues.map((i) => i.code);
  for (const code of ['repeated-word', 'citation-no-reference', 'reference-not-cited', 'word-count-low']) assert.ok(codes.includes(code), code);
  assert.equal(result.stats.words > 0, true);
});

test('format_references sorts and formats APA and MLA, from CSL or BibTeX', async () => {
  const client = await connect();
  const apa = await call(client, 'format_references', { references: [SMITH, LEE] });
  assert.equal(apa.entries.length, 2);
  assert.match(apa.entries[0], /^Lee, K\. \(2019\)/);
  const mla = await call(client, 'format_references', { references: [SMITH], style: 'mla', format: 'markdown' });
  assert.match(mla.entries[0], /^Smith, Jane\. \*Writing for university\*/);
  const bib = await call(client, 'format_references', { bibtex: '@book{x, title={Planning}, author={Lee, Kim}, year={2019}}' });
  assert.match(bib.entries[0], /^Lee, K\. \(2019\)/);
  const none = await call(client, 'format_references', {});
  assert.match(none.error, /references|bibtex/);
});

test('cite_in_text', async () => {
  const client = await connect();
  assert.equal((await call(client, 'cite_in_text', { reference: SMITH, page: 4 })).citation, '(Smith, 2020, p. 4)');
  assert.equal((await call(client, 'cite_in_text', { reference: SMITH, narrative: true })).citation, 'Smith (2020)');
  assert.equal((await call(client, 'cite_in_text', { reference: SMITH, style: 'mla', page: 4 })).citation, '(Smith 4)');
});

test('check_references flags duplicates and missing fields without going online', async () => {
  const result = await call(await connect(), 'check_references', { references: [SMITH, { ...SMITH, id: 'dup' }, { title: 'No author' }] });
  const codes = result.issues.map((i) => i.code);
  assert.ok(codes.includes('duplicate'));
  assert.ok(codes.includes('missing-author'));
});

test('BibTeX round trip', async () => {
  const client = await connect();
  const { bibtex } = await call(client, 'csl_to_bibtex', { references: [SMITH] });
  assert.match(bibtex, /@book\{smith2020,/);
  const { references } = await call(client, 'bibtex_to_csl', { bibtex });
  assert.equal(references[0].title, 'Writing for university');
});

test('bad input is a tool error, not a crash', async () => {
  const client = await connect();
  assert.match((await call(client, 'lookup_doi', { doi: 'not a doi' })).error, /valid DOI/);
  const res = await client.callTool({ name: 'check_draft', arguments: { text: '' } });
  assert.equal(res.isError, true);
});

test('HTTP endpoint answers initialize and tools/list', async () => {
  const post = (body) => handle(new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(body),
  }));
  const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
  assert.equal(init.status, 200);
  assert.equal(init.headers.get('access-control-allow-origin'), '*');
  assert.equal((await init.json()).result.serverInfo.name, 'plagx-mcp');
  const list = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal((await list.json()).result.tools.length, 7);
  const home = await handle(new Request('http://localhost/'));
  assert.equal((await home.json()).mcp, 'http://localhost/mcp');
});
