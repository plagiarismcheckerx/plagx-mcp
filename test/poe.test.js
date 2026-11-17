import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../src/http.js';
import { INTRO, respond } from '../src/poe.js';

const KEY = 'k'.repeat(32);
const env = { POE_ACCESS_KEY: KEY };
const poe = (body, key = KEY) => handle(new Request('http://localhost/poe', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
  body: JSON.stringify(body),
}), env);
const textOf = async (res) => (await res.text()).split('\n')
  .filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)).text ?? '').join('');

test('Poe requests need the access key', async () => {
  assert.equal((await poe({ version: '1.0', type: 'settings' }, 'x'.repeat(32))).status, 401);
  const unset = await handle(new Request('http://localhost/poe', { method: 'POST', body: '{}' }), {});
  assert.equal(unset.status, 503);
});

test('settings return the introduction', async () => {
  const res = await poe({ version: '1.0', type: 'settings' });
  assert.equal((await res.json()).introduction_message, INTRO);
});

test('a draft gets a preflight report as server-sent events', async () => {
  const content = 'Academic writing is is a skill that every student needs (Smith, 2020). Sources matter (Brown, 2018).\n\nReferences\n\nSmith, J. (2020). Writing for university. Academic Press.';
  const res = await poe({ version: '1.0', type: 'query', query: [{ role: 'user', content }] });
  assert.equal(res.headers.get('content-type'), 'text/event-stream');
  const raw = await res.clone().text();
  assert.match(raw, /^event: meta/);
  assert.match(raw, /event: done\ndata: \{\}\n\n$/);
  const text = await textOf(res);
  assert.match(text, /words\*\* · /);
  assert.match(text, /Brown, 2018|no matching entry|reference/i);
  assert.match(text, /Repeated word|repeated/i);
});

test('BibTeX gets a formatted list and checks; MLA on request', async () => {
  const bib = '@book{a, title={Planning essays}, author={Lee, Kim}, year={2019}, publisher={Academic Press}}\n@book{b, title={Planning essays}, author={Lee, Kim}, year={2019}}';
  const apa = await respond(bib);
  assert.match(apa, /^\*\*References\*\* \(2\)/);
  assert.match(apa, /Lee, K\. \(2019\)/);
  assert.match(apa, /duplicate/i);
  assert.match(await respond(`MLA please\n${bib}`), /^\*\*Works Cited\*\*/);
});

test('DOIs are looked up and formatted', async () => {
  const fakeFetch = async () => new Response(JSON.stringify({ message: {
    type: 'journal-article', title: ['A study'], author: [{ family: 'Ray', given: 'Oakley' }],
    issued: { 'date-parts': [[2004]] }, 'container-title': ['American Psychologist'], DOI: '10.1037/0003-066x.59.1.29',
  } }), { headers: { 'content-type': 'application/json' } });
  const out = await respond('10.1037/0003-066X.59.1.29', fakeFetch);
  assert.match(out, /Ray, O\. \(2004\)/);
  assert.match(out, /In text: \(Ray, 2004\)/);
});

test('short messages get the introduction', async () => {
  assert.equal(await respond('hi'), INTRO);
});
