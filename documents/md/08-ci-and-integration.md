# CI and integration

> GitHub Actions, SARIF code scanning, pre-commit usage, other CI systems and the programmatic API.

## GitHub Actions: audit on every pull request

```yaml
name: Docs audit
on: [pull_request]
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx docsutra-ai scan --root . --format all --out-dir docsutra-report
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: docsutra-report, path: docsutra-report }
```

Reviewers download the artifact and open `audit.html`.

## Fail only on new problems

Store the base branch report, then compare:

```bash
docsutra scan --root . --out-dir report --baseline base/audit.json
```

The step fails only when a finding exists that the baseline did not have.

## SARIF and code scanning

```yaml
- run: npx docsutra-ai scan --root . --format sarif --out docsutra.sarif --fail-on none
- uses: github/codeql-action/upload-sarif@v3
  with: { sarif_file: docsutra.sarif }
```

Findings then appear as annotations on the pull request. The SARIF contains rule metadata and a `docsutraId` fingerprint per result.

## Other CI systems

Any system that can run Node 20+ works: run the same `npx` command and archive the output folder. Use the exit code to pass or fail the job.

## Local pre-commit

```bash
docsutra scan --root . --fail-on error --format md --out .docsutra/audit.md
```

## Programmatic API

```js
import { audit, diffAudits, toMarkdown } from 'docsutra-ai';
const before = await audit('./repo-base');
const after = await audit('./repo-head');
const delta = diffAudits(before, after);
console.log(delta.added.length, 'new findings');
```

Exports: `audit`, `diffAudits`, `parseMarkdown`, `headingId`, `validateConfig`, `RULES`, `findSecrets`, `redact`, `classifyLine`, `toMarkdown`, `toHtml`, `toSarif`, `saveReport`, `saveAll`, `installSkills`, `HOSTS`.

## Stable contracts

| Contract | Location |
|---|---|
| Report JSON schema | `schemas/audit.schema.json` |
| Exit codes | 0 clean, 1 findings, 2 error |
| Rule IDs | [Rules reference](05-rules-reference.md) |
| Finding IDs | SHA-256 prefix of rule, file, line and subject |
