// Deterministic protocol-layer tags, derived from a proposal's own title, abstract and type.
// No model, no guessing: each tag lists the exact terms that matched, so the UI can show why.
// A title hit counts double; the top three tags by score are kept. No hit, no tag.
// A handful of well-known proposals whose text no sane rule catches are set by hand in
// lib/tag-overrides.js, each with a one-line reason; the UI labels those "curated", not "derived".
import { OVERRIDES } from './tag-overrides.js';

export const TAGS = [
  'execution', 'state', 'fee-market', 'consensus', 'networking', 'blobs-da',
  'account-abstraction', 'crypto-precompiles', 'interop-crosschain', 'governance-meta', 'native-assets', 'app-standard',
];

// [tag, pattern, scope, weight]. scope 'title' = only counts when found in the title (for broad words).
const RULES = [
  ['execution', /\bEVM\b/], ['execution', /\bopcodes?\b/i], ['execution', /\bEOF\b/], ['execution', /\bbytecode\b/i],
  ['execution', /\bparallel (execution|evm)\b/i], ['execution', /\b(transaction|tx) (types?|formats?|envelopes?)\b/i],
  ['execution', /\bnew (transaction|tx) type\b/i], ['execution', /\bSELFDESTRUCT\b/i], ['execution', /\bCREATE2?\b/],
  ['execution', /\b(contract )?code size\b/i], ['execution', /\binitcode\b/i], ['execution', /\bmemory (expansion|costs?|costing|limits?|model|pages?)\b|\blinear memory\b/i],
  ['execution', /\b(static )?jumps?\b|\bJUMPDEST\b|\bsubroutines?\b/i], ['execution', /\b(SWAPN|DUPN|EXCHANGE|CLZ|SLOTNUM|BLOBHASH|BASEFEE|PUSH0|MCOPY|TSTORE|TLOAD)\b/],
  ['execution', /\binstruction(s| set)?\b/i], ['execution', /\bcontract (creation|deployment)\b/i], ['execution', /\bexecution (layer|engine|client)s?\b/i],
  ['execution', /\bsystem (calls?|contracts?)\b/i], ['execution', /\bcall stack\b/i], ['execution', /\breturn ?data\b/i],

  ['state', /\bstate (trees?|tries?|growth|expiry|roots?|size|access|creation|rent|sync|commitments?)\b/i], ['state', /\bverkle\b/i],
  ['state', /\b(merkle[- ])?patricia\b|\btries?\b/i], ['state', /\bstateless(ness)?\b/i], ['state', /\bhistory (expiry|pruning)\b|\bhistorical (block|data|state)\b/i],
  ['state', /\bstorage\b/i], ['state', /\bSSTORE\b|\bSLOAD\b/], ['state', /\baccess lists?\b/i], ['state', /\bwitness(es)?\b/i],
  ['state', /\bstate\b/i, 'title'], ['state', /\b(binary|unified) tree\b/i], ['state', /\bsnapshots?\b/i, 'title'],

  ['fee-market', /\bgas (costs?|prices?|limits?|schedule|pricing|accounting|refunds?|targets?|fees?|tokens?|floor|ceiling|metering)\b/i],
  ['fee-market', /\bgas\b/i, 'title'], ['fee-market', /\bbase ?fees?\b/i], ['fee-market', /\bEIP-?1559\b/i], ['fee-market', /\bpriority fees?\b/i],
  ['fee-market', /\bfee (market|vaults?|recipients?|tokens?|distribution|burn(ing)?)\b/i], ['fee-market', /\bfees?\b/i, 'title'],
  ['fee-market', /\b(re)?pric(e|es|ing)\b/i], ['fee-market', /\bcalldata (cost|floor|pricing)\b/i], ['fee-market', /\bblob base fee\b/i],
  ['fee-market', /\bmulti-?dimensional\b/i], ['fee-market', /\bL1[- ](cost|pricing|fees?|gas)\b/i], ['fee-market', /\bburn(ing)? mechanism\b/i],

  ['consensus', /\bfinality\b/i], ['consensus', /\bvalidators?\b/i], ['consensus', /\bstak(e|es|ed|ing)\b/i], ['consensus', /\bproof[- ]of[- ](stake|work)\b/i],
  ['consensus', /\bPoS\b|\bPoW\b|\bBFT\b|\bProgPoW\b/], ['consensus', /\bfork[- ]choice\b/i], ['consensus', /\be?PBS\b|\bFOCIL\b/],
  ['consensus', /\binclusion lists?\b/i], ['consensus', /\bproposers?\b/i], ['consensus', /\bblock (production|builders?|building|time|interval)s?\b/i],
  ['consensus', /\bactive (validator )?set\b/i], ['consensus', /\bslash(ing|ed|es)?\b/i], ['consensus', /\battest(ation|ations|ers)\b/i], ['consensus', /(?<!(BNB|BC|Binance) )\bbeacon (chain|blocks?|state|nodes?|roots?|committees?|proposers?)\b/i],
  ['consensus', /\bconsensus\b/i], ['consensus', /\bcommittees?\b/i], ['consensus', /\bdeposit contract\b/i], ['consensus', /\bepochs?\b/i],
  ['consensus', /\bsequenc(er|ers|ing)\b/i], ['consensus', /\bdifficulty\b/i], ['consensus', /(?<!liquidity )\bmining\b/i], ['consensus', /\bDKG\b/],
  ['consensus', /\bchurn\b/i], ['consensus', /\bdelegators?\b/i], ['consensus', /(?<!(storage|balance|and) )\bslots?\b/i, 'title'],

  ['networking', /\bp2p\b|\bpeer[- ]to[- ]peer\b|\bdevp2p\b/i], ['networking', /\bgossip(sub)?\b/i], ['networking', /\bsync(ing|hroni[sz]ation)?\b/i],
  ['networking', /\bsnap\/\d\b|\beth\/\d+\b/i], ['networking', /\bmempool\b|\btx ?pool\b|\btransaction pool\b|\bblobpool\b/i],
  ['networking', /\b(JSON-?)?RPC\b/i], ['networking', /\bengine API\b/i], ['networking', /\b(node |peer )?discovery\b/i], ['networking', /\bENR\b/],
  ['networking', /\b(wire|networking|network) protocol\b/i], ['networking', /\blight clients?\b/i], ['networking', /\bbroadcast(ing)?\b/i],
  ['networking', /\bRaptorCast\b/i], ['networking', /\bpeers?\b/i], ['networking', /\bbandwidth\b/i], ['networking', /\bpropagation\b/i],
  ['networking', /\b(eth|wallet)_[a-zA-Z]+\b/], ['networking', /\bprovider\b/i, 'title'],

  ['blobs-da', /\bblobs?\b/i], ['blobs-da', /\bdata availability\b/i], ['blobs-da', /\bDAS\b|\bPeerDAS\b/], ['blobs-da', /\bdata columns?\b/i],
  ['blobs-da', /\bBPO\d*\b|\bblob[- ]parameter[- ]only\b/i], ['blobs-da', /\bcalldata\b/i], ['blobs-da', /\b(proto-?)?danksharding\b|\bsharding\b/i],
  ['blobs-da', /\bKZG\b/], ['blobs-da', /\bDA\b/, 'title'],

  ['account-abstraction', /\baccount abstraction\b/i], ['account-abstraction', /\bAA\b/], ['account-abstraction', /\bsmart (contract )?(accounts?|wallets?)\b/i],
  ['account-abstraction', /\bpaymasters?\b/i], ['account-abstraction', /\b(ERC|EIP)-?(4337|7702|3074|7560)\b/i], ['account-abstraction', /\bsession keys?\b/i],
  ['account-abstraction', /\bsponsor(ed|ship|s)?\b/i], ['account-abstraction', /\bfee payers?\b/i], ['account-abstraction', /\bbundlers?\b/i],
  ['account-abstraction', /\bUserOperations?\b/i], ['account-abstraction', /\bset(s)? (the )?code\b/i], ['account-abstraction', /\bEOAs?\b/],
  ['account-abstraction', /\baccess keys?\b/i], ['account-abstraction', /\bkeychain\b/i], ['account-abstraction', /\bpasskeys?\b|\bWebAuthn\b/i],
  ['account-abstraction', /\bconfigurable accounts?\b/i], ['account-abstraction', /\bdelegat(ion|ed) (code|designations?)\b/i],
  ['account-abstraction', /\b(account|key) (migration|recovery|rotation)\b/i], ['account-abstraction', /\bnative accounts?\b/i], ['account-abstraction', /\babstraction\b/i, 'title'],

  ['crypto-precompiles', /\bprecompiles?d?\b/i, 'title'], ['crypto-precompiles', /\belliptic curves?\b|\bcurve (operations|arithmetic)\b/i], ['crypto-precompiles', /\bBLS(12-381)?\b/],
  ['crypto-precompiles', /\bsecp256[rk]1\b|\bP-?256\b/i], ['crypto-precompiles', /\bBN-?254\b|\balt_bn128\b|\bbn128\b/i],
  ['crypto-precompiles', /\bhash (functions?|algorithms?)\b|\bhashing\b/i], ['crypto-precompiles', /\bkeccak(256)?\b|\bSHA-?(256|3)\b|\bblake2[bf]?\b|\bposeidon\b/i],
  ['crypto-precompiles', /\bzk-?(SNARK|STARK|EVM|VM)s?\b|\bSNARKs?\b|\bSTARKs?\b|\bzero[- ]knowledge\b|\bZK\b/i],
  ['crypto-precompiles', /\bpost[- ]quantum\b|\bPQ\b|\bFalcon\d*\b|\bDilithium\b|\bML-DSA\b/], ['crypto-precompiles', /\bsignatures?\b(?! (schemes?|verification|aggregation|algorithms?)\b)/i, 'title'], ['crypto-precompiles', /\bsignature (schemes?|verification|aggregation|algorithms?)\b/i],
  ['crypto-precompiles', /\bEd25519\b/i], ['crypto-precompiles', /\bpairings?\b/i], ['crypto-precompiles', /\bMODEXP\b|\bmodular exponentiation\b/i],
  ['crypto-precompiles', /\bKZG\b/], ['crypto-precompiles', /\bcryptograph(y|ic)\b/i], ['crypto-precompiles', /\bVRF\b|\bverifiable random/i],

  ['interop-crosschain', /\bbridg(e|es|ing)\b/i], ['interop-crosschain', /\bintents?\b/i], ['interop-crosschain', /\bcross[- ]?chain\b/i],
  ['interop-crosschain', /\binterop(erability)?\b/i], ['interop-crosschain', /\bL1[- /]?(to[- ])?L2\b|\bL2[- ]to[- ]L1\b/i], ['interop-crosschain', /\bL2s?\b|\bL3s?\b/],
  ['interop-crosschain', /\brollups?\b/i], ['interop-crosschain', /\bsuperchain\b/i], ['interop-crosschain', /\bmessag(e|ing) passing\b|\bcross-?domain\b/i],
  ['interop-crosschain', /\bZones?\b|\bZoneFactory\b/], ['interop-crosschain', /\b(L2|fast) withdrawals?\b/i], ['interop-crosschain', /\bsettlement\b/i],
  ['interop-crosschain', /\bportals?\b/i], ['interop-crosschain', /\bteleport\b/i], ['interop-crosschain', /\b(fault|fraud|validity) proofs?\b|\bdispute games?\b|\bBoLD\b/i],
  ['interop-crosschain', /\bopBNB\b|\bGreenfield\b/],

  ['governance-meta', /\bhard ?fork meta\b|\bmeta (EIP|BEP|TIP|MIP)\b/i], ['governance-meta', /\bgovernance\b/i], ['governance-meta', /\bpurpose and guidelines\b/i],
  ['governance-meta', /\bsecurity council\b/i], ['governance-meta', /\btreasury\b/i], ['governance-meta', /\bDAO\b/], ['governance-meta', /\bconstitution(al)?\b/i],
  ['governance-meta', /\bgrants?\b/i, 'title'], ['governance-meta', /\b(governance|DAO|delegate|token[- ]holder) vot(e|es|ing)\b|\bvoting (power|cycle|period)\b/i], ['governance-meta', /\bquorum\b/i], ['governance-meta', /\belections?\b/i],
  ['governance-meta', /\bbudget\b/i, 'title'], ['governance-meta', /\bfund(s|ing)\b/i, 'title'], ['governance-meta', /\bprocess\b/i, 'title'], ['governance-meta', /\bparameters?\b/i, 'title'],
  ['governance-meta', /\bownership\b|\bproxy ?admin\b|\bupgrade executor\b/i], ['governance-meta', /\bmaintenance upgrade\b/i], ['governance-meta', /\bdelegates?\b/i, 'title'],

  ['app-standard', /\btoken standard\b/i], ['app-standard', /\bNFTs?\b|\bnon-fungible\b/i], ['app-standard', /\b(ERC|BEP)-?(20|721|1155)\b/i],
  ['app-standard', /\bwallet (interface|standard|API)s?\b/i],
];

