# Technical architecture

> Modules, data flow, contracts, design decisions and trade-offs. Written so a new contributor can navigate the code in minutes.

## Design principles

1. **Offline and deterministic.** Same input, same findings, same IDs. Only timestamps and duration vary.
2. **Untrusted input.** Every scanned file is data. Nothing in it is executed or obeyed.
3. **Honest evidence.** Every finding names its evidence method; every report states what was not checked.
4. **Zero runtime dependencies.** Only Node.js built-ins. Smaller supply-chain risk, simpler installs.
5. **Pure core, thin edges.** Parsing and rules are functions; file and process I/O sit at the boundaries.

## Pipeline

{{svg:pipeline}}

## Trust boundaries

{{svg:trust}}

## Module map

| Path | Responsibility |
|---|---|
| `packages/core/files.mjs` | Bounded discovery, symlink skipping, link target resolution (root-relative, directory, case check) |
| `packages/core/markdown.mjs` | Line scanner: headings, anchors, links, references, code, comments, front matter |
| `packages/core/commands.mjs` | Shell snippet classification and declared-CLI-contract checks |
| `packages/core/security.mjs` | Credential patterns, redaction, excerpt creation |
| `packages/core/rules.mjs` | Versioned rule catalog (severity, category, evidence type) |
| `packages/core/config.mjs` | Strict config validation |
| `packages/core/audit.mjs` | Orchestrates a scan, builds the ledger, applies suppression, returns the report object |
| `packages/reporter/index.mjs` | JSON, Markdown, HTML and SARIF renderers; multi-file writer |
| `packages/cli/index.mjs` | Argument parsing, commands, exit codes |
| `packages/adapters/skills.mjs` | Safe project-local skill installer for five hosts |
| `packages/server/index.mjs` | Loopback read-only report server |
| `packages/index.mjs` | Public programmatic API |
| `scripts/` | Benchmark, evidence, skill and documentation builders |

## Data model

The report (`schemaVersion` 2.0.0) is a single JSON object: `tool`, `toolVersion`, `rulesVersion`, `mode`, `createdAt`, `environment`, `inputFingerprint`, `summary`, `ledger`, `rules`, `files`, `findings`, `limitations`. A finding has `id`, `rule`, `severity`, `category`, `file`, `line`, `message`, `subject`, `suggestion`, `excerpt`, `status`, `verificationMethod`, `confidence`. The JSON Schema is in `schemas/audit.schema.json`.

**Finding ID** = first 16 hex characters of SHA-256 over `rule | file | line | subject`. Stable across runs, which is what makes baseline comparison work. Moving a line changes its ID; that limit is documented.

## Key algorithms

- **Anchors** follow GitHub slug rules: lower-case, strip punctuation (keeping letters, marks, digits, `_`, `-`), spaces to hyphens, duplicates suffixed `-1`, `-2`. HTML `id` and `name` attributes also count.
- **Links** are extracted by a small scanner with balanced brackets and parentheses, after masking code spans. Fenced and indented code, HTML comments and front matter are skipped.
- **Path resolution** canonicalises with the native realpath. A target outside the root is reported and never opened. Case-only differences are detected by comparing the requested path with the true on-disk case.
- **Redaction** replaces credential matches with `[REDACTED:type]` before an excerpt is stored, so secrets never reach any report.
- **Bounded work**: file count and size caps, and a 2000-character window for bracket matching keep pathological input linear.

## Design decisions

| Decision | Reason | Trade-off |
|---|---|---|
| Custom scanner instead of a Markdown AST library | Zero dependencies; precise control of what is supported | Not full CommonMark; documented in the coverage matrix |
| Declared CLI contracts instead of running `--help` | Running tools executes code | Contract can go stale; reports say so |
| Report is one self-contained HTML file with no scripts | Safe to open and archive; strict CSP | Filtering uses CSS only |
| Static classification of snippets, no execution | Safety first | No runtime verification of examples |
| Strict config validation | Typos should not silently disable checks | Slightly less forgiving |

## Extending

Add a rule in four steps: register it in `rules.mjs`, emit it from `audit.mjs` or a core module, add a case to `benchmark/corpus` with its label in `labels.json`, and add a unit test. The benchmark gate in CI fails if precision or recall drops.
