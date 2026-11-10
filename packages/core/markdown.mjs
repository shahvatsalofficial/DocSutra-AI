import path from 'node:path';

// Bounded, dependency-free Markdown scanner. It is NOT a full CommonMark parser; see docs/COVERAGE in the
// documents folder for the explicit support matrix. It handles the constructs that cause the most documentation
// drift: ATX/setext headings, fenced + indented code, code spans, HTML comments, inline/reference/shortcut links,
// images, autolinks, HTML href/src/id/name attributes and front matter.

export function headingId(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}_\-\s]/gu, '')
    .replace(/\s/g, '-');
}

export const normLabel = s => String(s).trim().replace(/\s+/g, ' ').toLowerCase();

const LIST_MARKER = /^ {0,3}(?:[-*+]|\d{1,9}[.)])(?:\s|$)/;

/** Replace code spans with spaces so their contents are never read as links. */
function maskCodeSpans(line) {
  let out = '';
  for (let i = 0; i < line.length;) {
    if (line[i] === '\\') { out += line.slice(i, i + 2); i += 2; continue; }
    if (line[i] !== '`') { out += line[i++]; continue; }
    let n = 0; while (line[i + n] === '`') n++;
    const fence = '`'.repeat(n);
    const end = line.indexOf(fence, i + n);
    // An unmatched backtick run is literal text (CommonMark), so keep it as-is.
    if (end === -1 || line[end + n] === '`') { out += line.slice(i, i + n); i += n; continue; }
    out += ' '.repeat(end + n - i); i = end + n;
  }
  return out;
}

/** Index of the bracket matching `open` at line[start], honouring nesting and backslash escapes; -1 if none. */
function matchBracket(s, start, open, close) {
  let depth = 0;
  // Window cap keeps pathological input (thousands of unmatched '[') linear instead of quadratic.
  for (let i = start, end = Math.min(s.length, start + 2000); i < end; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === open) depth++;
    else if (s[i] === close && --depth === 0) return i;
  }
  return -1;
}

/** Parse "(dest "title")" starting at s[start]==='('. Returns {url, end} or null. */
function parseDestination(s, start) {
  let i = start + 1;
  while (s[i] === ' ' || s[i] === '\t') i++;
  let url;
  if (s[i] === '<') {
    const e = s.indexOf('>', i);
    if (e === -1) return null;
    url = s.slice(i + 1, e); i = e + 1;
  } else {
    let depth = 0; const b = i;
    while (i < s.length) {
      const c = s[i];
      if (c === '\\') { i += 2; continue; }
      if (c === ' ' || c === '\t') break;
      if (c === '(') depth++;
      else if (c === ')') { if (depth === 0) break; depth--; }
      i++;
    }
    url = s.slice(b, i);
  }
  while (s[i] === ' ' || s[i] === '\t') i++;
  if (s[i] === '"' || s[i] === "'" || s[i] === '(') {
    const q = s[i] === '(' ? ')' : s[i];
    const e = s.indexOf(q, i + 1);
    if (e === -1) return null;
    i = e + 1;
    while (s[i] === ' ' || s[i] === '\t') i++;
  }
  return s[i] === ')' ? { url, end: i } : null;
}

function extractLinks(masked, lineNo, out, depthGuard = 0) {
  if (depthGuard > 3) return;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === '\\') { i++; continue; }
    if (c === '<') {
      const m = masked.slice(i).match(/^<([a-z][a-z0-9+.-]*:[^\s<>]*)>/i);
      if (m) { out.push({ url: m[1], label: m[1], image: false, line: lineNo, reference: false, kind: 'autolink' }); i += m[0].length - 1; continue; }
      const tag = masked.slice(i).match(/^<(a|img|source|link|script|iframe|video|audio)\b([^>]*)>/i);
      if (tag) {
        const attrs = tag[2];
        const isImg = tag[1].toLowerCase() === 'img';
        const attr = name => attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'));
        const u = attr(tag[1].toLowerCase() === 'a' || tag[1].toLowerCase() === 'link' ? 'href' : 'src');
        const url = u && (u[1] ?? u[2] ?? u[3]);
        if (url) {
          const alt = attr('alt');
          out.push({ url, label: alt ? (alt[1] ?? alt[2] ?? alt[3] ?? '') : '', image: isImg, line: lineNo, reference: false, kind: 'html', altMissing: isImg && !alt });
        }
        i += tag[0].length - 1;
      }
      continue;
    }
    if (c !== '[') continue;
    const image = masked[i - 1] === '!' && masked[i - 2] !== '\\';
    const close = matchBracket(masked, i, '[', ']');
    if (close === -1) continue;
    const label = masked.slice(i + 1, close);
    const next = masked[close + 1];
    if (next === '(') {
      const dest = parseDestination(masked, close + 1);
      if (dest) {
        out.push({ url: dest.url, label, image, line: lineNo, reference: false, kind: 'inline' });
        extractLinks(label, lineNo, out, depthGuard + 1); // image nested in a link, e.g. [![a](i.png)](x.md)
        i = dest.end; continue;
      }
    } else if (next === '[') {
      const c2 = matchBracket(masked, close + 1, '[', ']');
      if (c2 !== -1) {
        const key = normLabel(masked.slice(close + 2, c2) || label);
        out.push({ url: `ref:${key}`, label, image, line: lineNo, reference: true, kind: 'reference' });
        extractLinks(label, lineNo, out, depthGuard + 1);
        i = c2; continue;
      }
    }
    // Possible shortcut reference [label]; resolved later only if a definition exists.
    if (label && !/^\s*[x ]\s*$/i.test(label) && !label.startsWith('^')) out.push({ url: `ref:${normLabel(label)}`, label, image, line: lineNo, reference: true, kind: 'shortcut' });
  }
}

