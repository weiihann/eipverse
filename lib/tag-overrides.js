// Curated layers for well-known proposals whose own title and abstract no sane keyword rule catches
// (or catches wrongly). Each entry replaces the derived tags for that one row and says why.
// 'layer/sub' pins the subcategory; a bare 'layer' still derives its sub from the text.
// The UI labels these "curated" with the reason, never "derived". Keep this list short: fix rules first.
const O = (chain, id, tags, reason) => [id, { chain, tags, reason }];

export const OVERRIDES = Object.fromEntries([
  // Ethereum
  O('Ethereum', 'EIP-2', ['governance-meta/hardfork-meta', 'execution'], 'Homestead hard-fork bundle: several EVM and tx-validity changes in one EIP.'),
  O('Ethereum', 'EIP-1010', ['governance-meta/irregular-state'], 'Proposes moving ether between two named addresses: an irregular state change.'),
  O('Ethereum', 'EIP-999', ['governance-meta/irregular-state'], 'Restores the frozen Parity WalletLibrary code: an irregular state change.'),
  O('Ethereum', 'EIP-908', ['consensus/validators-staking', 'governance-meta/council-treasury'], 'Adds a client-developer reward to block issuance.'),
  O('Ethereum', 'EIP-2228', ['governance-meta/process'], 'Naming convention for network ID 1 / chain ID 1, not a protocol change.'),
  O('Ethereum', 'EIP-3541', ['execution/eof-bytecode'], 'Reserves the 0xEF prefix so EOF can ship; derived rules wrongly read "trie".'),
  O('Ethereum', 'EIP-3607', ['execution/tx-types', 'account-abstraction/eoa-delegation'], 'Tx validity rule: senders must be code-less, the invariant 7702 delegation later relaxes.'),
  O('Ethereum', 'EIP-4747', ['state/expiry-history'], 'Simplifies EIP-161 empty-account clearing.'),
  O('Ethereum', 'EIP-6189', ['execution/eof-bytecode', 'state'], 'Alias contracts forward calls to another contract via account state.'),
  O('Ethereum', 'EIP-6810', ['consensus/finality', 'execution'], 'Reverting confirmed transactions after the fact changes finality semantics.'),
  O('Ethereum', 'EIP-6493', ['execution/tx-types', 'networking/serialization', 'crypto-precompiles/curves'], 'SSZ signature scheme for transactions.'),
  O('Ethereum', 'EIP-658', ['execution/blocks-logs'], 'Puts the transaction status code into receipts; abstract mentions the state root only as what it replaces.'),
  O('Ethereum', 'EIP-7685', ['consensus/validators-staking', 'execution/blocks-logs'], 'EL→CL request bus that carries deposits, withdrawals and consolidations in the block.'),
  O('Ethereum', 'EIP-7688', ['networking/serialization', 'consensus'], 'Forward-compatible SSZ containers for consensus data structures.'),
  O('Ethereum', 'EIP-7782', ['consensus/block-time'], 'Shortens slot time (6s slots) to cut block latency.'),
  O('Ethereum', 'EIP-7934', ['fee-market/gas-limits', 'networking/serialization'], 'Caps RLP-encoded block size; derived rules wrongly read "beacon block".'),
  O('Ethereum', 'EIP-7928', ['state/storage-access', 'execution/parallel'], 'Block-level access lists: records state accesses so clients can execute and fetch state in parallel.'),
  O('Ethereum', 'EIP-8025', ['consensus', 'crypto-precompiles/zk-pq'], 'Optional zk execution proofs that validators can verify instead of re-executing.'),
  O('Ethereum', 'EIP-8188', ['state/storage-access'], '"Slots" here are storage slots, not consensus slots.'),
  O('Ethereum', 'EIP-152', ['crypto-precompiles/hashing'], 'BLAKE2 precompile; the PoW mention is only Zcash interop motivation.'),
  O('Ethereum', 'EIP-196', ['crypto-precompiles/curves'], 'alt_bn128 add/mul precompile; "gas limit" in the text is incidental.'),
  O('Ethereum', 'EIP-197', ['crypto-precompiles/curves'], 'alt_bn128 pairing precompile; "gas limit" in the text is incidental.'),
  O('Ethereum', 'EIP-7999', ['fee-market/base-fee'], 'Multidimensional fee market; "budget" here is gas budget, not governance.'),
  O('Ethereum', 'EIP-8282', ['consensus/pbs-inclusion', 'execution'], 'Deposit/exit request contracts for ePBS (EIP-7732) builders.'),
  O('Ethereum', 'EIP-1470', ['app-standard/dev-patterns'], 'Smart contract weakness classification: an app-security taxonomy, not a protocol change.'),
  O('Ethereum', 'EIP-7940', ['governance-meta/council-treasury'], 'Proposes electing a single "Shah" to protect core devs: governance structure.'),
  // BNB Chain
  O('BNB Chain', 'BEP-221', ['interop-crosschain/messaging', 'consensus'], 'Verifies CometBFT light blocks (BNB Beacon Chain / Greenfield headers) on BSC for cross-chain.'),
  O('BNB Chain', 'BEP-20', ['app-standard/fungible-tokens'], 'The BEP-20 token interface, BSC\'s ERC-20.'),
  O('BNB Chain', 'BEP-228', ['execution/eof-bytecode'], 'BSC port of EIP-3541 (reject 0xEF code); derived rules wrongly read "trie".'),
  O('BNB Chain', 'BEP-10', ['execution/tx-types'], 'Adds a source field to transactions.'),
  O('BNB Chain', 'BEP-402', ['consensus', 'execution/blocks-logs'], 'Block header fields covered by the validator seal signature.'),
  O('BNB Chain', 'BEP-564', ['networking/devp2p', 'consensus/block-time'], 'bsc/2 wire-protocol messages for fetching blocks under short block intervals.'),
  O('BNB Chain', 'BEP-714', ['consensus/block-time'], 'Parlia out-of-turn validator backoff time.'),
  O('BNB Chain', 'BEP-3', ['interop-crosschain/messaging', 'native-assets/native-tokens'], 'HTLC atomic peg between BNB Beacon Chain and other chains.'),
  O('BNB Chain', 'BEP-67', ['native-assets/native-dex'], 'Order type on the BNB Beacon Chain DEX; "price" is not fees.'),
  O('BNB Chain', 'BEP-82', ['native-assets/native-tokens'], 'Ownership of BEP-2 tokens on BNB Beacon Chain.'),
  O('BNB Chain', 'BEP-466', ['execution/blocks-logs'], 'Adds the EIP-7685 requests hash to the BSC block header.'),
  // Polygon PoS
  O('Polygon PoS', 'PIP-18', ['governance-meta/process', 'consensus'], 'Polygon 2.0 phase 0 roadmap: POL token, staking and governance changes.'),
  O('Polygon PoS', 'PIP-43', ['consensus/finality'], 'Swaps Tendermint for CometBFT in Heimdall, the Polygon PoS consensus layer.'),
  O('Polygon PoS', 'PIP-44', ['consensus'], 'Bumps cosmos-sdk in Heimdall, the Polygon PoS consensus layer.'),
  O('Polygon PoS', 'PIP-62', ['consensus', 'governance-meta/hardfork-meta'], 'Migrates Heimdall, the Polygon PoS consensus layer, to v2.'),
  // Avalanche
  O('Avalanche C-Chain', 'ACP-25', ['execution', 'networking/rpc'], 'Lets a VM return application-defined errors over the app request protocol.'),
  O('Avalanche C-Chain', 'ACP-77', ['interop-crosschain/rollups', 'consensus/validators-staking'], 'Reinvents Subnets as sovereign L1s with their own validator management.'),
  // Base
  O('Base', 'blog:b20-tokenized-stocks-on-base', ['native-assets/native-tokens', 'app-standard/rwa-compliance'], 'B20, the token standard Base ships for tokenized (regulated) stocks.'),
  O('Base', 'blog:next-chapter-for-base-chain-1', ['interop-crosschain/rollups', 'networking/rpc'], 'Base moving to its own unified node/rollup stack (base/base) for scaling and decentralization.'),
  O('Base', 'blog:making-aws-nitro-validation-feasible-onchain', ['interop-crosschain/rollups', 'crypto-precompiles/curves'], 'Onchain verification of AWS Nitro (TEE) attestations for Base proofs; "validator" is a library name.'),
  // Monad
  O('Monad', 'MIP-4', ['execution', 'consensus'], 'Reserve balance: the safety rule that lets Monad execute asynchronously after consensus.'),
  O('Monad', 'MIP-23', ['execution', 'consensus'], 'Per-account reserve balance for asynchronous execution.'),
  O('Monad', 'MIP-5', ['governance-meta/hardfork-meta'], 'Activates a set of Ethereum Fusaka EIPs on Monad.'),
  O('Monad', 'MIP-15', ['governance-meta/hardfork-meta'], 'Activates a set of Ethereum Glamsterdam EIPs on Monad.'),
  // Tempo
  O('Tempo', 'TIP-1009', ['execution/tx-types', 'account-abstraction'], 'Expiring nonces for Tempo (AA) transactions: replay protection without sequential nonces.'),
  O('Tempo', 'TIP-1106', ['execution/tx-types', 'account-abstraction'], 'Nonce discriminators for expiring-nonce Tempo transactions.'),
  O('Tempo', 'TIP-1093', ['execution/tx-types', 'account-abstraction'], 'Widens the expiring-nonce window.'),
  O('Tempo', 'TIP-1045', ['native-assets/payments', 'consensus'], 'Classifies payment transactions so block space can be reserved for them.'),
  // Hyperliquid: HIPs are HyperCore protocol features (enshrined tokens and markets), not contract standards
  O('Hyperliquid', 'HIP-1', ['native-assets/native-tokens'], 'Native HyperCore token standard with built-in spot order books, not an ERC-style contract standard.'),
  O('Hyperliquid', 'HIP-2', ['native-assets/native-dex'], 'Protocol-run liquidity (Hyperliquidity) on HIP-1 spot order books.'),
  O('Hyperliquid', 'HIP-3', ['native-assets/native-dex', 'consensus/validators-staking'], 'Builder-deployed perp markets on HyperCore order books, gated by a HYPE staking requirement.'),
  O('Hyperliquid', 'HIP-4', ['native-assets/native-dex'], 'Outcome markets: a protocol-level contract type traded on HyperCore.'),
  // Sei
  O('Sei', 'SIP-6', ['consensus'], 'Autobahn: replaces Sei\'s consensus with a multi-proposer design (Sei Giga).'),
]);
