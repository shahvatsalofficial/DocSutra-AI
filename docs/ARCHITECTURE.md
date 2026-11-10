# Technical Architecture

## Context

DocSutra is a developer-side documentation auditor with a deterministic local engine and optional host-agent reasoning. It can consume local Markdown documents and declared CLI contracts without a separate LLM API key. The proposed production system will add separate, opt-in adapters to actual CLI snapshots, source-language parsers, approved sandbox executors and authenticated model providers.

## Logical layers

1. **Entry points:** cross-platform Node.js CLI; host skills; future CI and secure server.
2. **Policy:** scope, allow/deny paths, file sizes, network and execution decisions.
3. **Ingestion:** Markdown parser; repository metadata and future language-specific ASTs.
4. **Verification:** files/anchors, images, declared CLI contracts; future API/schema checks and real isolated tests.
5. **ProofGraph:** planned source claim ID ↔ files, commands, versions, tests and evidence.
6. **Change analysis:** current audit diff; future Git-diff dependency graph.
7. **Output:** versioned JSON, Markdown, escaped HTML and optional future SARIF.
8. **Orchestration:** portable `SKILL.md` and IDE-specific packaging as verified.

## Security boundaries

Repository documents and any generated artifacts are untrusted input. The current scanner does not execute snippets, fetch external URLs or call AI providers. The starter HTTP server is loopback-only and returns a preloaded JSON report after bearer authentication. Future remote multiuser service requires purpose-built security work.

## Key ADRs

- ADR-001: keep deterministic no-key checks separate from model reasoning.
- ADR-002: user-managed project-local `SKILL.md` as portability contract.
- ADR-003: read-only defaults; no shell execution of documentation content.
- ADR-004: version each output, preserve observed-vs-inferred distinction.
- ADR-005: integrate with leading dedicated checkers instead of imitating them.