// Protocol-only vocabulary, added after a hand audit of every untagged and protocol row (see test/tags.test.js).
// Not applied to app standards, where words like 'chain id', 'nonce' or 'orders' mean something else.
const PROTO_RULES = [
  ['account-abstraction', /\bframes?\b(?! pointers?)/i, 'title'], ['account-abstraction', /\bframe (transactions?|abstraction)\b/i],
  ['account-abstraction', /\b(EIP|RIP)-?(8141|7701|7560|2938|5806|7377|5003|7851|7819|8164|8130|7712)\b/i],
  ['account-abstraction', /\bkeystore accounts?\b|\bauthenticators?\b|\bdelegation indicators?\b|\b(delegation|set ?code) authori[sz]ations?\b|\bauthori[sz]ation lists?\b|\bkeyed nonces?\b|\b2D nonces?\b|\bnonce (abstraction|domains?)\b/i],
  ['account-abstraction', /\bgas payment\b|\bpay(s|ing)? (for )?(gas|fees)\b|\bgasless\b/i], ['account-abstraction', /\btransaction validation\b|\bvalidation (logic|phase|frames?)\b/i],
  ['execution', /\b(transactions?|txs?)\b/i, 'title', 0.5], ['execution', /\breplay (attack )?protection\b|\b(account )?nonces?\b|\btransactions? from senders\b/i], ['execution', /\bchain ?ids?\b/i, 'title'],
  ['execution', /\breceipts?\b|\b(event |system )?logs?\b|\bbloom filters?\b|\bblock headers?\b|\bBLOCKHASH\b|\bCOINBASE\b/i, 'title'],
  ['execution', /\b(delayed|deferred|async(hronous)?|optimistic) execution\b|\bpipelin(e|ed|ing)\b/i],
  ['execution', /\b(DELEGATECALL|STATICCALL|CALLCODE|SELFBALANCE|CHAINID|GAS2ETH|EXTCODE\w*|SWAP\d*|DUP\d*)\b/], ['execution', /\bstack (manipulation|depth|access)\b/i],
  ['execution', /\baccount versioning\b|\balias contracts?\b|\bscheduled (function )?calls\b|\bconditional transactions?\b|\btransaction assertions?\b|\bcontracts? (forward|calls)\b/i],
  ['execution', /\bblock[- ]level access lists?\b|\bBALs?\b/i],
  ['state', /\bstate (clearing|tiering|conversion|migration|healing|retention)\b|\bempty accounts?\b|\btouched accounts?\b|\btiering\b/i],
  ['state', /\bwarm(ing|ed)?\b|\bcold (access|reads?)\b|\baccount (writes?|changes)\b/i], ['state', /\bcode (merkleization|chunk(s|ing)?)\b|\bmerkleization\b/i],
  ['fee-market', /\bcosts?\b|\bcosting\b|\bdiscounts?\b|\bfloor\b|\bmetering\b/i, 'title'], ['fee-market', /\bblock size\b|\bgas units?\b|\bmilli-?gas\b/i],
  ['consensus', /(?<!Provider )\bexits?\b|\bconsolidations?\b|\bwithdrawal credentials?\b|\beffective balance\b|\b(deposit|consolidation|withdrawal|exit|execution( layer)?) requests?\b|\brequest bus\b|\bEL requests\b/i],
  ['consensus', /\bWhisk\b|\bSSLE\b|\bRANDAO\b|\brandomness\b|\b(proposer )?lookahead\b|\bClique\b|\bproof[- ]of[- ]authority\b|\bParlia\b|\bEthash\b|\bFNV\b/i],
  ['consensus', /\bMEV\b|\bTimeboost\b|\b(transaction|priority) ordering\b|\bordering policy\b/i], ['consensus', /\bbuilders?\b/i, 'title'],
  ['consensus', /\bBeacon(Block|State|BlockBody)\w*\b|\beth1 ?data\b|\bblock (latency|rewards?)\b|\bissuance\b(?! platform)|\btimestamp drift\b|\bbackoff\b|\bin-turn\b/i],
  ['networking', /\bSSZ\b|\bRLP\b/], ['networking', /\bserializ(e|ed|ation)\b|\bmultiproofs?\b|\bProgressive(List|Container|BitList)\b|\bCompatibleUnion\b/i],
  ['networking', /\bannounce (transactions?|txs?)\b|\b(transaction|tx) announcements?\b|\bsubscriptions?\b|\bmetrics\b|\bgenesis (files?|format)\b|\btrace (spec|format)\w*\b/i, 'title'],
  ['blobs-da', /\bblob (transactions?|streaming|sidecars?|reconstruction|inclusion)\b|\bshard blob\b|\bEIP-?4844\b/i],
  ['crypto-precompiles', /\bpoint evaluation\b|\bZKPs?\b|\bNTT\b|\becRecover\b|\bexecution proofs?\b|\bHTLC\b/i],
  ['interop-crosschain', /\bHTLC\b|\batomic (peg|swaps?)\b|\brelayers?\b/i],
  ['governance-meta', /\bmascots?\b|\bnaming conventions?\b|\bupgrade naming\b|\bactivation (triggers?|mechanisms?)\b|\bupgrade signal(l)?ing\b|\b(EIP|upgrade) activation\b/i],
  ['governance-meta', /\bEIPs?\/ERCs?\b|\bERCs?\/EIPs?\b|\btestnets?\b|\bhard[- ]?fork\b/i, 'title'],
  ['governance-meta', /\bfrontmatter\b|\bpreamble\b|\bEIP headers?\b/i], ['governance-meta', /\birregular state (change|transition)s?\b|\brestore (the )?contract code\b|\brecovery proposals?\b|\bfrozen (funds|ether|ETH|ARB)\b/i],
  // Polygon / Avalanche vocabulary (audit of the new chains, Nov 2026)
  ['governance-meta', /\b(Frontier|Homestead|Byzantium|Constantinople|Istanbul|Berlin|London|Shanghai|Cancun|Dencun|Prague|Pectra|Osaka|Fusaka|Amsterdam|Glamsterdam)( EIPs)?\b/, 'title'],
  ['governance-meta', /\b(protocol|security|community) council\b|\bcouncil membership\b|\bclassification\b|\bworkflow\b/i, 'title'],
  ['consensus', /\bHeimdall\b|\bTendermint\b|\bCometBFT\b|\bcosmos-sdk\b|\bsprint ?length\b|\bSprintLength\b|\bround change\b|\bperformance benchmark\b|\buptime\b|\bemissions?\b|\bepoch rewards?\b|\bvalidator rewards?\b/i],
  ['interop-crosschain', /\bStateSync\b|\bstate ?syncs? (confirmations?|transactions?)\b|\bfailed state syncs\b|\bcheckpoints?\b|\bsubnets?\b|\bWarp Messaging\b/i],
  ['fee-market', /\bBaseFee\w+\b|\bmin(imum)? ?gas( price)?\b|\bMinGas\b|\bmulti[- ]currency\b|\bfee currenc(y|ies)\b/i],
  ['native-assets', /\bPOL\b|\bMATIC\b|\btotal supply\b|\bflash swaps?\b/],
  ['account-abstraction', /\bsigner authori[sz]ation\b/i],
  ['networking', /\bhardware (requirements|recommendations)\b|\bclient version\b/i],
  // Sei vocabulary: pointer contracts expose Cosmos-native tokens as ERC tokens; IBC is Cosmos interop
  ['native-assets', /\bpointers?\b/i, 'title'], ['interop-crosschain', /\bIBC\b/], ['consensus', /\bunbonding\b/i],
  // Base engineering blog vocabulary
  ['consensus', /\bFlashblocks\b|\bpre-?confirmations?\b|\bpostmortem\b|\bincident\b|\boutage\b|\bnetwork (briefly )?stalled\b/i],
  ['interop-crosschain', /\bStage [12]\b|\bMT-?Cannon\b|\bCannon\b|\bOP Stack\b|\bfault[- ]proof\w*\b/],
  ['networking', /\bbenchmark(s|ing)?\b|\bclient performance\b|\bReth\b|\bmonitoring\b/i, 'title'],
  ['governance-meta', /\bGoerli\b|\bSepolia\b|\bmainnet launch\b|\bPath to \w+ Mainnet\b/, 'title'],
  // enshrined assets: chains that ship tokens, a DEX or transfer policy in the protocol itself (Tempo, BNB Beacon Chain)
  ['native-assets', /\bTIP-?20\b|\bBEP-?2\b|\bMini-BEP2\b|\btoken (symbol|management|issuance)\b|\btokens on (the )?BNB\b|\btime[- ]lock(ing)? of tokens\b/i],
  ['native-assets', /\bStablecoin ?DEX\b|\bFeeAMM\b|\bmatch(ing)? engine\b|\btrading pairs?\b|\b(list(ing)?|trad(e|ing)) \w+ pairs\b|\b(flip|ask|bid|crossed|client) orders?\b|\border (IDs?|book|storage)\b|\bquote tokens?\b|\bdecentrali[sz]ed exchange\b|\bdelist\b/i],
  ['native-assets', /\bTIP-?403\b|\btransfer polic(y|ies)\b|\breceive polic(y|ies)\b|\bpolicy (IDs?|exemptions?)\b|\btransfer memo\b/i],
  ['native-assets', /\bpayment (lanes?|transactions?|channels?|transfers?)\b|\bchannel reserve\b|\bpure payment\b|\bstablecoins?\b/i],
];

