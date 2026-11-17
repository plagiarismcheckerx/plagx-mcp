// Plagx Cite + Preflight MCP: the open-source plagx-cite and plagx-preflight libraries as
// MCP tools. Everything runs locally except DOI lookups, which call the public Crossref and
// doi.org APIs. No keys, no accounts, nothing stored.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  checkReferences, citeInText, formatBibliography, lookupDOI, parseBibTeX, toBibTeX,
} from 'plagx-cite';
import { checkDraft, CHECKS } from 'plagx-preflight';

export const NAME = 'plagx-mcp';
export const VERSION = '1.0.0';

const MAX_TEXT = 200_000;
const MAX_REFS = 500;
const DOI_TIMEOUT_MS = 10_000;

const STYLE = z.enum(['apa', 'mla']).default('apa').describe('Citation style: "apa" (APA 7) or "mla" (MLA 9).');

const NAME_SCHEMA = z.union([
  z.string(),
  z.object({ family: z.string(), given: z.string().optional(), suffix: z.string().optional() }),
  z.object({ literal: z.string() }),
]);

const REFERENCE = z.looseObject({
  id: z.string().optional().describe('Citation key, e.g. "smith2020".'),
  type: z.string().optional().describe('CSL type: article-journal, book, chapter, paper-conference, report, thesis, webpage, …'),
  title: z.string().optional(),
  author: z.array(NAME_SCHEMA).optional().describe('Authors as {family, given} objects, {literal} for organisations, or "Family, Given" strings.'),
  editor: z.array(NAME_SCHEMA).optional(),
  year: z.union([z.number(), z.string()]).optional().describe('Publication year (shortcut for issued).'),
  issued: z.object({ 'date-parts': z.array(z.array(z.number())) }).optional(),
  'container-title': z.string().optional().describe('Journal, book or website name.'),
  volume: z.union([z.string(), z.number()]).optional(),
  issue: z.union([z.string(), z.number()]).optional(),
  page: z.string().optional(),
  edition: z.union([z.string(), z.number()]).optional(),
  publisher: z.string().optional(),
  DOI: z.string().optional(),
  URL: z.string().optional(),
}).describe('A reference in CSL-JSON form.');

const REFERENCES = z.array(REFERENCE).min(1).max(MAX_REFS);

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const ONLINE = { ...READ_ONLY, openWorldHint: true };

/** A tool result with both a JSON text block and structured content. */
const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data });
const fail = (message) => ({ content: [{ type: 'text', text: message }], isError: true });

const timed = () => ({ signal: AbortSignal.timeout(DOI_TIMEOUT_MS) });

/** References from either a CSL-JSON array or BibTeX source. */
function readRefs({ references, bibtex }) {
  if (references?.length) return references;
  if (bibtex) {
    const refs = parseBibTeX(bibtex);
    if (!refs.length) throw new Error('No BibTeX entries found.');
    if (refs.length > MAX_REFS) throw new Error(`Too many references (max ${MAX_REFS}).`);
    return refs;
  }
  throw new Error('Give either references (CSL-JSON) or bibtex.');
}

/** Wraps a handler so thrown errors come back as tool errors, not protocol errors. */
const safe = (fn) => async (args) => {
  try {
    return ok(await fn(args));
  } catch (err) {
    return fail(err?.name === 'TimeoutError' ? 'DOI lookup timed out.' : (err?.message ?? String(err)));
  }
};

