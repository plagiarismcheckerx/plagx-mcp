# Privacy policy: Plagx Cite + Preflight MCP

*Last updated: 17 November 2026*

Plagx Cite + Preflight MCP is a free, open-source tool by Plagiarism Checker X. This policy covers the MCP server in this repository, whether you run it on your own computer (npm, Claude Desktop extension, Docker) or use the hosted endpoint.

## What the server processes

- **Text and references you send to a tool.** Drafts, reference lists and BibTeX are processed in memory to produce the result, then discarded. Nothing is written to disk, logged or kept.
- **DOIs.** `lookup_doi`, and `check_references` with `checkDOIs` turned on, send the DOI (and nothing else) to the public [Crossref](https://www.crossref.org/) API and, if Crossref has no record, to [doi.org](https://www.doi.org/). Their own privacy policies apply to those requests.

## What the server does not do

- No accounts, sign-in, cookies, analytics or tracking.
- No API keys and no paid features.
- No text is sent to Plagiarism Checker X. The tools do not check plagiarism or detect AI-generated text.
- No data is sold or shared.

## Hosted endpoint

The hosted endpoint runs the same code. Like any web service, its hosting provider may keep short-lived technical logs (IP address, time, request size) for security and abuse prevention. Request bodies are not logged.

## Contact

Open an issue at <https://github.com/plagiarismcheckerx/plagx-mcp/issues>.
