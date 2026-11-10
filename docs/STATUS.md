# Implementation status

Honest record of what exists. Test counts and accuracy are in [evidence/summary.json](../evidence/summary.json), regenerated from real runs by `npm run build:evidence`.

## Implemented and tested (offline, no dependencies)

- Bounded Markdown scanner: headings (ATX, setext), anchors, links, references, images, HTML href/src, code, comments, front matter. See [COVERAGE.md](COVERAGE.md).
- 18 rules: links, anchors, case mismatch, reference links, encoding, unsafe schemes, repository escape, image alt, empty link text, heading structure, unclosed fences, declared-CLI contracts, pipe-to-shell, destructive commands, credentials, invalid files.
- Reports: JSON, Markdown, HTML, SARIF 2.1.0 with verification ledger, provenance and per-file hashes.
- CI gating: `--fail-on`, `--baseline`; exit codes 0/1/2.
- Inline and config suppression, counted in reports.
- 16 skills with honest `backing`, project-local installer for 5 host folders.
- Hand-labelled benchmark corpus with precision/recall gate in CI.
- Loopback read-only report server with bearer token.
- Cross-OS CI configuration (Linux, Windows, macOS x Node 20/22/24). **Observed:** CI run [42767882960](https://github.com/shahvatsalofficial/DocSutra-AI/actions/runs/42767882960) passed all 9 jobs (ubuntu, windows, macos x Node 20, 22, 24) on commit after the test-runner fix.

## Not implemented

- Executing snippets (Snippet Lab only classifies).
- External link checking.
- MDX/JSX, AsciiDoc, reStructuredText, notebooks, HTML files.
- API/OpenAPI/TypeDoc comparison, schema validation, ProofGraph, git-diff impact mapping, ProofPatch applier.
- MCP server, web dashboard, hosted multi-user server.
- LLM inference of any kind.

## Not verified

- Skill activation inside Claude Code, Cursor, Codex, Gemini CLI and Copilot. Files are copied to the documented folders; no host smoke test has been run. See [IDE_COMPATIBILITY.md](IDE_COMPATIBILITY.md).
- Accuracy on arbitrary third-party repositories (corpus is author-built).

Never advertise planned features as shipped.
