# Real-world scenarios

> Six situations every documentation team recognises, with flowcharts showing what happens with and without DocSutra. Commands are real; findings use the exact rule IDs and wording the tool produces.

## Before you read

These are **illustrative stories**, not customer case studies. The commands, rule IDs, exit codes and report fields are exactly what the tool does today. Numbers such as "14 links" are examples. Nothing here is a measured result from a named user.

## Scenario 1: The rename that broke 14 links

**Who:** an open-source maintainer. **Rule:** `BROKEN_LOCAL_LINK`.

A maintainer renames a page. Every other page that linked to it now points nowhere. Reviewers only see the diff of the renamed file, so nobody notices.

{{flow:rename}}

{{cmp:rename}}

```bash
docsutra scan --root . --baseline main-audit.json --out-dir docsutra-report
```

## Scenario 2: A token pasted into the docs

**Who:** a team about to open-source a repository. **Rule:** `SECRET_IN_DOCS`.

{{flow:secret}}

> **Warning** If DocSutra reports a credential, assume it is compromised. Revoke it first. Deleting the line does not remove it from git history.

The finding in the report looks like this. The value never appears:

```text
SECRET_IN_DOCS  docs/deploy.md:12
Text matches a github-token credential format (value redacted)
Context: export GITHUB_TOKEN=[REDACTED:github-token]
```

## Scenario 3: Works on my Windows laptop, 404 on GitHub

**Who:** a technical writer. **Rule:** `PATH_CASE_MISMATCH`.

{{flow:caseMismatch}}

> **Note** This rule needs a case-insensitive filesystem (Windows, default macOS) to detect the mismatch. On Linux, a wrong-case link is simply a missing file and is reported as `BROKEN_LOCAL_LINK`.

## Scenario 4: The `curl | sh` install line

**Who:** a security reviewer. **Rules:** `PIPE_TO_SHELL`, `DESTRUCTIVE_COMMAND`.

{{flow:pipeshell}}

DocSutra also classifies every shell line (pipe-to-shell, destructive, package install, network, mutation, inert) so a reviewer can see the risk profile of the whole documentation set at once.

## Scenario 5: Docs lag behind the CLI

**Who:** a CLI maintainer. **Rules:** `CLI_UNKNOWN_FLAG`, `CLI_UNKNOWN_SUBCOMMAND`.

{{flow:cli}}

```json
{
  "cliContracts": {
    "mytool": { "subcommands": ["build", "test", "release"], "flags": ["--verbose", "--dry-run"] }
  }
}
```

> **Note** A contract is something you declare, not something DocSutra discovers. It can itself go stale, and the report says so. DocSutra never runs your tool to read its `--help`.

## Scenario 6: An AI assistant audits the docs

**Who:** a developer using Claude Code, Cursor, Codex, Gemini CLI or GitHub Copilot.

{{flow:assistant}}

{{svg:skills}}

> **Warning** Installing skills copies files into the folder each host reads. It does not prove the host loads them. Activation is not verified for any of the five hosts.

## What the numbers look like

A real run on the bundled broken demo repository, from the committed sample report:

{{chart:demo}}

## Pick your starting point

| If you are | Start with |
|---|---|
| A maintainer who wants fewer 404s | Scenario 1, then the [user guide](04-user-guide.md) |
| Preparing to open-source | Scenario 2, then [security and privacy](06-security-and-privacy.md) |
| A technical writer | Scenario 3, then the [rules reference](05-rules-reference.md) |
| In CI or release engineering | [CI and integration](08-ci-and-integration.md) |
| Using an AI coding assistant | Scenario 6, then the [skills guide](09-agent-skills-guide.md) |
