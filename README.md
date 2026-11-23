# forkwatch

One static page that tracks protocol proposals and network upgrades across EVM chains (Ethereum, BNB Chain incl. BSC/opBNB, Tempo, Monad, Arbitrum, Optimism / OP Stack, Base), in the spirit of forkcast.org. Every row comes from the chain's own canonical source (GitHub proposal repos, client chain configs, official registries, governance APIs). Nothing is inferred except "activated"/"scheduled", which compares a stated activation timestamp with the build time.

## Layout

- `adapters/<chain>.js`: one file per chain. Default export `{ chain, sources: [{label, url}], fetch() -> { proposals, notes?, reason? } }`. Each row has `chain, id, title, status, target_upgrade, dates[{label, value}], url, type, kind` where `kind` is `protocol` or `app standard` (ERCs, BAPs, MRCs). To add a chain, add a file.
- `build.js`: runs every adapter and writes `site/data.json` (per chain: status ok/empty/error, reason, fetched_at, sources, notes, rows).
- `site/`: the static page (`index.html`, `app.js`, `derive.js`). All URLs are relative, so it works from a subpath such as GitHub Pages `/<repo>/`. Filters can be set from the URL: `?chain=&status=&kind=&q=`.
- `test/`: `node:test` tests for adapter parsing, the row shape, and the upgrades-view derivation.

No dependencies. Needs Node 18+.

```sh
npm run build   # fetch live sources -> site/data.json (set GITHUB_TOKEN to raise the GitHub API limit)
npm test
npm run serve   # http://127.0.0.1:8787
```

## Deploy

`.github/workflows/pages.yml` builds, tests and deploys `site/` to GitHub Pages on every push to `main`, daily at 03:17 UTC, and on manual dispatch. It uses only the built-in `GITHUB_TOKEN`. In the repo, enable Settings → Pages → Source: GitHub Actions.
