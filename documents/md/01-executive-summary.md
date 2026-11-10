# Executive summary

> What DocSutra AI is, the problem it solves, what you get, and what it deliberately does not claim.

## The problem

Documentation rots silently. Files move, headings are renamed, flags are removed, and nobody notices until a reader hits a 404 or copies a command that no longer exists. Manual review does not scale, and most link checkers ignore anchors, case-sensitivity, accessibility and leaked secrets.

## The product

**DocSutra AI** is a command-line auditor for Markdown documentation. One command scans a repository and produces an audit report as **Markdown, HTML, JSON and SARIF**.

- **Offline and private.** No network calls, no API keys, no telemetry. The scan never leaves the machine.
- **Safe by design.** It never executes a command found in a document and never fetches a URL. Credentials it finds are redacted in every output.
- **Transparent.** Each report includes a verification ledger (what was checked, how many passed and failed) and an explicit "not checked" section. It admits what it did not verify.
- **CI-ready.** Exit codes 0/1/2, a `--fail-on` threshold, baseline comparison to fail only on new problems, and SARIF for GitHub code scanning.
- **Agent-ready.** 16 portable skills for Claude Code, Cursor, Codex, Gemini CLI and GitHub Copilot, each labelled with what actually backs it.

## Who it is for

| Audience | Value |
|---|---|
| Open-source maintainers | Catch broken links and stale anchors before contributors do |
| Technical writers | A readable HTML report with line-level evidence and fixes |
| CI / release engineers | Gate pull requests on newly introduced documentation errors |
| Security reviewers | Find leaked tokens and risky install snippets before publishing |
| AI-assisted teams | Give coding assistants a deterministic scanner plus guardrailed skills |

## Evidence at a glance

{{evidence}}

All numbers come from real runs (`npm run build:evidence`). See [Testing and evidence](07-testing-and-evidence.md) for method and limits.

## What it does not claim

- It does **not** prove documentation is true. A pass means the listed static checks passed.
- It is **not** a security audit, certification, or WCAG conformance statement.
- Benchmark accuracy is measured on a small author-built corpus, not on arbitrary repositories.
- Skill activation inside each IDE is **not verified**; files are copied to documented folders only.
- It does not check external URLs, run snippets, or analyse MDX, AsciiDoc or notebooks.

## Decision summary

| Question | Answer |
|---|---|
| License | Apache-2.0, zero runtime dependencies |
| Runtime | Node.js 20 or newer |
| Cost | Free; no external services |
| Data leaves machine? | No |
| Maturity | Version 0.x, active; see [roadmap](12-roadmap-and-faq.md) |
| Creator | Vatsal Shah |
