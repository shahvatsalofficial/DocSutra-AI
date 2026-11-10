# IDE Skill Compatibility

Canonical source: `.agents/skills/<name>/SKILL.md`.

| Host | Project-local destination installed by CLI | Status |
|---|---|---|
| Claude Code | `.claude/skills/` | Folder copy supported; native activation not tested here |
| Cursor | `.cursor/skills/` | Folder copy supported; native activation not tested here |
| Codex CLI | `.agents/skills/` | Folder copy supported; native activation not tested here |
| Gemini CLI | `.gemini/skills/` | Folder copy supported; native activation not tested here |
| GitHub Copilot | `.github/skills/` | Folder copy supported; native activation not tested here |

Sources to recheck when releasing: [Agent Skills](https://agentskills.io/), [Microsoft skill paths](https://github.com/MicrosoftDocs/Agent-Skills), and vendor documentation. A copied skill file does not constitute verified host skill discovery or API access.

The original repo can use `.agents/skills/` natively with supporting hosts, but Claude Code conventionally loads `.claude/skills/`. The `install-skills` command copies only project-locally and protects existing destination folders. No private IDE APIs or account tokens are used.
