// Versioned rule catalog. Every finding references one of these IDs; reports embed the catalog entries they used.
export const RULES_VERSION = '2.0.0';
export const RULES = {
  BROKEN_LOCAL_LINK: { severity: 'error', category: 'links', title: 'Broken local link', description: 'A relative or repository-root link points at a file or directory that does not exist.', evidence: 'local-filesystem' },
  BROKEN_ANCHOR: { severity: 'error', category: 'links', title: 'Broken heading anchor', description: 'A #fragment does not match any heading or id/name attribute in the target Markdown file (GitHub slug rules).', evidence: 'local-filesystem' },
  PATH_CASE_MISMATCH: { severity: 'error', category: 'links', title: 'Link path differs in letter case', description: 'The link resolves on case-insensitive filesystems (Windows/macOS) but breaks on Linux and GitHub.', evidence: 'local-filesystem' },
  UNDEFINED_REFERENCE: { severity: 'error', category: 'links', title: 'Undefined reference link', description: 'A [text][label] reference has no matching [label]: url definition.', evidence: 'local-static' },
  MALFORMED_LINK: { severity: 'error', category: 'links', title: 'Malformed link encoding', description: 'The URL contains invalid percent-encoding or NUL characters.', evidence: 'local-static' },
  UNSAFE_LINK_SCHEME: { severity: 'error', category: 'security', title: 'Unsafe URL scheme', description: 'A link uses javascript:, file:, vbscript: or another non-web scheme.', evidence: 'local-static' },
  OUTSIDE_REPOSITORY_LINK: { severity: 'warning', category: 'links', title: 'Link escapes repository', description: 'A local link resolves outside the scanned root; it is reported and never opened.', evidence: 'local-static' },
  IMAGE_MISSING_ALT: { severity: 'warning', category: 'accessibility', title: 'Image without alternative text', description: 'Markdown or HTML image has no alt text (WCAG 1.1.1).', evidence: 'local-static' },
  UNCLOSED_CODE_FENCE: { severity: 'warning', category: 'structure', title: 'Unclosed code fence', description: 'A fenced code block is never closed, so everything after it renders as code.', evidence: 'local-static' },
  CLI_UNKNOWN_SUBCOMMAND: { severity: 'error', category: 'commands', title: 'Documented subcommand not in declared contract', description: 'A documented command uses a subcommand absent from the cliContracts you declared. The declaration itself may be stale.', evidence: 'declared-contract' },
  CLI_UNKNOWN_FLAG: { severity: 'error', category: 'commands', title: 'Documented flag not in declared contract', description: 'A documented command uses a --flag absent from the cliContracts you declared. The declaration itself may be stale.', evidence: 'declared-contract' },
  PIPE_TO_SHELL: { severity: 'warning', category: 'security', title: 'Pipe-to-shell install pattern', description: 'A snippet pipes a download straight into a shell (curl | sh). Never executed by DocSutra; flagged for manual review.', evidence: 'local-static' },
  DESTRUCTIVE_COMMAND: { severity: 'warning', category: 'security', title: 'Destructive command in docs', description: 'A snippet contains a destructive command (rm -rf, mkfs, dd, chmod -R 777 ...). Never executed; flagged for manual review.', evidence: 'local-static' },
  SECRET_IN_DOCS: { severity: 'error', category: 'security', title: 'Possible credential in documentation', description: 'Text matches a known credential format (GitHub/npm/AWS/Slack/Stripe/Google tokens, private keys). The value is redacted in all reports.', evidence: 'local-static' },
  DUPLICATE_HEADING: { severity: 'info', category: 'structure', title: 'Duplicate heading in one file', description: 'Duplicate headings get -1, -2 suffixed anchors, which makes anchor links fragile.', evidence: 'local-static' },
  EMPTY_LINK_TEXT: { severity: 'warning', category: 'accessibility', title: 'Link with no text', description: 'A link has an empty label, which is unusable for screen-reader users (WCAG 2.4.4).', evidence: 'local-static' },
  HEADING_LEVEL_SKIP: { severity: 'info', category: 'accessibility', title: 'Heading level skipped', description: 'A heading jumps more than one level (for example h2 to h4), which weakens document structure.', evidence: 'local-static' },
  INVALID_FILE: { severity: 'error', category: 'structure', title: 'Document could not be read as UTF-8 text', description: 'The file contains invalid UTF-8 or a NUL byte and was not analysed.', evidence: 'local-static' },
};
export const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };
