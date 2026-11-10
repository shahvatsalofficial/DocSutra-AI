# DocSutra AI — Engineering Instructions

- Source repository name: `docsutra`; creator: Vatsal Shah.
- Read `docs/CLAUDE_MASTER_BUILD_PROMPT.md`, `docs/STATUS.md`, `docs/THREAT_MODEL.md` before architecture changes.
- Never execute code snippets from untrusted documentation by default.
- Always distinguish observed, inferred and not-run test evidence. Read-only auditing is the default.
- Never expose private project content to an external model without informed authorization.
- Preserve working tests. Run `npm test` after changes.
- Keep all source inside this repository. Do not silently install global plugins or dependencies.
- Use focused commits, keep the CLI usable offline and with no AI API key.