export function createServer() {
  const server = new McpServer(
    { name: NAME, title: 'Plagx Cite + Preflight', version: VERSION },
    {
      instructions:
        'Free academic writing tools by Plagiarism Checker X: APA/MLA reference formatting, in-text citations, '
        + 'BibTeX conversion, DOI lookup, reference list checks, and a draft preflight (word count, reading time, '
        + 'citations vs. reference list, punctuation and basic grammar). These tools give writing suggestions only; '
        + 'they do not detect plagiarism or AI-generated text.',
    },
  );

  server.registerTool('check_draft', {
    title: 'Check a draft',
    description:
      'Preflight an essay, paper or article before submission. Returns word, sentence and paragraph counts, reading time '
      + 'and Flesch reading ease, plus issues: in-text citations with no reference entry, references never cited, word '
      + 'limits, long sentences and paragraphs, unmatched quotes and brackets, spacing, repeated words, a/an, sentence '
      + 'capitals and common word confusions. Put the reference list after a heading such as "References" or "Works Cited". '
      + 'Suggestions only; it does not detect plagiarism or AI text.',
    inputSchema: {
      text: z.string().min(1).max(MAX_TEXT).describe('The draft as plain text or Markdown. Separate paragraphs with blank lines.'),
      style: STYLE,
      minWords: z.number().int().min(0).optional().describe('Minimum word count (reference list excluded).'),
      maxWords: z.number().int().min(0).optional().describe('Maximum word count (reference list excluded).'),
      checks: z.array(z.enum(CHECKS)).optional().describe('Check groups to run. Default: all except passive-voice.'),
      requiredHeadings: z.array(z.string()).max(50).optional().describe('Headings the draft must contain, e.g. ["Introduction", "Conclusion"].'),
    },
    annotations: READ_ONLY,
  }, safe(({ text, ...options }) => checkDraft(text, options)));

  server.registerTool('format_references', {
    title: 'Format a reference list',
    description:
      'Format references as an APA 7 reference list or MLA 9 Works Cited list, sorted alphabetically. '
      + 'Give CSL-JSON references or BibTeX source.',
    inputSchema: {
      references: REFERENCES.optional(),
      bibtex: z.string().max(MAX_TEXT).optional().describe('BibTeX source, used when references is not given.'),
      style: STYLE,
      format: z.enum(['text', 'markdown', 'html']).default('text').describe('Output markup for italics.'),
    },
    annotations: READ_ONLY,
  }, safe(({ style, format, ...input }) => ({ style, entries: formatBibliography(readRefs(input), { style, format }) })));

  server.registerTool('cite_in_text', {
    title: 'In-text citation',
    description: 'Create an APA or MLA in-text citation for one reference, e.g. "(Smith & Lee, 2020, p. 4)" or narrative "Smith and Lee (2020)".',
    inputSchema: {
      reference: REFERENCE,
      style: STYLE,
      page: z.union([z.string(), z.number()]).optional().describe('Page or page range, e.g. 12 or "12-15".'),
      narrative: z.boolean().default(false).describe('Narrative form: Smith (2020) instead of (Smith, 2020).'),
    },
    annotations: READ_ONLY,
  }, safe(({ reference, ...options }) => ({ citation: citeInText(reference, options) })));

  server.registerTool('check_references', {
    title: 'Check a reference list',
    description:
      'Check references for likely duplicates (same DOI or title), invalid DOIs and missing title, author or year. '
      + 'With checkDOIs, each DOI is also looked up in the public Crossref/doi.org registry.',
    inputSchema: {
      references: REFERENCES.optional(),
      bibtex: z.string().max(MAX_TEXT).optional().describe('BibTeX source, used when references is not given.'),
      checkDOIs: z.boolean().default(false).describe('Also confirm each DOI exists (online lookup).'),
    },
    annotations: ONLINE,
  }, safe(({ checkDOIs, ...input }) => {
    const refs = readRefs(input);
    if (checkDOIs && refs.length > 50) throw new Error('DOI checks are limited to 50 references at a time.');
    const fetchWithTimeout = (url, init) => fetch(url, { ...init, ...timed() });
    return checkReferences(refs, { checkDOIs, fetch: fetchWithTimeout });
  }));

  server.registerTool('lookup_doi', {
    title: 'Look up a DOI',
    description: 'Fetch metadata for a DOI from the public Crossref/doi.org registry and return it as CSL-JSON with formatted APA or MLA citations.',
    inputSchema: {
      doi: z.string().min(1).max(500).describe('A DOI or DOI URL, e.g. 10.1037/0003-066X.59.1.29.'),
      style: STYLE,
    },
    annotations: ONLINE,
  }, safe(async ({ doi, style }) => {
    const reference = await lookupDOI(doi, timed());
    return {
      reference,
      formatted: formatBibliography([reference], { style })[0],
      inText: citeInText(reference, { style }),
    };
  }));

  server.registerTool('bibtex_to_csl', {
    title: 'BibTeX to CSL-JSON',
    description: 'Parse BibTeX source into CSL-JSON references.',
    inputSchema: { bibtex: z.string().min(1).max(MAX_TEXT).describe('BibTeX source.') },
    annotations: READ_ONLY,
  }, safe(({ bibtex }) => ({ references: readRefs({ bibtex }) })));

  server.registerTool('csl_to_bibtex', {
    title: 'CSL-JSON to BibTeX',
    description: 'Export CSL-JSON references as BibTeX entries.',
    inputSchema: { references: REFERENCES },
    annotations: READ_ONLY,
  }, safe(({ references }) => ({ bibtex: toBibTeX(references) })));

  return server;
}
