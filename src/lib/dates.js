// ISO 'YYYY-MM-DD' date helpers, computed in UTC so results never shift by timezone.

const DAY_MS = 86_400_000;

export function parseDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(String(s).trim())) return null;
  const [y, m, d] = String(s).trim().split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  const check = new Date(t);
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return t;
}

export function isValidDate(s) {
  return parseDate(s) !== null;
}

export function daysBetween(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / DAY_MS);
}

export function addMonths(iso, months) {
  const t = new Date(parseDate(iso));
  const day = t.getUTCDate();
  t.setUTCDate(1);
  t.setUTCMonth(t.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, lastDay));
  return toIso(t.getTime());
}

export function addDays(iso, days) {
  return toIso(parseDate(iso) + days * DAY_MS);
}

export function toIso(t) {
  return new Date(t).toISOString().slice(0, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function monthsBetween(from, to) {
  return daysBetween(from, to) / 30.4375;
}
