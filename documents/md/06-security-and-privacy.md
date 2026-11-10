# Security and privacy

> Threats considered, controls implemented, and the tests that prove each control. Limits are stated plainly.

## Threat model summary

Scanned documents are **untrusted**. A hostile README may contain a malicious link, a path-traversal attempt, a symlink trap, prompt-injection text, an HTML payload meant for the report, or a shell one-liner meant to be run.

| Threat | Control | Test |
|---|---|---|
| Command in docs is executed | Scanner never spawns anything from document content | "malicious snippet is never executed by a full audit" |
| Path traversal to read secret files | Targets outside the root are reported, never opened | "target traversal is not followed" |
| Symlink escape | Symlinks are skipped in discovery; resolved paths must stay inside the root | "symlink-escape secret file is never read" |
| Credential leak through the report | Redaction before excerpt storage; verified in JSON, Markdown and HTML | "secrets are detected and redacted in report output" |
| HTML injection in the report | All text escaped; CSP `default-src 'none'`; no scripts | "HTML report escapes ..." and "self-contained" |
| Parser denial of service | File size and count caps; bounded bracket window | "pathological input finishes quickly" |
| Silent misconfiguration | Strict config validation | "config validation rejects unknown keys" |
| Network exfiltration | No network code in the scan path; `networkUsed: false` recorded | "offline: scan works with network and AI keys absent" |
| Hostile skill installation | Refuses symlinked destinations; no overwrite without `--force` | skill installer tests |
| Local server abuse | Loopback only; bearer token of at least 20 characters; read-only | server tests |

## Privacy

The tool collects nothing. There is no telemetry and no AI-provider call. Reports are written only to the folder you choose and include file paths, SHA-256 hashes and short redacted line excerpts. Review a report before publishing it.

## Credential detection

High-precision formats only: GitHub tokens, npm tokens, AWS access keys, Slack tokens, Stripe live keys, Google API keys, OpenAI/Anthropic-style keys and PEM private-key headers. Absence of a finding does not prove a repository is free of secrets; use a dedicated secret scanner as well.

If DocSutra reports a credential: **revoke it first**, then remove it from the file and from git history.

## Honest limits

- No third-party penetration test or certification has been performed.
- `docsutra serve` is a local convenience, not a hardened remote API. Never bind it to a public interface.
- Skills are text instructions for AI hosts; DocSutra cannot control what a host does with them.
- The scanner is not a full Markdown parser, so some constructs can produce false negatives (see the [coverage matrix](../../docs/COVERAGE.md)).

## Reporting vulnerabilities

Use GitHub private vulnerability reporting. See [SECURITY.md](../../SECURITY.md).
