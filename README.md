# Plagx Cite + Preflight MCP

*Free academic writing tools by Plagiarism Checker X, for AI assistants.*

**Plagx Cite + Preflight MCP is a free, open-source [Model Context Protocol](https://modelcontextprotocol.io/) server for citations and draft checks.** Ask Claude, ChatGPT, Cursor or any MCP client to format an APA or MLA reference list, write an in-text citation, look up a DOI, find duplicate references, convert BibTeX, or preflight an essay for word count, reading time, citations missing from the reference list, punctuation and basic grammar.

- No account, no API key, nothing stored
- Runs on your computer; only DOI lookups go online (public Crossref API)
- Read-only tools with MCP safety annotations
- Built on the open-source [plagx-cite](https://github.com/plagiarismcheckerx/plagx-cite) and [plagx-preflight](https://github.com/plagiarismcheckerx/plagx-preflight) libraries

## Tools

| Tool | What it does |
|---|---|
| `check_draft` | Word, sentence and paragraph counts, reading time, Flesch reading ease; in-text citations with no reference entry and references never cited; word limits and required headings; long sentences and paragraphs; unmatched quotes and brackets, spacing; repeated words, *a*/*an*, sentence capitals, common word confusions; optional passive-voice hints |
| `format_references` | APA 7 reference list or MLA 9 Works Cited, sorted, as text, Markdown or HTML, from CSL-JSON or BibTeX |
| `cite_in_text` | Parenthetical or narrative in-text citation, with page numbers |
| `check_references` | Likely duplicates (same DOI or title), invalid DOIs, missing title, author or year; optional online DOI check |
| `lookup_doi` | DOI → CSL-JSON reference plus formatted APA/MLA citation |
| `bibtex_to_csl` | BibTeX → CSL-JSON |
| `csl_to_bibtex` | CSL-JSON → BibTeX |

Example prompts:

- *"Check my essay before I submit it. The limit is 1,500 words, APA."*
- *"Turn these three DOIs into an APA reference list."*
- *"Are there duplicates in this BibTeX file?"*
- *"Give me the MLA in-text citation for page 42 of this book."*

## Install

Requires [Node.js](https://nodejs.org/) 18 or later.

### Claude Desktop

Download `plagx-mcp.mcpb` from the [latest release](https://github.com/plagiarismcheckerx/plagx-mcp/releases/latest) and open it, or add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "plagx": { "command": "npx", "args": ["-y", "plagx-mcp"] }
  }
}
```

### Claude Code

```bash
claude mcp add plagx -- npx -y plagx-mcp
```

### Cursor, Windsurf, Cline, VS Code

Use the same `command` and `args` (`npx -y plagx-mcp`) in the client's MCP settings. For VS Code:

```bash
code --add-mcp '{"name":"plagx","command":"npx","args":["-y","plagx-mcp"]}'
```

### Docker

```bash
docker build -t plagx-mcp .
docker run -i --rm plagx-mcp                                   # stdio
docker run --rm -p 3000:3000 plagx-mcp --http 3000             # http://localhost:3000/mcp
```

### Streamable HTTP

```bash
npx -y plagx-mcp --http 3000    # http://127.0.0.1:3000/mcp (set HOST=0.0.0.0 to listen on all interfaces)
```

The HTTP endpoint is stateless and needs no authentication. The handler in `src/http.js` uses web-standard `Request`/`Response`, so it also runs on Cloudflare Workers, Deno and Bun.

## Privacy

Text and references are processed in memory and discarded. Only DOIs are sent, and only to Crossref and doi.org. See [PRIVACY.md](PRIVACY.md).

## Development

```bash
npm install
npm test          # tool and HTTP tests (offline)
npm run inspect   # open the MCP Inspector
```

| Path | What it does |
|---|---|
| `src/server.js` | The MCP server and its tools |
| `src/http.js` | Streamable HTTP handler (web-standard) |
| `src/node-http.js` | Runs the HTTP handler on Node |
| `bin/plagx-mcp.js` | CLI: stdio by default, `--http [port]` for HTTP |
| `server.json` | Official MCP Registry entry |
| `manifest.json` | Claude Desktop extension (MCPB) manifest |

## Plagx Cite + Preflight - Free Citation & Draft Checker

An open-source writing utility for students, researchers and developers. Format references, check citations, and preflight drafts before you submit.

Developed by Plagiarism Checker X.

Plagx Cite + Preflight gives citation help and writing suggestions; it does not detect plagiarism or AI-generated text. For full document checks, explore [Text Similarity Detector](https://plagiarismcheckerx.com/?utm_source=plagx-mcp) and its [AI Content Detector](https://plagiarismcheckerx.com/ai-content-detector?utm_source=plagx-mcp).

## License

MIT © Plagiarism Checker X
