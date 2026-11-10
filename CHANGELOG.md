# Changelog

## 0.2.0 - 2026-11-10

### Added
- **Audit reports as Markdown and HTML by default.** `docsutra scan` now writes `audit.json`, `audit.md` and `audit.html` together (`--format all`). The HTML report is self-contained, accessible, light/dark aware, printable and script-free.
- SARIF 2.1.0 output (`--format sarif`) for GitHub code scanning.
- **Verification ledger** in every report: what was checked, how many passed and failed. Absent checks are shown as never performed.
- New rules: `PATH_CASE_MISMATCH`, `SECRET_IN_DOCS`, `PIPE_TO_SHELL`, `DESTRUCTIVE_COMMAND`, `EMPTY_LINK_TEXT`, `HEADING_LEVEL_SKIP`, `DUPLICATE_HEADING`, `INVALID_FILE`.
- Snippet risk classification (pipe-to-shell, destructive, install, network, mutation) without executing anything.
- `--fail-on error|warning|none`, `--baseline OLD.json` (fail only on new findings), `--out-dir`, `docsutra version`.
- Inline suppression `<!-- docsutra-disable-next-line RULE -->` and `ignoreRules`; suppressed counts are reported.
- Strict config validation. Report provenance: tool/rules version, Node, platform, git revision, input fingerprint (SHA-256), per-file hashes.
- Hand-labelled benchmark corpus with reproducible precision/recall (`npm run benchmark`).
- Programmatic API (`import { audit } from 'docsutra-ai'`), npm package `docsutra-ai`, `docsutra-ai` bin.
- Rewritten 16 skills, each distinct and marked `cli`, `cli-diff`, `cli-classification` or `instructions-only`.

### Fixed
- Links inside inline code, HTML comments and indented code were flagged (false positives).
- URLs containing `)` were truncated; setext headings, shortcut references, nested image links and HTML `href`/`src` were missed.
- `<img alt="">` (valid decorative image) was flagged.
- `C#`-style headings lost their trailing `#`; combining marks were dropped from Unicode anchors.
- Root-relative (`/docs/x.md`) and directory links were reported as broken or outside the repo.
- Quadratic slowdown on pathological bracket input (now bounded).
- CLI did not run when launched through an npm/npx symlinked bin.
- `--root=a=b` values containing `=` were truncated.
- Windows CI: symlink tests failed without privileges (now skipped with a reason).
- CLI contract check ignored chained commands, env prefixes and `\` continuations, and mistook flag values for subcommands.

### Changed
- Package is publishable (`docsutra-ai`); report schema is `2.0.0` (additive over `1.0.0`).

## 0.1.0 - 2026-11-10

Starter: offline Markdown audit, JSON/MD/HTML export, audit diff, skills installer, loopback server.
