# Chain diff data

One file per column (`<id>.json`) plus `_lineage.json`, read by `lib/diffs.js` and written to `site/diffs.json` at build time.

- `facts[dimension]` = `{ mark, value, note, kind, as_of, sources: [{ label, url }] }`.
- `mark`: `base` (Ethereum only), `+` adds, `-` missing, `~` changed, `=` same as Ethereum.
- `kind`: `doc` (spec, code or docs page; GitHub links pinned to a commit where possible) or `observed` (read from a public RPC; the source label names the endpoint and block).
- A dimension a chain does not list renders as "no source". Do not fill a cell without a source: leave it out.
- Values prefixed "Derived:" in the note are arithmetic on sourced numbers (e.g. 2 epochs × 32 slots × 12 s).

`npm test` (test/diffs.test.js) fails the build if any fact lacks an https source or an ISO `as_of` date.
