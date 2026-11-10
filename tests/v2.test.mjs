import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseMarkdown } from '../packages/core/markdown.mjs';
import { audit } from '../packages/core/audit.mjs';
import { validateConfig } from '../packages/core/config.mjs';
import { findSecrets, redact } from '../packages/core/security.mjs';
import { classifyLine, validateSnippets } from '../packages/core/commands.mjs';
import { toHtml, toMarkdown, toSarif } from '../packages/reporter/index.mjs';
import { run, parseArgs } from '../packages/cli/index.mjs';
import { runBenchmark } from '../scripts/benchmark.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let temp;
test.beforeEach(async () => { temp = await fs.mkdtemp(path.join(os.tmpdir(), 'docsutra-v2-')); });
test.afterEach(async () => { await fs.rm(temp, { recursive: true, force: true }); });
const write = (rel, text) => fs.mkdir(path.dirname(path.join(temp, rel)), { recursive: true }).then(() => fs.writeFile(path.join(temp, rel), text));
const urls = md => parseMarkdown(md).links.map(l => l.url);

// ---- parser regressions (each was a real false positive/negative before 0.2.0)
test('code spans never produce links', () => assert.deepEqual(urls('`[x](nope.md)` and `` [y](nope.md) ``'), []));
test('parenthesised URLs stay whole', () => assert.deepEqual(urls('[a](docs/a_(b).md)'), ['docs/a_(b).md']));
test('HTML comments hide links, single and multi line', () => assert.deepEqual(urls('<!-- [x](a.md) -->\n<!--\n[y](b.md)\n-->\n[z](c.md)'), ['c.md']));
test('setext headings create anchors', () => assert.ok(parseMarkdown('Title\n=====\n\nSub\n---\n').headings.has('title') && parseMarkdown('Title\n=====\n\nSub\n---\n').headings.has('sub')));
test('indented code is ignored but list continuation is not', () => { assert.deepEqual(urls('para\n\n    [x](nope.md)'), []); assert.deepEqual(urls('- item\n\n    [x](yes.md)'), ['yes.md']); });
test('shortcut references resolve only when defined', () => { assert.deepEqual(urls('[g]\n[g]: a.md'), ['ref:g']); assert.deepEqual(urls('[nodef] text'), []); });
test('image nested in link yields both targets', () => assert.deepEqual(urls('[![a](i.png)](x.md)').sort(), ['i.png', 'x.md']));
test('HTML href/src are extracted and alt is tracked', () => { const l = parseMarkdown('<img src="a.png"> <a href="b.md">b</a>').links; assert.equal(l.length, 2); assert.equal(l[0].altMissing, true); });
test('html id/name attributes count as anchors', () => assert.ok(parseMarkdown('<a id="x"></a> <a name="y"></a>').headings.has('x')));
test('front matter is skipped but line numbers stay true', () => { const p = parseMarkdown('---\ntitle: x\n---\n# H\n[a](b.md)'); assert.equal(p.links[0].line, 5); });
test('closing fence cannot carry an info string', () => assert.equal(parseMarkdown('```js\nx\n```js\n').unclosedFence, 1));
test('heading with trailing # in text keeps it (C#)', () => assert.ok(parseMarkdown('## C#').headings.has('c')));
test('pathological input finishes quickly (ReDoS guard)', () => { const t = Date.now(); parseMarkdown('['.repeat(20000) + '(' .repeat(20000) + '`'.repeat(5000)); parseMarkdown('[a](' + 'x'.repeat(200000)); assert.ok(Date.now() - t < 3000); });