/** Structural tags from fields the source states (kind, EIP category/type, row type). */
function structural(r) {
  const out = [];
  const type = r.type || '';
  if (r.kind === 'app standard') out.push(['app-standard', r.id.split('-')[0]]);
  if (/\bNetworking\b/.test(type)) out.push(['networking', 'category: Networking']);
  if (/\bInterface\b/.test(type)) out.push(['networking', 'category: Interface']);
  if (/^Meta\b|\/ Process\b|· Process\b|^BEP \/ Process|^Process/.test(type)) out.push(['governance-meta', `type: ${type}`]);
  if (/Snapshot vote|forum|^Sei governance\b/.test(type)) out.push(['governance-meta', 'governance vote/post']);
  if (/^network upgrade/.test(type)) out.push(['governance-meta', `type: ${type}`]);
  if (/blog post/.test(type) && r.target_upgrade) out.push(['governance-meta', `upgrade post: ${r.target_upgrade}`]);
  return out;
}

/** -> { tags: [...up to 3], why: { tag: [matched terms] } } */
export function classify(r) {
  const o = OVERRIDES[r.id];
  if (o && (!o.chain || o.chain === r.chain)) return curated(r, o);
  const title = r.title || '', abstract = r.abstract || '';
  const score = new Map(), why = {};
  const hit = (tag, term, pts) => {
    score.set(tag, (score.get(tag) || 0) + pts);
    (why[tag] ||= []).includes(term) || why[tag].push(term);
  };
  for (const [tag, term] of structural(r)) hit(tag, term, 3);
  for (const [tag, re, scope, w = 1] of r.kind === 'app standard' ? RULES : [...RULES, ...PROTO_RULES]) {
    const t = re.exec(title);
    if (t) { hit(tag, t[0], 2 * w); continue; }
    if (scope !== 'title') { const a = re.exec(abstract); if (a) hit(tag, a[0], w); }
  }
  const tags = [...score.entries()].sort((a, b) => b[1] - a[1] || TAGS.indexOf(a[0]) - TAGS.indexOf(b[0])).slice(0, 3).map(([t]) => t);
  const subs = {};
  for (const t of tags) { const s = subFor(t, r); if (s) subs[t] = s; }
  return { tags, why: Object.fromEntries(tags.map((t) => [t, why[t]])), subs, curated: null };
}

