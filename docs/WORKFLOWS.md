# Workflows

## A. Evidence-first audit (working subset)

1. Confirm project directory and exclusions.
2. Read Markdown files without following symlinked directories.
3. Validate local paths and headings; count external links as not checked.
4. Check declared CLI command contracts statically, never executing commands.
5. Emit JSON/Markdown/HTML report, list limitations and exit nonzero on errors.
6. Review suggested remediation. This starter does not write patches.

## B. Change impact (partially implemented)

Produce baseline and current JSON audit reports, then run `docsutra diff`. This compares stable finding IDs only; it is not a Git-aware claim dependency graph yet.

## C. Snippet Lab (planned)

Identify examples → classify risk → obtain authorization → launch time/memory/network-limited sandbox → run tests → capture artifacts → assign verification stamp → propose patch → require human review.

## D. IDE agent orchestration (skill definitions ready, runtime unverified)

Prime scopes task → Link/CLI/Schema specialists gather evidence → Truth reconciles conclusions → Patch Crafter drafts changes → Evidence Verifier challenges results → Privacy Guard approves any outbound data flow → human confirms changes.
