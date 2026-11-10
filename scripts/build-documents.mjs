#!/usr/bin/env node
// Builds documents/html/*.html and documents/index.html from documents/md/*.md (no dependencies).
// Directives inside Markdown: {{rules}} rule table, {{evidence}} live numbers, {{svg:name}} inline diagram.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, RULES_VERSION } from '../packages/core/rules.mjs';
import { TOOL_VERSION } from '../packages/core/audit.mjs';
import { headingId } from '../packages/core/markdown.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mdDir = path.join(root, 'documents/md'), htmlDir = path.join(root, 'documents/html');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SVG = {
  pipeline: `<svg viewBox="0 0 760 150" role="img" aria-labelledby="t1 d1" class="diagram"><title id="t1">Scan pipeline</title><desc id="d1">Markdown files flow through discovery, parsing, rule checks and reporting into four output formats. No network and no command execution.</desc><defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs><g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="45" width="110" height="60" rx="10"/><rect x="160" y="45" width="110" height="60" rx="10"/><rect x="312" y="45" width="110" height="60" rx="10"/><rect x="464" y="45" width="110" height="60" rx="10"/><rect x="616" y="12" width="136" height="30" rx="8"/><rect x="616" y="52" width="136" height="30" rx="8"/><rect x="616" y="92" width="136" height="30" rx="8"/><path d="M118 75h42M270 75h42M422 75h42" marker-end="url(#a)"/><path d="M574 75l42-45M574 75h42M574 75l42 32" marker-end="url(#a)"/></g><g fill="currentColor" font-size="13" text-anchor="middle" font-family="system-ui,sans-serif"><text x="63" y="70">Discover</text><text x="63" y="88" font-size="11">.md .mdx</text><text x="215" y="70">Parse</text><text x="215" y="88" font-size="11">headings, links</text><text x="367" y="70">Rules</text><text x="367" y="88" font-size="11">18 rules</text><text x="519" y="70">Ledger</text><text x="519" y="88" font-size="11">+ provenance</text><text x="684" y="32">JSON / SARIF</text><text x="684" y="72">Markdown</text><text x="684" y="112">HTML</text></g></svg>`,
  trust: `<svg viewBox="0 0 760 190" role="img" aria-labelledby="t2 d2" class="diagram"><title id="t2">Trust boundaries</title><desc id="d2">Scanned repository content is untrusted input to the DocSutra process. The only outputs are report files in a user chosen folder. Network and command execution are blocked by design.</desc><g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="20" width="200" height="150" rx="12" stroke-dasharray="6 4"/><rect x="280" y="20" width="250" height="150" rx="12"/><rect x="600" y="20" width="150" height="150" rx="12"/><path d="M208 95h72M530 95h70" /><path d="M405 175v10" stroke-dasharray="3 3"/></g><g fill="currentColor" font-family="system-ui,sans-serif" font-size="13" text-anchor="middle"><text x="108" y="50" font-weight="700">Untrusted</text><text x="108" y="75">Markdown files</text><text x="108" y="95">code fences</text><text x="108" y="115">links, front matter</text><text x="108" y="140" font-size="11">treated as data only</text><text x="405" y="50" font-weight="700">DocSutra process</text><text x="405" y="75">read-only scanner</text><text x="405" y="95">no network</text><text x="405" y="115">no command execution</text><text x="405" y="140" font-size="11">secrets redacted</text><text x="675" y="50" font-weight="700">Output</text><text x="675" y="75">audit.json</text><text x="675" y="95">audit.md / .html</text><text x="675" y="115">audit.sarif</text></g></svg>`,
};

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u.replace(/^([\w-]+)\.md(#|$)/, '$1.html$2')}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:)]|$)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
}

export function mdToHtml(md, ctx = {}) {
  const lines = md.split(/\r?\n/), out = [], toc = [];
  let i = 0;
  const para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para.length = 0; } };
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*$/.test(l)) { flush(); i++; continue; }
    const fence = l.match(/^```(\w*)/);
    if (fence) { flush(); const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(`<pre><code class="lang-${esc(fence[1])}">${esc(buf.join('\n'))}</code></pre>`); continue; }
    const dir = l.match(/^\{\{(\w+)(?::(\w+))?\}\}$/);
    if (dir) { flush(); out.push(dir[1] === 'svg' ? `<figure>${SVG[dir[2]] ?? ''}</figure>` : (ctx[dir[1]] ?? '')); i++; continue; }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flush(); const id = headingId(h[2]); if (h[1].length <= 3) toc.push({ level: h[1].length, text: h[2].replace(/`/g, ''), id }); out.push(`<h${h[1].length} id="${id}">${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^---+\s*$/.test(l)) { flush(); out.push('<hr>'); i++; continue; }
    if (/^>\s?/.test(l)) { flush(); const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, '')); out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`); continue; }
    if (/^\|.*\|\s*$/.test(l) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      flush(); const cells = r => r.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
      const head = cells(l), align = cells(lines[i + 1]).map(c => /^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : 'left'); i += 2; const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<div class="tw"><table><thead><tr>${head.map((c, k) => `<th style="text-align:${align[k]}">${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, k) => `<td style="text-align:${align[k]}">${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    const li = l.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      flush(); const ordered = /\d/.test(li[2]); const items = [];
      while (i < lines.length) { const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/); if (m) { items.push({ depth: Math.floor(m[1].length / 2), text: m[3] }); i++; } else if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; } else break; }
      let html = '', depth = -1; const tag = ordered ? 'ol' : 'ul';
      for (const it of items) { while (depth < it.depth) { html += `<${tag}>`; depth++; } while (depth > it.depth) { html += `</li></${tag}>`; depth--; } html += `<li>${inline(it.text)}`; }
      while (depth >= 0) { html += `</li></${tag}>`; depth--; }
      out.push(html.replace(/<li>([^<]*(?:<(?!\/?li>)[^>]*>[^<]*)*)<(ul|ol)>/g, '<li>$1<$2>')); continue;
    }
    para.push(l.trim()); i++;
  }
  flush();
  return { html: out.join('\n'), toc };
}

