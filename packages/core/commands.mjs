// Static contract validation + risk classification ONLY. Snippets from Markdown are never executed.
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'console', 'zsh', 'powershell', 'pwsh', 'cmd', 'bat', 'shell-session', 'terminal']);
const PIPE_TO_SHELL = /\b(?:curl|wget|iwr|Invoke-WebRequest|irm|Invoke-RestMethod)\b[^\n]*\|\s*(?:sudo\s+)?(?:ba|z|da|k)?sh\b|\|\s*(?:iex|Invoke-Expression)\b/i;
const DESTRUCTIVE = /\brm\s+-[a-z]*(?:rf|fr)[a-z]*\b|\bmkfs(?:\.\w+)?\b|\bdd\s+if=|:\(\)\s*\{|>\s*\/dev\/sd|\bchmod\s+-R\s+0?777\b|Remove-Item\b[^\n]*-Recurse[^\n]*-Force|\bformat\s+[a-z]:|\bgit\s+push\b[^\n]*--force\b|\bDROP\s+(?:TABLE|DATABASE)\b/i;
const INSTALL = /\b(?:npm|pnpm|yarn)\s+(?:i|install|add)\b|\bpip3?\s+install\b|\b(?:apt|apt-get|yum|dnf|brew|choco|winget|scoop)\s+install\b|\bcargo\s+install\b|\bgo\s+install\b|\bgem\s+install\b/i;
const NETWORK = /\b(?:curl|wget|iwr|Invoke-WebRequest|git\s+clone|ssh|scp)\b/i;
const MUTATION = /\b(?:git\s+(?:push|commit|reset)|docker\s+(?:run|rm)|kubectl\s+(?:apply|delete)|terraform\s+(?:apply|destroy)|rm|mv|chmod|chown)\b/i;

export function classifyLine(line) {
  if (PIPE_TO_SHELL.test(line)) return 'pipe-to-shell';
  if (DESTRUCTIVE.test(line)) return 'destructive';
  if (INSTALL.test(line)) return 'package-install';
  if (NETWORK.test(line)) return 'network';
  if (MUTATION.test(line)) return 'mutation';
  return 'inert-or-unclassified';
}

/** Join backslash-continued lines, keeping the starting line index. */
function logicalLines(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let text = lines[i];
    const start = i;
    while (/\\\s*$/.test(text) && i + 1 < lines.length) text = text.replace(/\\\s*$/, ' ') + lines[++i].trim();
    out.push({ text, idx: start });
  }
  return out;
}

export function validateSnippets(parsed, relativePath, cliContracts = {}) {
  const findings = [];
  const classes = {};
  let inspected = 0, notRun = 0;
  for (const block of parsed.snippets) {
    if (!SHELL_LANGS.has(block.language)) continue;
    for (const { text, idx } of logicalLines(block.lines)) {
      const trimmed = text.trim().replace(/^\$\s+/, '').replace(/^PS\s+[^>]*>\s+/, '').replace(/^>\s+/, '');
      if (!trimmed || /^(#|\/\/|REM\b)/i.test(trimmed)) continue;
      notRun++;
      const line = block.start + idx + 1;
      const cls = classifyLine(trimmed);
      classes[cls] = (classes[cls] || 0) + 1;
      if (cls === 'pipe-to-shell') findings.push({ rule: 'PIPE_TO_SHELL', file: relativePath, line, message: 'Snippet pipes a download into a shell; DocSutra did not execute it', subject: 'pipe-to-shell', suggestion: 'Document a checksum-verified download or a package-manager install instead.', excerpt: trimmed });
      else if (cls === 'destructive') findings.push({ rule: 'DESTRUCTIVE_COMMAND', file: relativePath, line, message: 'Snippet contains a destructive command; DocSutra did not execute it', subject: 'destructive', suggestion: 'Warn readers explicitly, scope the command narrowly and avoid copy-paste-ready destructive defaults.', excerpt: trimmed });
      // Command substitution cannot be reasoned about statically; pipelines and chains are split per command.
      if (/\$\(|`/.test(trimmed)) continue;
      for (const seg of trimmed.split(/\s*(?:&&|\|\||;|\|)\s*/)) {
        const parts = (seg.match(/(?:"[^"]*"|'[^']*'|\S+)/g) || []).filter(Boolean);
        while (parts.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[0]) || parts[0] === 'sudo')) parts.shift();
        const bin = parts[0];
        const contract = bin && Object.hasOwn(cliContracts, bin) ? cliContracts[bin] : null;
        if (!contract) continue;
        inspected++;
        const tokens = parts.slice(1);
        const first = tokens[0];
        if (first && !first.startsWith('-') && !/^[<[\"'$%]/.test(first) && Array.isArray(contract.subcommands) && !contract.subcommands.includes(first)) {
          findings.push({ rule: 'CLI_UNKNOWN_SUBCOMMAND', file: relativePath, line, message: `Documented '${bin}' subcommand '${first}' is absent from the declared CLI contract`, subject: `${bin} ${first}`, suggestion: 'Update the command or the declared CLI contract after checking real --help output.', excerpt: trimmed });
        }
        for (const token of tokens) {
          if (!token.startsWith('--') || token === '--') continue;
          const flag = token.split('=')[0];
          if (Array.isArray(contract.flags) && !contract.flags.includes(flag)) findings.push({ rule: 'CLI_UNKNOWN_FLAG', file: relativePath, line, message: `Documented flag '${flag}' is absent from the declared '${bin}' CLI contract`, subject: `${bin} ${flag}`, suggestion: 'Check real --help output, then fix the docs or the declared contract.', excerpt: trimmed });
        }
      }
    }
  }
  return { findings, inspected, notRun, classes };
}
