// Certification engine: turns a listing's tenancy data into a pass/fail
// "Certified Tenanted" result with a transparent list of checks.

import crypto from 'node:crypto';
import { rulesFor } from '../config/compliance-rules.js';
import { parseCsvObjects } from './csv.js';
import { parseDate, addMonths, addDays, monthsBetween } from './dates.js';
import { analyseLedger } from './ledger.js';
import { rentVsMarket } from './finance.js';

export const COMPLIANCE_COLUMNS = ['item', 'completed_date'];
export const CERTIFICATE_VALID_DAYS = 30;
export const MIN_LEDGER_MONTHS = 6;
export const FULL_LEDGER_MONTHS = 12;
export const INSPECTION_PASS_MONTHS = 6;
export const INSPECTION_MAX_MONTHS = 12;

export function parseComplianceCsv(text) {
  const { records, dropped } = parseCsvObjects(text, COMPLIANCE_COLUMNS);
  const errors = [];
  const items = [];
  records.forEach((r, i) => {
    const key = (r.item || '').trim().toLowerCase();
    if (!key) return errors.push(`Line ${i + 2}: missing item`);
    if (!parseDate(r.completed_date)) return errors.push(`Line ${i + 2}: invalid completed_date "${r.completed_date ?? ''}"`);
    items.push({ item: key, completed_date: r.completed_date });
  });
  return { items, errors, dropped };
}

function check(key, label, status, detail, mandatory = true) {
  return { key, label, status, detail, mandatory };
}

export function certify({ listing, ledger, compliance, asOf }) {
  const checks = [];

  // Lease on file and current (or periodic).
  const leaseOk = parseDate(listing.lease_start) &&
    (listing.periodic ? true : parseDate(listing.lease_end) && parseDate(listing.lease_end) >= parseDate(asOf));
  checks.push(check('lease', 'Lease on file and current',
    leaseOk ? 'pass' : 'fail',
    leaseOk
      ? (listing.periodic ? `Periodic since ${listing.lease_start}` : `${listing.lease_start} to ${listing.lease_end}`)
      : 'Lease start/end missing, or fixed term has expired without being marked periodic'));

  // Bond lodged with the state authority.
  const bondOk = Number(listing.bond_amount) > 0 && String(listing.bond_reference || '').trim() !== '';
  checks.push(check('bond', 'Bond lodged with state authority',
    bondOk ? 'pass' : 'fail',
    bondOk ? `$${Number(listing.bond_amount).toLocaleString('en-AU')} (ref ${listing.bond_reference})` : 'Bond amount and lodgement reference required'));

  // Entry condition report.
  const ecrOk = !!parseDate(listing.entry_condition_date);
  checks.push(check('entry_condition', 'Entry condition report on file',
    ecrOk ? 'pass' : 'fail', ecrOk ? `Dated ${listing.entry_condition_date}` : 'Entry condition report date required'));

  // Recent routine inspection.
  if (parseDate(listing.last_inspection_date)) {
    const age = monthsBetween(listing.last_inspection_date, asOf);
    const status = age <= INSPECTION_PASS_MONTHS ? 'pass' : age <= INSPECTION_MAX_MONTHS ? 'warn' : 'fail';
    checks.push(check('inspection', `Routine inspection within ${INSPECTION_PASS_MONTHS} months`, status,
      `Last inspection ${listing.last_inspection_date} (${age.toFixed(1)} months ago)`));
  } else {
    checks.push(check('inspection', `Routine inspection within ${INSPECTION_PASS_MONTHS} months`, 'fail', 'No routine inspection recorded'));
  }

  // Rent ledger history.
  const perf = analyseLedger(ledger, asOf);
  const coverage = perf.coverageMonths;
  checks.push(check('ledger', `Verified rent ledger (${FULL_LEDGER_MONTHS}+ months)`,
    coverage >= FULL_LEDGER_MONTHS ? 'pass' : coverage >= MIN_LEDGER_MONTHS ? 'warn' : 'fail',
    `${perf.periods} rent periods covering ${coverage} months`));

  // Arrears are disclosed, not disqualifying.
  checks.push(check('arrears', 'Rent paid to date',
    perf.currentArrears === 0 ? 'pass' : 'warn',
    perf.currentArrears === 0 ? 'No current arrears' : `$${perf.currentArrears.toLocaleString('en-AU')} currently in arrears (disclosed)`,
    false));

  // State compliance items.
  const latest = new Map();
  for (const c of compliance) {
    const prev = latest.get(c.item);
    if (!prev || parseDate(c.completed_date) > parseDate(prev)) latest.set(c.item, c.completed_date);
  }
  for (const rule of rulesFor(listing.state, listing)) {
    const done = latest.get(rule.key);
    if (!done) {
      checks.push(check(`compliance:${rule.key}`, rule.label, 'fail', 'No record provided'));
      continue;
    }
    if (rule.validityMonths === null) {
      checks.push(check(`compliance:${rule.key}`, rule.label, 'pass', `Completed ${done}`));
      continue;
    }
    const expires = addMonths(done, rule.validityMonths);
    const current = parseDate(expires) >= parseDate(asOf);
    checks.push(check(`compliance:${rule.key}`, rule.label, current ? 'pass' : 'fail',
      current ? `Completed ${done}, current until ${expires}` : `Completed ${done}, expired ${expires}`));
  }

  // Rent vs market is information for buyers, never a failure.
  const rvm = rentVsMarket(listing.weekly_rent, listing.market_rent);
  if (rvm) {
    checks.push(check('market_rent', 'Rent compared with market appraisal', 'info',
      `${rvm.label}: $${listing.weekly_rent}/wk vs $${listing.market_rent}/wk (${(rvm.diff * 100).toFixed(1)}%)`, false));
  }

  const mandatoryFailures = checks.filter((c) => c.mandatory && c.status === 'fail');
  const warnings = checks.filter((c) => c.status === 'warn');
  const certified = mandatoryFailures.length === 0;
  const grade = !certified ? null : warnings.length === 0 ? 'A' : 'B';

  const result = {
    certified,
    grade,
    checks,
    performance: perf,
    asOf,
    issuedAt: certified ? asOf : null,
    expiresAt: certified ? addDays(asOf, CERTIFICATE_VALID_DAYS) : null,
    certificateId: null,
  };
  if (certified) result.certificateId = certificateId(listing.id, asOf, { listing, ledger, compliance });
  return result;
}

function certificateId(listingId, asOf, data) {
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify({ listingId, asOf, data }))
    .digest('hex');
  return `CT-${hash.slice(0, 10).toUpperCase()}`;
}
