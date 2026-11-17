# Plagx Cite + Preflight plugin

*Free academic writing tools by Plagiarism Checker X.*

This plugin gives Claude citation and draft-checking tools for essays, papers and articles. Ask Claude to format an APA or MLA reference list, write an in-text citation, look up a DOI, find duplicate references, convert BibTeX, or check a draft before you submit it.

## What it adds

- **MCP server `plagx`**: the open-source [plagx-mcp](https://github.com/plagiarismcheckerx/plagx-mcp) server, started locally with `npx -y plagx-mcp@1.0.0`. Its tools:
  - `check_draft`: word, sentence and paragraph counts, reading time, word limits, in-text citations with no reference entry, references never cited, punctuation and basic grammar suggestions
  - `format_references` and `cite_in_text`: APA 7 and MLA 9 reference lists and in-text citations
  - `check_references`: likely duplicates, invalid DOIs, missing title, author or year
  - `lookup_doi`: citation metadata for a DOI
  - `bibtex_to_csl` and `csl_to_bibtex`: convert between BibTeX and CSL-JSON
- **Skill `check-academic-draft`**: tells Claude how to run these tools and report the results as a short pre-submission checklist.

Example prompts:

- "Check my essay before I submit it. The limit is 1,500 words, APA."
- "Turn these three DOIs into an APA reference list."
- "Are there duplicates in this BibTeX file?"

## Requirements

Node.js 18 or later. No account or API key.

## What it runs, sends and fetches

- On first use, `npx` downloads the `plagx-mcp` package (version 1.0.0) and its dependencies from the npm registry, then runs it on your computer.
- Drafts, references and BibTeX are processed locally, in memory. Nothing is stored or logged, and nothing is sent to Plagiarism Checker X.
- `lookup_doi`, and `check_references` with `checkDOIs` turned on, send only the DOI to the public Crossref API (`api.crossref.org`) and, if Crossref has no record, to `doi.org`.

## Privacy policy

See the [privacy policy](https://github.com/plagiarismcheckerx/plagx-mcp/blob/main/PRIVACY.md). In short: no accounts, no tracking, no data kept; DOIs only go to Crossref and doi.org.

## Limits

The tools give writing suggestions. They do not detect plagiarism or AI-generated text. For full document checks, Plagiarism Checker X offers [Text Similarity Detector](https://plagiarismcheckerx.com/?utm_source=plagx-mcp-claude-plugin-readme).

## Support

Open an issue at <https://github.com/plagiarismcheckerx/plagx-mcp/issues>.

## License

MIT © Plagiarism Checker X
