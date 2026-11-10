#!/usr/bin/env node
// Regenerates evidence/ and examples/reports/ from REAL runs. Nothing here is hand-written or mocked.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { audit } from '../packages/core/audit.mjs';
import { saveAll } from '../packages/reporter/index.mjs';
import { runBenchmark, benchmarkMarkdown } from './benchmark.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const out = path.join(root, 'evidence');
await fs.mkdir(out, { recursive: true });

// 1. Real test run, TAP-ish spec output captured verbatim.
const t = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...(await fs.readdir(path.join(root, 'tests'))).filter(f => f.endsWith('.test.mjs')).sort().map(f => `tests/${f}`)], { cwd: root, encoding: 'utf8', timeout: 300000 });
const text = (t.stdout + t.stderr).replace(/\x1b\[[0-9;]*m/g, '');
const num = k => Number((text.match(new RegExp(`ℹ ${k} (\\d+)`)) || [])[1] ?? NaN);
const tests = { pass: num('pass'), fail: num('fail'), skipped: num('skipped'), total: num('tests'), exitCode: t.status };
await fs.writeFile(path.join(out, 'test-results.txt'), `DocSutra AI ${pkg.version} test run\nNode ${process.version} on ${process.platform}/${process.arch} (${os.release()})\nCommand: node --test --test-reporter=spec tests/*.test.mjs\n\n${text}`);

// 2. Benchmark
const bench = await runBenchmark();
await fs.writeFile(path.join(out, 'benchmark.json'), JSON.stringify(bench, null, 2) + '\n');
await fs.writeFile(path.join(out, 'benchmark.md'), benchmarkMarkdown(bench));

// 3. Sample audits: broken demo, healthy, and DocSutra's own docs (dogfood)
const reportsDir = path.join(root, 'examples', 'reports');
const samples = {};
for (const [name, dir] of [['demo', 'examples/demo-repo'], ['healthy', 'examples/healthy-repo'], ['self', '.']]) {
  const abs = path.join(root, dir);
  let cfg = {}; try { cfg = JSON.parse(await fs.readFile(path.join(abs, 'docsutra.config.json'), 'utf8')); } catch { /* none */ }
  const r = await audit(abs, cfg);
  r.root = `<${name}>`; r.environment.gitRevision = null; // keep committed samples machine-independent
  await saveAll(r, reportsDir, ['json', 'md', 'html', 'sarif'], `${name}-audit`);
  samples[name] = { files: r.summary.files, errors: r.summary.errors, warnings: r.summary.warnings, info: r.summary.info, localLinksVerified: r.summary.checkedLocalLinks };
}

// 4. Machine-readable summary the README and docs cite
const summary = { tool: `docsutra-ai ${pkg.version}`, generatedAt: new Date().toISOString(), runtime: { node: process.version, platform: process.platform, arch: process.arch }, tests, benchmark: { precision: bench.precision, recall: bench.recall, labelledIssues: bench.labelledIssues, falsePositives: bench.falsePositives.length, falseNegatives: bench.falseNegatives.length }, samples };
await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
process.exitCode = tests.fail ? 1 : 0;
