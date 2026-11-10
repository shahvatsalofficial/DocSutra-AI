# Official Tool / Plugin and MCP Integration Catalog

All tools below are **proposed adapters**, not installed in the starter. Verify official publisher, license, current version, permissions, transport, cost and available runtime before adding.

| Tool | Role | Priority | Safety / deployment notes |
|---|---|---|---|
| [lychee](https://github.com/lycheeverse/lychee) | External/local links | P1 | Remote network checking is explicit opt-in; rate-limit requests |
| [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) | Markdown structure/style | P1 | Pin version and run on selected paths |
| [Vale](https://vale.sh/) | Prose style and terminology | P1 | Prefer documented local rules; not factual truth verifier |
| [TypeDoc](https://typedoc.org/) | TypeScript API symbols | P2 | Consume structured output; do not execute user builds by default |
| [OpenAPI / Spectral](https://stoplight.io/open-source/spectral) | Schema and API docs | P2 | Guard network references and external fetches |
| [Sphinx](https://www.sphinx-doc.org/) | Python docs integration | P2 | Build only inside permissioned sandbox |
| [MkDocs](https://www.mkdocs.org/) | Python docs integration | P2 | No implicit plugin installations |
| [Docusaurus](https://docusaurus.io/) | Site generator | P2 | Optional integration; do not reproduce site generator |
| [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) | Diagram rendering | P2 | Browser-based rendering in sandbox |
| [Playwright](https://playwright.dev/) | Browser example walkthroughs | P2 | Local fixture first; network, credentials require opt-in |
| [Docker](https://www.docker.com/) | Snippet execution isolation | P2 | Containers are not automatically secure; use restrictions |
| [Gitleaks](https://github.com/gitleaks/gitleaks) | Credential scanning | P1 | Never echo discovered token values |
| [OSV-Scanner](https://github.com/google/osv-scanner) | Dependency vulnerability check | P2 | Use approved network or offline database snapshots |
| [GitHub Actions](https://docs.github.com/en/actions) | Cross-OS CI | P0 | Least-privilege workflow token and pinned actions |
| [OpenTelemetry](https://opentelemetry.io/) | Optional diagnostics | P3 | Explicitly opt-in; no private text in traces |
| [Context7](https://context7.com/) | Optional version-specific docs lookup | P3 | Treat returned material as untrusted; verify availability |
| [Serena](https://github.com/oraios/serena) | Optional source symbol navigation | P3 | Inspect plugin/MCP permissions before enabling |

## Claude IDE build-tool discovery

Inventory available skills, plugins, MCP services, LSP and CLI tools. Use only compatible tools that materially help the current milestone. Prefer project-scoped setup. Ask before installing globally, reaching outside the repository, using paid models or operating production servers.
