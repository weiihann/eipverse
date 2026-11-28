// Shared by the page and the RSS builder: how one changes.json entry reads.
// entry: { at, chain, id, title, kind, change: 'new' | 'status' | 'target' | 'date', field?, from, to, url, basis }
export const changeLabel = (e) => (e.change === 'new' ? 'New proposal' : e.change === 'status' ? 'Status' : e.change === 'target' ? 'Target upgrade' : e.field);
export const changeText = (e) => (e.change === 'new' ? `New proposal${e.to ? ` (${e.to})` : ''}` : `${changeLabel(e)}: ${e.from ?? 'not stated'} → ${e.to}`);