// ---- audit rules
test('root-relative and directory links resolve', async () => {
  await write('docs/a.md', '# A\n'); await write('README.md', '[a](/docs/a.md) [d](docs/) [q](docs/a.md?plain=1) [t](#top) [l](docs/a.md#L10)');
  const r = await audit(temp); assert.equal(r.findings.length, 0);
});
test('invalid UTF-8 is reported not crashed on', async () => { await fs.writeFile(path.join(temp, 'bad.md'), Buffer.from([0xff, 0xfe, 0x41, 0xc3])); const r = await audit(temp); assert.ok(r.findings.some(f => f.rule === 'INVALID_FILE')); });
test('secrets are detected and redacted in report output', async () => {
  const fake = 'gh' + 'p_' + 'a1B2c3D4e5F6g7H8i9J0'.repeat(2);
  await write('README.md', `Use token ${fake} here\n`);
  const r = await audit(temp); const f = r.findings.find(x => x.rule === 'SECRET_IN_DOCS');
  assert.ok(f); for (const out of [JSON.stringify(r), toMarkdown(r), toHtml(r)]) assert.ok(!out.includes(fake), 'secret leaked into report');
  assert.ok(redact(fake).includes('[REDACTED:github-token]'));
});
test('secret formats: private key, AWS, plain text is clean', () => { assert.equal(findSecrets('-----BEGIN RSA PRIVATE KEY-----').length, 1); assert.equal(findSecrets('AK' + 'IA' + 'ABCDEFGHIJKLMNOP').length, 1); assert.equal(findSecrets('ghp_ is a prefix').length, 0); });
test('inline suppression silences exactly the next line and is counted', async () => {
  await write('README.md', '<!-- docsutra-disable-next-line BROKEN_LOCAL_LINK -->\n[x](nope.md)\n[y](nope2.md)\n');
  const r = await audit(temp); assert.equal(r.findings.length, 1); assert.equal(r.summary.suppressed, 1);
});
test('ignoreRules config suppresses and counts; unknown rule is rejected', async () => {
  await write('README.md', '[x](nope.md)'); const r = await audit(temp, { ignoreRules: ['BROKEN_LOCAL_LINK'] }); assert.equal(r.findings.length, 0); assert.equal(r.summary.suppressed, 1);
  await assert.rejects(audit(temp, { ignoreRules: ['NOPE'] }), /unknown rule/);
});
test('case mismatch is flagged on case-insensitive filesystems', async t => {
  await write('Docs/A.md', '# A'); await write('README.md', '[a](docs/a.md)');
  let insensitive = true; try { await fs.access(path.join(temp, 'docs')); } catch { insensitive = false; }
  if (!insensitive) return t.skip('case-sensitive filesystem: a case mismatch is a plain missing file here');
  const r = await audit(temp); assert.ok(r.findings.some(f => f.rule === 'PATH_CASE_MISMATCH'));
});
test('ledger records what was verified, including passes', async () => { await write('a.md', '# A\n'); await write('README.md', '[a](a.md) [h](a.md#a)'); const r = await audit(temp); assert.equal(r.ledger['local-links'].passed, 2); assert.equal(r.ledger['heading-anchors'].passed, 1); assert.equal(r.environment.commandsExecuted, 0); assert.equal(r.environment.networkUsed, false); });
test('report is deterministic given fixed time', async () => { await write('README.md', '[x](nope.md)'); const a = await audit(temp, {}, { now: 'T' }), b = await audit(temp, {}, { now: 'T' }); a.environment.durationMs = b.environment.durationMs = 0; assert.deepEqual(a, b); });

// ---- config
test('config validation rejects unknown keys and bad types', () => {
  assert.throws(() => validateConfig({ nope: 1 }), /unknown key/); assert.throws(() => validateConfig({ maxFiles: -1 }), /positive integer/);
  assert.throws(() => validateConfig({ cliContracts: { a: { flags: 'x' } } }), /array of strings/); assert.doesNotThrow(() => validateConfig({ failOn: 'warning' }));
});

