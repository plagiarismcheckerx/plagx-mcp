---
name: check-academic-draft
description: Check an essay, paper, thesis chapter or article before submission with the Plagx tools - word count and limits, reading time, in-text citations against the reference list, reference list formatting (APA or MLA), duplicate references, punctuation and basic grammar. Use when someone asks to proofread, preflight, review references or check citations in academic writing.
---

# Check an academic draft

Use the `plagx` MCP tools to give a short, actionable pre-submission report.

## Steps

1. **Collect the inputs.** Get the draft text, the citation style (APA or MLA; default APA), and any word limits or required headings. Don't ask for anything that isn't needed; use the defaults.
2. **Run `check_draft`** with the full text, including the reference list under a heading such as "References" or "Works Cited". Pass `minWords`, `maxWords` and `requiredHeadings` if the person gave them.
3. **Check the reference list.** If the references are available as structured data or BibTeX, run `check_references` for duplicates and missing fields. Turn on `checkDOIs` only when the person wants the DOIs confirmed online.
4. **Fix formatting when asked.** Use `format_references` to produce a corrected APA or MLA list, `cite_in_text` for in-text citations, and `lookup_doi` to build a reference from a DOI.

## Report

- Start with the stats: words, reading time, and whether the word limit is met.
- Group issues by **Citations and references**, **Length and structure**, **Punctuation** and **Grammar**, errors first.
- Quote the short text each issue points to and give a concrete fix.
- Keep it brief; skip groups with no issues.

## Limits

These tools give writing suggestions. They do not check plagiarism, originality or AI-generated text, so never describe a draft as "plagiarism-free" or "human-written" from these results.
