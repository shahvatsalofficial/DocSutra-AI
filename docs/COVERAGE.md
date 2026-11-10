# Markdown coverage matrix

DocSutra uses a bounded, dependency-free scanner, not a full CommonMark/MDX parser. This matrix is the contract. Each row is covered by a test in `tests/` or the benchmark corpus in `benchmark/corpus/`.

| Construct | Status | Notes |
|---|---|---|
| ATX headings (`## Title`, closing `#`s) | Supported | `C#` keeps its `#` |
| Setext headings (`===`, `---`) | Supported | |
| GitHub-style anchors, duplicates (`-1`), Unicode, combining marks | Supported | lower-case, punctuation dropped |
| HTML `id=` / `name=` anchors | Supported | `<a id="x">`, headings with ids |
| Inline links `[t](url "title")`, `<angle>` URLs, parentheses in URLs | Supported | |
| Reference links: full, collapsed, shortcut | Supported | shortcut only if defined |
| Images and linked images | Supported | nested image-in-link yields both |
| Autolinks `<https://...>` | Counted as external | not fetched |
| HTML `<a href>`, `<img src alt>`, `<source>`, `<script src>` etc. | Supported | |
| Fenced code (backtick/tilde, longer fences nest) | Supported | contents are never read as links |
| Indented code blocks | Supported | list continuations are not mistaken for code |
| Code spans | Supported | single-line |
| HTML comments (single and multi-line) | Supported | |
| YAML front matter | Skipped, line numbers preserved | |
| Root-relative links `/docs/x.md`, directory links, query strings | Supported | |
| Case-sensitive path check | Supported | detects only where the filesystem is case-insensitive; elsewhere it is a plain missing file |
| Footnotes `[^1]` | Ignored (not validated) | |
| MDX expressions / JSX components | **Not supported** | text is scanned as Markdown |
| Multi-line code spans, nested emphasis edge cases | **Not supported** | |
| AsciiDoc, reStructuredText, notebooks, static HTML files | **Not supported** | only `.md`, `.mdx`, `.markdown` |
| External URLs | **Never fetched** | counted as "not checked" |

Unsupported constructs can cause false negatives. Report real-world misparses as issues with a minimal reproducer; each fix lands with a regression test.
