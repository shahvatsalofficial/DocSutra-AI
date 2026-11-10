import fs from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';

// Native realpath returns the true on-disk letter case on Windows/macOS, which the case-mismatch rule needs.
const realpath = async p => { await fs.access(p); return realpathSync.native(p); };
const DEFAULT_IGNORES = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage', '.docsutra', '.venv', 'venv', '.cache']);
export function within(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
}
export async function discoverDocs(root, { maxFiles = 3000, ignore = [], maxBytes = 1_500_000 } = {}) {
  root = await realpath(root);
  const skip = new Set([...DEFAULT_IGNORES, ...ignore]);
  const output = [];
  async function walk(dir) {
    const ents = (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of ents) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!entry.isFile() || !/\.(md|mdx|markdown)$/i.test(entry.name)) continue;
      const stat = await fs.stat(full);
      if (stat.size > maxBytes) continue;
      if (output.length >= maxFiles) throw new Error(`Document limit exceeded (${maxFiles}). Narrow --root or update config.`);
      output.push(full);
    }
  }
  await walk(root);
  return { root, files: output };
}
export async function inspectTarget(root, docFile, raw) {
  const decoded = decodeHref(raw);
  if (decoded.kind !== 'local') return decoded;
  const rootAbs = decoded.file.startsWith('/'); // GitHub-style repository-root-relative link
  const target = decoded.file ? (rootAbs ? path.join(root, decoded.file) : path.resolve(path.dirname(docFile), decoded.file)) : docFile;
  const base = { target: decoded.file, anchor: decoded.anchor };
  if (!within(root, target)) return { kind: 'outside', ...base };
  try {
    const real = await realpath(target);
    if (!within(root, real)) return { kind: 'outside', ...base };
    const stat = await fs.stat(real);
    // Case-only mismatch works on Windows/macOS but 404s on Linux and GitHub.
    const caseMismatch = path.relative(root, real) !== path.relative(root, target) && path.relative(root, real).toLowerCase() === path.relative(root, target).toLowerCase();
    if (stat.isDirectory()) return { kind: 'found', absolute: real, anchor: decoded.anchor, directory: true, caseMismatch };
    if (!stat.isFile()) return { kind: 'missing', ...base };
    return { kind: 'found', absolute: real, anchor: decoded.anchor, caseMismatch };
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR' || e.code === 'ELOOP') return { kind: 'missing', ...base };
    throw e;
  }
}
export function decodeHref(url) {
  const s = String(url || '').trim().replace(/^<|>$/g, '');
  if (/^(https?:)?\/\//i.test(s)) return { kind: 'external' };
  if (/^(mailto|tel|data|sms):/i.test(s)) return { kind: 'special' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return { kind: 'unsafe', target: s.split(':')[0] };
  const [filePart, ...frag] = s.split('#');
  let file, anchor;
  try { file = decodeURIComponent(filePart.split('?')[0]); anchor = decodeURIComponent(frag.join('#')); }
  catch { return { kind: 'invalid', target: s }; }
  if (file.includes('\0')) return { kind: 'invalid', target: s };
  return { kind: 'local', file, anchor };
}
