// The one chain list. Every chain-ordered view (proposal filter, layer matrix, columns, upgrades, sources, chain diff
// columns) follows this array, and lib/diffs.js derives the diff column order from it.
//
// Order: native-token market cap, largest first, from the CoinGecko API (/api/v3/coins/markets, vs_currency=usd),
// read 2026-11-23 14:27 UTC. Tokens: ETH, BNB, HYPE, AVAX, ARB, POL, SEI, GNO, OP, MON. ARB and POL were within 0.3%
// of each other at that read. A chain with no token of its own (Base, an OP Stack L2 that pays gas in ETH; Tempo,
// which pays gas in stablecoins) has no market cap, so it goes after every ranked chain, alphabetically.
// Market caps are only used to order; the page never shows them.
//
// name: the adapter's `chain`; short: compact label; c: accent colour; logo: file in site/logos/ (themed: ships
// <logo>-dark.svg and <logo>-light.svg); backed: dark mark that gets a light backing in dark mode; diff: chain diff
// column ids (data/diffs/<id>.json), in column order.
export const CHAINS = [
  { name: 'Ethereum', short: 'Ethereum', c: '#627EEA', logo: 'ethereum', backed: true, diff: ['ethereum'] },
  { name: 'BNB Chain', short: 'BNB', c: '#F0B90B', logo: 'bnb', diff: ['bsc', 'opbnb'] },
  { name: 'Hyperliquid', short: 'Hyperliquid', c: '#97FCE4', logo: 'hyperliquid', themed: true, diff: ['hyperliquid'] },
  { name: 'Avalanche C-Chain', short: 'Avalanche', c: '#E84142', logo: 'avalanche', diff: ['avalanche'] },
  { name: 'Arbitrum', short: 'Arbitrum', c: '#28A0F0', logo: 'arbitrum', diff: ['arbitrum'] },
  { name: 'Polygon PoS', short: 'Polygon', c: '#8247E5', logo: 'polygon', diff: ['polygon'] },
  { name: 'Sei', short: 'Sei', c: '#9E1F19', logo: 'sei', backed: true, diff: ['sei'] },
  { name: 'Gnosis Chain', short: 'Gnosis', c: '#4F8A6F', logo: 'gnosis', diff: ['gnosis'] },
  { name: 'Optimism / OP Stack', short: 'OP', c: '#FF0420', logo: 'optimism', diff: ['optimism'] },
  { name: 'Monad', short: 'Monad', c: '#A855F7', logo: 'monad', diff: ['monad'] },
  { name: 'Base', short: 'Base', c: '#0052FF', logo: 'base', diff: ['base'] },
  { name: 'Tempo', short: 'Tempo', c: '#38BDF8', logo: 'tempo', themed: true, diff: ['tempo'] },
];
