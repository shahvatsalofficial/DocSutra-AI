# Evidence and Verification Model

The starter `audit.json` schema includes `schemaVersion`, `tool`, `mode`, `createdAt`, `summary`, `files` with SHA-256 and count data, `findings`, and `limitations`.

Each finding includes a stable ID, rule, severity, file path, line, message, suggestion, subject and verificationMethod.

## Audit terminology

- **Failed:** a specific deterministic rule found a mismatch in the selected source.
- **Observed/verified:** a check was executed and produced traceable evidence; not equivalent to global correctness.
- **Inferred:** model or heuristic suggestion without reproducible direct verification.
- **Manual review:** human evidence is required.
- **Not checked:** no execution occurred, tool absent or test unsupported.

The starter currently uses `status: failed` for reported findings and separate summary counts for checks that were never executed. Schema evolution should add per-claim ledgers and statuses without changing the historical interpretation of prior data.

**A timestamp says when a check was run; it is not certification that all linked content is true.**