const CSS = `:root{color-scheme:light dark;--bg:#f7f8fc;--card:#fff;--ink:#14213d;--mute:#5b6b85;--line:#e1e6ef;--brand:#4f46e5;--code:#eef1f8}
@media(prefers-color-scheme:dark){:root{--bg:#0b1020;--card:#131a2e;--ink:#e8edf8;--mute:#9aa8c4;--line:#243049;--brand:#9aa2ff;--code:#1a2340}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--brand)}a:focus-visible,summary:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.skip{position:absolute;left:-999px}.skip:focus{left:8px;top:8px;background:var(--card);padding:8px;z-index:9}
.top{background:linear-gradient(135deg,#312e81,#4f46e5 55%,#0ea5e9);color:#fff;padding:1rem 1.2rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap}.top a{color:#fff;text-decoration:none;font-weight:700}.top span{opacity:.85;font-size:.9rem}
.layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:2rem;max-width:1240px;margin:0 auto;padding:1.5rem 1rem}
nav.side{position:sticky;top:1rem;align-self:start;max-height:calc(100vh - 2rem);overflow:auto;font-size:.92rem}nav.side h2{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin:1rem 0 .3rem}nav.side ul{list-style:none;margin:0;padding:0}nav.side li a{display:block;padding:.28rem .6rem;border-radius:8px;text-decoration:none;color:var(--ink)}nav.side li a:hover{background:var(--code)}nav.side li a[aria-current=page]{background:var(--brand);color:#fff}
main{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.5rem clamp(1rem,3vw,2.5rem);min-width:0}
h1{font-size:clamp(1.7rem,4vw,2.3rem);line-height:1.2;margin-top:0}h2{margin-top:2.2rem;padding-bottom:.3rem;border-bottom:1px solid var(--line)}h3{margin-top:1.6rem}
code{background:var(--code);padding:.1em .35em;border-radius:5px;font:.88em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}pre{background:var(--code);padding:1rem;border-radius:10px;overflow:auto;border:1px solid var(--line)}pre code{background:none;padding:0}
.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.93rem}th,td{padding:.55rem .7rem;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--code);font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
blockquote{margin:1rem 0;padding:.7rem 1rem;border-left:4px solid var(--brand);background:var(--code);border-radius:0 10px 10px 0}
figure{margin:1.2rem 0}.diagram{width:100%;height:auto;color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem}.card{border:1px solid var(--line);border-radius:14px;padding:1rem 1.2rem;background:var(--card)}.card h3{margin:.1rem 0}.card a{text-decoration:none}.card p{color:var(--mute);margin:.3rem 0}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.8rem;margin:1rem 0}.stat{border:1px solid var(--line);border-radius:12px;padding:.8rem}.stat b{display:block;font-size:1.7rem}.stat span{color:var(--mute);font-size:.85rem}
footer{max-width:1240px;margin:0 auto;padding:1rem 1rem 3rem;color:var(--mute);font-size:.85rem}
@media(max-width:860px){.layout{grid-template-columns:1fr}nav.side{position:static;max-height:none}}
@media print{.top,nav.side,.skip{display:none}.layout{display:block}main{border:0}body{background:#fff}}`;

