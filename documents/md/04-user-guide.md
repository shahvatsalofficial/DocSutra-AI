# User guide

> Install, run, read a report, fix findings, configure, and automate. Copy-paste ready.

## 1. Requirements

Node.js 20 or newer. No account, API key or network access is needed to scan.

## 2. Run your first audit

```bash
npx docsutra-ai scan --root .
```

Open `.docsutra/audit.html` in a browser, or read `.docsutra/audit.md`. The command exits `1` when errors exist.

## 3. Read the report

1. **Verdict banner**: PASS, PASS WITH WARNINGS or FAIL.
2. **Findings**: use the severity filter. Each item shows the file, line, a context excerpt, the fix, the evidence method and an ID.
3. **Verification ledger**: shows what was actually checked. If a check is absent it never ran.
4. **Not checked**: external URLs, shell lines not executed, suppressed findings.
5. **Provenance**: versions, git revision and SHA-256 fingerprints so someone else can reproduce the run.

## 4. Fix common findings

| Finding | Typical fix |
|---|---|
| `BROKEN_LOCAL_LINK` | Correct the path or restore the file |
| `BROKEN_ANCHOR` | Use the real heading slug, for example `## Q&A: What?` becomes `#qa-what` |
| `PATH_CASE_MISMATCH` | Match the exact letter case of the file name |
| `IMAGE_MISSING_ALT` | Describe the image's purpose; use `alt=""` for decorative HTML images |
| `PIPE_TO_SHELL` | Offer a checksum-verified download or a package-manager install |
| `SECRET_IN_DOCS` | Revoke the credential first, then remove it from the file and git history |
| `CLI_UNKNOWN_FLAG` | Check real `--help` output, then fix the docs or the declared contract |

## 5. Choose formats

```bash
docsutra scan --root . --format md --out audit.md
docsutra scan --root . --format sarif --out docsutra.sarif
docsutra scan --root . --format all --out-dir reports
```

## 6. Gate CI on new problems only

```bash
docsutra scan --root . --out-dir base-report
docsutra scan --root . --out-dir pr-report --baseline base-report/audit.json
```

Run the first command on the base branch and keep `audit.json`. The second fails only for findings that did not exist in the baseline.

## 7. Declare your CLI contract

```json
{
  "cliContracts": {
    "mytool": { "subcommands": ["build", "test"], "flags": ["--verbose", "--dry-run"] }
  }
}
```

Docs that show `mytool deploy` or `mytool build --old` are then flagged. Update the contract from real `--help` output you run yourself.

## 8. Suppress a known false positive

```md
<!-- docsutra-disable-next-line BROKEN_LOCAL_LINK -->
[generated at build time](build/output.md)
```

Or add the rule ID to `ignoreRules` in the config. The report counts suppressions.

## 9. Install skills for your AI assistant

```bash
docsutra install-skills --host claude --target .
docsutra install-skills --host all --target . --force
```

Hosts: `claude`, `cursor`, `codex`, `gemini`, `copilot`, `all`. Existing skills are kept unless `--force` is set. See the [skills guide](09-agent-skills-guide.md).

## 10. Use as a library

```js
import { audit, toHtml, toSarif } from 'docsutra-ai';
const report = await audit('./repo', { ignore: ['vendor'] });
console.log(report.summary.errors, report.ledger);
```

## 11. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Exit code 2 and "unknown key" | A typo in `docsutra.config.json`; keys are validated strictly |
| Anchor flagged but works on GitHub | Heading contains HTML or a construct outside the [coverage matrix](../../docs/COVERAGE.md); add an HTML `id` or suppress the line |
| Case mismatch not reported on Linux | On case-sensitive filesystems a case difference is a plain missing file |
| File not scanned | It is larger than the size cap, a symlink, in an ignored folder, or not `.md`/`.mdx`/`.markdown` |
