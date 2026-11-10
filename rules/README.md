# Rule catalog

Implemented: `BROKEN_LOCAL_LINK`, `BROKEN_ANCHOR`, `IMAGE_MISSING_ALT`, `UNDEFINED_REFERENCE`, `UNSAFE_LINK_SCHEME`, `MALFORMED_LINK`, `OUTSIDE_REPOSITORY_LINK`, `UNCLOSED_CODE_FENCE`, `CLI_UNKNOWN_FLAG`, `CLI_UNKNOWN_SUBCOMMAND`.

Rules are deterministic but the Markdown parser is intentionally bounded. To implement richer rules, use well-maintained Markdown/MDX parsing libraries with fixtures and explicit security boundaries.
