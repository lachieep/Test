// Tenant payment performance from a rent ledger.
// Ledger rows: { due_date, amount_due, paid_date, amount_paid }.
// Output is aggregate only; no tenant identity is involved.

import { parseDate, daysBetween, monthsBetween } from './dates.js';
import { parseCsvObjects } from './csv.js';

export const LEDGER_COLUMNS = ['due_date', 'amount_due', 'paid_date', 'amount_paid'];

// NSW/VIC/QLD etc. all treat 14+ days of rent arrears as a serious event
// (it is the NSW threshold for a termination notice), so we flag it.
export const SERIOUS_ARREARS_DAYS = 14;

export function parseLedgerCsv(text) {
  const { records, dropped } = parseCsvObjects(text, LEDGER_COLUMNS);
  const errors = [];
  const rows = [];
  records.forEach((r, i) => {
    const line = i + 2;
    if (!parseDate(r.due_date)) return errors.push(`Line ${line}: invalid due_date "${r.due_date ?? ''}"`);
    const amountDue = Number(r.amount_due);
    if (!(amountDue > 0)) return errors.push(`Line ${line}: invalid amount_due "${r.amount_due ?? ''}"`);
    if (r.paid_date && !parseDate(r.paid_date)) return errors.push(`Line ${line}: invalid paid_date "${r.paid_date}"`);
    const amountPaid = r.amount_paid === '' || r.amount_paid === undefined ? 0 : Number(r.amount_paid);
    if (!(amountPaid >= 0)) return errors.push(`Line ${line}: invalid amount_paid "${r.amount_paid}"`);
    rows.push({
      due_date: r.due_date,
      amount_due: amountDue,
      paid_date: r.paid_date || null,
      amount_paid: amountPaid,
    });
  });
  return { rows, errors, dropped };
}

export function analyseLedger(rows, asOf, { graceDays = 0 } = {}) {
  const due = rows
    .filter((r) => parseDate(r.due_date) <= parseDate(asOf))
    .sort((a, b) => parseDate(a.due_date) - parseDate(b.due_date));

  if (!due.length) {
    return {
      periods: 0, onTimeRate: null, latePayments: 0, maxDaysLate: 0,
      seriousArrearsEvents: 0, currentArrears: 0, coverageMonths: 0,
      firstDue: null, lastDue: null, band: 'No history',
    };
  }

  let onTime = 0;
  let late = 0;
  let maxDaysLate = 0;
  let serious = 0;
  let currentArrears = 0;

  for (const r of due) {
    const shortfall = Math.max(0, r.amount_due - r.amount_paid);
    const unpaid = !r.paid_date || shortfall > 0.005;
    const daysLate = r.paid_date ? daysBetween(r.due_date, r.paid_date) : daysBetween(r.due_date, asOf);

    if (unpaid) currentArrears += r.paid_date ? shortfall : r.amount_due;
    if (!unpaid && daysLate <= graceDays) onTime++;
    else late++;
    maxDaysLate = Math.max(maxDaysLate, daysLate);
    if (daysLate >= SERIOUS_ARREARS_DAYS) serious++;
  }

  const onTimeRate = onTime / due.length;
  const firstDue = due[0].due_date;
  const lastDue = due[due.length - 1].due_date;
  return {
    periods: due.length,
    onTimeRate,
    latePayments: late,
    maxDaysLate,
    seriousArrearsEvents: serious,
    currentArrears: Math.round(currentArrears * 100) / 100,
    coverageMonths: Math.round(monthsBetween(firstDue, asOf) * 10) / 10,
    firstDue,
    lastDue,
    band: band(onTimeRate, serious),
  };
}

function band(onTimeRate, serious) {
  if (onTimeRate >= 0.95 && serious === 0) return 'Excellent';
  if (onTimeRate >= 0.85 && serious <= 1) return 'Good';
  if (onTimeRate >= 0.7) return 'Fair';
  return 'Poor';
}
