import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { discoverDocs, inspectTarget } from './files.mjs';
import { parseMarkdown } from './markdown.mjs';
import { validateSnippets } from './commands.mjs';
import { validateConfig } from './config.mjs';
import { RULES, RULES_VERSION, SEVERITY_ORDER } from './rules.mjs';
import { findSecrets, excerpt } from './security.mjs';

export const REPORT_SCHEMA_VERSION = '2.0.0';
const here = path.dirname(fileURLToPath(import.meta.url));
export const TOOL_VERSION = JSON.parse(await fs.readFile(path.join(here, '../../package.json'), 'utf8')).version;

const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const safeRel = (root, file) => path.relative(root, file).split(path.sep).join('/');
const SUPPRESS = /<!--\s*docsutra-disable-next-line\s+([A-Z_,\s]+?)\s*-->/;

function makeFinding(x) {
  const meta = RULES[x.rule];
  const subject = x.subject ?? x.message;
  return {
    id: hash([x.rule, x.file, x.line, subject].join('|')).slice(0, 16),
    rule: x.rule, severity: x.severity ?? meta.severity, category: meta.category,
    file: x.file, line: x.line, message: x.message, subject, suggestion: x.suggestion,
    excerpt: x.excerpt ? excerpt(x.excerpt) : undefined,
    status: 'failed', verificationMethod: x.evidenceType ?? meta.evidence, confidence: 'high',
  };
}

function gitRevision(root) {
  try {
    const r = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 3000, windowsHide: true });
    return r.status === 0 ? r.stdout.trim() : null;
  } catch { return null; }
}

