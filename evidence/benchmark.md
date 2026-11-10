# Benchmark results

Corpus: `benchmark/corpus` (5 files, 18 human-labelled issues + a tricky-syntax file that must stay silent). Tool: DocSutra AI 0.2.0, rules 2.0.0.

| Metric | Value |
|---|---:|
| Labelled issues | 18 |
| Reported findings | 18 |
| True positives | 18 |
| False positives | 0 |
| False negatives | 0 |
| **Precision** | **100.0%** |
| **Recall** | **100.0%** |
| F1 | 100.0% |
| Findings on legitimate-syntax file | 0 |

**Scope and honesty.** This is a small, author-built corpus. It proves the covered rules behave as designed on known cases and guards against regressions. It is not a claim about accuracy on arbitrary real-world repositories.
