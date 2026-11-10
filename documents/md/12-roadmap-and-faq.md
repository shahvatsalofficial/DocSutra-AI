# Roadmap and FAQ

> What is planned (clearly separated from what exists) and answers to common questions.

## Roadmap (not shipped)

| Next | Item | Why |
|---|---|---|
| 1 | Opt-in external link checking with rate limits and SSRF protection | Closes the biggest "not checked" gap |
| 2 | Full CommonMark/MDX AST parser, same test corpus | Fewer false negatives |
| 3 | Git-diff driven impact mapping (which docs does a source change affect) | Real drift detection |
| 4 | Real CLI `--help` snapshot ingestion (user-approved execution) | Replaces declared contracts |
| 5 | OpenAPI/TypeDoc comparison adapters | API documentation truth |
| 6 | Sandboxed snippet runner with policy files | Verify examples by running them safely |
| 7 | Host activation smoke tests for the five IDEs | Turn "installed" into "verified" |
| 8 | MCP server and optional dashboard | Easier assistant integration |

Nothing above is available today. See [Status](../../docs/STATUS.md).

## FAQ

**Does it need an AI key or internet?** No. The scan is fully offline.

**Will it run my README commands?** Never. Commands are classified and compared to a declared contract only.

**Does a green report mean my docs are correct?** No. It means the listed checks passed. Read the ledger and the not-checked section.

**Why not use a general link checker?** Many ignore heading anchors, case sensitivity, accessibility and credentials, and none produce a ledger of what was and was not verified.

**How accurate is it?** 100% precision and recall on the author's labelled corpus; unknown on arbitrary repositories. Report misses as issues.

**Does it support MDX, AsciiDoc or reStructuredText?** MDX text is scanned as Markdown with limits; the others are not supported. See the [coverage matrix](../../docs/COVERAGE.md).

**Is it secure to run on untrusted repositories?** The scan is read-only and never executes content, which is the design goal and is tested. It has not had a third-party audit.

**Can I use it commercially?** Yes, under Apache-2.0.

**Where do I report problems?** GitHub Issues for bugs; private vulnerability reporting for security.

## Glossary

| Term | Meaning |
|---|---|
| Anchor | The `#fragment` of a link, matched to a heading slug |
| Ledger | The table of checks performed, passed and failed |
| Baseline | An earlier `audit.json` used to find only new problems |
| CLI contract | Subcommands and flags you declare for a tool |
| SARIF | Standard format for static-analysis results used by GitHub code scanning |
| Finding ID | Stable hash identifying one finding across runs |
