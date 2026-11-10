# Functional specification

> Exactly what the tool does from a user's point of view: commands, inputs, outputs, behaviours and exit codes.

## Capabilities

| ID | Capability | Status |
|---|---|---|
| F1 | Discover `.md`, `.mdx`, `.markdown` files (bounded count and size, symlinks skipped) | Implemented |
| F2 | Verify local links, root-relative links, directory links and heading anchors | Implemented |
| F3 | Detect case-only path mismatches (works on Windows/macOS, breaks on Linux) | Implemented on case-insensitive filesystems |
| F4 | Resolve inline, full, collapsed and shortcut reference links | Implemented |
| F5 | Accessibility hints: image alt, empty link text, heading level skips | Implemented |
| F6 | Compare documented commands to a declared CLI contract | Implemented |
| F7 | Classify shell snippets by risk without executing them | Implemented |
| F8 | Detect credentials and redact them in all outputs | Implemented |
| F9 | Reports in JSON, Markdown, HTML, SARIF with ledger and provenance | Implemented |
| F10 | Baseline comparison and CI gating | Implemented |
| F11 | Inline and config suppression, counted | Implemented |
| F12 | Install 16 skills into project folders for five hosts | Implemented (activation unverified) |
| F13 | Loopback read-only report server | Implemented |
| F14 | External link checking, snippet execution, API/schema comparison | **Not implemented** |

## Commands

```bash
docsutra scan [--root PATH] [--config FILE] [--format all|json|md|html|sarif]
              [--out-dir DIR] [--out FILE] [--fail-on error|warning|none] [--baseline OLD.json]
docsutra diff --before OLD.json --after NEW.json [--out diff.json]
docsutra install-skills --host claude --target PATH
docsutra doctor
docsutra serve --report audit.json
docsutra version
```

### `scan`

- Reads every document under `--root` (default: current folder). Reads `docsutra.config.json` from the root unless `--config` is given.
- Default output: `.docsutra/audit.json`, `audit.md` and `audit.html`. `--format` selects one format; `--out FILE` writes a single file and infers the format from its extension.
- Prints a one-line summary, what was verified, what was not checked, and each report path.
- `--baseline OLD.json` prints new/resolved/unchanged counts and fails only on **new** findings.

### Exit codes

| Code | Meaning |
|---|---|
| 0 | No findings at or above the `--fail-on` level |
| 1 | At least one finding at or above the level (default `error`) |
| 2 | Usage, configuration or runtime error (for example unknown config key, unreadable baseline) |

## Severity model

| Severity | Meaning | Fails the build by default |
|---|---|---|
| error | Reproducibly wrong: broken link, missing anchor, leaked credential | Yes |
| warning | Likely problem or risk: missing alt text, pipe-to-shell | Only with `--fail-on warning` |
| info | Structure suggestion: duplicate heading, skipped heading level | No |

## Report contents

1. Verdict (PASS, PASS WITH WARNINGS, FAIL) and counts.
2. Verification ledger: per check, performed / passed / failed.
3. Findings grouped by file: rule, line, message, context excerpt (redacted), suggested fix, evidence method, stable ID.
4. Not checked: external URLs, unexecuted shell lines, suppressed findings, limitations.
5. Rules triggered, with meaning.
6. Provenance: tool/rules/schema versions, Node and OS, git revision, SHA-256 input fingerprint, per-file hashes, reproduce command.

## Configuration

`docsutra.config.json` is validated strictly. Allowed keys: `schemaVersion`, `ignore`, `maxFiles`, `maxBytes`, `ignoreRules`, `cliContracts`, `failOn`. Any other key exits with code 2.

## Suppression

Add `<!-- docsutra-disable-next-line RULE_ID -->` on the line before the one to silence, or list rules in `ignoreRules`. Suppressed findings are counted in the report so they cannot hide silently.

## Out of scope by design

The scanner never runs commands, never contacts a URL, never edits files, and never sends data to an AI provider.
