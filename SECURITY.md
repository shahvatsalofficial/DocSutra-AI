# Security Policy

## Reporting a vulnerability

Use GitHub's private reporting: **Security tab -> Report a vulnerability** on
<https://github.com/shahvatsalofficial/DocSutra-AI/security/advisories/new>.
Do not put exploit details or real credentials in public issues. Expect an acknowledgement within 7 days.

## Supported versions

Only the latest published `0.x` release receives fixes.

## What DocSutra guarantees (and tests)

| Guarantee | Enforced by |
|---|---|
| Scans are read-only and never execute commands found in Markdown | `tests/v2.test.mjs` "malicious snippet is never executed" |
| No network access during a scan | `environment.networkUsed` is recorded in every report; offline test runs with no env |
| Symlinked docs are skipped; links that resolve outside the root are never opened | "symlink-escape secret file is never read", "target traversal is not followed" |
| Credentials found in docs are redacted in JSON, Markdown and HTML output | "secrets are detected and redacted in report output" |
| HTML reports escape untrusted text and contain no scripts or external requests | "HTML report escapes ..." and "self-contained" tests |
| Pathological input cannot hang the parser | "pathological input finishes quickly" |
| Config is strictly validated (unknown keys rejected) | "config validation rejects unknown keys" |
| Skill installer never follows symlinks or overwrites without `--force` | skill installer tests |
| `serve` binds to loopback only and requires a 20+ character bearer token | server tests |

## Honest limitations

- Not a full CommonMark/MDX parser. See [docs/COVERAGE.md](docs/COVERAGE.md).
- Secret detection covers high-precision token formats only. It will miss arbitrary secrets.
- Reports contain file names, line excerpts (credentials redacted) and URLs. Review before sharing publicly.
- `docsutra serve` is a local read-only convenience, not a hardened remote API. Do not expose it to a network.
- Skill files are instructions for AI hosts. DocSutra cannot control what a host does with them.
- No security certification or third-party penetration test has been performed. See [docs/LEGAL.md](docs/LEGAL.md).

## Supply chain

DocSutra has **zero runtime dependencies**. CI actions are pinned to commit SHAs. npm releases are built in CI with provenance when published through the release workflow.
