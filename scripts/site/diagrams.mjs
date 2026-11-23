// Theme-aware inline SVG diagrams. Colours come from CSS variables in site.css, so one SVG serves light and dark.
let uid = 0;
const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = (w, h, label, body) => {
  const id = `ah${++uid}`;
  return `<div class="dia-scroll"><svg class="dia" viewBox="0 0 ${w} ${h}" role="img" aria-label="${e(label)}"><defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path class="ah" d="M0,0 L9,4.5 L0,9 z"/></marker></defs>${body.replaceAll('#AH', `url(#${id})`)}</svg></div>`;
};
const box = (x, y, w, h, t1, t2 = '', cls = '') => `<rect class="bx ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/><text class="t1" x="${x + w / 2}" y="${y + (t2 ? h / 2 - 3 : h / 2 + 5)}" text-anchor="middle">${e(t1)}</text>${t2 ? `<text class="t2" x="${x + w / 2}" y="${y + h / 2 + 15}" text-anchor="middle">${e(t2)}</text>` : ''}`;
const arrow = (d, dash = false) => `<path class="ln${dash ? ' dash' : ''}" d="${d}" marker-end="#AH"/>`;
const txt = (x, y, s, cls = 't2', anchor = 'middle') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${e(s)}</text>`;
const diamond = (cx, cy, w, h, t, cls = '') => `<polygon class="bx ${cls}" points="${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}"/>${txt(cx, cy + 4, t, 't1')}`;

export const DIAGRAMS = {
  pipeline: () => svg(780, 190, 'Scan pipeline: Markdown files are discovered, parsed, checked by rules, summarised in a ledger and written as four report formats. No network and no command execution.',
    box(10, 55, 120, 70, 'Discover', '.md .mdx .markdown') + box(170, 55, 120, 70, 'Parse', 'headings, links, code') + box(330, 55, 120, 70, 'Check', '18 rules', 'br') + box(490, 55, 120, 70, 'Ledger', 'checked / passed / failed') +
    box(650, 8, 120, 40, 'JSON', '', 'ok') + box(650, 58, 120, 40, 'Markdown', '', 'ok') + box(650, 108, 120, 40, 'HTML', '', 'ok') + box(650, 158, 120, 28, 'SARIF', '', 'ok') +
    arrow('M130 90 H170') + arrow('M290 90 H330') + arrow('M450 90 H490') + arrow('M610 90 C630 90 630 28 650 28') + arrow('M610 90 H650') + arrow('M610 90 C630 90 630 128 650 128') + arrow('M610 90 C625 90 625 172 650 172') +
    txt(390, 28, 'read-only, offline, nothing executed', 't2') + txt(390, 175, 'every report lists what was NOT checked', 't2')),

  trust: () => svg(780, 230, 'Trust boundaries: untrusted repository files go into the DocSutra process, which has no network and no command execution, and writes only report files to a folder you choose.',
    `<rect class="bx zone" x="8" y="20" width="220" height="190" rx="16"/>${txt(118, 44, 'UNTRUSTED INPUT', 't1')}${txt(118, 80, 'Markdown files')}${txt(118, 104, 'code fences and snippets')}${txt(118, 128, 'links, front matter, HTML')}${txt(118, 152, 'hostile README? still just data', 't2')}` +
    `<rect class="bx br" x="280" y="20" width="240" height="190" rx="16"/>${txt(400, 44, 'DOCSUTRA PROCESS', 'tb')}${txt(400, 80, 'read-only scanner')}${txt(400, 104, 'no network calls')}${txt(400, 128, 'no command execution')}${txt(400, 152, 'secrets redacted before storage', 't2')}${txt(400, 184, 'symlinks skipped, paths bounded', 't2')}` +
    `<rect class="bx ok" x="572" y="20" width="200" height="190" rx="16"/>${txt(672, 44, 'OUTPUT (YOU CHOOSE)', 'tg')}${txt(672, 80, 'audit.html')}${txt(672, 104, 'audit.md')}${txt(672, 128, 'audit.json')}${txt(672, 152, 'audit.sarif')}` +
    arrow('M228 115 H280') + arrow('M520 115 H572') + txt(400, 228, 'Blocked by design: network, shell, file edits, AI providers', 't2')),

  ci: () => svg(780, 250, 'Pull request gate: a PR triggers the scan with a baseline. Exit code 0 lets the merge proceed; exit code 1 blocks it and uploads the report for the author to fix.',
    box(10, 95, 120, 60, 'Pull request', 'opened or updated') + box(170, 95, 140, 60, 'CI job', 'docsutra scan --baseline', 'br') + diamond(400, 125, 130, 90, 'New errors?') +
    box(540, 20, 130, 56, 'Exit 0', 'merge allowed', 'ok') + box(540, 172, 130, 56, 'Exit 1', 'merge blocked', 'bad') + box(690, 172, 84, 56, 'Fix docs', 'push again') + box(690, 20, 84, 56, 'Merge', '', 'ok') +
    arrow('M130 125 H170') + arrow('M310 125 H335') + arrow('M400 80 V48 H540') + arrow('M400 170 V200 H540') + arrow('M670 48 H690') + arrow('M670 200 H690') + arrow('M732 172 C732 130 250 130 240 155', true) +
    txt(430, 62, 'no', 't2', 'start') + txt(430, 192, 'yes', 't2', 'start') + txt(400, 246, 'report.html + report.md attached as a CI artifact', 't2')),

  anatomy: () => svg(780, 330, 'Anatomy of an audit report: verdict banner, summary cards, findings grouped by file, verification ledger, not-checked section, rules triggered and provenance.',
    `<rect class="bx" x="170" y="10" width="440" height="310" rx="16"/>` +
    box(190, 24, 400, 40, '1  Verdict banner', 'PASS  /  PASS WITH WARNINGS  /  FAIL', 'br') + box(190, 72, 400, 40, '2  Summary cards', 'documents, errors, warnings, links verified') + box(190, 120, 400, 50, '3  Findings by file', 'rule, line, excerpt, fix, evidence method, ID', 'bad') +
    box(190, 178, 400, 40, '4  Verification ledger', 'what was checked: performed / passed / failed', 'ok') + box(190, 226, 400, 40, '5  Not checked', 'external URLs, unexecuted shell lines, suppressions', 'warn') + box(190, 274, 400, 38, '6  Provenance', 'versions, git revision, SHA-256 fingerprint') +
    txt(150, 148, 'start here', 't2', 'end') + txt(150, 204, 'trust here', 't2', 'end') + txt(150, 252, 'read the limits', 't2', 'end') + txt(630, 298, 'reproducible', 't2', 'start')),

  exitcodes: () => svg(780, 250, 'Exit code decision flow: invalid config or usage gives 2; findings at or above the fail-on level give 1; otherwise 0.',
    box(10, 95, 110, 56, 'docsutra scan') + diamond(210, 123, 130, 90, 'Config valid?') + diamond(400, 123, 140, 90, 'Findings ≥ fail-on?') +
    box(570, 20, 190, 56, 'Exit 2', 'usage / config / runtime error', 'warn') + box(570, 96, 190, 56, 'Exit 1', 'findings at or above level', 'bad') + box(570, 172, 190, 56, 'Exit 0', 'clean for this level', 'ok') +
    arrow('M120 123 H145') + arrow('M275 123 H330') + arrow('M210 78 V48 H570') + arrow('M470 123 H570') + arrow('M400 168 V200 H570') +
    txt(238, 114, 'yes', 't2') + txt(222, 64, 'no', 't2', 'start') + txt(500, 114, 'yes', 't2') + txt(412, 190, 'no', 't2', 'start') + txt(390, 246, 'default --fail-on is error; none disables gating', 't2')),

  arch: () => svg(780, 330, 'Architecture: the CLI calls the audit orchestrator, which uses core modules for files, markdown, commands, security, rules and config; the reporter renders four formats. Adapters install skills and the server serves reports.',
    box(280, 10, 220, 50, 'CLI', 'packages/cli', 'br') +
    box(280, 90, 220, 56, 'audit()', 'orchestrates a scan, builds the ledger', 'br') +
    box(10, 190, 130, 56, 'files', 'discovery, link targets') + box(155, 190, 130, 56, 'markdown', 'headings, links, code') + box(300, 190, 130, 56, 'commands', 'snippet risk, CLI contract') + box(445, 190, 130, 56, 'security', 'secrets, redaction') + box(590, 190, 90, 56, 'rules') + box(690, 190, 80, 56, 'config') +
    box(180, 275, 180, 48, 'reporter', 'JSON · MD · HTML · SARIF', 'ok') + box(400, 275, 180, 48, 'adapters / server', 'skills install · loopback API', 'ok') +
    arrow('M390 60 V90') + arrow('M390 146 V168 H75 V190') + arrow('M390 146 V190') + arrow('M390 146 V168 H510 V190') + arrow('M390 146 V168 H635 V190') + arrow('M390 146 V168 H730 V190') + arrow('M215 246 V275', true) + arrow('M640 246 V262 H490 V275', true) +
    txt(10, 160, 'pure functions below, I/O at the edges', 't2', 'start')),

  skills: () => svg(780, 300, 'Skill routing: docsutra-prime runs the scan, routes findings to link-guardian, cli-contract, privacy-guard, accessible-docs, drift-radar and snippet-lab, then evidence-verifier re-checks before anything is reported.',
    box(300, 10, 180, 56, 'docsutra-prime', 'runs the scan, routes', 'br') +
    box(10, 120, 140, 52, 'link-guardian', 'links · anchors') + box(165, 120, 140, 52, 'cli-contract', 'flags · subcommands') + box(320, 120, 140, 52, 'privacy-guard', 'secrets · risky cmds') + box(475, 120, 140, 52, 'accessible-docs', 'alt · headings') + box(630, 120, 140, 52, 'drift-radar', 'new vs resolved') +
    box(300, 232, 180, 56, 'evidence-verifier', 're-checks before reporting', 'ok') +
    arrow('M390 66 V92 H80 V120') + arrow('M390 66 V92 H235 V120') + arrow('M390 66 V120') + arrow('M390 66 V92 H545 V120') + arrow('M390 66 V92 H700 V120') +
    arrow('M80 172 V202 H390 V232') + arrow('M235 172 V202') + arrow('M390 172 V232') + arrow('M545 172 V202') + arrow('M700 172 V202 H390') +
    txt(20, 270, '8 more skills are instructions-only (see Skills guide)', 't2', 'start')),
};

/** Vertical/row flowchart as semantic HTML: reads well on phones, no horizontal scroll. */
export const FLOWS = {
  rename: { row: false, steps: [
    ['A maintainer renames `docs/install.md` to `docs/setup.md`', 'The PR looks clean: one file moved, tests pass.'],
    ['CI runs `docsutra scan --baseline main/audit.json`', 'Reads every Markdown file, resolves every relative link and anchor against the real filesystem.', ''],
    ['14 links now point at a file that no longer exists', 'Each is reported with file, line, an excerpt and the fix. Rule: `BROKEN_LOCAL_LINK`.', 'bad'],
    ['The job exits 1 and attaches `audit.html`', 'The reviewer sees exactly which lines to fix. Nobody has to click through the site.', 'warn'],
    ['Author fixes the links, pushes, CI exits 0', 'The merge goes through. Readers never see a 404.', 'ok']] },
  secret: { row: false, steps: [
    ['A contributor pastes a working token into `docs/deploy.md`', 'Copy-paste from a terminal, easy to miss in review.'],
    ['`docsutra scan` matches a known credential format', 'Rule `SECRET_IN_DOCS`. The value is replaced with `[REDACTED:github-token]` before it is stored in any report.', 'bad'],
    ['The PR is blocked and the report is safe to share', 'The report itself never contains the secret, so attaching it as a CI artifact does not leak it.', 'warn'],
    ['The team revokes the token first, then removes it from git history', 'Removing the line alone is not enough: the token is already in history.', 'ok']] },
  caseMismatch: { row: false, steps: [
    ['A writer on Windows links `[guide](Docs/Setup.md)`', 'The real folder is `docs/setup.md`. Windows and macOS ignore letter case, so it works locally.'],
    ['Docs go live on Linux and GitHub, and the link returns 404', 'Case-sensitive servers treat `Docs/Setup.md` and `docs/setup.md` as different files.', 'bad'],
    ['`docsutra scan` on the writer\'s machine reports `PATH_CASE_MISMATCH`', 'It compares the requested path with the true on-disk case, so the bug is caught before Linux ever sees it.', ''],
    ['Fix the case, push, ship', 'Same link works everywhere.', 'ok']] },
  pipeshell: { row: false, steps: [
    ['The install guide says `curl -fsSL https://example.com/install.sh | sh`', 'Fast to write. Dangerous: it runs unreviewed remote code with your privileges.'],
    ['`docsutra scan` flags `PIPE_TO_SHELL` and classifies the snippet', 'It never runs the command. It only reads the text.', 'warn'],
    ['Maintainer replaces it with a checksum-verified download or `npm install`', 'Readers get a safer path, and the docs show the checksum step.', 'ok']] },
  cli: { row: false, steps: [
    ['v2 of a tool removes `--legacy` and renames `deploy` to `release`', 'The code changed. The README still shows the old commands.'],
    ['The team lists the real subcommands and flags in `cliContracts`', 'Copied from real `--help` output that a human ran.'],
    ['`docsutra scan` finds `CLI_UNKNOWN_FLAG` and `CLI_UNKNOWN_SUBCOMMAND`', 'Every documented command that no longer exists is listed with its line.', 'bad'],
    ['Docs are updated in the same PR as the code', 'New contributors copy a command that works.', 'ok']] },
  assistant: { row: false, steps: [
    ['Developer asks Claude Code: "audit our docs"', 'The `docsutra-prime` skill was installed with `docsutra install-skills --host claude`.'],
    ['The assistant runs the real scanner, not a guess', 'Deterministic findings with line numbers. The assistant adds judgement, never invents evidence.'],
    ['`docsutra-evidence-verifier` re-checks each finding in the source', 'A finding it cannot reproduce is dropped and said so.', 'warn'],
    ['The assistant proposes minimal fix diffs and waits for approval', 'It never edits files or runs documented commands on its own.', 'ok']] },
  quickstart: { row: true, steps: [
    ['Run', '`npx docsutra-ai scan --root .`'], ['Open', '`.docsutra/audit.html`'], ['Fix', 'Follow each finding\'s suggested fix'], ['Gate', 'Add `--baseline` in CI']] },
};
