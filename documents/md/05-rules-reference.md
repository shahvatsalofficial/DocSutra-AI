# Rules reference

> Every rule with its severity, category and evidence type. Generated from the same catalog the scanner uses, so it cannot drift.

## Rule catalog

{{rules}}

## Evidence types

| Type | Meaning |
|---|---|
| `local-filesystem` | Verified by checking the real file system |
| `local-static` | Derived from the document text alone |
| `declared-contract` | Compared against a contract you declared; only as good as the declaration |

## Finding status labels

Findings from a scan are always `failed` (a reproducible problem). The verification vocabulary used by the skills is: **verified**, **failed**, **inferred**, **manual-review**, **not-run**. A timestamp is never a certification.

## Stability

Rule IDs are stable. New rules are added in minor versions; behaviour changes to existing rules are listed in the [changelog](../../CHANGELOG.md).
