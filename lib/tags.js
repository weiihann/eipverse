// Deterministic protocol-layer tags, derived from a proposal's own title, abstract and type.
// No model, no guessing: each tag lists the exact terms that matched, so the UI can show why.
// A title hit counts double; the top three tags by score are kept. No hit, no tag.

export const TAGS = [
  'execution', 'state', 'fee-market', 'consensus', 'networking', 'blobs-da',
  'account-abstraction', 'crypto-precompiles', 'interop-crosschain', 'governance-meta', 'app-standard',
];

// [tag, pattern, scope]. scope 'title' = only counts when found in the title (for broad words).
const RULES = [
  ['execution', /\bEVM\b/], ['execution', /\bopcodes?\b/i], ['execution', /\bEOF\b/], ['execution', /\bbytecode\b/i],
  ['execution', /\bparallel (execution|evm)\b/i], ['execution', /\b(transaction|tx) (types?|formats?|envelopes?)\b/i],
  ['execution', /\bnew (transaction|tx) type\b/i], ['execution', /\bSELFDESTRUCT\b/i], ['execution', /\bCREATE2?\b/],
  ['execution', /\b(contract )?code size\b/i], ['execution', /\binitcode\b/i], ['execution', /\bmemory (expansion|cost|limit)s?\b/i],
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
  ['consensus', /\bsequenc(er|ers|ing)\b/i], ['consensus', /\bdifficulty\b/i], ['consensus', /\bmining\b/i], ['consensus', /\bDKG\b/],
  ['consensus', /\bchurn\b/i], ['consensus', /\bdelegators?\b/i], ['consensus', /\bslots?\b/i, 'title'],

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

  ['crypto-precompiles', /\bprecompiles?d?\b/i], ['crypto-precompiles', /\belliptic curves?\b|\bcurve (operations|arithmetic)\b/i], ['crypto-precompiles', /\bBLS(12-381)?\b/],
  ['crypto-precompiles', /\bsecp256[rk]1\b|\bP-?256\b/i], ['crypto-precompiles', /\bBN-?254\b|\balt_bn128\b|\bbn128\b/i],
  ['crypto-precompiles', /\bhash(es|ing)?( functions?)?\b/i], ['crypto-precompiles', /\bkeccak(256)?\b|\bSHA-?(256|3)\b|\bblake2[bf]?\b|\bposeidon\b/i],
  ['crypto-precompiles', /\bzk-?(SNARK|STARK|EVM|VM)s?\b|\bSNARKs?\b|\bSTARKs?\b|\bzero[- ]knowledge\b|\bZK\b/i],
  ['crypto-precompiles', /\bpost[- ]quantum\b|\bPQ\b|\bFalcon\b|\bDilithium\b|\bML-DSA\b/], ['crypto-precompiles', /\bsignatures?( schemes?| verification| aggregation)?\b/i],
  ['crypto-precompiles', /\bEd25519\b/i], ['crypto-precompiles', /\bpairings?\b/i], ['crypto-precompiles', /\bMODEXP\b|\bmodular exponentiation\b/i],
  ['crypto-precompiles', /\bKZG\b/], ['crypto-precompiles', /\bcryptograph(y|ic)\b/i], ['crypto-precompiles', /\bVRF\b|\bverifiable random/i],

  ['interop-crosschain', /\bbridg(e|es|ing)\b/i], ['interop-crosschain', /\bintents?\b/i], ['interop-crosschain', /\bcross[- ]?chain\b/i],
  ['interop-crosschain', /\binterop(erability)?\b/i], ['interop-crosschain', /\bL1[- /]?(to[- ])?L2\b|\bL2[- ]to[- ]L1\b/i], ['interop-crosschain', /\bL2s?\b|\bL3s?\b/],
  ['interop-crosschain', /\brollups?\b/i], ['interop-crosschain', /\bsuperchain\b/i], ['interop-crosschain', /\bmessag(e|ing) passing\b|\bcross-?domain\b/i],
  ['interop-crosschain', /\bZones?\b/], ['interop-crosschain', /\b(L2|fast) withdrawals?\b/i], ['interop-crosschain', /\bsettlement\b/i],
  ['interop-crosschain', /\bportals?\b/i], ['interop-crosschain', /\bteleport\b/i], ['interop-crosschain', /\b(fault|fraud|validity) proofs?\b|\bdispute games?\b|\bBoLD\b/i],
  ['interop-crosschain', /\bopBNB\b|\bGreenfield\b/],

  ['governance-meta', /\bhard ?fork meta\b|\bmeta (EIP|BEP|TIP|MIP)\b/i], ['governance-meta', /\bgovernance\b/i], ['governance-meta', /\bpurpose and guidelines\b/i],
  ['governance-meta', /\bsecurity council\b/i], ['governance-meta', /\btreasury\b/i], ['governance-meta', /\bDAO\b/], ['governance-meta', /\bconstitution(al)?\b/i],
  ['governance-meta', /\bgrants?\b/i, 'title'], ['governance-meta', /\b(governance|DAO|delegate|token[- ]holder) vot(e|es|ing)\b|\bvoting (power|cycle|period)\b/i], ['governance-meta', /\bquorum\b/i], ['governance-meta', /\belections?\b/i],
  ['governance-meta', /\bbudget\b/i], ['governance-meta', /\bfund(s|ing)\b/i, 'title'], ['governance-meta', /\bprocess\b/i, 'title'], ['governance-meta', /\bparameters?\b/i, 'title'],
  ['governance-meta', /\bownership\b|\bproxy ?admin\b|\bupgrade executor\b/i], ['governance-meta', /\bmaintenance upgrade\b/i], ['governance-meta', /\bdelegates?\b/i],

  ['app-standard', /\btoken standard\b/i], ['app-standard', /\bNFTs?\b|\bnon-fungible\b/i], ['app-standard', /\b(ERC|BEP)-?(20|721|1155)\b/i],
  ['app-standard', /\bwallet (interface|standard|API)s?\b/i],
];

/** Structural tags from fields the source states (kind, EIP category/type, row type). */
function structural(r) {
  const out = [];
  const type = r.type || '';
  if (r.kind === 'app standard') out.push(['app-standard', r.id.split('-')[0]]);
  if (/\bNetworking\b/.test(type)) out.push(['networking', 'category: Networking']);
  if (/\bInterface\b/.test(type)) out.push(['networking', 'category: Interface']);
  if (/^Meta\b|\/ Process\b|^BEP \/ Process|^Process/.test(type)) out.push(['governance-meta', `type: ${type}`]);
  if (/Snapshot vote|forum/.test(type)) out.push(['governance-meta', 'governance vote/post']);
  return out;
}

/** -> { tags: [...up to 3], why: { tag: [matched terms] } } */
export function classify(r) {
  const title = r.title || '', abstract = r.abstract || '';
  const score = new Map(), why = {};
  const hit = (tag, term, pts) => {
    score.set(tag, (score.get(tag) || 0) + pts);
    (why[tag] ||= []).includes(term) || why[tag].push(term);
  };
  for (const [tag, term] of structural(r)) hit(tag, term, 3);
  for (const [tag, re, scope] of RULES) {
    const t = re.exec(title);
    if (t) { hit(tag, t[0], 2); continue; }
    if (scope !== 'title') { const a = re.exec(abstract); if (a) hit(tag, a[0], 1); }
  }
  const tags = [...score.entries()].sort((a, b) => b[1] - a[1] || TAGS.indexOf(a[0]) - TAGS.indexOf(b[0])).slice(0, 3).map(([t]) => t);
  return { tags, why: Object.fromEntries(tags.map((t) => [t, why[t]])) };
}
