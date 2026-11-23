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
  const subs = {};
  for (const t of tags) { const s = subFor(t, r); if (s) subs[t] = s; }
  return { tags, why: Object.fromEntries(tags.map((t) => [t, why[t]])), subs };
}

// ---------- second level: one sub per layer, same rules (whole words, title x2), never guessed ----------
// [sub id, label, [[pattern, weight?, scope?], ...]]. Order breaks ties, so more specific subs come first.
const N = (n) => new RegExp(`\\b(ERC|EIP)-?(${n})\\b`, 'i');
export const SUBS = {
  'app-standard': [
    ['smart-accounts', 'Smart accounts', [[N('4337|6900|7579|7702|6551|7710|7484|7562|5189|6315|7780|7947')], [/\bsmart (contract )?(accounts?|wallets?)\b/i], [/\bmodular (smart )?accounts?\b|\bmodules?\b/i], [/\baccount abstraction\b|\bAA\b/], [/\bUserOperations?\b|\bpaymasters?\b|\bbundlers?\b/i], [/\btoken bound accounts?\b/i], [/\bsocial recovery\b|\brecovery interface\b/i], [/\bdelegat(ed|ion) (accounts?|validation)\b/i], [/\bEOA smart account\b|\bhierarchical accounts?\b|\bportable smart contract accounts?\b/i]]],
    ['cross-chain', 'Cross-chain', [[N('7683|7802|5164|7930|7828|7831|7786|6170|7841|7888')], [/\bcross-?chain\b|\bcrosschain\b/i], [/\bmulti-?chain\b/i], [/\binterop(erable|erability)?\b/i], [/\bxERC-?20\b/i], [/\bbridg(e|es|ing)\b/i], [/\bchain[- ](id|identifiers?|specific)\b/i], [/\bL2\b/], [/\bmailbox\b|\bbroadcaster\b|\bmessaging gateway\b/i]]],
    ['rwa-compliance', 'RWA & compliance', [[/\bRWA\b|\buRWA\b/], [/\breal[- ]world assets?\b/i], [/\bcompli(ance|ant)\b/i], [/\bsecurity tokens?\b/i], [/\bregulated\b|\bregulatory\b|\bjurisdiction\b|\baccreditation\b/i], [/\bpermissioned\b/i], [/\bKYC\b|\bAML\b/], [/\bESG\b|\bNAV\b/], [/\bfinancial statements?\b|\breal estate\b|\bphysical(ly)? (assets?|backed)\b/i], [/\binsurance\b/i], [/\btransfer rules\b/i], [/\be-money\b/i]]],
    ['defi-vaults', 'DeFi & vaults', [[N('4626|7540|7575|7535|3156|5143|7887')], [/\bvaults?\b/i], [/\boracles?\b/i], [/\bAMMs?\b|\bPropAMM\b|\bDEX\b/], [/\bswaps?\b/i], [/\bderivatives?\b|\boptions\b|\bperpetual\b/i], [/\binterest rates?\b|\bbonds?\b|\byield\b|\bprincipal token\b/i], [/\blending\b|\bloans?\b|\bflash ?loans?\b|\bliens?\b|\bmortgage\b|\blease\b/i], [/\bcollateral(ized)?\b/i], [/\bliquidity\b|\bslippage\b|\bsolvency\b|\bbonding curve\b/i], [/\bstaking\b|\bstaked\b/i], [/\bescrow\b/i]]],
    ['payments', 'Payments', [[N('1337|3009|7758')], [/\bpayments?\b|\bmicropayments?\b|\bpayable\b/i], [/\bsubscriptions?\b|\bauto-renewable\b/i], [/\b(money )?streaming\b/i], [/\binvoices?\b|\breceipts?\b/i], [/\bpurpose[- ]bound\b/i], [/\btransaction requests?\b/i], [/\bcommerce\b|\bshop\b/i], [/\btransfer with authorization\b/i], [/\bpayouts?\b|\bpayoutable\b/i]]],
    ['ai-agents', 'AI agents', [[/\bAI\b|\bML\b|\bZKML\b/], [/\bagents?\b|\bagentic\b/i]]],
    ['identity-naming', 'Identity & names', [[N('137|181|4361|5192|4973|1056|7734')], [/\bENS\b/], [/\bnames?\b|\bnaming\b|\bdomains?\b|\bresolution\b|\bresolver\b/i], [/\bDIDs?\b|\bdecentrali[sz]ed identit(y|ies)\b|\bidentit(y|ies)\b/i], [/\battestations?\b|\bclaims\b|\bcredentials?\b|\bendorsement\b/i], [/\bsoulbound\b|\bSBTs?\b|\baccount-bound\b|\bnon-tradable\b/i], [/\bprofiles?\b|\breputation\b|\bratings\b|\bmembership\b|\bbadge\b/i], [/\bsign-in with ethereum\b|\bSIWE\b|\blogin\b|\bsingle sign-on\b|\bauthentication\b/i]]],
    ['multi-token', 'Multi-token', [[N('1155|6909|3525')], [/\bmulti[- ]?tokens?\b/i], [/\bsemi-?fungible\b/i], [/\bmulti-class\b/i]]],
    ['privacy', 'Privacy', [[/\bstealth\b/i], [/\bconfidential\b/i], [/\bprivacy\b|\bprivate\b|\bshielded\b/i], [/\bzero[- ]knowledge\b|\bzk\b/i], [/\bencrypt(ion|ed)?\b|\bdecrypt(ion)?\b/i]]],
    ['wallets-signing', 'Wallets & signing', [[N('712|1271|1193|5792|191|6492|7739|7920|7964|7730|7715|2098')], [/\bsignatures?\b|\bsign(ed|ing)\b/i], [/\bwallets?\b/i], [/\b(JSON-?)?RPC\b|\bprovider\b|\bAPI\b/], [/\bsession keys?\b|\bkeystore\b|\bkey generation\b|\bmnemonics?\b|\bBIP-?(32|39|44)\b/i], [/\b(HD|deterministic) wallets?\b|\bhierarchical deterministic\b/i], [/\bmeta[- ]transactions?\b|\bgas relay\b|\bforwarder\b/i], [/\bchecksum\b|\baddress (encoding|format)\b|\baddresses\b/i], [/\bpermissions?\b|\bcapabilit(y|ies)\b/i]]],
    ['nfts', 'NFTs', [[N('721|2981|4906|998|875')], [/\bNFTs?\b|\bnon-?fungible\b/i], [/\broyalt(y|ies)\b/i], [/\btokenURI\b|\beditions?\b/i], [/\brental\b|\brentable\b/i]]],
    ['fungible-tokens', 'Fungible tokens', [[N('20|777|223|2612|1363|7674|7410|5827')], [/\bBEP-?20\b/i], [/(?<!non-|semi-|re-)\bfungible\b/i], [/\bpermits?\b/i], [/\ballowances?\b|\bapprovals?\b/i], [/\bmint(ing)?\b|\bburn(ing)?\b/i], [/\btokens?\b/i, 0.5, 'title']]],
    ['proxies', 'Proxies', [[N('1167|1967|1822|2535|897|3448|3561|7511|7760|7201|8042|8109')], [/\bprox(y|ies)\b/i], [/\bupgrad(e|eable|ability|able)\b/i], [/\bdiamonds?\b|\bfacets?\b/i], [/\bstorage (layout|slots?)\b|\bnamespaced storage\b|\bdiamond storage\b/i], [/\bfactory\b|\bclones?\b|\bCREATE2\b|\bdelegatecall\b/i]]],
    ['uris-web3', 'URIs & web3 URLs', [[N('681|831|67|1710|4804|6860|5219|6944')], [/\bURIs?\b|\bURLs?\b/], [/\bweb3 url\b/i]]],
    ['metadata-introspection', 'Metadata & introspection', [[N('165|1820|820|5269|7572')], [/\binterface (detection|discovery)\b|\bintrospection\b|\bfeature detection\b|\bdetection interface\b/i], [/\bmetadata\b/i], [/\bcontract-level\b/i], [/\bregistry\b|\bregistries\b/i], [/\bpackag(e|ing)\b|\bABIs?\b/i], [/\berror(s)?\b|\bstatus codes\b|\brevert\b/i]]],
    ['dao-governance', 'DAO & voting', [[/\bDAOs?\b/], [/\bvot(e|es|ing)\b|\bpoll\b|\bgovernance\b|\bproposals?\b/i]]],
    ['access-control', 'Access control', [[N('173|5313|5982|7820|6617|6366|8023')], [/\bownership\b|\baccess control\b|\broles?\b|\bpermission (token|bits?)\b|\bbit based permission\b|\bowners?\b/i]]],
  ],
  'account-abstraction': [
    ['sponsorship', 'Gas sponsorship & paymasters', [[/\bsponsor(ed|ship|s)?\b|\bpaymasters?\b|\bfee payers?\b|\bgas abstraction\b|\bpay (gas|fees) in\b/i]]],
    ['keys-auth', 'Keys, passkeys & permissions', [[/\b(access|session) keys?\b|\bkeychain\b|\bpasskeys?\b|\bWebAuthn\b|\bP-?256\b|\bsecp256r1\b/i], [/\bkey (rotation|recovery|migration)\b|\bpermissions?\b|\bspending limits?\b/i]]],
    ['eoa-delegation', 'EOA code & delegation', [[N('7702|3074|5003|7377'), 1.5], [/\bset(s)? (the )?code\b|\bEOAs?\b|\bdelegat(ion|ed|ion designations?)\b|\bAUTH(CALL)?\b/]]],
    ['native-aa', 'Native AA & smart accounts', [[N('4337|7560|2938|86|7701'), 1.5], [/\bnative (AA|account abstraction|accounts?)\b|\bsmart (contract )?(accounts?|wallets?)\b|\bUserOperations?\b|\bbundlers?\b|\bentry ?point\b|\bvalidation\b|\bconfigurable accounts?\b|\babstraction\b/i]]],
  ],
  'execution': [
    ['eof-bytecode', 'EOF, bytecode & code size', [[/\bEOF\b/], [/\bbytecode\b|\binitcode\b|\bcode (size|loading)\b|\bcontract (code|creation|deployment)\b|\bcode hash\b/i], [/\bSELFDESTRUCT\b|\bCREATE2?\b|\bEXTCODE\w*\b/i], [/\bobject format\b/i]]],
    ['tx-types', 'Transaction types', [[/\b(transaction|tx) (types?|formats?|envelopes?)\b|\bnew (transaction|tx) type\b|\btyped transactions?\b/i], [/\bSSZ transactions?\b|\bframe transactions?\b|\bbatch(ed)? transactions?\b/i], [/\btransactions? (receipts?|signatures?)\b|\breceipts?\b/i]]],
    ['parallel', 'Parallel execution', [[/\bparallel\b/i], [/\bconcurren(t|cy)\b/i]]],
    ['opcodes', 'Opcodes & EVM semantics', [[/\bopcodes?\b|\binstructions?\b/i], [/\b(SWAPN|DUPN|EXCHANGE|CLZ|SLOTNUM|BLOBHASH|BASEFEE|PUSH0|MCOPY|TSTORE|TLOAD|JUMPDEST|CALLDATALOAD)\b/], [/\bmemory\b|\bstack\b|\bjumps?\b|\bsubroutines?\b|\breturn ?data\b|\bcall stack\b/i], [/\bsystem (calls?|contracts?)\b|\blogs?\b/i]]],
  ],
  'state': [
    ['trees', 'State trees & stateless', [[/\bverkle\b|\bbinary (tree|trie)\b|\bunified tree\b|\bpatricia\b|\btries?\b|\bstate (trees?|roots?|commitments?)\b|\bmerkle\b/i], [/\bstateless(ness)?\b|\bwitness(es)?\b/i]]],
    ['expiry-history', 'State & history expiry', [[/\b(state|history) expiry\b|\bhistory\b|\bhistorical\b|\bpruning\b|\bexpir(y|ation)\b|\bstate growth\b|\bstate rent\b/i]]],
    ['storage-access', 'Storage & access lists', [[/\bstorage\b|\bSSTORE\b|\bSLOAD\b|\bslots?\b/i], [/\baccess lists?\b/i], [/\bstate (creation|access|diffs?)\b/i]]],
  ],
  'fee-market': [
    ['blob-fees', 'Blob fees', [[/\bblob (base )?fees?\b|\bblob gas\b|\bexcess blob\b|\bblob pric\w*\b/i]]],
    ['l2-fees', 'L2 & operator fees', [[/\bL1[- ](cost|pricing|fees?|gas|data)\b|\bfee vaults?\b|\boperator fees?\b|\bsequencer fees?\b|\bfee (router|recipients?|distribution|config)\b|\bL2\b/i]]],
    ['gas-limits', 'Gas limits & block size', [[/\bgas limits?\b|\bblock (size|gas)\b|\bblock gas limit\b|\bgas target\b|\btransaction gas (limit|cap)\b|\bgas cap\b/i]]],
    ['base-fee', 'Base fee & fee market', [[/\bbase ?fees?\b|\bEIP-?1559\b|\bpriority fees?\b|\bfee market\b|\bburn(ing)?\b|\btips?\b|\bgas price\b|\bmulti-?dimensional\b/i]]],
    ['repricing', 'Gas repricing', [[/\brepric(e|es|ing)\b|\bgas (costs?|schedule|pricing|accounting|metering)\b|\bpricing\b|\bcosts?\b|\bintrinsic\b|\bcalldata (cost|floor)\b|\brefunds?\b/i]]],
  ],
  'consensus': [
    ['pbs-inclusion', 'PBS & inclusion lists', [[/\be?PBS\b|\bFOCIL\b/], [/\binclusion lists?\b|\bproposer-builder\b|\bbuilders?\b|\bMEV\b|\bpreconf\w*\b|\btransaction ordering\b|\bordering\b/i]]],
    ['finality', 'Finality', [[/\bfinality\b|\bfinali[sz]ed?\b|\bfork[- ]choice\b|\bBFT\b|\bvoting pool\b/i]]],
    ['validators-staking', 'Validators & staking', [[/\bvalidators?\b|\bstak(e|es|ed|ing)\b|\bslash(ing|ed)?\b|\bdeposits?\b|\bwithdrawals?\b|\bchurn\b|\bactive set\b|\bdelegators?\b|\bcommittees?\b|\battest\w*\b/i]]],
    ['block-time', 'Block time & slots', [[/\bblock (time|interval)s?\b|\bslots?\b|\bepochs?\b|\bslot (time|duration)\b|\bsub-second\b|\bmilliseconds?\b/i]]],
    ['pow', 'Proof of work (historical)', [[/\bPoW\b|\bproof[- ]of[- ]work\b|\bProgPoW\b|\bmining\b|\bdifficulty\b|\bEthash\b/i]]],
  ],
  'networking': [
    ['rpc', 'RPC & engine API', [[/\b(JSON-?)?RPC\b|\bengine API\b|\b(eth|wallet|debug|engine)_[a-zA-Z]+\b|\bprovider\b|\bAPI\b/]]],
    ['mempool', 'Mempool & tx propagation', [[/\bmempool\b|\btx ?pool\b|\btransaction pool\b|\bblobpool\b|\bbroadcast(ing)?\b|\bpropagation\b|\bRaptorCast\b/i]]],
    ['sync', 'Sync', [[/\bsync(ing|hroni[sz]ation)?\b|\bsnap\/\d\b|\bcheckpoint\b|\blight clients?\b/i]]],
    ['devp2p', 'devp2p & wire protocol', [[/\bdevp2p\b|\beth\/\d+\b|\bwire\b|\bp2p\b|\bpeer[- ]to[- ]peer\b|\bgossip(sub)?\b|\bdiscovery\b|\bENR\b|\bpeers?\b|\bforkid\b|\bnetwork protocol\b/i]]],
  ],
  'blobs-da': [
    ['peerdas', 'PeerDAS & sampling', [[/\bPeerDAS\b|\bDAS\b/], [/\bsampling\b|\bdata columns?\b|\bcustody\b|\berasure\b|\bcells?\b/i]]],
    ['blob-params', 'Blob parameters & BPO', [[/\bBPO\d*\b|\bblob[- ]parameter[- ]only\b|\bblob (count|target|schedule|parameters?|limit)s?\b|\bmax(imum)? blobs\b|\bblobs per block\b/i]]],
    ['calldata', 'Calldata', [[/\bcalldata\b/i]]],
  ],
  'crypto-precompiles': [
    ['zk-pq', 'ZK & post-quantum', [[/\bzk-?(SNARK|STARK|EVM|VM)s?\b|\bSNARKs?\b|\bSTARKs?\b|\bzero[- ]knowledge\b|\bZK\b/i], [/\bpost[- ]quantum\b|\bPQ\b|\bFalcon\b|\bDilithium\b|\bML-DSA\b|\bquantum\b/i]]],
    ['curves', 'Curves & signatures', [[/\bBLS(12-381)?\b|\bsecp256[rk]1\b|\bP-?256\b|\bBN-?254\b|\balt_bn128\b|\bbn128\b|\bEd25519\b|\bcurves?\b|\bpairings?\b|\bMODEXP\b|\bmodular exponentiation\b/i], [/\bsignatures?\b|\bECDSA\b|\bECRECOVER\b/i]]],
    ['hashing', 'Hashing', [[/\bhash(es|ing)?( functions?)?\b|\bkeccak(256)?\b|\bSHA-?(256|3)\b|\bblake2[bf]?\b|\bposeidon\b|\bRIPEMD\b/i]]],
  ],
  'interop-crosschain': [
    ['superchain', 'Superchain, interop & sequencing', [[/\bsuperchain\b|\binterop(erability)?\b|\bsequenc(er|ers|ing)\b|\bchain servicer\b/i]]],
    ['messaging', 'L1↔L2 messaging & bridges', [[/\bbridg(e|es|ing)\b|\bcross[- ]?chain\b|\bmessag(e|es|ing)\b|\bdeposits?\b|\bwithdrawals?\b|\bportals?\b|\bL1[- /]?(to[- ])?L2\b|\bL2[- ]to[- ]L1\b/i]]],
    ['rollups', 'Rollups & proofs', [[/\brollups?\b|\bRIP-?\d+\b|\bL2s?\b|\b(fault|fraud|validity) proofs?\b|\bdispute games?\b|\bBoLD\b|\bprestate\b|\bZones?\b/]]],
  ],
  'governance-meta': [
    ['hardfork-meta', 'Hardfork meta & upgrades', [[/\bhard ?fork meta\b|\bmeta (EIP|BEP|TIP|MIP)\b|\bnetwork upgrade\b|\bupgrade proposal\b|\bArbOS\b|\bhard ?fork\b/i]]],
    ['process', 'Process', [[/\bprocess\b|\bpurpose and guidelines\b|\beditors?\b|\bguidelines\b|\bstatus terms?\b/i]]],
    ['council-treasury', 'Council, treasury & DAO', [[/\bsecurity council\b|\btreasury\b|\bDAO\b|\bgrants?\b|\bbudget\b|\bfunds?\b|\bfunding\b|\bconstitution(al)?\b|\belections?\b|\bdelegates?\b|\bquorum\b|\bfoundation\b/i]]],
    ['parameters', 'Parameter & config changes', [[/\bparameters?\b|\bconfig(uration)?\b|\bownership\b|\bproxy ?admin\b|\bmaintenance upgrade\b|\bkey rotation\b|\brotation\b/i]]],
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
  return best && { sub: best.sub, why: best.why };
}
