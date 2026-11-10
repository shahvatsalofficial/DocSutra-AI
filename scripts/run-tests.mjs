#!/usr/bin/env node
// Cross-platform test entry: Node 20 and cmd.exe do not expand globs, so list files explicitly.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = (await fs.readdir(path.join(root, 'tests'))).filter(f => f.endsWith('.test.mjs')).sort().map(f => path.join('tests', f));
const r = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files], { cwd: root, stdio: 'inherit' });
process.exitCode = r.status ?? 1;