export function parseMarkdown(content) {
  const lines = content.split(/\r?\n/);
  const headings = new Set();
  const counts = new Map();
  const links = [];
  const snippets = [];
  const references = new Map();
  const headingList = [];
  let fence = null, inComment = false, prevBlank = true, inList = false, prevText = null;
  let i = 0;

  // YAML front matter: skip, but keep line numbers accurate.
  if (lines[0]?.trim() === '---') {
    const end = lines.slice(1).findIndex(l => l.trim() === '---' || l.trim() === '...');
    if (end !== -1) i = end + 2;
  }

  const addHeading = (text, line, level) => {
    const slug = headingId(text);
    const num = counts.get(slug) || 0;
    counts.set(slug, num + 1);
    headings.add(num ? `${slug}-${num}` : slug);
    headingList.push({ text, line, level, slug: num ? `${slug}-${num}` : slug });
  };

  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (fence) {
      const close = raw.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.marker && close[1].length >= fence.width) { snippets.push({ ...fence, content: fence.lines.join('\n') }); fence = null; }
      else fence.lines.push(raw);
      prevBlank = false; continue;
    }
    const open = raw.match(/^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)([^`]*)$/);
    if (open && !(open[1][0] === '`' && /`/.test(raw.slice(raw.indexOf(open[1]) + open[1].length)))) {
      fence = { marker: open[1][0], width: open[1].length, language: open[2].toLowerCase(), start: i + 1, lines: [] };
      prevBlank = false; continue;
    }
    let line = raw;
    // HTML comments (single- and multi-line) are not rendered, so links inside are not live.
    if (inComment) { const e = line.indexOf('-->'); if (e === -1) continue; line = ' '.repeat(e + 3) + line.slice(e + 3); inComment = false; }
    for (;;) {
      const s = line.indexOf('<!--'); if (s === -1) break;
      const e = line.indexOf('-->', s + 4);
      if (e === -1) { line = line.slice(0, s); inComment = true; break; }
      line = line.slice(0, s) + ' '.repeat(e + 3 - s) + line.slice(e + 3);
    }
    const blank = line.trim() === '';
    if (blank) { prevBlank = true; prevText = null; continue; }
    const indented = /^( {4}|\t)/.test(line);
    if (!indented) inList = LIST_MARKER.test(line) ? true : (prevBlank ? false : inList);
    if (indented && prevBlank && !inList) { prevBlank = false; continue; } // indented code block

    // Reference definition
    const def = line.match(/^ {0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*$/);
    if (def && !def[1].startsWith('^')) { references.set(normLabel(def[1]), { raw: def[2], line: i + 1 }); prevBlank = false; prevText = null; continue; }

    // Setext underline
    const setext = line.match(/^ {0,3}(=+|-+)\s*$/);
    if (setext && prevText && !indented) {
      addHeading(prevText.text, prevText.line, setext[1][0] === '=' ? 1 : 2);
      prevText = null; prevBlank = false; continue;
    }
    // ATX heading
    const h = line.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/);
    if (h) { addHeading(h[2] ?? '', i + 1, h[1].length); prevBlank = false; prevText = null; extractAnchors(line, headings); continue; }

    extractAnchors(line, headings);
    extractLinks(maskCodeSpans(line), i + 1, links);
    prevText = LIST_MARKER.test(line) || /^ {0,3}>/.test(line) || /^ {0,3}(?:[-*_]\s*){3,}$/.test(line) ? null : { text: line.trim(), line: i + 1 };
    prevBlank = false;
  }
  // Keep only shortcut-style references that actually have a definition (e.g. "[x]" with no def is plain text).
  const kept = links.filter(l => l.kind !== 'shortcut' || references.has(l.url.slice(4)));
  return { links: kept, snippets, headings, headingList, references, unclosedFence: fence?.start ?? null };
}

function extractAnchors(line, headings) {
  for (const m of line.matchAll(/<(?:a|h[1-6]|div|span|section|p)\b[^>]*?\b(?:id|name)\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) headings.add(m[1] ?? m[2]);
}

export function isDocumentationFile(file) { return /\.(md|mdx|markdown)$/i.test(path.extname(file)); }
