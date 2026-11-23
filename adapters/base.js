// Base: network upgrades and mainnet activation timestamps from the Base client (base/base), plus chain-engineering
// posts from Base's official blog RSS feed (www.base.org/blog/rss.xml; blog.base.dev redirects there).
import { fetchText, raw, blob, row, isoFromUnix, forkStatus } from '../lib/util.js';

const FEED = 'https://www.base.org/blog/rss.xml';
// Blog filter: the feed's own <category>Engineering</category>, then a title/description check so only posts about
// the chain itself stay: upgrades, scaling/gas/throughput, fees and blobs, proofs, flashblocks, decentralization,
// outages/postmortems, clients, testnets, bridges, and EIPs/ERCs. App/SDK/product, audit and tooling posts are dropped.
const CHAIN_TOPIC = /\b(upgrades?|hard ?forks?|introducing base [A-Z][a-z]+$|scal(e|ing)|gas|mgas|throughput|capacity|fees?|blobs?|eip-\d+|erc-\d+|rrc-\d+|proofs?|multiproofs?|fault|cannon|mtcannon|flashblocks|faster|decentrali[sz]ation|stage 1|postmortem|outage|incident|reth|stack|sequenc\w*|testnet|sepolia|goerli|mainnet|bridg\w*|keystore|account abstraction|appchains|benchmark\w*|nitro|security-first|governance proposals|superchain|op stack|pectra|glamsterdam|b20)\b/i;
const NOT_CHAIN = /\b(base app|base pay|account sdk|onchaintestkit|security reviews|solady audit|farcaster frames|op-viem|basenames|anti-sybil|base verify|commerce payments|sub accounts|frontend|passkey)\b/i;

const decode = (s = '') => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
const tag = (xml, name) => decode(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml)?.[1] || '');

/** RSS 2.0 items -> { title, link, date (YYYY-MM-DD from pubDate), categories, description }. */
export function parseRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const pub = tag(it, 'pubDate');
    const t = Date.parse(pub);
    return {
      title: tag(it, 'title'), link: tag(it, 'link'), date: Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null,
      categories: [...it.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/g)].map((m) => decode(m[1])), description: tag(it, 'description'),
    };
  });
}

export const isChainPost = (p) => p.categories.includes('Engineering') && /\/blog\//.test(p.link)
  && CHAIN_TOPIC.test(`${p.title} ${p.description}`) && !NOT_CHAIN.test(`${p.title} ${p.description}`);

/** Target upgrade only when the title names one of Base's own configured upgrades ("Introducing Base Denim"). */
export function blogRow(p, upgradeNames = []) {
  const named = upgradeNames.find((n) => new RegExp(`\\b${n}\\b`).test(p.title));
  return row({
    chain: CHAIN, id: `blog:${p.link.replace(/\/+$/, '').split('/').pop()}`, title: p.title, status: 'blog post',
    target_upgrade: named || null, abstract: p.description, type: 'engineering blog post',
    dates: [{ label: 'published', value: p.date }], url: p.link,
  });
}

const REPO = 'base/base', REF = 'main', PATH = 'crates/common/chains/src/config.rs', CHAIN = 'Base';

/** Parse `<name>_timestamp: 1_234 | Some(1_234) | None` inside `const MAINNET: ChainConfig = ChainConfig {`,
 *  plus the field's doc comment (e.g. "(optional, sepolia-only)"). */
export function parseBaseMainnet(src) {
  const docs = Object.fromEntries([...src.matchAll(/\/\/\/\s*(.+)\n\s*pub (\w+?)_timestamp:/g)].map((m) => [m[2], m[1]]));
  const start = src.indexOf('const MAINNET: ChainConfig');
  if (start < 0) return [];
  const body = src.slice(start, src.indexOf('\n};', start));
  const out = [];
  const re = /^\s*(\w+?)_timestamp:\s*(?:Some\()?([\d_]+|None)\)?,/gm;
  for (let m; (m = re.exec(body));) {
    const v = m[2] === 'None' ? null : m[2].replace(/_/g, '');
    out.push({ name: m[1].split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), value: v, sepoliaOnly: /sepolia-only/i.test(docs[m[1]] || '') });
  }
  return out;
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'base/base mainnet ChainConfig (upgrade timestamps)', url: blob(REPO, REF, PATH) },
    { label: 'Base blog RSS (Engineering posts about the chain)', url: FEED },
  ],
  async fetch() {
    const forks = parseBaseMainnet(await fetchText(raw(REPO, REF, PATH)));
    const notes = [];
    let posts = [], all = [];
    try {
      all = parseRss(await fetchText(FEED));
      posts = all.filter(isChainPost).map((p) => blogRow(p, forks.map((f) => f.name)));
      notes.push(`Base blog: ${posts.length} of ${all.length} feed posts kept (category Engineering, about the chain itself: upgrades, scaling, fees, proofs, flashblocks, outages, clients, EIPs). Dates are the posts' own publish dates; a post gets a target upgrade only if its title names a configured Base upgrade.`);
    } catch (e) {
      notes.push(`Base blog not included in this build: ${e.message}`);
    }
    return {
      proposals: [...forks.map((f) => row({
        chain: CHAIN, id: `Base:${f.name}`, title: `${f.name} upgrade (Base mainnet)`, status: f.sepoliaOnly && !f.value ? 'sepolia-only (per source)' : forkStatus(f.value),
        target_upgrade: f.name, type: 'network upgrade',
        dates: f.value ? [{ label: 'mainnet activation (UTC)', value: isoFromUnix(f.value) }] : [],
        url: blob(REPO, REF, PATH),
      })), ...posts],
      notes: [...notes,'Base has no public proposal repo found in github.com/base; upgrades come from the client chain config. Status is activated/scheduled by comparing the stated timestamp with build time.'],
    };
  },
};