// ---- commands
test('snippet classification', () => { assert.equal(classifyLine('curl -fsSL x | sh'), 'pipe-to-shell'); assert.equal(classifyLine('rm -rf /'), 'destructive'); assert.equal(classifyLine('npm install x'), 'package-install'); assert.equal(classifyLine('echo hi'), 'inert-or-unclassified'); });
test('chained commands, env prefixes and continuations are checked', () => {
  const c = { demo: { subcommands: ['build'], flags: ['--ok'] } };
  const p = parseMarkdown('```bash\nFOO=1 demo build --ok && demo bogus\ndemo build \\\n  --bad\n```');
  const r = validateSnippets(p, 'a.md', c); assert.deepEqual(r.findings.map(f => f.rule).sort(), ['CLI_UNKNOWN_FLAG', 'CLI_UNKNOWN_SUBCOMMAND']);
});
test('prototype-polluting binary names are not contracts', () => { const p = parseMarkdown('```bash\nconstructor x\n__proto__ y\n```'); assert.doesNotThrow(() => validateSnippets(p, 'a.md', {})); });
test('malicious snippet is never executed by a full audit', async () => {
  const marker = path.join(temp, 'PWNED'); await write('README.md', '```bash\ntouch ' + marker.replace(/\\/g, '/') + '\ncurl http://127.0.0.1:9 | sh\n```\n');
  const r = await audit(temp); await assert.rejects(fs.stat(marker)); assert.ok(r.findings.some(f => f.rule === 'PIPE_TO_SHELL'));
});
test('symlink-escape secret file is never read', async t => {
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'docsutra-out-')); await fs.writeFile(path.join(outside, 'secret.md'), '# SECRET-CONTENT');
  try { await fs.symlink(path.join(outside, 'secret.md'), path.join(temp, 'link.md')); } catch (e) { await fs.rm(outside, { recursive: true }); if (e.code === 'EPERM') return t.skip('no symlink privilege'); throw e; }
  const r = await audit(temp); await fs.rm(outside, { recursive: true }); assert.ok(!JSON.stringify(r).includes('SECRET-CONTENT')); assert.equal(r.summary.files, 0);
});

