#!/usr/bin/env node
// Reproducible precision/recall benchmark against the hand-labelled corpus in benchmark/.
// Usage: node scripts/benchmark.mjs [--write]   (--write refreshes benchmark/results.{json,md})
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from '../packages/core/audit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpus = path.join(root, 'benchmark', 'corpus');

export async function runBenchmark() {
  const labels = JSON.parse(await fs.readFile(path.join(root, 'benchmark', 'labels.json'), 'utf8'));
  const config = JSON.parse(await fs.readFile(path.join(corpus, 'docsutra.config.json'), 'utf8'));
  const report = await audit(corpus, config, { now: '2026-01-01T00:00:00.000Z' });
  const key = x => `${x.file}:${x.line}:${x.rule}`;
  const want = new Set(labels.expected.map(key));
  const got = new Set(report.findings.map(key));
  const tp = [...got].filter(k => want.has(k));
  const fp = [...got].filter(k => !want.has(k));
  const fn = [...want].filter(k => !got.has(k));
  const byRule = {};
  for (const k of want) { const r = k.split(':').pop(); (byRule[r] ??= { expected: 0, found: 0 }).expected++; if (got.has(k)) byRule[r].found++; }
  const precision = got.size ? tp.length / got.size : 1;
  const recall = want.size ? tp.length / want.size : 1;
  return {
    corpus: 'benchmark/corpus', files: report.summary.files, labelledIssues: want.size, reported: got.size,
    truePositives: tp.length, falsePositives: fp, falseNegatives: fn, precision: +precision.toFixed(4), recall: +recall.toFixed(4),
    f1: +(2 * precision * recall / (precision + recall || 1)).toFixed(4),
    trickyMdFindings: report.findings.filter(f => f.file === 'tricky.md').length,
    perRule: byRule, tool: `DocSutra AI ${report.toolVersion}`, rules: report.rulesVersion, node: process.version,
  };
}

export function benchmarkMarkdown(r) {
  const pct = n => (n * 100).toFixed(1) + '%';
  return `# Benchmark results\n\nCorpus: \`${r.corpus}\` (${r.files} files, ${r.labelledIssues} human-labelled issues + a tricky-syntax file that must stay silent). Tool: ${r.tool}, rules ${r.rules}.\n\n| Metric | Value |\n|---|---:|\n| Labelled issues | ${r.labelledIssues} |\n| Reported findings | ${r.reported} |\n| True positives | ${r.truePositives} |\n| False positives | ${r.falsePositives.length} |\n| False negatives | ${r.falseNegatives.length} |\n| **Precision** | **${pct(r.precision)}** |\n| **Recall** | **${pct(r.recall)}** |\n| F1 | ${pct(r.f1)} |\n| Findings on legitimate-syntax file | ${r.trickyMdFindings} |\n\n${r.falsePositives.length ? `False positives: ${r.falsePositives.join(', ')}\n\n` : ''}${r.falseNegatives.length ? `False negatives: ${r.falseNegatives.join(', ')}\n\n` : ''}**Scope and honesty.** This is a small, author-built corpus. It proves the covered rules behave as designed on known cases and guards against regressions. It is not a claim about accuracy on arbitrary real-world repositories.\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await runBenchmark();
  console.log(JSON.stringify(r, null, 2));
  if (process.argv.includes('--write')) {
    await fs.writeFile(path.join(root, 'benchmark', 'results.json'), JSON.stringify(r, null, 2) + '\n');
    await fs.writeFile(path.join(root, 'benchmark', 'results.md'), benchmarkMarkdown(r));
  }
  process.exitCode = r.falsePositives.length || r.falseNegatives.length ? 1 : 0;
}
