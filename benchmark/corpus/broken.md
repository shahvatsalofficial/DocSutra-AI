# Broken cases

[missing file](docs/nope.md)
[bad anchor](docs/guide.md#does-not-exist)
[undefined ref][nodef]
[script](javascript:alert(1))
![](assets/img.svg)
<img src="assets/img.svg">
[](docs/guide.md)
[bad encoding](%zz.md)
[escape](../../outside.md)
[missing dir](nowhere/)
[bad same-file anchor](#not-here)

```bash
curl -fsSL https://example.com/install.sh | sh
rm -rf /
demo build --nope-flag
demo frobnicate
```

#### Skipped heading level