/** Hand-set layers for one proposal. 'layer/sub' fixes the sub; a bare 'layer' still derives its sub from the text. */
function curated(r, o) {
  const tags = [], subs = {}, why = {};
  for (const spec of o.tags) {
    const [t, sub] = spec.split('/');
    if (!TAGS.includes(t)) throw new Error(`tag-overrides: unknown layer ${t} for ${r.id}`);
    if (sub && !SUBS[t]?.some(([id]) => id === sub)) throw new Error(`tag-overrides: unknown sub ${spec} for ${r.id}`);
    tags.push(t); why[t] = ['curated'];
    const s = sub ? { sub, why: ['curated'] } : subFor(t, r);
    if (s) subs[t] = s;
  }
  return { tags, why, subs, curated: o.reason };
}

// ---------- second level: one sub per layer, same rules (whole words, title x2), never guessed ----------
// [sub id, label, [[pattern, weight?, scope?], ...]]. Order breaks ties, so more specific subs come first.
const N = (n) => new RegExp(`\\b(ERC|EIP)-?(${n})\\b`, 'i');
export const SUBS = {
  'app-standard': [
    ['smart-accounts', 'Smart accounts', [[N('4337|6900|7579|7702|6551|7710|7484|7562|5189|6315|7780|7947')], [/\bsmart (contract )?(accounts?|wallets?)\b/i], [/\bmodular (smart )?accounts?\b|\bmodules?\b/i], [/\baccount abstraction\b|\bAA\b/], [/\bUserOperations?\b|\bpaymasters?\b|\bbundlers?\b/i], [/\btoken bound accounts?\b/i], [/\bsocial recovery\b|\brecovery interface\b/i], [/\bdelegat(ed|ion) (accounts?|validation)\b/i], [/\bEOA smart account\b|\bhierarchical accounts?\b|\bportable smart contract accounts?\b/i], [N('725|7821|8000')], [/\bbatch (executor|executions?)\b|\bnon delegated EOAs\b/i]]],
    ['cross-chain', 'Cross-chain', [[N('7683|7802|5164|7930|7828|7831|7786|6170|7841|7888')], [/\bcross-?chain\b|\bcrosschain\b/i], [/\bmulti-?chain\b/i], [/\binterop(erable|erability)?\b/i], [/\bxERC-?20\b/i], [/\bbridg(e|es|ing)\b/i], [/\bchain[- ](id|identifiers?|specific)\b/i], [/\bL2\b/], [/\bmailbox\b|\bbroadcaster\b|\bmessaging gateway\b/i]]],
    ['rwa-compliance', 'RWA & compliance', [[/\bRWA\b|\buRWA\b/], [/\breal[- ]world assets?\b/i], [/\bcompli(ance|ant)\b/i], [/\bsecurity tokens?\b/i], [/\bregulated\b|\bregulatory\b|\bjurisdiction\b|\baccreditation\b/i], [/\bpermissioned\b/i], [/\bKYC\b|\bAML\b/], [/\bESG\b|\bNAV\b/], [/\bfinancial statements?\b|\breal estate\b|\bphysical(ly)? (assets?|backed)\b/i], [/\binsurance\b/i], [/\btransfer rules\b/i], [/\be-money\b/i]]],
    ['defi-vaults', 'DeFi & vaults', [[N('4626|7540|7575|7535|3156|5143|7887')], [/\bvaults?\b/i], [/\boracles?\b/i], [/\bAMMs?\b|\bPropAMM\b|\bDEX\b/], [/\bswaps?\b/i], [/\bderivatives?\b|\boptions\b|\bperpetual\b/i], [/\binterest rates?\b|\bbonds?\b|\byield\b|\bprincipal token\b/i], [/\blending\b|\bloans?\b|\bflash ?loans?\b|\bliens?\b|\bmortgage\b|\blease\b/i], [/\bcollateral(ized)?\b/i], [/\bliquidity\b|\bslippage\b|\bsolvency\b|\bbonding curve\b/i], [/\bstaking\b|\bstaked\b/i], [/\bescrow\b/i], [/\b(tokenized )?reserves?\b|\btime[- ]locks?\b|\bwrapped deposits?\b/i], [N('1973')]]],
    ['payments', 'Payments', [[N('1337|3009|7758')], [/\bpayments?\b|\bmicropayments?\b|\bpayable\b/i], [/\bsubscriptions?\b|\bauto-renewable\b/i], [/\b(money )?streaming\b/i], [/\binvoices?\b|\breceipts?\b/i], [/\bpurpose[- ]bound\b/i], [/\btransaction requests?\b/i], [/\bcommerce\b|\bshop\b/i], [/\btransfer with authorization\b/i], [/\bpayouts?\b|\bpayoutable\b/i]]],
    ['ai-agents', 'AI agents', [[/\bAI\b|\bML\b|\bZKML\b/], [/\bagents?\b|\bagentic\b/i]]],
    ['identity-naming', 'Identity & names', [[N('137|181|4361|5192|4973|1056|7734')], [/\bENS\b/], [/\bnames?\b|\bnaming\b|\bdomains?\b|\bresolution\b|\bresolver\b/i], [/\bDIDs?\b|\bdecentrali[sz]ed identit(y|ies)\b|\bidentit(y|ies)\b/i], [/\battestations?\b|\bclaims\b|\bcredentials?\b|\bendorsement\b/i], [/\bsoulbound\b|\bSBTs?\b|\baccount-bound\b|\bnon-tradable\b/i], [/\bprofiles?\b|\breputation\b|\bratings\b|\bmembership\b|\bbadge\b/i], [/\bsign-in with ethereum\b|\bSIWE\b|\blogin\b|\bsingle sign-on\b|\bauthentication\b/i], [/\bassociated accounts?\b|\bnotary\b|\bemployment\b/i]]],
    ['multi-token', 'Multi-token', [[N('1155|6909|3525')], [/\bmulti[- ]?tokens?\b/i], [/\bsemi-?fungible\b/i], [/\bmulti-class\b/i]]],
    ['privacy', 'Privacy', [[/\bstealth\b/i], [/\bconfidential\b/i], [/\bprivacy\b|\bprivate\b|\bshielded\b/i], [/\bzero[- ]knowledge\b|\bzk\b/i], [/\bencrypt(ion|ed)?\b|\bdecrypt(ion)?\b/i]]],
    ['wallets-signing', 'Wallets & signing', [[N('712|1271|1193|5792|191|6492|7739|7920|7964|7730|7715|2098')], [/\bsignatures?\b|\bsign(ed|ing)\b/i], [/\bwallets?\b/i], [/\b(JSON-?)?RPC\b|\bprovider\b|\bAPI\b/], [/\bsession keys?\b|\bkeystore\b|\bkey generation\b|\bmnemonics?\b|\bBIP-?(32|39|44)\b/i], [/\b(HD|deterministic) wallets?\b|\bhierarchical deterministic\b/i], [/\bmeta[- ]transactions?\b|\bgas relay\b|\bforwarder\b/i], [/\bchecksum\b|\baddress (encoding|format)\b|\baddresses\b/i], [/\bpermissions?\b|\bcapabilit(y|ies)\b/i], [N('1613|2334|3224|4430')], [/\bdescribed (data|transactions?)\b|\bhuman-readable descriptions?\b|\bgas stations?\b|\brelayed transactions?\b|\baccount hierarchy\b/i]]],
    ['nfts', 'NFTs', [[N('721|2981|4906|998|875')], [/\bNFTs?\b|\bnon-?fungible\b/i], [/\broyalt(y|ies)\b/i], [/\btokenURI\b|\beditions?\b/i], [/\brental\b|\brentable\b/i]]],
    ['fungible-tokens', 'Fungible tokens', [[N('20|777|223|2612|1363|7674|7410|5827')], [/\bBEP-?20\b/i], [/(?<!non-|semi-|re-)\bfungible\b/i], [/\bpermits?\b/i], [/\ballowances?\b|\bapprovals?\b/i], [/\bmint(ing)?\b|\bburn(ing)?\b/i], [/\btokens?\b/i, 0.5, 'title']]],
    ['proxies', 'Proxies', [[N('1167|1967|1822|2535|897|3448|3561|7511|7760|7201|8042|8109')], [/\bprox(y|ies)\b/i], [/\bupgrad(e|eable|ability|able)\b/i], [/\bdiamonds?\b|\bfacets?\b/i], [/\bstorage (layout|slots?)\b|\bnamespaced storage\b|\bdiamond storage\b/i], [/\bfactory\b|\bclones?\b|\bCREATE2\b|\bdelegatecall\b/i]]],
    ['uris-web3', 'URIs & web3 URLs', [[N('681|831|67|1710|4804|6860|5219|6944')], [/\bURIs?\b|\bURLs?\b/], [/\bweb3 url\b/i]]],
    ['metadata-introspection', 'Metadata & introspection', [[N('165|1820|820|5269|7572')], [/\binterface (detection|discovery)\b|\bintrospection\b|\bfeature detection\b|\bdetection interface\b/i], [/\bmetadata\b/i], [/\bcontract-level\b/i], [/\bregistry\b|\bregistries\b/i], [/\bpackag(e|ing)\b|\bABIs?\b/i], [/\berror(s)?\b|\bstatus codes\b|\brevert\b/i]]],
    ['dao-governance', 'DAO & voting', [[/\bDAOs?\b/], [/\bvot(e|es|ing)\b|\bpoll\b|\bgovernance\b|\bproposals?\b/i]]],
    ['access-control', 'Access control', [[N('173|5313|5982|7820|6617|6366|8023|1207')], [/\bownership\b|\baccess control\b|\broles?\b|\bpermission (token|bits?)\b|\bbit based permission\b|\bowners?\b|\bauthori[sz]ation delegation\b/i]]],
    ['data-offchain', 'Onchain data & offchain reads', [[N('3668|7412|7615|5018|7827|8100|8119|7813|8326|7585|8179|8180')], [/\boff-?chain data\b|\bCCIP\b|\bdata (feeds?|retrieval|storage)\b|\bkey[- ]value\b|\bstorage (keys?|proofs?)\b|\bfilesystem\b|\btables?\b|\bJSON\b|\bdocuments?\b|\bblob space\b|\bcontract state\b/i]]],
    ['dev-patterns', 'Contract patterns & tooling', [[N('5202|7744|7746|6372|5732|5750|1900|2193|3772|5850|7654|7884|801|5902|1129|1444|2848')], [/\bhooks?\b|\bmiddleware\b|\bblueprints?\b|\bcode index\b|\bclock\b|\bcommit(-reveal)?\b|\bextensibility\b|\btype system\b|\bdType\b|\bcompressed integers?\b|\bcomplex numbers\b|\bmulticalls?\b|\brequest methods?\b|\bcanary\b|\bannouncements?\b/i]]],
    ['games-social', 'Games, social & misc', [[N('7566|7509|3722|7439|7580|1491')], [/\bgames?\b|\bgaming\b|\bmultiplayer\b|\bsocial\b|\btickets?\b|\badvertis\w*\b|\bentity component\b/i]]],
  ],
  'account-abstraction': [
    ['sponsorship', 'Gas sponsorship & paymasters', [[/\bsponsor(ed|ship|s)?\b|\bpaymasters?\b|\bfee payers?\b|\bgas abstraction\b|\bpay (gas|fees) in\b|\bgasless\b/i]]],
    ['keys-auth', 'Keys, passkeys & permissions', [[/\b(access|session) keys?\b|\bkeychain\b|\bpasskeys?\b|\bWebAuthn\b|\bP-?256\b|\bsecp256r1\b/i], [/\bkey (rotation|recovery|migration)\b|\bpermissions?\b|\bspending limits?\b/i], [/\bauthenticators?\b|\bkeystore\b|\bsigner authori[sz]ation\b|\bkey (authori[sz]ations?|delegation)\b/i]]],
    ['eoa-delegation', 'EOA code & delegation', [[N('7702|3074|5003|7377'), 1.5], [/\bset(s)? (the )?code\b|\bEOAs?\b|\bdelegat(ion|ed|ion designations?)\b|\bAUTH(CALL)?\b/], [/\b(delegation|set ?code) authori[sz]ations?\b|\bauthori[sz]ation lists?\b|\bdelegation indicators?\b/i]]],
    ['native-aa', 'Native AA, frames & smart accounts', [[/\b(EIP|RIP|ERC)-?(4337|7560|2938|86|7701|8141|7712)\b/i, 1.5], [/\bframes?\b(?! pointers?)|\bframe transactions?\b|\btransaction validation\b|\bkeyed nonces?\b|\b2D nonces?\b|\bnative (AA|account abstraction|accounts?)\b|\bsmart (contract )?(accounts?|wallets?)\b|\bUserOperations?\b|\bbundlers?\b|\bentry ?point\b|\bvalidation\b|\bconfigurable accounts?\b|\babstraction\b/i]]],
  ],
  'execution': [
    ['eof-bytecode', 'EOF, bytecode & code size', [[/\bEOF\b/], [/\bbytecode\b|\binitcode\b|\bcode (size|loading)\b|\bcontract (code|creation|deployment)\b|\bcode hash\b/i], [/\bSELFDESTRUCT\b|\bCREATE2?\b|\bEXTCODE\w*\b/i], [/\bobject format\b/i], [/\baccount versioning\b|\balias contracts?\b|\b0xEF\b/i]]],
    ['opcodes', 'Opcodes & EVM semantics', [[/\bopcodes?\b|\binstructions?\b/i], [/\b(SWAPN|DUPN|EXCHANGE|CLZ|SLOTNUM|BLOBHASH|BASEFEE|PUSH0|MCOPY|TSTORE|TLOAD|JUMPDEST|CALLDATALOAD|DELEGATECALL|STATICCALL|CALLCODE|SELFBALANCE|CHAINID|EXP|SWAP|DUP)\b/], [/\bstack manipulation\b|\bcontrol flow\b|\b(modular )?arithmetic\b|\bprocedures\b/i], [/\bmemory\b|\bstack\b|\bjumps?\b|\bsubroutines?\b|\breturn ?data\b|\bcall stack\b/i], [/\bsystem (calls?|contracts?)\b/i]]],
    ['tx-types', 'Transactions & validity', [[/\b(transaction|tx) (types?|formats?|envelopes?)\b|\bnew (transaction|tx) type\b|\btyped transactions?\b/i], [/\bSSZ transactions?\b|\bframe transactions?\b|\bbatch(ed)? transactions?\b|\b(composable|agile) transactions?\b|\btransaction signatures?\b/i], [/\breplay (attack )?protection\b|\bchain ?ids?\b|\bnonces?\b|\btransactions? from senders\b|\bconditional transactions?\b|\bscheduled (function )?calls\b|\btransaction (assertions?|source)\b/i], [/\b(transactions?|txs?)\b/i, 0.25, 'title']]],
    ['blocks-logs', 'Blocks, receipts & logs', [[/\breceipts?\b|\blogs?\b|\bbloom( filters?)?\b|\bblock headers?\b|\bheader\b|\bBLOCKHASH\b|\bblock hash(es)?\b|\bCOINBASE\b|\btimestamps?\b|\blog index\b/i]]],
    ['parallel', 'Parallel & delayed execution', [[/\bparallel\b/i], [/\bconcurren(t|cy)\b/i], [/\b(delayed|deferred|async(hronous)?|optimistic) execution\b|\bpipelin(e|ed|ing)\b/i], [/\bblock[- ]level access lists?\b|\bBALs?\b/i, 0.5]]],
  ],
  'state': [
    ['trees', 'State trees & stateless', [[/\bverkle\b|\bbinary (tree|trie)\b|\bunified tree\b|\bpatricia\b|\btries?\b|\bstate (trees?|roots?|commitments?)\b|\bmerkle\b/i], [/\bstateless(ness)?\b|\bwitness(es)?\b/i], [/\bcode (merkleization|chunk(s|ing)?)\b|\bmerkleization\b|\bstate (conversion|migration)\b|\bPBT\b/i]]],
    ['expiry-history', 'State growth, expiry & history', [[/\bstate (clearing|tiering|retention)\b|\btiering\b|\bempty accounts?\b|\btouched accounts?\b|\bEIP-?161\b|\b(state|history) expiry\b|\bhistory\b|\bhistorical\b|\bpruning\b|\bexpir(y|ation)\b|\bstate growth\b|\bstate rent\b/i]]],
    ['storage-access', 'Storage & access lists', [[/\bstorage\b|\bSSTORE\b|\bSLOAD\b|\bslots?\b/i], [/\baccess lists?\b/i], [/\bstate (creation|access|diffs?)\b/i], [/\bwarm(ing|ed)?\b|\bcold (access|reads?)\b|\baccount (writes?|changes)\b/i]]],
  ],
  'fee-market': [
    ['blob-fees', 'Blob fees', [[/\bblob (base )?fees?\b|\bblob gas\b|\bexcess blob\b|\bblob pric\w*\b/i]]],
    ['l2-fees', 'L2 & operator fees', [[/\bL1[- ](cost|pricing|fees?|gas|data)\b|\bfee vaults?\b|\boperator fees?\b|\bsequencer fees?\b|\bfee (router|recipients?|distribution|config)\b|\bL2\b/i]]],
    ['gas-limits', 'Gas limits & block size', [[/\bgas limits?\b|\bblock (size|gas)\b|\bblock gas limit\b|\bgas target\b|\btransaction gas (limit|cap)\b|\bgas cap\b|\bblock size\b/i]]],
    ['base-fee', 'Base fee & fee market', [[/\bbase ?fees?\b|\bEIP-?1559\b|\bpriority fees?\b|\bfee market\b|\bburn(ing)?\b|\btips?\b|\bgas price\b|\bmulti-?dimensional\b|\bBaseFee\w+\b|\bmin(imum)? ?gas( price)?\b|\bMinGas\b|\bmulti[- ]currency\b|\bfee currenc(y|ies)\b/i]]],
    ['repricing', 'Gas repricing', [[/\brepric(e|es|ing)\b|\bgas (costs?|schedule|pricing|accounting|metering)\b|\bpricing\b|\bcosts?\b|\bintrinsic\b|\bcalldata (cost|floor)\b|\brefunds?\b|\bdiscounts?\b|\bfloor\b|\bmetering\b|\bmilli-?gas\b|\bgas units?\b|\bcosting\b/i]]],
  ],
  'consensus': [
    ['pbs-inclusion', 'PBS, MEV & ordering', [[/\be?PBS\b|\bFOCIL\b/], [/\bTimeboost\b|\bpriority ordering\b|\bordering policy\b|\bMEVless\b/i], [/\binclusion lists?\b|\bproposer-builder\b|\bbuilders?\b|\bMEV\b|\bpreconf\w*\b|\bpre-confirmations?\b|\bFlashblocks\b|\btransaction ordering\b|\bordering\b/i]]],
    ['finality', 'Finality', [[/\bfinality\b|\bfinali[sz]ed?\b|\bfork[- ]choice\b|\bBFT\b|\bvoting pool\b|\bround change\b|\bmilestones?\b/i]]],
    ['validators-staking', 'Validators & staking', [[/\bvalidators?\b|\bstak(e|es|ed|ing)\b|\bslash(ing|ed)?\b|\bdeposits?\b|\bwithdrawals?\b|\bchurn\b|\bactive set\b|\bdelegators?\b|\bcommittees?\b|\battest\w*\b/i], [/\bexits?\b|\bconsolidations?\b|\bwithdrawal credentials?\b|\beffective balance\b|\b(deposit|consolidation|withdrawal|exit|execution( layer)?) requests?\b|\brequest bus\b|\bissuance\b(?! platform)|\beth1 ?data\b|\bemissions?\b|\b(epoch|validator|staking) rewards?\b|\buptime\b|\bperformance benchmark\b/i]]],
    ['randomness', 'Randomness & proposer lookahead', [[/\bRANDAO\b|\brandao_reveal\b|\bVRF\b|\brandomness\b|\blookahead\b|\bWhisk\b|\bSSLE\b|\b(leader|proposer) election\b/i]]],
    ['block-time', 'Block time & slots', [[/\bblock (time|interval)s?\b|\bslots?\b|\bepochs?\b|\bslot (time|duration)\b|\bsub-second\b|\bmilliseconds?\b|\bblock latency\b|\bpostmortem\b|\boutage\b|\bincident\b|\btimestamp drift\b|\bbackoff\b|\bin-turn\b|\bquick slots\b|\bsprint ?length\b|\bSprintLength\b/i]]],
    ['pow', 'PoW & PoA (historical)', [[/\bPoW\b|\bproof[- ]of[- ]work\b|\bProgPoW\b|(?<!liquidity )\bmining\b|\bdifficulty\b|\bEthash\b|\bFNV\b|\bClique\b|\bproof[- ]of[- ]authority\b|\bblock rewards?\b|\bdifficulty bomb\b/i]]],
  ],
  'networking': [
    ['rpc', 'RPC, APIs & client config', [[/\b(JSON-?)?RPC\b|\bAPIs?\b|\b(eth|wallet|debug|engine)_[a-zA-Z]+\b/], [/\bengine API\b|\bproviders?\b|\bwallet (call|permissions?)\b|\bsubscriptions?\b|\bmetrics\b|\bgenesis (files?|format)\b|\bconfig files?\b|\btrace\b|\bwindow\.\w+\b|\bhardware\b|\bclient version\b|\bbenchmark(s|ing)?\b|\bReth\b|\bmonitoring\b/i, 0.5]]],
    ['serialization', 'SSZ, RLP & encoding', [[/\bSSZ\b|\bRLP\b/], [/\bserializ(e|ed|ation)\b|\bmultiproofs?\b|\bProgressive(List|Container|BitList)\b|\bCompatibleUnion\b|\bsnappy\b|\bdata structures\b/i]]],
    ['mempool', 'Mempool & tx propagation', [[/\bmempool\b|\btx ?pool\b|\btransaction pool\b|\bblobpool\b|\bbroadcast(ing)?\b|\bpropagation\b|\bRaptorCast\b|\bannounce (transactions?|txs?)\b|\b(transaction|tx) announcements?\b/i]]],
    ['sync', 'Sync', [[/\bsync(ing|hroni[sz]ation)?\b|\bsnap\/\d\b|\bcheckpoint\b|\blight clients?\b/i]]],
    ['devp2p', 'devp2p & wire protocol', [[/\bdevp2p\b|\beth\/\d+\b|\bwire\b|\bp2p\b|\bpeer[- ]to[- ]peer\b|\bgossip(sub)?\b|\bdiscovery\b|\bENR\b|\bpeers?\b|\bforkid\b|\bnetwork protocol\b/i]]],
  ],
  'blobs-da': [
    ['peerdas', 'PeerDAS & sampling', [[/\bPeerDAS\b|\bDAS\b/], [/\bsampling\b|\bdata columns?\b|\bcustody\b|\berasure\b|\bcells?\b|\breconstruction\b|\bRowDAS\b/i]]],
    ['blob-params', 'Blob parameters & BPO', [[/\bBPO\d*\b|\bblob[- ]parameter[- ]only\b|\bblob (count|target|schedule|parameters?|limit)s?\b|\bmax(imum)? blobs\b|\bblobs per block\b/i]]],
    ['blob-tx', 'Blob transactions & streaming', [[/\bblob (transactions?|streaming|sidecars?|inclusion)\b|\bshard blob\b|\bEIP-?4844\b|\bblock-in-blobs\b|\bblob-carrying\b/i]]],
    ['calldata', 'Calldata', [[/\bcalldata\b/i]]],
  ],
  'crypto-precompiles': [
    ['zk-pq', 'ZK & post-quantum', [[/\bzk-?(SNARK|STARK|EVM|VM)s?\b|\bSNARKs?\b|\bSTARKs?\b|\bzero[- ]knowledge\b|\bZK\b/i], [/\bpost[- ]quantum\b|\bPQ\b|\bFalcon\d*\b|\bDilithium\b|\bML-DSA\b|\bquantum\b|\bNTT\b|\bZKPs?\b|\bexecution proofs?\b/i]]],
    ['curves', 'Curves & signatures', [[/\bBLS(12-381)?\b|\bsecp256[rk]1\b|\bP-?256\b|\bBN-?254\b|\balt_bn128\b|\bbn128\b|\bEd25519\b|\bcurves?\b|\bpairings?\b|\bMODEXP\b|\bmodular exponentiation\b|\bKZG\b|\bpoint evaluation\b/i], [/\bsignatures?\b|\bECDSA\b|\bECRECOVER\b/i]]],
    ['hashing', 'Hashing', [[/\bhash(es|ing)?( functions?)?\b|\bkeccak(256)?\b|\bSHA-?(256|3)\b|\bblake2[bf]?\b|\bposeidon\b|\bRIPEMD\b/i]]],
    ['other-precompiles', 'Other precompiles', [[/\bprecompiles?d?\b/i]]],
  ],
  'interop-crosschain': [
    ['superchain', 'Superchain, interop & sequencing', [[/\bsuperchain\b|\bOP Stack\b|\binterop(erability)?\b|\bsequenc(er|ers|ing)\b|\bchain servicer\b/i]]],
    ['messaging', 'L1↔L2 messaging & bridges', [[/\bbridg(e|es|ing)\b|\bcross[- ]?chain\b|\bmessag(e|es|ing)\b|\bdeposits?\b|\bwithdrawals?\b|\bportals?\b|\bL1[- /]?(to[- ])?L2\b|\bL2[- ]to[- ]L1\b|\bHTLC\b|\batomic (peg|swaps?)\b|\brelayers?\b|\bStateSync\b|\bstate ?syncs?\b|\bcheckpoints?\b|\bWarp\b/i]]],
    ['rollups', 'Rollups & proofs', [[/\brollups?\b|\bRIP-?\d+\b|\bL2s?\b|\b(fault|fraud|validity) proofs?\b|\bdispute games?\b|\bBoLD\b|\bprestate\b|\bStage [12]\b|\bCannon\b|\bMT-?Cannon\b|\bdecentrali[sz]ation\b|\b[Ss]ubnets?\b|\bZones?\b|\bZoneFactory\b/]]],
  ],
  'governance-meta': [
    ['hardfork-meta', 'Hardfork meta & upgrades', [[/\bhard ?fork meta\b|\bmeta (EIP|BEP|TIP|MIP)\b|\bnetwork upgrade\b|\bupgrade proposal\b|\bArbOS\b|\bhard[- ]?forks?\b|\bactivation\b|\bupgrade signal(l)?ing\b|\btestnets?\b|\bnetwork upgrades?\b|\bGoerli\b|\bSepolia\b|\bmainnet launch\b/i], [/\bupgrade\b|\brevision\b/i, 1, 'title'], [/\b(Frontier|Homestead|Byzantium|Constantinople|Istanbul|Berlin|London|Shanghai|Cancun|Dencun|Prague|Pectra|Osaka|Fusaka|Amsterdam|Glamsterdam)( EIPs)?\b/, 1, 'title']]],
    ['process', 'Process', [[/\bprocess\b|\bpurpose and guidelines\b|\beditors?\b|\bguidelines\b|\bstatus terms?\b|\bmascots?\b|\bnaming\b|\bEIPs?\/ERCs?\b|\bERCs?\/EIPs?\b|\bfrontmatter\b|\bheaders?\b|\bclassification\b|\bcanonicali[sz]e the name\b/i]]],
    ['council-treasury', 'Council, treasury & DAO', [[/\bsecurity council\b|\btreasury\b|\bDAO\b|\bgrants?\b|\bbudget\b|\bfunds?\b|\bfunding\b|\bconstitution(al)?\b|\belections?\b|\bdelegates?\b|\bquorum\b|\bfoundation\b|\belect(ed|ion|ions)?\b|\bShah\b|\bcouncil\b|\bmembership\b/i]]],
    ['irregular-state', 'Irregular state changes & recovery', [[/\birregular state\b|\brestore (the )?contract code\b|\brecovery proposals?\b|\bfrozen (funds|ether|ETH|ARB)\b|\bDAO fork\b|\bether distribution\b/i]]],
    ['parameters', 'Parameter & config changes', [[/\bparameters?\b|\bconfig(uration)?\b|\bownership\b|\bproxy ?admin\b|\bmaintenance upgrade\b|\bkey rotation\b|\brotation\b/i]]],
  ],
  'native-assets': [
    ['transfer-policy', 'Transfer policies & compliance', [[/\bTIP-?403\b|\btransfer polic(y|ies)\b|\breceive polic(y|ies)\b|\bpolicy (IDs?|exemptions?)\b|\bpolicies\b|\btransfer memo\b|\bcompliance\b/i]]],
    ['payments', 'Payment lanes & channels', [[/\bpayments?\b|\bchannels?\b|\bvouchers?\b/i]]],
    ['native-dex', 'Enshrined DEX', [[/\bStablecoin ?DEX\b|\bFeeAMM\b|\bDEX\b|\bmatch(ing)? engine\b|\btrading pairs?\b|\bpairs\b|\borders?\b|\bquote tokens?\b|\bdecentrali[sz]ed exchange\b|\bdelist\b|\bswaps?\b/i]]],
    ['native-tokens', 'Native tokens', [[/\bTIP-?20\b|\bBEP-?2\b|\bMini-BEP2\b|\btokens?\b|\bpermit\b|\bapprovals?\b|\bvirtual addresses\b|\brewards\b|\blogo\b|\bPOL\b|\bMATIC\b|\btotal supply\b|\bmigration\b/i]]],
  ],
};
export const SUB_LABEL = Object.fromEntries(Object.entries(SUBS).flatMap(([t, subs]) => subs.map(([id, label]) => [`${t}/${id}`, label])));

