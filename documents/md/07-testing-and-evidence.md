# Testing and evidence

> How the claims in this project are proven, how to reproduce them, and exactly where the proof stops.

## Live numbers

{{evidence}}

## What is tested

| Layer | Examples | Files |
|---|---|---|
| Parser regressions | code spans, comments, parenthesised URLs, setext headings, nested images, front matter | `tests/v2.test.mjs` |
| Rules | broken links, anchors, case, secrets, suppression, config | `tests/core.test.mjs`, `tests/v2.test.mjs` |
| Security | never executes snippets, symlink escape, HTML escaping, redaction, ReDoS guard, offline run | `tests/v2.test.mjs` |
| CLI | exit codes in a real child process, baseline gating, bad config, symlinked bin | `tests/v2.test.mjs` |
| Reports | SARIF shape, self-contained HTML, determinism | `tests/v2.test.mjs` |
| Skills | frontmatter validity, uniqueness, honest `backing` | `tests/v2.test.mjs` |
| Accuracy gate | precision and recall on the labelled corpus | `scripts/benchmark.mjs` |
| Dogfood | DocSutra audits its own documentation, zero errors | `tests/v2.test.mjs` |

## Reproduce everything

```bash
npm test
npm run benchmark
npm run build:evidence
```

`build:evidence` regenerates `evidence/test-results.txt` (verbatim test output), `evidence/benchmark.json`, `evidence/summary.json` and the sample reports in `examples/reports/`.

## Benchmark method

The corpus in `benchmark/corpus` contains planted issues plus a file of tricky-but-legal syntax that must produce **zero** findings. Ground truth is in `benchmark/labels.json`, written from the corpus construction rather than from tool output. A finding counts as correct only if file, line and rule all match.

The benchmark has already paid for itself: it exposed a false positive (valid decorative `<img alt="">` was flagged) that was then fixed. Earlier, a pathological-input test exposed a quadratic slowdown that is now bounded.

## Sample reports

Real outputs from real runs, committed to the repository:

- Broken demo: [HTML](../../examples/reports/demo-audit.html), [Markdown](../../examples/reports/demo-audit.md), [JSON](../../examples/reports/demo-audit.json), [SARIF](../../examples/reports/demo-audit.sarif)
- Healthy repo: [Markdown](../../examples/reports/healthy-audit.md)
- DocSutra's own docs: [Markdown](../../examples/reports/self-audit.md)

## Cross-platform

CI runs Linux, Windows and macOS on Node 20, 22 and 24. Local evidence in this repository was produced on the platform stated in the live numbers above. Three tests skip when the OS denies symlink creation or is case-sensitive; skipped tests are reported, not hidden.

## What this does not prove

- The corpus is small and written by the author. A 100% score on it means the covered rules behave as designed and cannot silently regress. It is **not** an accuracy claim for arbitrary repositories.
- No independent third-party audit has been performed.
- IDE skill activation has not been tested in the five hosts.

## How to challenge a result

Open an issue with a minimal Markdown file and the finding ID. Each confirmed false positive or negative becomes a labelled corpus case and a regression test.