export async function audit(root, config = {}, options = {}) {
  validateConfig(config);
  const started = Date.now();
  const { root: realRoot, files } = await discoverDocs(root, { maxFiles: config.maxFiles ?? 3000, ignore: config.ignore ?? [], maxBytes: config.maxBytes });
  const ignoredRules = new Set(config.ignoreRules ?? []);
  for (const r of ignoredRules) if (!RULES[r]) throw new Error(`Invalid docsutra config: unknown rule '${r}' in ignoreRules`);

  const reports = [], parsedDocs = new Map(), contents = new Map(), raw = [];
  const ledger = {};
  const tick = (check, passed) => { const l = (ledger[check] ??= { performed: 0, passed: 0, failed: 0 }); l.performed++; passed ? l.passed++ : l.failed++; };
  let externalNotChecked = 0, snippetNotRun = 0, inspectedCli = 0, suppressed = 0, unreadable = 0;
  const snippetClasses = {};
  const decoder = new TextDecoder('utf-8', { fatal: true });

  for (const file of files) {
    const rel = safeRel(realRoot, file);
    const buf = await fs.readFile(file);
    let content;
    try { content = decoder.decode(buf); if (content.includes('\0')) throw new Error('nul'); }
    catch { unreadable++; raw.push({ rule: 'INVALID_FILE', file: rel, line: 1, message: 'File is not valid UTF-8 text and was skipped', subject: 'invalid-file' }); continue; }
    contents.set(file, content);
    parsedDocs.set(file, parseMarkdown(content));
    reports.push({ path: rel, sha256: hash(content), bytes: buf.length });
  }

  for (const file of contents.keys()) {
    const rel = safeRel(realRoot, file);
    const parsed = parsedDocs.get(file);
    const text = contents.get(file);
    const lines = text.split(/\r?\n/);
    const report = reports.find(r => r.path === rel);
    report.headings = parsed.headingList.length;
    report.links = parsed.links.length;
    const add = f => raw.push({ file: rel, ...f });
    const lineText = n => lines[n - 1] ?? '';

    if (parsed.unclosedFence !== null) add({ rule: 'UNCLOSED_CODE_FENCE', line: parsed.unclosedFence, message: 'Code fence has no matching close marker', subject: 'unclosed-fence', suggestion: 'Close the fence with a matching marker.', excerpt: lineText(parsed.unclosedFence) });
    tick('code-fences-balanced', parsed.unclosedFence === null);

    // Structure: duplicate headings and skipped levels
    const seen = new Map(); let prevLevel = 0;
    for (const h of parsed.headingList) {
      if (seen.has(h.text.toLowerCase())) add({ rule: 'DUPLICATE_HEADING', line: h.line, message: `Heading '${h.text}' repeats line ${seen.get(h.text.toLowerCase())}`, subject: `dup:${h.text}`, suggestion: 'Rename one heading so anchors stay stable.', excerpt: lineText(h.line) });
      else seen.set(h.text.toLowerCase(), h.line);
      if (prevLevel && h.level > prevLevel + 1) add({ rule: 'HEADING_LEVEL_SKIP', line: h.line, message: `Heading level jumps from h${prevLevel} to h${h.level}`, subject: `skip:${h.line}`, suggestion: 'Use consecutive heading levels.', excerpt: lineText(h.line) });
      prevLevel = h.level;
    }

    // Secrets anywhere in the file, including code fences and comments
    lines.forEach((l, i) => { for (const s of findSecrets(l)) add({ rule: 'SECRET_IN_DOCS', line: i + 1, message: `Text matches a ${s.type} credential format (value redacted)`, subject: `${s.type}@${i + 1}:${s.index}`, suggestion: 'Revoke the credential, remove it from the file and from git history, then use a placeholder.', excerpt: l }); });
    tick('secret-scan', !lines.some(l => findSecrets(l).length));

    for (const link of parsed.links) {
      let url = link.url;
      if (link.reference) {
        const ref = parsed.references.get(url.slice(4));
        if (!ref) { add({ rule: 'UNDEFINED_REFERENCE', line: link.line, message: `Reference link '${link.label}' has no definition`, subject: url, suggestion: 'Define this reference or use an inline URL.', excerpt: lineText(link.line) }); tick('reference-links-defined', false); continue; }
        tick('reference-links-defined', true);
        url = ref.raw;
      }
      if (link.image || link.altMissing) {
        const missing = link.kind === 'html' ? link.altMissing : !link.label.trim(); // HTML alt="" is a valid decorative image
        if (missing) add({ rule: 'IMAGE_MISSING_ALT', line: link.line, message: 'Image is missing descriptive alternative text', subject: url, suggestion: 'Add meaningful alt text, or alt="" for purely decorative images in HTML.', excerpt: lineText(link.line) });
        tick('image-alt-text', !missing);
      } else if (!link.label.trim() && link.kind !== 'autolink' && link.kind !== 'html') {
        add({ rule: 'EMPTY_LINK_TEXT', line: link.line, message: 'Link has no visible text', subject: url, suggestion: 'Add descriptive link text.', excerpt: lineText(link.line) });
        tick('link-text', false);
      }
      const t = await inspectTarget(realRoot, file, url);
      if (t.kind === 'external') { externalNotChecked++; continue; }
      if (t.kind === 'special') continue;
      if (t.kind === 'unsafe') { add({ rule: 'UNSAFE_LINK_SCHEME', line: link.line, message: `Link uses unsafe or unsupported scheme '${t.target}:'`, subject: t.target + ':' + link.line, suggestion: 'Use a vetted HTTPS or local URL.', excerpt: lineText(link.line) }); tick('link-scheme-safe', false); continue; }
      if (t.kind === 'invalid') { add({ rule: 'MALFORMED_LINK', line: link.line, message: 'URL contains invalid percent-encoding or characters', subject: 'bad-url:' + url, suggestion: 'Correct the URL encoding.', excerpt: lineText(link.line) }); tick('local-links', false); continue; }
      if (t.kind === 'outside') { add({ rule: 'OUTSIDE_REPOSITORY_LINK', line: link.line, message: 'Local link resolves outside the scanned root; not opened', subject: url, suggestion: 'Use an in-repository path or review the reference manually.', excerpt: lineText(link.line) }); continue; }
      if (t.kind === 'missing') { add({ rule: 'BROKEN_LOCAL_LINK', line: link.line, message: `Local target '${t.target}' does not exist`, subject: url, suggestion: 'Correct the path or restore the file.', excerpt: lineText(link.line) }); tick('local-links', false); continue; }
      if (t.caseMismatch) { add({ rule: 'PATH_CASE_MISMATCH', line: link.line, message: `Link '${t.target}' differs in letter case from the real path`, subject: url, suggestion: 'Match the exact case of the file or directory name.', excerpt: lineText(link.line) }); tick('local-links', false); continue; }
      tick('local-links', true);
      const a = t.anchor;
      if (a && a !== 'top' && !/^L\d+(C\d+)?(-L\d+(C\d+)?)?$/.test(a) && !t.directory && /\.(md|mdx|markdown)$/i.test(t.absolute)) {
        let target = parsedDocs.get(t.absolute);
        if (!target) { try { target = parseMarkdown(await fs.readFile(t.absolute, 'utf8')); parsedDocs.set(t.absolute, target); } catch { continue; } }
        const ok = target.headings.has(a.toLowerCase()) || target.headings.has(a);
        tick('heading-anchors', ok);
        if (!ok) add({ rule: 'BROKEN_ANCHOR', line: link.line, message: `Anchor '#${a}' was not found in '${safeRel(realRoot, t.absolute)}'`, subject: url, suggestion: 'Use a real heading slug from the referenced document.', excerpt: lineText(link.line) });
      }
    }

    const c = validateSnippets(parsed, rel, config.cliContracts || {});
    for (const f of c.findings) add(f);
    inspectedCli += c.inspected; snippetNotRun += c.notRun;
    for (const [k, v] of Object.entries(c.classes)) snippetClasses[k] = (snippetClasses[k] || 0) + v;
    const cliFail = c.findings.filter(f => f.rule.startsWith('CLI_')).length;
    for (let i = 0; i < c.inspected; i++) tick('cli-contract-lines', i >= cliFail);
  }

  // Suppressions: <!-- docsutra-disable-next-line RULE_A, RULE_B --> silences the following line, and is counted.
  const suppressMap = new Map();
  for (const [file, text] of contents) {
    const rel = safeRel(realRoot, file);
    text.split(/\r?\n/).forEach((l, i) => { const m = l.match(SUPPRESS); if (m) suppressMap.set(`${rel}:${i + 2}`, new Set(m[1].split(/[,\s]+/).filter(Boolean))); });
  }
  const findings = [];
  for (const f of raw) {
    if (ignoredRules.has(f.rule)) { suppressed++; continue; }
    if (suppressMap.get(`${f.file}:${f.line}`)?.has(f.rule)) { suppressed++; continue; }
    findings.push(makeFinding(f));
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule) || a.id.localeCompare(b.id));
  reports.sort((a, b) => a.path.localeCompare(b.path));

  const count = sev => findings.filter(f => f.severity === sev).length;
  const byRule = {}; for (const f of findings) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
  const usedRules = Object.fromEntries(Object.keys(RULES).map(id => [id, { ...RULES[id] }]));
  const treeHash = hash(reports.map(r => `${r.path}:${r.sha256}`).join('\n'));

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    tool: 'DocSutra AI',
    toolVersion: TOOL_VERSION,
    rulesVersion: RULES_VERSION,
    mode: 'static-offline',
    createdAt: options.now ?? new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch, gitRevision: gitRevision(realRoot), durationMs: Date.now() - started, networkUsed: false, commandsExecuted: 0 },
    root: realRoot,
    inputFingerprint: treeHash,
    summary: {
      files: contents.size, filesUnreadable: unreadable,
      checkedLocalLinks: ledger['local-links']?.performed ?? 0,
      externalLinksNotChecked: externalNotChecked,
      shellLinesNotExecuted: snippetNotRun,
      declaredCliLinesInspected: inspectedCli,
      errors: count('error'), warnings: count('warning'), info: count('info'),
      suppressed, byRule, snippetClasses,
    },
    ledger,
    rules: usedRules,
    files: reports,
    findings,
    limitations: [
      'External URLs are not fetched or checked.',
      'Shell commands are statically classified and, if you declare cliContracts, compared to that declaration; no command or test is ever executed.',
      'The scanner is a bounded Markdown scanner, not a full CommonMark/MDX parser; setext/ATX headings, fenced and indented code, code spans, comments, inline/reference links, images and HTML href/src are covered. Footnotes, MDX expressions and generated docs are not.',
      'A CLI contract is a declaration you maintain; it can itself be stale. It is not runtime verification of the real CLI.',
      'Secret detection uses high-precision formats only and cannot find arbitrary secrets.',
      'An audit timestamp records when the check ran; it does not certify that documentation claims or API behaviour are true.',
    ],
  };
}

export function diffAudits(before, after) {
  const a = new Map(before.findings.map(x => [x.id, x])), b = new Map(after.findings.map(x => [x.id, x]));
  const added = [...b].filter(([id]) => !a.has(id)).map(([, x]) => x);
  const resolved = [...a].filter(([id]) => !b.has(id)).map(([, x]) => x);
  return { schemaVersion: '1.0.0', before: before.createdAt, after: after.createdAt, added, resolved, unchanged: after.findings.length - added.length };
}

export { SEVERITY_ORDER };