const shell = ({ title, body, nav, depth, tocHtml }) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} - DocSutra AI Docs</title><meta name="description" content="DocSutra AI documentation: ${esc(title)}"><style>${CSS}</style></head><body><a class="skip" href="#main">Skip to content</a><header class="top"><a href="${depth}index.html">DocSutra AI</a><span>Documentation Truth Audit - v${TOOL_VERSION} - by Vatsal Shah</span></header><div class="layout"><nav class="side" aria-label="Documentation">${nav}${tocHtml}</nav><main id="main">${body}</main></div><footer>DocSutra AI ${TOOL_VERSION}, rules ${RULES_VERSION}. Apache-2.0. A passing audit proves only the checks it lists. <a href="https://github.com/shahvatsalofficial/DocSutra-AI">Source on GitHub</a></footer></body></html>`;

async function main() {
  const files = (await fs.readdir(mdDir)).filter(f => f.endsWith('.md')).sort();
  const ev = JSON.parse(await fs.readFile(path.join(root, 'evidence/summary.json'), 'utf8'));
  const stat = (b, s) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`;
  const ctx = {
    rules: `<div class="tw"><table><thead><tr><th>Rule</th><th>Severity</th><th>Category</th><th>Evidence</th><th>What it means</th></tr></thead><tbody>${Object.entries(RULES).map(([id, r]) => `<tr><td><code>${id}</code></td><td>${r.severity}</td><td>${r.category}</td><td>${r.evidence}</td><td>${esc(r.description)}</td></tr>`).join('')}</tbody></table></div>`,
    evidence: `<div class="stats">${stat(ev.tests.pass, 'tests passed')}${stat(ev.tests.fail, 'tests failed')}${stat(ev.tests.skipped, 'skipped (OS privilege)')}${stat((ev.benchmark.precision * 100).toFixed(0) + '%', 'benchmark precision')}${stat((ev.benchmark.recall * 100).toFixed(0) + '%', 'benchmark recall')}${stat(Object.keys(RULES).length, 'rules')}</div><p><em>Generated ${esc(ev.generatedAt)} on Node ${esc(ev.runtime.node)}, ${esc(ev.runtime.platform)}/${esc(ev.runtime.arch)}.</em></p>`,
  };
  const pages = [];
  for (const f of files) {
    const md = await fs.readFile(path.join(mdDir, f), 'utf8');
    const title = (md.match(/^#\s+(.+)$/m) || [, f])[1];
    pages.push({ f, title, summary: (md.match(/^>\s+(.+)$/m) || [, ''])[1], md });
  }
  const nav = cur => `<h2>Documents</h2><ul><li><a href="../index.html">Overview</a></li>${pages.map(p => `<li><a href="${p.f.replace('.md', '.html')}"${p.f === cur ? ' aria-current="page"' : ''}>${esc(p.title.replace(/^\d+\s*[-.]?\s*/, ''))}</a></li>`).join('')}</ul>`;
  for (const p of pages) {
    const { html, toc } = mdToHtml(p.md, ctx);
    const tocHtml = toc.length > 2 ? `<h2>On this page</h2><ul>${toc.filter(t => t.level === 2).map(t => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ul>` : '';
    await fs.writeFile(path.join(htmlDir, p.f.replace('.md', '.html')), shell({ title: p.title, body: html, nav: nav(p.f), depth: '../', tocHtml }));
  }
  const idx = `<h1>DocSutra AI documentation</h1><blockquote>Complete technical, functional, architectural, executive and operational documentation. Every document exists as Markdown (<code>documents/md</code>) and HTML (<code>documents/html</code>).</blockquote>${ctx.evidence}<div class="grid">${pages.map(p => `<div class="card"><h3><a href="html/${p.f.replace('.md', '.html')}">${esc(p.title)}</a></h3><p>${inline(p.summary)}</p></div>`).join('')}</div>`;
  await fs.writeFile(path.join(root, 'documents/index.html'), shell({ title: 'Overview', body: idx, nav: nav(''), depth: '', tocHtml: '' }).replace(/href="(?!index\.html)(\w[\w-]*\.html)"/g, 'href="html/$1"').replace('href="../index.html"', 'href="index.html"'));
  console.log(`Built ${pages.length} documents + index`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