/** -> { sub, why } | null. Best-scoring sub for a layer; ties go to the earlier (more specific) sub. */
export function subFor(tag, r) {
  const subs = SUBS[tag];
  if (!subs) return null;
  const title = `${r.kind === 'app standard' ? `${r.id} ` : ''}${r.title || ''}`, abstract = r.abstract || '';
  let best = null;
  for (const [id, , rules] of subs) {
    let score = 0; const why = [];
    for (const [re, w = 1, scope] of rules) {
      const t = re.exec(title);
      if (t) { score += 2 * w; why.includes(t[0]) || why.push(t[0]); continue; }
      if (scope !== 'title') { const a = re.exec(abstract); if (a) { score += w; why.includes(a[0]) || why.push(a[0]); } }
    }
    if (score > (best?.score || 0)) best = { sub: id, why, score };
  }
  if (!best && tag === 'networking' && /\bInterface\b/.test(r.type || '')) return { sub: 'rpc', why: ['category: Interface'] };
  if (!best && tag === 'networking' && /\bNetworking\b/.test(r.type || '')) return { sub: 'devp2p', why: ['category: Networking'] };
  if (!best && tag === 'governance-meta' && /^network upgrade/.test(r.type || '')) return { sub: 'hardfork-meta', why: [`type: ${r.type}`] };
  if (!best && tag === 'governance-meta' && /blog post/.test(r.type || '') && r.target_upgrade) return { sub: 'hardfork-meta', why: [`upgrade post: ${r.target_upgrade}`] };
  return best && { sub: best.sub, why: best.why };
}
