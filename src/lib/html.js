// HTML escaping and number formatting for server-rendered pages.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

export function money(n, digits = 0) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '–';
  const v = Number(n);
  const s = Math.abs(v).toLocaleString('en-AU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${v < 0 ? '−' : ''}$${s}`;
}

export function pct(n, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '–';
  return `${(Number(n) * 100).toFixed(digits)}%`;
}
