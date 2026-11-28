# <img src="site/favicon.svg" width="36" height="36" alt="eipverse"> eipverse

Track how each EVM chain evolves side by side.

[eipverse.com](https://eipverse.com) is a static page of improvement proposals and network upgrades, read from each chain's own sources.

Machine-readable data is at [eipverse.com/data.json](https://eipverse.com/data.json). [llms.txt](https://eipverse.com/llms.txt) lists the views, schema, and per-chain endpoints.

## Chains

Twelve chains, in the same order as the site (`site/chains.js`).

| Chain | Sources |
| --- | --- |
| Ethereum | [EIPs](https://github.com/ethereum/EIPs/tree/master/EIPS), [ERCs](https://github.com/ethereum/ERCs/tree/master/ERCS) |
| BNB Chain | [BEPs](https://github.com/bnb-chain/BEPs/blob/master/README.md), [BSC](https://github.com/bnb-chain/bsc/blob/master/params/config.go), [opBNB](https://github.com/bnb-chain/opbnb/blob/develop/op-node/chaincfg/chains.go) |
| Hyperliquid | [HIPs](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips) |
| Avalanche C-Chain | [ACPs](https://github.com/avalanche-foundation/ACPs/tree/main/ACPs), [avalanchego](https://github.com/ava-labs/avalanchego/blob/master/upgrade/upgrade.go) |
| Arbitrum | [Upgrades](https://github.com/ArbitrumFoundation/docs/blob/main/content/docs/network-upgrades.mdx), [Forum](https://forum.arbitrum.foundation/c/proposals/7), [Snapshot](https://snapshot.box/#/s:arbitrumfoundation.eth), [Governors](https://docs.arbitrum.foundation/deployment-addresses) |
| Polygon PoS | [PIPs](https://github.com/0xPolygon/Polygon-Improvement-Proposals/tree/main/PIPs), [PRCs](https://github.com/0xPolygon/Polygon-Improvement-Proposals/tree/main/PIPs/PRC), [bor](https://github.com/0xPolygon/bor/blob/develop/internal/cli/server/chains/mainnet.go) |
| Sei | [SIPs](https://github.com/sei-protocol/sips/tree/main/sips), [governance](https://rest.sei-apis.com/cosmos/gov/v1beta1/proposals?pagination.limit=500) |
| Gnosis Chain | [Network upgrades](https://github.com/gnosischain/specs/tree/master/network-upgrades), [GIPs](https://snapshot.box/#/s:gnosis.eth) |
| Optimism / OP Stack | [Specs](https://github.com/ethereum-optimism/specs/blob/main/specs/SUMMARY.md), [OP Mainnet](https://github.com/ethereum-optimism/superchain-registry/blob/main/superchain/configs/mainnet/op.toml), [Upgrade proposals](https://gov.optimism.io/search?q=%22Upgrade%20Proposal%22%20in%3Atitle) |
| Monad | [MIPs](https://github.com/monad-crypto/MIPs/tree/main/MIPs), [MRCs](https://github.com/monad-crypto/MIPs/tree/main/MRCs), [monad-bft](https://github.com/category-labs/monad-bft/blob/master/monad-chain-config/src/lib.rs) |
| Base | [Chain config](https://github.com/base/base/blob/main/crates/common/chains/src/config.rs), [blog](https://www.base.org/blog/rss.xml) |
| Tempo | [TIPs](https://github.com/tempoxyz/tempo/tree/main/tips), [genesis](https://github.com/tempoxyz/tempo/blob/main/crates/chainspec/src/genesis/presto.json) |

## Run locally

No dependencies. Node 18 or later. Set `GITHUB_TOKEN` to raise the GitHub API rate limit.

```sh
npm run build   # fetch live sources into site/data.json
npm test
npm run serve   # http://127.0.0.1:8787
```

## Add a chain

Add a file in `adapters/` and a row in `site/chains.js`. `build.js` runs every adapter in that folder.

The default export is `{ chain, sources, fetch }`. `sources` is `[{ label, url }]`. `fetch()` returns `{ proposals, notes?, reason? }`.

## Deploy

`.github/workflows/deploy.yml` builds `site/` daily and on every push to `main`, then deploys the static assets to Cloudflare Workers. The deploy step uses the `CLOUDFLARE_API_TOKEN` repository secret.
