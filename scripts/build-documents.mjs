#!/usr/bin/env node
// Builds the documentation website: documents/index.html, documents/html/*.html, documents/assets, documents/404.html
// from documents/md/*.md. Dependency-free. Light theme by default, dark via toggle (remembered).
// Directives in Markdown: {{rules}} {{evidence}} {{svg:name}} {{flow:name}} {{chart:name}} {{cmp:name}}
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, RULES_VERSION } from '../packages/core/rules.mjs';
import { TOOL_VERSION } from '../packages/core/audit.mjs';
import { headingId } from '../packages/core/markdown.mjs';
import { DIAGRAMS, FLOWS } from './site/diagrams.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mdDir = path.join(root, 'documents/md'), htmlDir = path.join(root, 'documents/html'), assetDir = path.join(root, 'documents/assets');
const GH = 'https://github.com/shahvatsalofficial/DocSutra-AI';
const SITE = 'https://shahvatsalofficial.github.io/DocSutra-AI';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const GROUPS = [
  ['Start here', ['01-executive-summary', '04-user-guide', '13-real-world-scenarios']],
  ['Reference', ['02-functional-specification', '05-rules-reference', '08-ci-and-integration', '09-agent-skills-guide']],
  ['Design and trust', ['03-technical-architecture', '06-security-and-privacy', '07-testing-and-evidence', '10-legal-and-trust']],
  ['Project', ['11-release-runbook', '12-roadmap-and-faq']],
];
const ORDER = GROUPS.flatMap(g => g[1]);

const ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  code: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  terminal: '<path d="M4 17l6-6-6-6M12 19h8"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
};
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join('')}</defs></svg>`;
const ic = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

// ---------- Markdown ----------
function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      u = u.replace(/&amp;/g, '&');
      if (/^\.\.\/\.\.\//.test(u)) u = `${GH}/blob/main/${u.replace(/^\.\.\/\.\.\//, '')}`;
      else u = u.replace(/^([\w-]+)\.md(#|$)/, '$1.html$2');
      return `<a href="${esc(u)}"${/^https?:/.test(u) ? ' rel="noopener"' : ''}>${t}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:)]|$)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
}

function mdToHtml(md, ctx) {
  const lines = md.split(/\r?\n/), out = [], toc = [];
  let i = 0, firstQuote = true;
  const para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para.length = 0; } };
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*$/.test(l)) { flush(); i++; continue; }
    const fence = l.match(/^```(\w*)/);
    if (fence) { flush(); const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(`<pre class="code" data-lang="${esc(fence[1])}"><code>${esc(buf.join('\n'))}</code><button class="copy" type="button">Copy</button></pre>`); continue; }
    const dir = l.match(/^\{\{(\w+)(?::(\w+))?\}\}$/);
    if (dir) { flush(); out.push(ctx.directive(dir[1], dir[2])); i++; continue; }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush(); const id = headingId(h[2]); const n = h[1].length;
      if (n === 2 || n === 3) toc.push({ level: n, text: h[2].replace(/`/g, ''), id });
      out.push(n === 1 ? `<h1>${inline(h[2])}</h1>` : `<h${n} id="${id}">${inline(h[2])}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${n}>`); i++; continue;
    }
    if (/^---+\s*$/.test(l)) { flush(); out.push('<hr>'); i++; continue; }
    if (/^>\s?/.test(l)) {
      flush(); const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      const text = buf.join(' '); const k = text.match(/^\*\*(Warning|Important|Tip|Note)\*\*\s*/);
      if (firstQuote && !k) { firstQuote = false; out.push(`<blockquote class="lead-q">${inline(text)}</blockquote>`); }
      else out.push(`<blockquote class="callout-${k ? k[1].toLowerCase() : 'note'}">${k ? `<strong>${k[1]}.</strong> ${inline(text.slice(k[0].length))}` : inline(text)}</blockquote>`);
      firstQuote = false; continue;
    }
    if (/^\|.*\|\s*$/.test(l) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      flush(); const cells = r => r.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
      const head = cells(l), align = cells(lines[i + 1]).map(c => /^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : 'left'); i += 2; const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c, k) => `<th scope="col" style="text-align:${align[k]}">${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, k) => `<td style="text-align:${align[k]}">${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    const li = l.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      flush(); const ordered = /\d/.test(li[2]); const items = [];
      while (i < lines.length) { const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/); if (m) { items.push({ depth: Math.floor(m[1].length / 2), text: m[3] }); i++; } else if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; } else break; }
      const tag = ordered ? 'ol' : 'ul'; let html = '', depth = -1;
      for (const it of items) { while (depth < it.depth) { html += `<${tag}>`; depth++; } while (depth > it.depth) { html += `</li></${tag}>`; depth--; } html += `<li>${inline(it.text)}`; }
      while (depth >= 0) { html += `</li></${tag}>`; depth--; }
      out.push(html); continue;
    }
    para.push(l.trim()); i++;
  }
  flush();
  return { html: out.join('\n'), toc };
}

// ---------- data-driven blocks ----------
const read = async p => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const ev = await read('evidence/summary.json');
const bench = await read('evidence/benchmark.json');
const demo = await read('examples/reports/demo-audit.json');
const nRules = Object.keys(RULES).length;

const bars = (rows, cls = '') => `<div class="bars">${rows.map(([l, v, max, c]) => `<div class="bar"><span class="lab">${esc(l)}</span><div class="trk"><div class="fill ${c || cls}" style="width:${max ? Math.max(3, Math.round(100 * v / max)) : 0}%"></div></div><span class="val">${v}</span></div>`).join('')}</div>`;
const chart = (title, body, note = '') => `<figure class="chart"><h4>${esc(title)}</h4>${body}${note ? `<p class="note">${esc(note)}</p>` : ''}</figure>`;
const CHARTS = {
  rules: () => { const c = {}; for (const r of Object.values(RULES)) c[r.category] = (c[r.category] || 0) + 1; const rows = Object.entries(c).sort((a, b) => b[1] - a[1]); const sev = { error: 0, warning: 0, info: 0 }; for (const r of Object.values(RULES)) sev[r.severity]++;
    return chart(`${nRules} rules by category`, bars(rows.map(([k, v]) => [k, v, rows[0][1]]))) + chart('Default severity split', `<div class="stack" role="img" aria-label="${sev.error} errors, ${sev.warning} warnings, ${sev.info} info"><i style="width:${100 * sev.error / nRules}%;background:var(--bad)"></i><i style="width:${100 * sev.warning / nRules}%;background:var(--warn)"></i><i style="width:${100 * sev.info / nRules}%;background:var(--info)"></i></div><p class="legend"><span><b style="background:var(--bad)"></b>${sev.error} errors</span><span><b style="background:var(--warn)"></b>${sev.warning} warnings</span><span><b style="background:var(--info)"></b>${sev.info} info</span></p>`); },
  bench: () => chart('Benchmark: planted issues found, per rule', bars(Object.entries(bench.perRule).map(([k, v]) => [`${k}`, v.found, Math.max(...Object.values(bench.perRule).map(x => x.expected)), v.found === v.expected ? 'ok' : 'bad'])), `${bench.truePositives} of ${bench.labelledIssues} planted issues found, ${bench.falsePositives.length} false positives. Small author-built corpus: regression evidence, not an accuracy claim for other repositories.`),
  tests: () => { const t = ev.tests; return chart('Test run', `<div class="stack" role="img" aria-label="${t.pass} passed, ${t.skipped} skipped, ${t.fail} failed"><i style="width:${100 * t.pass / t.total}%;background:var(--ok)"></i><i style="width:${100 * t.skipped / t.total}%;background:var(--warn)"></i><i style="width:${100 * t.fail / t.total}%;background:var(--bad)"></i></div><p class="legend"><span><b style="background:var(--ok)"></b>${t.pass} passed</span><span><b style="background:var(--warn)"></b>${t.skipped} skipped (needs OS privilege)</span><span><b style="background:var(--bad)"></b>${t.fail} failed</span></p>`, `Node ${ev.runtime.node} on ${ev.runtime.platform}/${ev.runtime.arch}, ${ev.generatedAt}.`); },
  demo: () => { const byRule = demo.summary.byRule; const rows = Object.entries(byRule).sort((a, b) => b[1] - a[1]); return chart(`Bundled broken demo: ${demo.summary.errors} errors, ${demo.summary.warnings} warning, ${demo.summary.checkedLocalLinks} local links verified`, bars(rows.map(([k, v]) => [k, v, rows[0][1], RULES[k]?.severity === 'error' ? 'bad' : 'warn'])), 'From examples/reports/demo-audit.json, produced by a real run.'); },
};
const CMPS = {
  rename: `<div class="cmp"><div class="b"><h4>Without a gate</h4><p>Reviewers see one renamed file. The 14 broken links are invisible in the diff. Readers find them weeks later.</p></div><div class="g"><h4>With DocSutra</h4><p>The PR fails with every broken link listed by file and line. The fix lands in the same PR.</p></div></div>`,
};
const ctx = {
  directive(name, arg) {
    if (name === 'rules') return `<div class="table-wrap"><table><thead><tr><th scope="col">Rule</th><th scope="col">Severity</th><th scope="col">Category</th><th scope="col">Evidence</th><th scope="col">What it means</th></tr></thead><tbody>${Object.entries(RULES).map(([id, r]) => `<tr><td><code>${id}</code></td><td>${r.severity}</td><td>${r.category}</td><td>${r.evidence}</td><td>${esc(r.description)}</td></tr>`).join('')}</tbody></table></div>`;
    if (name === 'evidence') return `<div class="proof"><div><h3>${ev.tests.pass} tests passed</h3><p>${ev.tests.fail} failed, ${ev.tests.skipped} skipped. Node ${esc(ev.runtime.node)}, ${esc(ev.runtime.platform)}.</p></div><div><h3>${(bench.precision * 100).toFixed(0)}% precision, ${(bench.recall * 100).toFixed(0)}% recall</h3><p>On ${bench.labelledIssues} human-labelled planted issues. Small corpus; regression evidence only.</p></div><div><h3>${nRules} rules, 0 dependencies</h3><p>Offline. Nothing executed. Nothing fetched.</p></div></div>`;
    if (name === 'svg') return `<figure class="dia">${DIAGRAMS[arg]?.() ?? ''}</figure>`;
    if (name === 'chart') return CHARTS[arg]?.() ?? '';
    if (name === 'cmp') return CMPS[arg] ?? '';
    if (name === 'flow') { const f = FLOWS[arg]; if (!f) return ''; return `<ol class="flow${f.row ? ' row' : ''}" style="--n:${f.steps.length}">${f.steps.map(([t, d, c]) => `<li class="${c || ''}"><b>${inline(t)}</b>${d ? `<span>${inline(d)}</span>` : ''}</li>`).join('')}</ol>`; }
    return '';
  },
};

// ---------- page shell ----------
const themeInit = `try{var t=localStorage.getItem('docsutra-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light')}catch(e){document.documentElement.setAttribute('data-theme','light')}`;
const head = ({ title, desc, base, canon }) => `<!DOCTYPE html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#4f46e5"><link rel="canonical" href="${canon}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${canon}"><meta name="twitter:card" content="summary"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%234f46e5'/%3E%3Ctext x='16' y='22' font-size='16' font-family='Arial' font-weight='700' fill='white' text-anchor='middle'%3EDS%3C/text%3E%3C/svg%3E"><script>${themeInit}</script><link rel="stylesheet" href="${base}assets/site.css"></head>`;

const topbar = (base, home, cur) => `<header class="topbar"><div class="topbar-in"><button class="icon-btn menu-btn" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="sidebar">${ic('menu')}</button><a class="brand" href="${home ? '#top' : base + 'index.html'}"><span class="logo" aria-hidden="true">DS</span><span class="brand-name">Doc<b>Sutra</b> AI</span><span class="ver">v${TOOL_VERSION}</span></a>
<nav class="topnav" aria-label="Primary"><a href="${base}html/04-user-guide.html"${cur === '04-user-guide' ? ' aria-current="page"' : ''}>Guide</a><a href="${base}html/13-real-world-scenarios.html"${cur === '13-real-world-scenarios' ? ' aria-current="page"' : ''}>Scenarios</a><a href="${base}html/05-rules-reference.html"${cur === '05-rules-reference' ? ' aria-current="page"' : ''}>Rules</a><a href="${base}html/03-technical-architecture.html"${cur === '03-technical-architecture' ? ' aria-current="page"' : ''}>Architecture</a><a href="${base}html/07-testing-and-evidence.html"${cur === '07-testing-and-evidence' ? ' aria-current="page"' : ''}>Proof</a></nav>
<div class="search" role="search">${ic('search', 18)}<label class="sr" for="q">Search the documentation</label><input id="q" type="search" placeholder="Search docs" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="results"><kbd aria-hidden="true">/</kbd><ul id="results" role="listbox" hidden></ul></div>
<a class="icon-btn gh" href="${GH}" rel="noopener" aria-label="DocSutra AI on GitHub">${ic('code')}</a>
<button class="icon-btn theme-btn" type="button" aria-pressed="false" aria-label="Switch to dark theme"><svg class="ic i-sun" width="20" height="20" aria-hidden="true"><use href="#i-sun"/></svg><svg class="ic i-moon" width="20" height="20" aria-hidden="true"><use href="#i-moon"/></svg></button></div></header>`;

const footer = base => `<footer class="site-foot"><div class="foot-in"><div class="foot-brand"><a class="brand" href="${base}index.html"><span class="logo" aria-hidden="true">DS</span><span class="brand-name">Doc<b>Sutra</b> AI</span></a><p>Offline documentation auditor for Markdown. Verifies what it can, and says what it did not.</p><p class="fine">Created by Vatsal Shah. Apache-2.0.</p></div>
<div><p class="foot-title">Start</p><ul><li><a href="${base}html/01-executive-summary.html">Overview</a></li><li><a href="${base}html/04-user-guide.html">User guide</a></li><li><a href="${base}html/13-real-world-scenarios.html">Scenarios</a></li></ul></div>
<div><p class="foot-title">Reference</p><ul><li><a href="${base}html/05-rules-reference.html">Rules</a></li><li><a href="${base}html/08-ci-and-integration.html">CI and SARIF</a></li><li><a href="${base}html/09-agent-skills-guide.html">Agent skills</a></li></ul></div>
<div><p class="foot-title">Trust</p><ul><li><a href="${base}html/06-security-and-privacy.html">Security</a></li><li><a href="${base}html/07-testing-and-evidence.html">Test evidence</a></li><li><a href="${base}html/10-legal-and-trust.html">Legal</a></li></ul></div>
<div><p class="foot-title">Project</p><ul><li><a href="${GH}" rel="noopener">GitHub</a></li><li><a href="https://www.npmjs.com/package/docsutra-ai" rel="noopener">npm</a></li><li><a href="${GH}/blob/main/CHANGELOG.md" rel="noopener">Changelog</a></li></ul></div></div>
<p class="legal">DocSutra AI ${TOOL_VERSION}, rules ${RULES_VERSION}. A passing audit means the listed static checks passed, nothing more. Product names mentioned belong to their owners; no endorsement is implied.</p></footer>`;

const tail = (base, idx) => `<script>window.__DOCS_INDEX__=${JSON.stringify(idx).replace(/</g, '\\u003c')}</script><script src="${base}assets/site.js" defer></script></body></html>`;

// ---------- build ----------
async function main() {
  const pages = [];
  for (const slug of ORDER) {
    const md = await fs.readFile(path.join(mdDir, slug + '.md'), 'utf8');
    pages.push({ slug, title: (md.match(/^#\s+(.+)$/m) || [, slug])[1], md, summary: (md.match(/^>\s+(.+)$/m) || [, ''])[1] });
  }
  const unknown = (await fs.readdir(mdDir)).filter(f => f.endsWith('.md') && !ORDER.includes(f.slice(0, -3)));
  if (unknown.length) throw new Error(`Markdown files missing from GROUPS: ${unknown.join(', ')}`);
  const plain = md => md.replace(/```[\s\S]*?```/g, ' ').replace(/\{\{[^}]*\}\}/g, ' ').replace(/[`*#>|_\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  const index = base => pages.map(p => ({ t: p.title, u: `${base}${p.slug}.html`, x: plain(p.md).slice(0, 2500) }));
  const side = cur => `<aside class="sidebar" id="sidebar" aria-label="Documentation"><a class="nav-home" href="../index.html">Home</a>${GROUPS.map(([g, slugs]) => `<div class="nav-group"><p class="nav-title">${g}</p><ol>${slugs.map(s => { const p = pages.find(x => x.slug === s); return `<li><a href="${s}.html"${s === cur ? ' aria-current="page"' : ''}>${esc(p.title)}</a></li>`; }).join('')}</ol></div>`).join('')}</aside><div class="scrim" hidden></div>`;

  await fs.rm(htmlDir, { recursive: true, force: true });
  await fs.mkdir(htmlDir, { recursive: true }); await fs.mkdir(assetDir, { recursive: true });
  await fs.writeFile(path.join(assetDir, 'site.css'), (await fs.readFile(path.join(root, 'scripts/site/site.css'), 'utf8')) + (await fs.readFile(path.join(root, 'scripts/site/extra.css'), 'utf8')) + '\n.dia-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}.dia-scroll svg.dia{min-width:600px}.table-wrap td:first-child code{white-space:nowrap;overflow-wrap:normal}\n');
  await fs.copyFile(path.join(root, 'scripts/site/site.js'), path.join(assetDir, 'site.js'));

  for (let n = 0; n < pages.length; n++) {
    const p = pages[n]; const { html, toc } = mdToHtml(p.md, ctx);
    const prev = pages[n - 1], next = pages[n + 1];
    const tocUl = toc.length ? `<ul>${toc.map(t => `<li class="l${t.level}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ul>` : '';
    const body = html.replace(/^<h1>/, `<p class="eyebrow">${esc(GROUPS.find(g => g[1].includes(p.slug))[0])}</p><h1>`);
    const page = `${head({ title: `${p.title} · DocSutra AI`, desc: p.summary, base: '../', canon: `${SITE}/html/${p.slug}.html` })}<body><a class="skip" href="#content">Skip to content</a>${sprite}${topbar('../', false, p.slug)}<div class="layout">${side(p.slug)}<main class="content" id="content" tabindex="-1"><article class="prose">${body.replace(/(<\/h1>)/, '$1')}${toc.length > 2 ? '' : ''}<details class="toc-m"><summary>On this page</summary>${tocUl}</details>${''}<p class="edit"><a href="${GH}/blob/main/documents/md/${p.slug}.md" rel="noopener">Edit this page on GitHub</a></p><nav class="pager" aria-label="Pagination">${prev ? `<a class="prev" href="${prev.slug}.html"><span>Previous</span><b>${esc(prev.title)}</b></a>` : '<span></span>'}${next ? `<a class="next" href="${next.slug}.html"><span>Next</span><b>${esc(next.title)}</b></a>` : '<span></span>'}</nav></article></main><nav class="toc" aria-label="On this page"><h2>On this page</h2>${tocUl}</nav></div>${footer('../')}${tail('../', index(''))}`;
    await fs.writeFile(path.join(htmlDir, p.slug + '.html'), page);
  }

  // ----- home -----
  const top = demo.findings.filter(f => f.severity === 'error').slice(0, 3).concat(demo.findings.filter(f => f.severity === 'warning').slice(0, 1));
  const mock = `<div class="mock" role="img" aria-label="Example audit report summary for the bundled broken demo"><div class="mock-bar"><i></i><i></i><i></i><span>.docsutra/audit.html</span></div><div class="mock-in"><div class="mock-head"><b>Documentation audit report</b><span class="pill bad">FAIL</span></div><div class="mock-cards"><div><b>${demo.summary.files}</b><span>documents</span></div><div><b>${demo.summary.errors}</b><span>errors</span></div><div><b>${demo.summary.warnings}</b><span>warning</span></div></div><ul class="mock-list">${top.map(f => `<li><span class="pill ${f.severity === 'error' ? 'bad' : 'warn'}">${f.severity}</span> <code>${esc(f.rule)}</code> ${esc(f.message)}<span class="loc">${esc(f.file)}:${f.line}</span></li>`).join('')}</ul></div></div>`;
  const feat = [['link', 'Links and anchors', 'Every relative link and every #heading anchor is resolved against the real filesystem, with GitHub slug rules and case-sensitivity checks.'], ['lock', 'Leaked credentials', 'Known token formats are detected and redacted before they reach any report, so the report is safe to share.'], ['terminal', 'Commands that still exist', 'Documented flags and subcommands are compared to a CLI contract you declare. Risky snippets like curl | sh are flagged, never run.'], ['image', 'Accessibility basics', 'Missing alt text, empty link text and skipped heading levels, with WCAG pointers.'], ['shield', 'Safe by design', 'Read-only. No network. No command execution. Symlinks skipped. Hostile documents stay inert data.'], ['file', 'Reports people read', 'Self-contained HTML, Markdown, JSON and SARIF, each with a verification ledger and a not-checked section.']];
  const scn = [['1', 'The rename that broke 14 links', 'A moved file silently breaks every page that linked to it.', 'k-bad'], ['2', 'A token pasted into the docs', 'Found, redacted, and blocked before you open-source.', 'k-warn'], ['3', 'Works on my Windows laptop, 404 on GitHub', 'Case-only path mismatches caught before Linux sees them.', 'k-info'], ['6', 'An AI assistant audits the docs', 'Skills route findings to specialists and verify before reporting.', 'k-ok']];
  const faq = [['Does it need an API key or internet?', 'No. The scan is fully offline and uses only Node.js built-ins.'], ['Will it run the commands in my README?', 'Never. Commands are classified and compared to a contract only.'], ['Does a green report mean my docs are correct?', 'No. It means the listed static checks passed. Read the ledger and the not-checked section.'], ['How accurate is it?', 'It scores 100% precision and recall on the author-built labelled corpus. That is regression evidence, not a guarantee for arbitrary repositories.'], ['Can I use it commercially?', 'Yes, under Apache-2.0.']];
  const homeIdx = index('html/');
  const home = `${head({ title: 'DocSutra AI · Docs that tell the truth', desc: 'Offline documentation auditor for Markdown: broken links, stale anchors, leaked secrets, risky snippets. HTML, Markdown, JSON and SARIF reports. No API key, nothing executed.', base: '', canon: `${SITE}/` })}<body class="home-page" id="top"><a class="skip" href="#main">Skip to content</a>${sprite}${topbar('', true, '')}
<main id="main"><section class="hero"><div class="wrap hero-grid"><div><p class="badge"><span class="dot"></span>v${TOOL_VERSION} · Apache-2.0 · zero dependencies</p><h1>Docs that <span class="grad">tell the truth</span>.</h1><p class="lead">DocSutra AI audits your Markdown for broken links, stale anchors, leaked secrets and risky commands, then writes a report people actually read. Offline. Read-only. It never runs your commands.</p>
<div class="cta"><a class="btn primary" href="html/04-user-guide.html">Get started ${ic('arrow', 18)}</a><a class="btn" href="html/13-real-world-scenarios.html">See real scenarios</a></div>
<div class="install"><span class="prompt" aria-hidden="true">$</span><code>npx docsutra-ai scan --root .</code><button class="copy-inline" type="button" aria-label="Copy install command">${ic('copy', 16)}<span>Copy</span></button></div>
<ul class="facts"><li>Node 20+</li><li>No API key</li><li>No network</li><li>HTML · MD · JSON · SARIF</li></ul></div><div class="hero-art">${mock}</div></div></section>
<section class="statband" aria-label="Key facts"><div class="wrap"><ul><li><b>${nRules}</b><span>rules</span></li><li><b>${ev.tests.pass}</b><span>tests passing</span></li><li><b>${(bench.precision * 100).toFixed(0)}%</b><span>benchmark precision</span></li><li><b>0</b><span>runtime dependencies</span></li><li><b>0</b><span>network calls</span></li></ul></div></section>
<section class="sec"><div class="wrap"><p class="kicker">What it catches</p><h2>The problems readers hit first</h2><p class="sub">Most link checkers stop at "does the URL exist". DocSutra checks what actually goes wrong in real documentation sets.</p><div class="feat-grid">${feat.map(([i, t, d]) => `<div class="feat"><div class="feat-ic">${ic(i, 22)}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
<section class="sec alt"><div class="wrap"><p class="kicker">How it works</p><h2>One command, four reports</h2><p class="sub">Files in, evidence out. Every stage is deterministic, and the report states what was never checked.</p><figure class="dia" style="margin:0">${DIAGRAMS.pipeline()}</figure>
<ol class="steps"><li><span class="n">1</span><h3>Scan</h3><p>Point it at a folder.</p><pre class="mini-code"><code>npx docsutra-ai scan --root .</code></pre></li><li><span class="n">2</span><h3>Read</h3><p>Open the HTML report. Findings show line, context and fix.</p><pre class="mini-code"><code>.docsutra/audit.html</code></pre></li><li><span class="n">3</span><h3>Gate</h3><p>Fail pull requests only on new problems.</p><pre class="mini-code"><code>docsutra scan --baseline base.json</code></pre></li></ol></div></section>
<section class="sec"><div class="wrap"><p class="kicker">Real-world scenarios</p><h2>Situations you will recognise</h2><p class="sub">Each scenario has a step-by-step flowchart showing what happens with and without a gate.</p><div class="scn-grid">${scn.map(([n, t, d, k]) => `<a class="scard ${k}" href="html/13-real-world-scenarios.html#scenario-${n}-${headingId(t).slice(0, 60)}"><span class="snum">${n}</span><h3>${t}</h3><p>${d}</p><span class="more">Read the scenario ${ic('arrow', 16)}</span></a>`).join('')}</div></div></section>
<section class="sec alt"><div class="wrap"><p class="kicker">Proof, with limits</p><h2>Measured, not promised</h2><p class="sub">Every number below is regenerated from a real run. The limits are stated next to the numbers.</p>${ctx.directive('evidence')}${CHARTS.bench()}<p class="cta" style="margin-top:1.2rem"><a class="btn" href="html/07-testing-and-evidence.html">Method and raw results ${ic('arrow', 18)}</a><a class="btn ghost" href="html/10-legal-and-trust.html">What a report does not prove</a></p></div></section>
<section class="sec"><div class="wrap"><p class="kicker">Who uses it</p><h2>Built for the people who own the docs</h2><div class="who"><div><b>Maintainers</b><span>Catch 404s before contributors do.</span></div><div><b>Technical writers</b><span>A readable report with line-level fixes.</span></div><div><b>CI and release</b><span>Exit codes, baselines and SARIF.</span></div><div><b>Security reviewers</b><span>Leaked tokens and risky install lines.</span></div></div></div></section>
<section class="sec alt"><div class="wrap"><p class="kicker">Documentation</p><h2>Everything, in order</h2><div class="dgrid">${GROUPS.map(([g, slugs]) => `<div class="dgroup"><h3>${g}</h3><p>${slugs.length} pages</p><ul>${slugs.map(s => { const p = pages.find(x => x.slug === s); return `<li><a href="html/${s}.html">${esc(p.title)}</a></li>`; }).join('')}</ul></div>`).join('')}</div></div></section>
<section class="sec"><div class="wrap narrow"><p class="kicker center">FAQ</p><h2 class="center">Quick answers</h2>${faq.map(([q, a]) => `<details class="qa"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>
<section class="cta-band"><div class="wrap"><h2>Find the broken link before your reader does</h2><p>Free, offline and open source.</p><div class="install on-dark"><span class="prompt" aria-hidden="true">$</span><code>npx docsutra-ai scan --root .</code><button class="copy-inline" type="button" aria-label="Copy install command">${ic('copy', 16)}<span>Copy</span></button></div><div class="cta center"><a class="btn light" href="${GH}" rel="noopener">View on GitHub</a><a class="btn outline" href="html/04-user-guide.html">Read the guide</a></div></div></section></main>${footer('')}${tail('', homeIdx)}`;
  await fs.writeFile(path.join(root, 'documents/index.html'), home);

  await fs.writeFile(path.join(root, 'documents/404.html'), `${head({ title: 'Page not found · DocSutra AI', desc: 'Page not found', base: '/DocSutra-AI/', canon: `${SITE}/404.html` })}<body>${sprite}<main class="wrap narrow center" style="padding:5rem 0"><h1>Page not found</h1><p class="lead" style="margin-inline:auto">This page does not exist. Ironically, that is the kind of broken link DocSutra finds.</p><p class="cta center"><a class="btn primary" href="/DocSutra-AI/">Back to the home page</a></p></main><script src="/DocSutra-AI/assets/site.js" defer></script></body></html>`);
  console.log(`Built site: ${pages.length} pages + home + 404`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
