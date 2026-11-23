const root = document.documentElement;
const KEY = 'docsutra-theme';
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
};
// Light is the default. Dark only when the visitor chose it with the toggle.
function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-btn').forEach((b) => {
    b.setAttribute('aria-pressed', String(theme === 'dark'));
    b.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  });
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0b1020' : '#4f46e5');
}
applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
document.querySelectorAll('.theme-btn').forEach((b) => b.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  store.set(KEY, next);
}));

// Mobile drawer
const menu = document.querySelector('.menu-btn');
const sidebar = document.getElementById('sidebar');
const scrim = document.querySelector('.scrim');
function setDrawer(open) {
  if (!sidebar) return;
  sidebar.classList.toggle('open', open);
  if (scrim) { scrim.hidden = !open; requestAnimationFrame(() => scrim.classList.toggle('on', open)); }
  menu?.setAttribute('aria-expanded', String(open));
  menu?.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  document.body.style.overflow = open ? 'hidden' : '';
}
menu?.addEventListener('click', () => setDrawer(!sidebar?.classList.contains('open')));
scrim?.addEventListener('click', () => setDrawer(false));
sidebar?.addEventListener('click', (e) => { if (e.target.closest('a')) setDrawer(false); });
matchMedia('(min-width: 861px)').addEventListener?.('change', (e) => { if (e.matches) setDrawer(false); });

// Copy buttons for code blocks and the install command
document.querySelectorAll('.copy').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const code = btn.parentElement?.querySelector('code')?.textContent ?? '';
    try { await navigator.clipboard.writeText(code); btn.textContent = 'Copied'; }
    catch { btn.textContent = 'Select the code'; }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
  });
});
document.querySelectorAll('.copy-inline').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const label = btn.querySelector('span');
    const code = btn.parentElement?.querySelector('code')?.textContent ?? '';
    try { await navigator.clipboard.writeText(code); if (label) label.textContent = 'Copied'; }
    catch { if (label) label.textContent = 'Select it'; }
    setTimeout(() => { if (label) label.textContent = 'Copy'; }, 1600);
  });
});

// Highlight the current section in the table of contents
const links = [...document.querySelectorAll('.toc a')];
if (links.length && 'IntersectionObserver' in window) {
  const map = new Map(links.map((a) => [a.getAttribute('href')?.slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((l) => l.classList.remove('on'));
    map.get(visible.target.id)?.classList.add('on');
  }, { rootMargin: '-80px 0px -65% 0px', threshold: [0.1, 0.5] });
  map.forEach((_a, id) => { const el = id ? document.getElementById(id) : null; if (el) io.observe(el); });
}

// Search
const index = Array.isArray(window.__DOCS_INDEX__) ? window.__DOCS_INDEX__ : [];
const q = document.getElementById('q');
const results = document.getElementById('results');
let active = -1;
function hideResults() { if (!results) return; results.hidden = true; results.replaceChildren(); active = -1; q?.setAttribute('aria-expanded', 'false'); }
function showResults(items) {
  if (!results) return;
  results.replaceChildren();
  active = -1;
  if (!items.length) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = 'No page matches that.';
    span.style.cssText = 'display:block;padding:.6rem .75rem;color:var(--muted);font-size:.92rem';
    li.append(span);
    results.append(li);
    results.hidden = false;
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.u;
    a.setAttribute('role', 'option');
    a.textContent = item.t;
    li.append(a);
    results.append(li);
  }
  results.hidden = false;
  q?.setAttribute('aria-expanded', 'true');
}
q?.addEventListener('input', () => {
  const term = q.value.trim().toLowerCase();
  if (term.length < 2) { hideResults(); return; }
  const words = term.split(/\s+/);
  const scored = index.map((item) => {
    const title = item.t.toLowerCase();
    const body = item.x.toLowerCase();
    if (!words.every((w) => title.includes(w) || body.includes(w))) return null;
    return { item, score: words.reduce((n, w) => n + (title.includes(w) ? 5 : 0) + (body.includes(w) ? 1 : 0), 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8).map((s) => s.item);
  showResults(scored);
});
q?.addEventListener('keydown', (event) => {
  const opts = [...(results?.querySelectorAll('a') ?? [])];
  if (event.key === 'Escape') { hideResults(); return; }
  if (!opts.length) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    active = event.key === 'ArrowDown' ? Math.min(active + 1, opts.length - 1) : Math.max(active - 1, 0);
    opts.forEach((a, i) => a.setAttribute('aria-selected', String(i === active)));
    opts[active]?.scrollIntoView({ block: 'nearest' });
  }
  if (event.key === 'Enter') { event.preventDefault(); (opts[active >= 0 ? active : 0]).click(); }
});
document.addEventListener('click', (event) => { if (!event.target.closest('.search')) hideResults(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setDrawer(false);
  if (event.key === '/' && document.activeElement !== q && !event.metaKey && !event.ctrlKey && !event.altKey && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) {
    event.preventDefault();
    q?.focus();
  }
});
