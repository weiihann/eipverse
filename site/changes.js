// Shared by the page and the RSS builder: how one changes.json entry reads, and how the Changes view groups them.
// entry: { at, chain, id, title, kind, change: 'new' | 'status' | 'target' | 'date', field?, from, to, url, basis }
export const changeLabel = (e) => (e.change === 'new' ? 'New proposal' : e.change === 'status' ? 'Status' : e.change === 'target' ? 'Target upgrade' : e.field);
export const changeText = (e) => (e.change === 'new' ? `New proposal${e.to ? ` (${e.to})` : ''}` : `${changeLabel(e)}: ${e.from ?? 'not stated'} → ${e.to}`);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 864e5;

// Weeks run Monday 00:00 UTC through Sunday. UTC matches how the rest of the page prints dates (human() uses getUTC*).
export function weekStartUtc(t) {
  const d = new Date(t);
  const offset = (d.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - offset);
}

export function weekRangeLabel(start) {
  const mon = new Date(start);
  const sun = new Date(start + 6 * DAY);
  const sameYear = mon.getUTCFullYear() === sun.getUTCFullYear();
  const sameMonth = sameYear && mon.getUTCMonth() === sun.getUTCMonth();
  const left = `${MON[mon.getUTCMonth()]} ${mon.getUTCDate()}${sameYear ? '' : `, ${mon.getUTCFullYear()}`}`;
  const right = `${sameMonth ? '' : `${MON[sun.getUTCMonth()]} `}${sun.getUTCDate()}, ${sun.getUTCFullYear()}`;
  return `${left} – ${right}`;
}

// Newest week first; within a week, newest entry first. Does not mutate the input.
export function groupByWeek(entries) {
  const map = new Map();
  for (const e of entries) {
    const start = weekStartUtc(e.at);
    if (!map.has(start)) map.set(start, []);
    map.get(start).push(e);
  }
  return [...map.keys()].sort((a, b) => b - a).map((start) => ({
    start,
    label: weekRangeLabel(start),
    entries: map.get(start).slice().sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)),
  }));
}
