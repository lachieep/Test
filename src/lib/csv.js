// Minimal RFC 4180 CSV parser: quoted fields, escaped quotes, CRLF/LF.

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = String(text ?? '').replace(/^﻿/, '');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

// Parse CSV with a header row into objects, keeping ONLY the allowed columns.
// Anything else (e.g. tenant names, phone numbers) is dropped at import and
// never reaches the database.
export function parseCsvObjects(text, allowedColumns) {
  const rows = parseCsv(text);
  if (!rows.length) return { records: [], dropped: [] };
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const keep = header.map((h) => allowedColumns.includes(h));
  const dropped = header.filter((h, i) => !keep[i] && h);
  const records = rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, i) => {
      if (keep[i]) o[h] = (r[i] ?? '').trim();
    });
    return o;
  });
  return { records, dropped };
}