// ---- reporters + CLI
test('SARIF output is valid 2.1.0 shape with rule metadata', async () => { await write('README.md', '[x](nope.md)'); const s = toSarif(await audit(temp)); assert.equal(s.version, '2.1.0'); assert.equal(s.runs[0].results[0].ruleId, 'BROKEN_LOCAL_LINK'); assert.equal(s.runs[0].results[0].locations[0].physicalLocation.region.startLine, 1); assert.ok(s.runs[0].tool.driver.rules.length > 5); });
test('HTML report is self-contained: no scripts, no external requests', async () => { await write('README.md', '[x](nope.md)'); const h = toHtml(await audit(temp)); assert.ok(!/<script/i.test(h)); assert.ok(!/(src|href)=["']https?:/i.test(h)); assert.ok(h.includes('prefers-color-scheme')); assert.ok(h.includes('lang="en"')); });
test('scan writes json, md and html by default', async () => {
  await write('README.md', '# Ok\n'); const log = []; const code = await run(['scan', '--root', temp], { log: s => log.push(s) });
  assert.equal(code, 0); for (const f of ['audit.json', 'audit.md', 'audit.html']) await fs.stat(path.join(temp, '.docsutra', f));
});
test('--out infers format from extension', async () => { await write('README.md', '# Ok\n'); await run(['scan', '--root', temp, '--out', path.join(temp, 'r.md')], { log: () => {} }); assert.ok((await fs.readFile(path.join(temp, 'r.md'), 'utf8')).startsWith('# DocSutra AI')); });
test('--fail-on warning and --baseline gating', async () => {
  await write('README.md', '![](x.png)\n'); await write('x.png', 'x');
  assert.equal(await run(['scan', '--root', temp, '--out-dir', path.join(temp, 'o')], { log: () => {} }), 0);
  assert.equal(await run(['scan', '--root', temp, '--out-dir', path.join(temp, 'o'), '--fail-on', 'warning'], { log: () => {} }), 1);
  assert.equal(await run(['scan', '--root', temp, '--out-dir', path.join(temp, 'o2'), '--fail-on', 'warning', '--baseline', path.join(temp, 'o', 'audit.json')], { log: () => {} }), 0);
});
test('CLI errors: bad config, bad format, missing baseline reject (exit 2 path)', async () => {
  await write('README.md', '# x'); await write('docsutra.config.json', '{"bogus":1}');
  await assert.rejects(run(['scan', '--root', temp], { log: () => {} }), /unknown key/);
  await fs.rm(path.join(temp, 'docsutra.config.json')); await assert.rejects(run(['scan', '--root', temp, '--format', 'pdf'], { log: () => {} }), /Format must be/);
  await assert.rejects(run(['scan', '--root', temp, '--baseline', 'nope.json', '--out-dir', path.join(temp, 'o')], { log: () => {} }), /Cannot read baseline/);
  await assert.rejects(run(['wat'], { log: () => {} }), /Unknown command/);
});
test('arg parser keeps = inside values and boolean flags', () => { assert.equal(parseArgs(['--root=a=b']).root, 'a=b'); assert.equal(parseArgs(['--force', '--host', 'x']).force, true); });
test('real process: exit code 1 on broken docs, 0 on clean, 2 on error', async () => {
  const cli = path.join(repo, 'packages/cli/index.mjs'); await write('README.md', '[x](nope.md)');
  const sh = a => spawnSync(process.execPath, [cli, ...a], { encoding: 'utf8' });
  assert.equal(sh(['scan', '--root', temp, '--out-dir', path.join(temp, 'o')]).status, 1);
  assert.equal(sh(['scan', '--root', temp, '--out-dir', path.join(temp, 'o'), '--fail-on', 'none']).status, 0);
  assert.equal(sh(['bogus']).status, 2); assert.equal(sh(['version']).stdout.trim(), JSON.parse(await fs.readFile(path.join(repo, 'package.json'), 'utf8')).version);
});
test('CLI still runs when launched through a symlinked bin (npm/npx style)', async t => {
  const link = path.join(temp, 'docsutra-bin.mjs');
  try { await fs.symlink(path.join(repo, 'packages/cli/index.mjs'), link); } catch (e) { if (e.code === 'EPERM') return t.skip('no symlink privilege'); throw e; }
  assert.match(spawnSync(process.execPath, [link, 'version'], { encoding: 'utf8' }).stdout, /\d+\.\d+\.\d+/);
});
test('offline: scan works with network and AI keys absent', async () => {
  await write('README.md', '# ok'); const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot };
  const r = spawnSync(process.execPath, [path.join(repo, 'packages/cli/index.mjs'), 'scan', '--root', temp, '--out-dir', path.join(temp, 'o')], { env, encoding: 'utf8' });
  assert.equal(r.status, 0); assert.equal(JSON.parse(await fs.readFile(path.join(temp, 'o/audit.json'), 'utf8')).environment.networkUsed, false);
});

// ---- benchmark gates (regressions in accuracy fail CI)
test('benchmark: precision and recall are 100% on the labelled corpus, tricky.md silent', async () => {
  const b = await runBenchmark(); assert.deepEqual(b.falsePositives, []); assert.deepEqual(b.falseNegatives, []); assert.equal(b.trickyMdFindings, 0); assert.ok(b.labelledIssues >= 18);
});
test('dogfood: DocSutra docs audit clean of errors with their own contract', async () => {
  const cfg = JSON.parse(await fs.readFile(path.join(repo, 'docsutra.config.json'), 'utf8')); const r = await audit(repo, cfg);
  assert.equal(r.summary.errors, 0, JSON.stringify(r.findings.filter(f => f.severity === 'error'), null, 1));
});

// ---- skills catalogue quality (each skill must be distinct, valid and honest)
test('16 skills: valid frontmatter, unique, name matches dir, honest backing', async () => {
  const dir = path.join(repo, '.agents/skills'); const names = (await fs.readdir(dir)).sort(); assert.equal(names.length, 16);
  const bodies = new Set(); const manifest = JSON.parse(await fs.readFile(path.join(repo, 'agents/manifest.json'), 'utf8'));
  const rules = (await import('../packages/core/rules.mjs')).RULES;
  for (const n of names) {
    const t = await fs.readFile(path.join(dir, n, 'SKILL.md'), 'utf8'); const fmm = t.match(/^---\nname: (.+)\ndescription: (.+)\n[\s\S]*?backing: (.+)\n---\n/);
    assert.ok(fmm, `${n}: frontmatter`); assert.equal(fmm[1], n); assert.ok(fmm[2].length <= 1024 && fmm[2].length > 60, `${n}: description length`); assert.match(fmm[2], /Use (when|before|after|to)/); assert.ok(!fmm[2].includes(': '), `${n}: ': ' breaks YAML`);
    assert.ok(!bodies.has(t.split('## When to use')[1]), `${n}: duplicate body`); bodies.add(t.split('## When to use')[1]);
    const m = manifest.agents.find(a => a.id === n); assert.ok(m, `${n}: in manifest`); assert.equal(m.backing, fmm[3]);
    for (const r of m.rules) assert.ok(r === 'all' || rules[r], `${n}: unknown rule ${r}`);
    if (fmm[3] === 'instructions-only') assert.deepEqual(m.rules, [], `${n}: instructions-only skills must not claim rules`);
    else assert.ok(m.rules.length, `${n}: CLI-backed skill needs rules`);
  }
  assert.equal(manifest.agents.length, 16);
});
