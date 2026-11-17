// Poe server bot (https://creator.poe.com/docs/server-bots/poe-protocol-specification) built on the
// same libraries as the MCP tools. It looks at the latest message and:
//   - BibTeX entries      -> formatted reference list + reference checks
//   - one or more DOIs    -> formatted citations (public Crossref lookup)
//   - anything else long  -> draft preflight report
// Requests must carry the bot's access key (POE_ACCESS_KEY). Nothing is stored.
import { checkReferences, citeInText, extractDOIs, formatBibliography, lookupDOI, parseBibTeX } from 'plagx-cite';
import { checkDraft } from 'plagx-preflight';

const MAX_TEXT = 200_000;
const MAX_DOIS = 10;
const LEVEL = { error: 'Error', warning: 'Warning', info: 'Suggestion' };

export const INTRO = [
  '**Plagx Cite + Preflight**: free academic writing checks by Plagiarism Checker X.',
  '',
  '- **Paste a draft** (with its References or Works Cited list) to get word count, reading time, citation vs. reference checks, punctuation and grammar suggestions.',
  '- **Paste DOIs** to get APA citations (add "MLA" for MLA).',
  '- **Paste BibTeX** to get a formatted reference list and a duplicate/missing-field check.',
  '',
  'Suggestions only: this bot does not check plagiarism or AI-generated text.',
].join('\n');

const sse = (events) => {
  const body = events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');
  return new Response(body, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' } });
};
const reply = (text) => sse([['meta', { content_type: 'text/markdown' }], ['text', { text }], ['done', {}]]);

/** Constant-time comparison of two strings. */
function sameKey(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Text of the latest user message, with any text attachments Poe has parsed. */
function latestText(query = []) {
  const last = [...query].reverse().find((m) => m.role === 'user');
  if (!last) return '';
  const parts = [last.content ?? ''];
  for (const a of last.attachments ?? []) if (typeof a.parsed_content === 'string') parts.push(a.parsed_content);
  return parts.join('\n\n').trim();
}

/** "1 warning", "2 warnings". */
const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const wantsMla = (text) => /\bMLA\b|works cited/i.test(text);
const plain = (msg) => {
  const text = msg.replace(/^Suggestion: /, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const quote = (s) => (s.length > 80 ? `${s.slice(0, 80)}…` : s).replace(/\s+/g, ' ').replace(/[`*_]/g, '');

export function draftReport(text) {
  const style = /^\s*#*\s*works cited\s*$/im.test(text) ? 'mla' : 'apa';
  const result = checkDraft(text, { style });
  const { stats } = result;
  const lines = [
    `**${count(stats.words, 'word')}** · ${stats.readingTimeMinutes} min read · ${count(stats.sentences, 'sentence')} · ${count(stats.paragraphs, 'paragraph')} · Flesch reading ease ${stats.fleschReadingEase}`,
    '',
    `${count(result.errors, 'error')}, ${count(result.warnings, 'warning')}, ${count(result.infos, 'suggestion')} (${style.toUpperCase()} citations).`,
  ];
  if (!result.issues.length) lines.push('', 'No issues found.');
  for (const issue of result.issues.slice(0, 60)) {
    const where = issue.text ? ` (line ${issue.line}: “${quote(issue.text)}”)` : '';
    lines.push(`- **${LEVEL[issue.level]}:** ${plain(issue.message)}${where}`);
  }
  if (result.issues.length > 60) lines.push(`- …and ${result.issues.length - 60} more.`);
  return lines.join('\n');
}

export async function bibtexReport(text, style) {
  const refs = parseBibTeX(text);
  if (!refs.length) return null;
  const check = await checkReferences(refs);
  const lines = [`**${style === 'mla' ? 'Works Cited' : 'References'}** (${refs.length})`, ''];
  for (const entry of formatBibliography(refs, { style, format: 'markdown' })) lines.push(entry, '');
  lines.push(check.issues.length ? '**Checks**' : 'No duplicates or missing fields found.');
  for (const issue of check.issues) lines.push(`- **${LEVEL[issue.level]}** (${issue.ref}): ${issue.message}`);
  return lines.join('\n');
}

export async function doiReport(dois, style, fetchFn = fetch) {
  const lines = [];
  for (const doi of dois.slice(0, MAX_DOIS)) {
    try {
      const ref = await lookupDOI(doi, { fetch: (url, init) => fetchFn(url, { ...init, signal: AbortSignal.timeout(10_000) }) });
      lines.push(formatBibliography([ref], { style, format: 'markdown' })[0], `In text: ${citeInText(ref, { style })}`, '');
    } catch (err) {
      lines.push(`**${doi}**: ${err?.name === 'TimeoutError' ? 'lookup timed out' : err.message}`, '');
    }
  }
  if (dois.length > MAX_DOIS) lines.push(`Only the first ${MAX_DOIS} DOIs were looked up.`);
  return lines.join('\n').trim();
}

export async function respond(text, fetchFn) {
  if (!text) return INTRO;
  if (text.length > MAX_TEXT) return `That is too long to check here (max ${MAX_TEXT.toLocaleString('en')} characters).`;
  const style = wantsMla(text) ? 'mla' : 'apa';
  if (/@\w+\s*\{/.test(text)) {
    const report = await bibtexReport(text, style);
    if (report) return report;
  }
  const dois = extractDOIs(text);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (dois.length && words <= dois.length * 6 + 10) return doiReport(dois, style, fetchFn);
  if (words < 15) return INTRO;
  return draftReport(text);
}

/** Handle a request from Poe. */
export async function handlePoe(request, env = {}) {
  if (request.method !== 'POST') return new Response('Poe bot endpoint', { status: 405 });
  if (!env.POE_ACCESS_KEY) return new Response('Bot not configured', { status: 503 });
  const auth = request.headers.get('authorization') ?? '';
  if (!sameKey(auth.replace(/^Bearer /, ''), env.POE_ACCESS_KEY)) return new Response('Unauthorized', { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  if (body.type === 'settings') {
    return Response.json({ introduction_message: INTRO, allow_attachments: true, expand_text_attachments: true });
  }
  if (body.type !== 'query') return new Response(null, { status: 200 });
  try {
    return reply(await respond(latestText(body.query)));
  } catch (err) {
    return sse([['error', { allow_retry: false, text: `Something went wrong: ${err.message}` }], ['done', {}]]);
  }
}
