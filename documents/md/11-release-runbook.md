# Release runbook

> Repeatable steps to verify, tag, publish to npm and confirm a release. Written for the maintainer.

## Pre-release checklist

1. `npm test` passes locally.
2. `npm run benchmark` reports no false positives or negatives.
3. `npm run build:skills && npm run build:evidence` produce no unexpected diffs.
4. `node scripts/build-documents.mjs` regenerates the HTML documentation.
5. `CHANGELOG.md` has an entry; `package.json`, `CITATION.cff` carry the same version.
6. CI is green on Linux, Windows and macOS.
7. `npm pack --dry-run` lists only intended files and no secrets.

## Publish to npm (manual)

```bash
npm login
npm publish --access public
```

npm may require a one-time password (2FA). Never paste tokens into chat, files or issues; use `npm login` or a CI secret.

## Publish to npm (CI with provenance)

Create an npm **automation** token, add it as repository secret `NPM_TOKEN`, then publish a GitHub Release. The workflow `.github/workflows/publish.yml` runs the tests and executes `npm publish --provenance`.

## Verify the published package

```bash
npx docsutra-ai@latest version
npx docsutra-ai@latest doctor
```

## GitHub release

```bash
git tag v0.2.0
git push origin v0.2.0
gh release create v0.2.0 --title "v0.2.0" --notes-file CHANGELOG.md
```

## After release

- Confirm the npm page and the README render.
- Add repository topics and a description so people and search engines can find it.
- Rotate any credential that was ever shared outside a secret store.

## Rollback

npm versions are immutable. Fix forward with a patch release; deprecate the bad version with `npm deprecate`.
