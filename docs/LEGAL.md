# Legal, licensing and trust notes

This page records what has and has not been checked. It is not legal advice.

## License

DocSutra AI is licensed under the **Apache License 2.0** ([LICENSE](../LICENSE)). Copyright 2026 Vatsal Shah. See [NOTICE](../NOTICE).

## Dependencies

- **Runtime dependencies: none.** The package uses only Node.js built-in modules, so there are no third-party licences to comply with at runtime.
- **Dev dependencies: none.** Tests use `node:test`.
- The Apache-2.0 licence text is unmodified from the Apache Software Foundation's standard text.

## Names and trademarks

- On 2026-11-10 the npm registry returned 404 (name free) for `docsutra-ai`, and the GitHub repository `shahvatsalofficial/DocSutra-AI` did not exist before this project created it. **No trademark search has been performed and no trademark registration is claimed.** Availability on a registry is not legal clearance. If you build a commercial offering, run your own trademark search.
- "DocSutra", "Sutra" and the other project names are used as descriptive project names. Other products named in documentation (Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot, GitHub, npm) are trademarks of their owners. Their names indicate file-path compatibility only; **no endorsement, partnership or verified host activation is claimed**.

## Privacy and data handling

- A scan runs on your machine. No telemetry, no analytics, no network calls, no AI-provider calls.
- Reports are written only where you point `--out-dir`/`--out` (default `<root>/.docsutra/`, which `.gitignore` excludes).
- Detected credentials are redacted before being written to any report.
- Reports include file paths, headings counts, SHA-256 file hashes and short line excerpts. Review before sharing.
- There is no personal data collection by the tool. GDPR/CCPA obligations about documents you scan remain yours.

## What a report does and does not prove

- A passing report means the **supported static checks passed** on the files scanned at that time (see the ledger).
- It is **not** a certification, a security audit, an accessibility conformance statement (WCAG), or proof that documentation claims are true.
- Accuracy numbers in this repo come from a small author-built labelled corpus (`benchmark/`). They are regression evidence, not a guarantee on arbitrary repositories.
- Claims about "world-class", market position, adoption or security certification are deliberately absent because they would be unverifiable.

## Warranty

Provided "AS IS" under Apache-2.0 section 7-8, without warranty. Vulnerabilities: see [SECURITY.md](../SECURITY.md).
