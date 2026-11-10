---
title: Legitimate syntax that must NOT be flagged
---

# Tricky but correct

Code span: `[not a link](nope.md)` and `` [also not](nope.md) ``.

Escaped: \[literal](nope.md) and a task list:

- [ ] unchecked item
- [x] checked item

Fenced block with a link-looking line:

```md
[ignored](nope.md)
```

````md
```
[still ignored](nope.md)
```
````

<!-- [commented out](nope.md) -->

<!--
[multi-line comment](nope.md)
-->

    [indented code](nope.md)

Parenthesised file: [parens](docs/a_(b).md). With title: [titled](docs/guide.md "The guide").
Angle bracket: [spaced](<assets/my image.svg>). Percent-encoded: [spaced](assets/my%20image.svg).

Anchors: [install](docs/guide.md#install), [q&a](docs/guide.md#qa-what-happens-v20), [csharp](docs/guide.md#c-notes),
[cafe](docs/guide.md#café-déjà-vu), [setext](docs/guide.md#setext-heading), [setext 2](docs/guide.md#second-setext),
[html id](docs/guide.md#custom-anchor), [dup](docs/guide.md#usage-1), [top](#top), [line](docs/guide.md#L3), [self](#tricky-but-correct).

Root-relative: [guide](/docs/guide.md). Directory: [docs](docs/). Query: [plain](docs/guide.md?plain=1).
External and special: <https://example.com>, [mail](mailto:someone@example.com), [site](https://example.com/page).

Reference styles: [full][g], [collapsed][], [shortcut].

[g]: docs/guide.md "Guide"
[collapsed]: docs/guide.md
[shortcut]: docs/guide.md#install

Linked image: [![logo](assets/img.svg)](docs/guide.md).
Decorative HTML image: <img src="assets/img.svg" alt="">. Described: <img src="assets/img.svg" alt="diagram">.

Footnote reference[^1] and plain bracket text [not defined] stay quiet.

[^1]: A footnote definition.

```bash
demo build --dry-run
demo test --verbose && demo build
curl -fsSL https://example.com/file.txt -o file.txt
```
