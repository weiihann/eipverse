# eipverse

An aggregator of improvement ideas across EVM chains: every chain's proposals (EIPs/ERCs, BEPs/BAPs, TIPs, MIPs/MRCs, AIPs, OP Stack upgrade proposals, PIPs/PRCs, ACPs, CIPs, GIPs) and network upgrades side by side in one static page, so you can see what each chain is proposing and shipping. Chains: Ethereum, BNB Chain (BSC, opBNB), Tempo, Monad, Arbitrum, Optimism / OP Stack, Base, Polygon PoS, Avalanche C-Chain, Celo, Gnosis Chain.

Live: https://weiihann.github.io/eipverse/ Every row comes from the chain's own canonical source (GitHub proposal repos, client chain configs, official registries, governance APIs). Two things are derived, and the page labels them: "activated"/"scheduled" (a stated activation timestamp compared with the build time) and layer tags.

## Layout

- `adapters/<chain>.js`: one file per chain. Default export `{ chain, sources: [{label, url}], fetch() -> { proposals, notes?, reason? } }`. Each row has `chain, id, title, abstract, status, target_upgrade, dates[{label, value}], url, type, kind, shared_with, refs` where `abstract` is the source's own description or summary paragraph (null when it has none) and `kind` is `protocol` or `app standard` (ERCs, BAPs, MRCs). A fork that ships another chain's proposals (Gnosis and Polygon forks of Ethereum EIPs, Celo's OP Stack hardforks) sets `shared_with` to that chain and lists `refs: [{chain, id | upgrade, note}]` pointing at those rows instead of copying them; the drawer links them. To add a chain, add a file.
- `lib/tags.js`: deterministic layer tags (execution, state, fee-market, consensus, networking, blobs-da, account-abstraction, crypto-precompiles, interop-crosschain, governance-meta, app-standard). Word-boundary keyword rules over title and abstract plus stated category/kind; 1–3 tags per row, each with the terms that matched (`why`), and at most one subcategory per tag (`subs`, e.g. app-standard › NFTs, execution › opcodes) with its own matched terms. No match means no tag or no sub; the page counts those as "Other".
- `build.js`: runs every adapter, tags each row and writes `site/data.json` (per chain: status ok/empty/error, reason, fetched_at, sources, notes, rows).
- `site/`: the static page (`index.html`, `styles.css`, `app.js`, `derive.js`). Views: proposals, compare by layer (layer × chain matrix plus side-by-side columns), upgrades, sources. `derive.js` also buckets statuses into active vs historical for the default scope; the verbatim status is always shown. All URLs are relative, so it works from a subpath such as GitHub Pages `/<repo>/`. All state lives in the URL: `?view=&scope=&kind=&chain=&tag=&sub=&status=&fork=&q=&id=`. Chain logos are vendored in `site/logos/` (sources in its README). Keys: `/` search, `Esc` clear/close, `j`/`k` step through the list.
- `test/`: `node:test` tests for adapter parsing, the row shape, tags, status buckets, abstracts and the upgrades-view derivation.

No dependencies. Needs Node 18+.

```sh
npm run build   # fetch live sources -> site/data.json (set GITHUB_TOKEN to raise the GitHub API limit)
npm test
npm run serve   # http://127.0.0.1:8787
```

## Deploy

`.github/workflows/pages.yml` builds, tests and deploys `site/` to GitHub Pages on every push to `main`, daily at 03:17 UTC, and on manual dispatch. It uses only the built-in `GITHUB_TOKEN`. In the repo, enable Settings → Pages → Source: GitHub Actions.
