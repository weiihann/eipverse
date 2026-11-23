// Avalanche (C-Chain / Primary Network): ACPs in avalanche-foundation/ACPs (ACPs/<n>-<slug>/README.md, each opening
// with a metadata table), plus mainnet network upgrade times from avalanchego upgrade/upgrade.go (`Mainnet = Config{`).
import { ghList, fetchText, raw, blob, tree, pool, row, sectionText, isoFromUnix, forkStatus } from '../lib/util.js';

const CHAIN = 'Avalanche C-Chain';
const ACPS = 'avalanche-foundation/ACPs', ACPS_REF = 'main';
const AVAGO = 'ava-labs/avalanchego', AVAGO_REF = 'master', UPG = 'upgrade/upgrade.go';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const plain = (s) => (s || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').trim();

/** ACP README metadata table: | ACP | 77 | / | **Title** | ... | / | **Status** | Activated ([Discussion](...)) | ... */
export function parseAcp(text, path) {
  const meta = {};
  for (const line of text.split('\n')) {
    if (!/^\|/.test(line)) { if (Object.keys(meta).length) break; continue; }
    const c = line.split('|').slice(1, -1).map((x) => x.trim());
    if (c.length >= 2 && !/^:?-+/.test(c[0])) meta[plain(c[0]).toLowerCase()] = c[1];
  }
  const n = plain(meta.acp);
  if (!/^\d+$/.test(n)) return null;
  // "Activated ([Discussion](...))" -> "Activated"; keep any other wording as stated.
  const status = plain(meta.status).replace(/\s*\(?\s*Discussion\s*\)?\s*$/i, '').trim();
  return row({
    chain: CHAIN, id: `ACP-${n}`, title: plain(meta.title), status: status || null, abstract: sectionText(text, ['abstract', 'summary']),
    url: blob(ACPS, ACPS_REF, path), type: meta.track ? `ACP · ${plain(meta.track)}` : 'ACP',
  });
}

/** `<Name>Time: time.Date(2024, time.March, 6, 16, 0, 0, 0, time.UTC)` or `UnscheduledActivationTime` in `Mainnet = Config{`. */
export function parseAvalancheMainnet(src) {
  const start = src.indexOf('Mainnet = Config{');
  if (start < 0) return [];
  const body = src.slice(start, src.indexOf('\n\t}', start));
  const out = [];
  const re = /^\s*(\w+?)Time:\s*(?:time\.Date\((\d{4}), time\.(\w+), (\d+), (\d+), (\d+), (\d+), \d+, time\.UTC\)|(\w+))/gm;
  for (let m; (m = re.exec(body));) {
    if (m[8]) { out.push({ name: m[1], value: null, raw: m[8] }); continue; }
    const t = Date.UTC(+m[2], MONTHS.indexOf(m[3]), +m[4], +m[5], +m[6], +m[7]) / 1000;
    out.push({ name: m[1], value: String(t), raw: null });
  }
  return out;
}

const spaced = (s) => s.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/Pre 6/, 'Pre6').replace(/Post 6/, 'Post6');

export function upgradeRow(u) {
  return row({
    chain: CHAIN, network: 'Avalanche Primary Network (P/X/C)', id: `Avalanche:${u.name}`, title: `${spaced(u.name)} network upgrade (Avalanche mainnet)`,
    status: u.value ? forkStatus(u.value) : /unscheduled/i.test(u.raw || '') ? 'unscheduled (per source)' : 'no mainnet time set',
    target_upgrade: spaced(u.name), type: 'network upgrade',
    dates: u.value ? [{ label: 'mainnet activation (UTC)', value: isoFromUnix(u.value) }] : [],
    url: `${blob(AVAGO, AVAGO_REF, UPG)}#:~:text=${u.name}Time`,
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'avalanche-foundation/ACPs ACPs/*/README.md metadata tables', url: tree(ACPS, ACPS_REF, 'ACPs') },
    { label: 'avalanchego upgrade/upgrade.go Mainnet config (upgrade times)', url: blob(AVAGO, AVAGO_REF, UPG) },
  ],
  async fetch() {
    const dirs = (await ghList(ACPS, 'ACPs', ACPS_REF)).filter((f) => f.type === 'dir' && /^\d+-/.test(f.name));
    const acps = await pool(dirs, 16, async (d) => parseAcp(await fetchText(raw(ACPS, ACPS_REF, `${d.path}/README.md`)), `${d.path}/README.md`));
    const ups = parseAvalancheMainnet(await fetchText(raw(AVAGO, AVAGO_REF, UPG)));
    return {
      proposals: [...acps.filter(Boolean), ...ups.map(upgradeRow)],
      notes: [
        'ACP metadata tables have no dates, so ACP rows are undated. Upgrade times are the avalanchego mainnet config; a time set to UnscheduledActivationTime is shown as unscheduled.',
        'Upgrades apply to the whole Primary Network (P-, X- and C-Chain). ACP tables do not name the upgrade that activated them, so ACP rows have no target upgrade.',
      ],
    };
  },
};
