// Chain diff ("multiverse") data: hand-curated per-chain facts in data/diffs/<id>.json, compared against Ethereum.
// Every fact carries a mark, a short value, sources (pinned where possible) and an as-of date. A dimension a chain
// file does not list is rendered as an explicit "no source" blank: nothing here is inferred.
import { readdir, readFile } from 'node:fs/promises';

export const GROUPS = [
  ['consensus', 'Consensus & finality'],
  ['blocks', 'Blocks & gas limits'],
  ['fees', 'Fee model'],
  ['evm', 'EVM & gas schedule'],
  ['precompiles', 'Precompiles'],
  ['tx', 'Transaction types'],
  ['infra', 'DA, clients & native features'],
];

// [id, group, label]
export const DIMENSIONS = [
  ['consensus.settlement', 'consensus', 'Settles on'],
  ['consensus.mechanism', 'consensus', 'Consensus / sequencing'],
  ['consensus.finality', 'consensus', 'Finality'],
  ['consensus.validators', 'consensus', 'Validator set'],
  ['blocks.time', 'blocks', 'Block time'],
  ['blocks.gas_limit', 'blocks', 'Block gas limit'],
  ['blocks.tx_gas_cap', 'blocks', 'Per-tx gas cap'],
  ['fees.gas_token', 'fees', 'Gas token'],
  ['fees.eip1559', 'fees', 'Base fee controller'],
  ['fees.min_base_fee', 'fees', 'Base fee floor'],
  ['fees.base_fee_dest', 'fees', 'Base fee: burned or kept'],
  ['fees.extra', 'fees', 'Extra fee components'],
  ['evm.baseline', 'evm', 'EVM fork baseline'],
  ['evm.opcodes_added', 'evm', 'Opcodes added / missing'],
  ['evm.opcodes_changed', 'evm', 'Opcodes with changed semantics'],
  ['evm.gas_repricing', 'evm', 'Gas repricing'],
  ['evm.contract_size', 'evm', 'Contract size limit'],
  ['precompiles.added', 'precompiles', 'Precompiles added'],
  ['precompiles.missing', 'precompiles', 'Ethereum precompiles missing / changed'],
  ['tx.types_added', 'tx', 'Tx types'],
  ['tx.blob', 'tx', 'Blob txs (type 3)'],
  ['tx.setcode', 'tx', 'EIP-7702 set code (type 4)'],
  ['da.layer', 'infra', 'Data availability'],
  ['clients.execution', 'infra', 'Execution client(s)'],
  ['native.features', 'infra', 'Native protocol features'],
];

// Column order: Ethereum baseline first, then the same order as the chain filter.
export const COLUMNS = ['ethereum', 'bsc', 'opbnb', 'tempo', 'monad', 'arbitrum', 'optimism', 'base', 'polygon', 'avalanche', 'celo', 'gnosis'];
export const MARKS = { base: 'baseline', '+': 'added', '-': 'missing', '~': 'changed', '=': 'same' };
const KINDS = new Set(['doc', 'spec', 'code', 'observed']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateDiffs({ chains }) {
  const errors = [];
  const dims = new Set(DIMENSIONS.map(([id]) => id));
  const ids = new Set(chains.map((c) => c.id));
  for (const id of COLUMNS) if (!ids.has(id)) errors.push(`missing chain file: ${id}`);
  for (const c of chains) {
    if (!COLUMNS.includes(c.id)) errors.push(`${c.id}: not in COLUMNS`);
    for (const k of ['chain', 'label', 'logo', 'role']) if (!c[k]) errors.push(`${c.id}: missing ${k}`);
    if (!DATE.test(c.as_of || '')) errors.push(`${c.id}: bad as_of`);
    for (const [dim, f] of Object.entries(c.facts || {})) {
      const at = `${c.id}.${dim}`;
      if (!dims.has(dim)) errors.push(`${at}: unknown dimension`);
      if (!(f.mark in MARKS)) errors.push(`${at}: bad mark ${f.mark}`);
      if ((f.mark === 'base') !== (c.id === 'ethereum')) errors.push(`${at}: only Ethereum uses the baseline mark`);
      if (!f.value || typeof f.value !== 'string') errors.push(`${at}: empty value`);
      if (!DATE.test(f.as_of || '')) errors.push(`${at}: missing as_of`);
      if (!KINDS.has(f.kind)) errors.push(`${at}: bad kind ${f.kind}`);
      if (!Array.isArray(f.sources) || !f.sources.length) errors.push(`${at}: no source`);
      for (const s of f.sources || []) if (!s.label || !/^https:\/\//.test(s.url || '')) errors.push(`${at}: source without https URL`);
      // Multi-valued cells (e.g. a client list): every item names itself and carries its own source.
      if (f.items !== undefined) {
        if (!Array.isArray(f.items) || !f.items.length) errors.push(`${at}: items must be a non-empty array`);
        for (const it of f.items || []) {
          if (!it.name) errors.push(`${at}: item without name`);
          if (!it.sources?.length) errors.push(`${at}: item ${it.name} has no source`);
          for (const s of it.sources || []) if (!s.label || !/^https:\/\//.test(s.url || '')) errors.push(`${at}: item ${it.name} source without https URL`);
        }
      }
    }
  }
  return errors;
}

export async function loadDiffs(dir = new URL('../data/diffs/', import.meta.url)) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const read = async (f) => JSON.parse(await readFile(new URL(f, dir), 'utf8'));
  const chains = (await Promise.all(files.filter((f) => !f.startsWith('_')).map(read)))
    .sort((a, b) => COLUMNS.indexOf(a.id) - COLUMNS.indexOf(b.id));
  return { groups: GROUPS, dimensions: DIMENSIONS, columns: COLUMNS, marks: MARKS, chains };
}
