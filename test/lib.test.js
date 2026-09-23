import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseCsvObjects } from '../src/lib/csv.js';
import { stampDuty } from '../src/config/stamp-duty.js';
import { rulesFor, STATES } from '../src/config/compliance-rules.js';
import { analyseLedger, parseLedgerCsv } from '../src/lib/ledger.js';
import { investorNumbers, rentVsMarket } from '../src/lib/finance.js';
import { certify, parseComplianceCsv } from '../src/lib/certify.js';
import { addMonths } from '../src/lib/dates.js';
import { parseFilters, matches } from '../src/lib/search.js';
import { validateListing } from '../src/lib/validate.js';
import { esc } from '../src/lib/html.js';

test('csv: quoted fields, escaped quotes and CRLF', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x, y","say ""hi"""\n\n'), [['a', 'b'], ['x, y', 'say "hi"']]);
});

test('csv: disallowed columns (e.g. tenant names) are dropped on import', () => {
  const { records, dropped } = parseCsvObjects('Tenant Name,due_date\nJane Citizen,2026-01-01', ['due_date']);
  assert.deepEqual(records, [{ due_date: '2026-01-01' }]);
  assert.deepEqual(dropped, ['tenant_name']);
  assert.ok(!JSON.stringify(records).includes('Jane'));
});

test('stamp duty: known values per state', () => {
  // NSW $620k: 10,527 + 4.5% of (620,000 - 351,000)
  assert.equal(stampDuty('NSW', 620_000), 22_632);
  // VIC $495k: 2,870 + 6% of (495,000 - 130,000)
  assert.equal(stampDuty('VIC', 495_000), 24_770);
  // VIC $1.2m: 5.5% of the whole value
  assert.equal(stampDuty('VIC', 1_200_000), 66_000);
  // QLD $640k: 17,325 + 4.5% of 100,000
  assert.equal(stampDuty('QLD', 640_000), 21_825);
  // TAS tiny purchase is a flat $50
  assert.equal(stampDuty('TAS', 2_000), 50);
  // NT uses its formula below $525k
  assert.equal(stampDuty('NT', 385_000), 15_516);
  assert.equal(stampDuty('NT', 600_000), 29_700);
  for (const s of STATES) assert.ok(stampDuty(s, 700_000) > 0, s);
  assert.throws(() => stampDuty('XX', 1));
});

test('stamp duty: scales are continuous at bracket edges', () => {
  for (const s of ['NSW', 'QLD', 'SA', 'WA', 'TAS']) {
    for (const edge of [100_000, 300_000, 540_000, 725_000, 1_000_000]) {
      const jump = stampDuty(s, edge + 1) - stampDuty(s, edge);
      assert.ok(jump >= 0 && jump < 100, `${s} jumps ${jump} at ${edge}`);
    }
  }
});

test('compliance rules: conditional items only apply when the feature exists', () => {
  assert.ok(!rulesFor('VIC', {}).some((r) => r.key === 'gas_safety'));
  assert.ok(rulesFor('VIC', { has_gas: 1 }).some((r) => r.key === 'gas_safety'));
  for (const s of STATES) assert.ok(rulesFor(s).some((r) => r.key === 'smoke_alarm'), s);
});

const ASOF = '2026-09-23';
function ledger(months, { unpaidLast = false } = {}) {
  const rows = [];
  for (let i = months; i >= 1; i--) {
    const due = addMonths(ASOF, -i);
    rows.push({ due_date: due, amount_due: 2000, paid_date: due, amount_paid: 2000 });
  }
  if (unpaidLast) rows[rows.length - 1] = { ...rows[rows.length - 1], paid_date: null, amount_paid: 0 };
  return rows;
}

test('ledger: perfect history is Excellent', () => {
  const p = analyseLedger(ledger(12), ASOF);
  assert.equal(p.periods, 12);
  assert.equal(p.onTimeRate, 1);
  assert.equal(p.band, 'Excellent');
  assert.equal(p.currentArrears, 0);
  assert.ok(p.coverageMonths >= 11.9);
});

test('ledger: unpaid rent counts as arrears and a serious event after 14 days', () => {
  const rows = ledger(12, { unpaidLast: true });
  const p = analyseLedger(rows, ASOF);
  assert.equal(p.currentArrears, 2000);
  assert.equal(p.latePayments, 1);
  assert.equal(p.seriousArrearsEvents, 1); // due a month ago, still unpaid
});

test('ledger: partial payment is a shortfall, not on time', () => {
  const p = analyseLedger([{ due_date: '2026-09-01', amount_due: 2000, paid_date: '2026-09-01', amount_paid: 1500 }], ASOF);
  assert.equal(p.currentArrears, 500);
  assert.equal(p.onTimeRate, 0);
});

test('ledger: future rent periods are ignored', () => {
  const p = analyseLedger([{ due_date: '2026-12-01', amount_due: 2000, paid_date: null, amount_paid: 0 }], ASOF);
  assert.equal(p.periods, 0);
  assert.equal(p.band, 'No history');
});

test('ledger csv: validation errors carry line numbers', () => {
  const r = parseLedgerCsv('due_date,amount_due,paid_date,amount_paid\n2026-01-01,500,2026-01-01,500\nnot-a-date,500,,\n2026-02-30,500,,');
  assert.equal(r.rows.length, 1);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0], /Line 3/);
});

test('finance: yields, duty and cash flow', () => {
  const n = investorNumbers({ state: 'NSW', price: 620_000, weekly_rent: 540, management_fee_pct: 7.7, council_rates: 2300, insurance: 1600, maintenance: 1500 });
  assert.equal(n.annualRent, 28_080);
  assert.ok(Math.abs(n.grossYield - 0.04529) < 0.0001);
  assert.ok(Math.abs(n.netYield - 0.03309) < 0.0001);
  assert.equal(n.stampDuty, 22_632);
  assert.equal(n.loanAmount, 496_000);
  assert.equal(n.cashRequired, 124_000 + 22_632 + 2_600);
  assert.deepEqual(rentVsMarket(540, 570).label, 'Below market (rent upside)');
  assert.equal(rentVsMarket(540, null), null);
});

function goodListing(overrides = {}) {
  return {
    id: 1, state: 'NSW', weekly_rent: 500, market_rent: 520,
    lease_start: '2025-06-01', lease_end: '2027-06-01', periodic: 0,
    bond_amount: 2000, bond_reference: 'RB-1', entry_condition_date: '2025-06-01',
    last_inspection_date: '2026-08-01', has_pool: 0, has_gas: 0, ...overrides,
  };
}
const goodCompliance = [{ item: 'smoke_alarm', completed_date: '2026-03-01' }];

test('certify: complete listing is certified grade A with a stable certificate id', () => {
  const r = certify({ listing: goodListing(), ledger: ledger(15), compliance: goodCompliance, asOf: ASOF });
  assert.equal(r.certified, true);
  assert.equal(r.grade, 'A');
  assert.match(r.certificateId, /^CT-[0-9A-F]{10}$/);
  assert.equal(r.expiresAt, '2026-10-23');
  const again = certify({ listing: goodListing(), ledger: ledger(15), compliance: goodCompliance, asOf: ASOF });
  assert.equal(again.certificateId, r.certificateId);
});

test('certify: expired smoke alarm check blocks certification', () => {
  const r = certify({ listing: goodListing(), ledger: ledger(15), compliance: [{ item: 'smoke_alarm', completed_date: '2025-01-01' }], asOf: ASOF });
  assert.equal(r.certified, false);
  assert.equal(r.grade, null);
  assert.equal(r.checks.find((c) => c.key === 'compliance:smoke_alarm').status, 'fail');
});

test('certify: pool certificate required only when there is a pool', () => {
  const noPool = certify({ listing: goodListing(), ledger: ledger(15), compliance: goodCompliance, asOf: ASOF });
  const pool = certify({ listing: goodListing({ has_pool: 1 }), ledger: ledger(15), compliance: goodCompliance, asOf: ASOF });
  assert.equal(noPool.certified, true);
  assert.equal(pool.certified, false);
});

test('certify: expired fixed-term lease fails unless periodic', () => {
  const expired = goodListing({ lease_end: '2026-01-01' });
  assert.equal(certify({ listing: expired, ledger: ledger(15), compliance: goodCompliance, asOf: ASOF }).certified, false);
  assert.equal(certify({ listing: { ...expired, periodic: 1 }, ledger: ledger(15), compliance: goodCompliance, asOf: ASOF }).certified, true);
});

test('certify: short ledger and ageing inspection give grade B; arrears are disclosed not blocking', () => {
  const r = certify({
    listing: goodListing({ last_inspection_date: '2026-01-01' }),
    ledger: ledger(8, { unpaidLast: true }), compliance: goodCompliance, asOf: ASOF,
  });
  assert.equal(r.certified, true);
  assert.equal(r.grade, 'B');
  assert.equal(r.checks.find((c) => c.key === 'arrears').status, 'warn');
});

test('certify: under 6 months of ledger fails', () => {
  const r = certify({ listing: goodListing(), ledger: ledger(4), compliance: goodCompliance, asOf: ASOF });
  assert.equal(r.checks.find((c) => c.key === 'ledger').status, 'fail');
  assert.equal(r.certified, false);
});

test('compliance csv parsing', () => {
  const r = parseComplianceCsv('item,completed_date,notes\nSmoke_Alarm,2026-01-01,ok\n,2026-01-01,\n');
  assert.deepEqual(r.items, [{ item: 'smoke_alarm', completed_date: '2026-01-01' }]);
  assert.equal(r.errors.length, 1);
  assert.deepEqual(r.dropped, ['notes']);
});

test('search filters', () => {
  const l = { state: 'QLD', suburb: 'Toowoomba', property_type: 'House', price: 640_000, numbers: { netYield: 0.045 }, certification: { grade: 'B' } };
  assert.ok(matches(l, parseFilters({ state: 'qld', suburb: 'toow' })));
  assert.ok(matches(l, parseFilters({ min_net_yield: '4.5', max_price: '650000' })));
  assert.ok(!matches(l, parseFilters({ min_net_yield: '4.6' })));
  assert.ok(!matches(l, parseFilters({ min_grade: 'A' })));
  assert.ok(matches(l, parseFilters({ min_grade: 'B', max_price: 'abc' })));
});

test('validateListing: required fields and consent rule', () => {
  const { errors } = validateListing({ state: 'XX', tenant_consent: 'on' });
  assert.ok(errors.some((e) => e.includes('Address')));
  assert.ok(errors.some((e) => e.includes('State')));
  assert.ok(errors.some((e) => e.includes('consent date')));
  const ok = validateListing({
    address: '1 Test St', suburb: 'Bathurst', state: 'nsw', postcode: '2795', property_type: 'House',
    price: '500000', weekly_rent: '500', has_pool: 'on',
  });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.data.state, 'NSW');
  assert.equal(ok.data.has_pool, 1);
  assert.equal(ok.data.has_gas, 0);
});

test('esc escapes HTML', () => {
  assert.equal(esc('<a href="x">\'&'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
});
