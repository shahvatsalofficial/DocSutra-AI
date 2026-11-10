#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, diffAudits, TOOL_VERSION } from '../core/audit.mjs';
import { validateConfig } from '../core/config.mjs';
import { saveAll, saveReport } from '../reporter/index.mjs';
import { installSkills, HOSTS } from '../adapters/skills.mjs';
import { createReadOnlyServer } from '../server/index.mjs';

const FORMATS = ['json', 'md', 'html', 'sarif'];
const usage = `DocSutra AI ${TOOL_VERSION} — evidence-backed documentation engineering

Usage:
  docsutra scan [--root PATH] [--config FILE] [--format all|json|md|html|sarif]
                [--out-dir DIR] [--out FILE] [--fail-on error|warning|none] [--baseline OLD.json]
  docsutra diff --before OLD.json --after NEW.json [--out diff.json]
  docsutra install-skills --host claude|cursor|codex|gemini|copilot|all --target PATH [--force]
  docsutra doctor
  docsutra serve --report audit.json [--port 4077] [--host 127.0.0.1]
  docsutra version | help

scan writes audit.json + audit.md + audit.html into <root>/.docsutra by default.
Exit codes: 0 clean, 1 findings at or above --fail-on (default: error), 2 usage/config/runtime error.
Scans are read-only: documented commands are never executed and external links are never fetched.
serve requires DOCSUTRA_SERVER_TOKEN; it binds to loopback only.
`;

export function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (!v.startsWith('--')) { o._.push(v); continue; }
    const eq = v.indexOf('=');
    if (eq !== -1) { o[v.slice(2, eq)] = v.slice(eq + 1); continue; }
    const next = argv[i + 1];
    o[v.slice(2)] = next !== undefined && !next.startsWith('--') ? (i++, next) : true;
  }
  return o;
}

async function readJson(file, what) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (e) { throw new Error(`Cannot read ${what} '${file}': ${e.code === 'ENOENT' ? 'file not found' : e.message}`); }
}

export async function run(argv, io = { log: console.log, error: console.error }) {
  const [command, ...rest] = argv;
  const a = parseArgs(rest);
  if (!command || command === 'help' || command === '--help' || command === '-h') { io.log(usage); return 0; }
  if (command === 'version' || command === '--version' || command === '-v') { io.log(TOOL_VERSION); return 0; }

  if (command === 'doctor') {
    io.log(JSON.stringify({ tool: 'DocSutra AI', version: TOOL_VERSION, node: process.version, platform: process.platform, architecturalMode: 'offline-static', skills: Object.keys(HOSTS), shellExecution: 'disabled', remoteLinkFetching: 'disabled', features: ['local links', 'heading anchors (GitHub slugs)', 'case-sensitivity check', 'reference + shortcut links', 'HTML href/src', 'image alt text', 'credential detection (redacted)', 'snippet risk classification', 'declared CLI contracts', 'JSON/Markdown/HTML/SARIF reports', 'audit comparison + baseline gating', 'project-local skills', 'loopback server'] }, null, 2));
    return 0;
  }

  if (command === 'scan') {
    const root = path.resolve(typeof a.root === 'string' ? a.root : '.');
    const cfgPath = path.resolve(typeof a.config === 'string' ? a.config : path.join(root, 'docsutra.config.json'));
    let config = {};
    try { config = JSON.parse(await fs.readFile(cfgPath, 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT' || typeof a.config === 'string') throw new Error(`Cannot load config '${cfgPath}': ${e.code === 'ENOENT' ? 'file not found' : e.message}`); }
    validateConfig(config);
    const failOn = a['fail-on'] ?? config.failOn ?? 'error';
    if (!['error', 'warning', 'none'].includes(failOn)) throw new Error('--fail-on must be error, warning or none');
    let format = a.format;
    if (typeof a.out === 'string' && !format) format = path.extname(a.out).slice(1).replace('markdown', 'md') || 'json';
    format = format && format !== true ? format : 'all';
    if (format !== 'all' && !FORMATS.includes(format)) throw new Error('Format must be all, json, md, html or sarif');

    const report = await audit(root, config);
    let written;
    if (typeof a.out === 'string') {
      if (format === 'all') throw new Error('--out needs a single --format; use --out-dir for all formats');
      written = [await saveReport(report, a.out, format)];
    } else {
      const dir = path.resolve(typeof a['out-dir'] === 'string' ? a['out-dir'] : path.join(root, '.docsutra'));
      written = await saveAll(report, dir, format === 'all' ? ['json', 'md', 'html'] : [format]);
    }
    const s = report.summary;
    io.log(`DocSutra audit: ${s.files} docs, ${s.errors} errors, ${s.warnings} warnings, ${s.info} info.`);
    io.log(`Verified ${s.checkedLocalLinks} local links. Not checked: ${s.externalLinksNotChecked} external URLs; ${s.shellLinesNotExecuted} shell lines not executed.`);
    for (const w of written) io.log(`Report: ${w}`);

    let gating = report.findings;
    if (typeof a.baseline === 'string') {
      const d = diffAudits(await readJson(a.baseline, 'baseline'), report);
      io.log(`Baseline: ${d.added.length} new, ${d.resolved.length} resolved, ${d.unchanged} unchanged.`);
      gating = d.added;
    }
    const bad = failOn === 'none' ? 0 : gating.filter(f => f.severity === 'error' || (failOn === 'warning' && f.severity === 'warning')).length;
    return bad > 0 ? 1 : 0;
  }

  if (command === 'diff') {
    if (typeof a.before !== 'string' || typeof a.after !== 'string') throw new Error('diff requires --before and --after');
    const report = diffAudits(await readJson(a.before, 'report'), await readJson(a.after, 'report'));
    if (typeof a.out === 'string') { await fs.mkdir(path.dirname(path.resolve(a.out)), { recursive: true }); await fs.writeFile(a.out, JSON.stringify(report, null, 2) + '\n'); }
    io.log(JSON.stringify({ added: report.added.length, resolved: report.resolved.length, unchanged: report.unchanged }, null, 2));
    return report.added.some(f => f.severity === 'error') ? 1 : 0;
  }

  if (command === 'install-skills') {
    if (typeof a.host !== 'string' || typeof a.target !== 'string') throw new Error('install-skills requires --host and --target');
    io.log(JSON.stringify(await installSkills(a.target, a.host, { force: a.force === true }), null, 2));
    return 0;
  }

  if (command === 'serve') {
    if (typeof a.report !== 'string') throw new Error('serve requires --report');
    const server = await createReadOnlyServer({ reportPath: path.resolve(a.report), token: process.env.DOCSUTRA_SERVER_TOKEN, port: Number(a.port ?? 4077), host: typeof a.host === 'string' ? a.host : '127.0.0.1' });
    io.log(`DocSutra report server listening on http://127.0.0.1:${server.address().port} (read-only; /report requires bearer token)`);
    return 0;
  }

  throw new Error(`Unknown command: ${command}. Run 'docsutra help'.`);
}

const entry = process.argv[1] && (() => { try { return path.resolve(process.argv[1]); } catch { return ''; } })();
if (entry) {
  const self = fileURLToPath(import.meta.url);
  const same = async () => (await fs.realpath(entry).catch(() => entry)) === (await fs.realpath(self).catch(() => self));
  if (await same()) {
    try { process.exitCode = await run(process.argv.slice(2)); }
    catch (e) { console.error(`DocSutra error: ${e.message}`); process.exitCode = 2; }
  }
}
