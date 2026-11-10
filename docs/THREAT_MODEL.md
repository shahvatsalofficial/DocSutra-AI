# Threat Model

Assets: private source files; documentation containing internal links; developer tokens; allowed filesystem paths; tool/plugin permissions; test-runner process capabilities; evidence validity.

Attack surfaces: malicious Markdown link paths, symlinked docs or targets, shell code fences, prompt injection embedded in docs, forged verification claims, untrusted MCP servers, external URL lookups and report HTML.

Controls in this starter: read-only audit; boundary-checked local file resolution; symlink exclusion; bounded document scanning; escaped HTML; strong token requirement and loopback-only report server; no automatic command execution; project-local, explicit install.

Planned controls: real sandbox (OS/container isolation and blocked network by default), per-tool authorization, content redaction, secret detector, artifact retention policy, semver-pinned plugin manifests, provenance integrity checks and negative security CI.

Residual risks: regex parser misses complex Markdown; path metadata in reports may leak sensitive information; local users can inspect local report data; a bearer token is not a substitute for TLS/RBAC; malicious repos must not be executed automatically.
