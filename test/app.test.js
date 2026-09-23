// End-to-end tests over real HTTP against an in-memory database.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { addMonths } from '../src/lib/dates.js';

const ASOF = '2026-09-23';
let server;
let base;
let store;

before(async () => {
  store = openDb(':memory:');
  store.createAgency({ name: 'Test Realty', state: 'NSW', access_code: 'secret-code' });
  store.createAgency({ name: 'Other Realty', state: 'VIC', access_code: 'other-code' });
  server = http.createServer(createApp({ store, secret: 'test', baseUrl: 'http://tenanted.test', now: () => ASOF }));
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});

after(() => {
  server.close();
  store.close();
});

async function req(method, path, { form, cookie } = {}) {
  const res = await fetch(base + path, {
    method,
    redirect: 'manual',
    headers: {
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  return { status: res.status, headers: res.headers, text: await res.text() };
}

async function login(code) {
  const r = await req('POST', '/agency/login', { form: { access_code: code } });
  assert.equal(r.status, 303);
  return r.headers.get('set-cookie').split(';')[0];
}

function ledgerCsv(months) {
  const lines = ['due_date,amount_due,paid_date,amount_paid,tenant_name'];
  for (let i = months; i >= 1; i--) {
    const d = addMonths(ASOF, -i);
    lines.push(`${d},2166.67,${d},2166.67,Jane Citizen`);
  }
  return lines.join('\n');
}

const listingForm = {
  address: '10 Test Street', suburb: 'Bathurst', state: 'NSW', postcode: '2795', property_type: 'House',
  bedrooms: '3', bathrooms: '1', price: '600000', weekly_rent: '500', market_rent: '520',
  management_fee_pct: '7.7', council_rates: '2000', lease_start: '2025-06-01', lease_end: '2027-06-01',
  bond_amount: '2000', bond_reference: 'RB-123', entry_condition_date: '2025-06-01',
  last_inspection_date: '2026-08-01', tenant_consent: 'on', tenant_consent_date: '2026-09-01',
  description: '<script>alert(1)</script> nice house',
  ledger_csv: ledgerCsv(14),
  compliance_csv: 'item,completed_date\nsmoke_alarm,2026-04-01',
};

test('home page renders and security headers are set', async () => {
  const r = await req('GET', '/');
  assert.equal(r.status, 200);
  assert.match(r.text, /Buy rental properties with the tenant in place/);
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
});

test('agency area requires login; bad code is rejected', async () => {
  assert.equal((await req('GET', '/agency')).headers.get('location'), '/agency/login');
  assert.equal((await req('POST', '/agency/login', { form: { access_code: 'nope' } })).status, 401);
  assert.equal((await req('GET', '/agency', { cookie: 'tnt_session=1.9999999999999.forged' })).status, 303);
});

test('full flow: create → certify → public listing → enquiry → alerts → feed', async () => {
  // Buyer saves an alert before the listing exists.
  const alert = await req('POST', '/alerts', { form: { email: 'buyer@example.com', state: 'NSW', min_net_yield: '3' } });
  assert.equal(alert.status, 200);

  const cookie = await login('secret-code');
  const created = await req('POST', '/agency/listings', { form: listingForm, cookie });
  assert.equal(created.status, 303);
  const id = Number(created.headers.get('location').split('/').pop());

  const agencyView = await req('GET', `/agency/listings/${id}`, { cookie });
  assert.match(agencyView.text, /Certified, grade A/);

  // Public pack is live, escapes HTML, and never contains the tenant's name.
  const page = await req('GET', `/listings/${id}`);
  assert.equal(page.status, 200);
  assert.match(page.text, /Verified tenancy pack/);
  assert.match(page.text, /Excellent/);
  assert.ok(!page.text.includes('<script>alert(1)</script>'));
  assert.ok(page.text.includes('&lt;script&gt;'));
  assert.ok(!page.text.includes('Jane Citizen'));
  const stored = JSON.stringify(store.ledger(id));
  assert.ok(!stored.includes('Jane'));

  // Search + JSON API.
  const api = JSON.parse((await req('GET', '/api/listings?state=NSW')).text);
  assert.equal(api.count, 1);
  assert.equal(api.listings[0].certificate.grade, 'A');
  assert.equal(api.listings[0].tenant_performance.band, 'Excellent');
  assert.equal(JSON.parse((await req('GET', '/api/listings?state=VIC')).text).count, 0);

  // Alert queued for the matching saved search, exactly once.
  let pending = store.pendingAlerts();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].email, 'buyer@example.com');
  assert.match(pending[0].body, new RegExp(`/listings/${id}`));
  await req('POST', `/agency/listings/${id}/certify`, { cookie });
  assert.equal(store.pendingAlerts().length, 1);

  // Unsubscribe link works.
  const token = pending[0].body.match(/unsubscribe\/([a-f0-9]{32})/)[1];
  assert.match((await req('GET', `/alerts/unsubscribe/${token}`)).text, /Unsubscribed/);

  // Buyer enquiry with "keep the manager" reaches the agency dashboard.
  const enq = await req('POST', `/listings/${id}/enquire`, {
    form: { name: 'Bea Buyer', email: 'bea@example.com', message: 'Keen', keep_manager: 'on' },
  });
  assert.equal(enq.status, 303);
  const dash = await req('GET', '/agency', { cookie });
  assert.match(dash.text, /Bea Buyer/);
  assert.match(dash.text, /<span>1<\/span>Want to keep you as manager/);

  // Syndication feed.
  const feed = await req('GET', '/feed.xml');
  assert.match(feed.headers.get('content-type'), /xml/);
  assert.match(feed.text, new RegExp(`<uniqueID>TNT-${id}</uniqueID>`));
  assert.match(feed.text, /CERTIFIED TENANTED/);

  // Another agency cannot see or edit it.
  const other = await login('other-code');
  assert.equal((await req('GET', `/agency/listings/${id}`, { cookie: other })).status, 404);
  assert.equal((await req('POST', `/agency/listings/${id}/certify`, { cookie: other })).status, 404);

  // Marking it sold takes it off the public site.
  await req('POST', `/agency/listings/${id}/status`, { form: { status: 'sold' }, cookie });
  assert.equal((await req('GET', `/listings/${id}`)).status, 404);
});

test('failing listing stays private and shows what to fix', async () => {
  const cookie = await login('secret-code');
  const created = await req('POST', '/agency/listings', {
    form: { ...listingForm, address: '11 Test Street', compliance_csv: 'item,completed_date\nsmoke_alarm,2024-01-01' }, cookie,
  });
  const id = Number(created.headers.get('location').split('/').pop());
  const view = await req('GET', `/agency/listings/${id}`, { cookie });
  assert.match(view.text, /Not certified/);
  assert.match(view.text, /expired/);
  assert.equal((await req('GET', `/listings/${id}`)).status, 404);

  // Fixing the data via edit certifies it.
  const edited = await req('POST', `/agency/listings/${id}/edit`, { form: { ...listingForm, address: '11 Test Street' }, cookie });
  assert.equal(edited.status, 303);
  assert.equal((await req('GET', `/listings/${id}`)).status, 200);
});

test('invalid submission re-renders the form with errors', async () => {
  const cookie = await login('secret-code');
  const r = await req('POST', '/agency/listings', {
    form: { ...listingForm, price: '', ledger_csv: 'due_date,amount_due\nbad,1' }, cookie,
  });
  assert.equal(r.status, 422);
  assert.match(r.text, /Price must be a whole dollar amount/);
  assert.match(r.text, /Rent ledger: Line 2/);
});

test('expired certificates drop off the public site', async () => {
  const cookie = await login('secret-code');
  const created = await req('POST', '/agency/listings', { form: { ...listingForm, address: '12 Test Street' }, cookie });
  const id = Number(created.headers.get('location').split('/').pop());
  assert.equal((await req('GET', `/listings/${id}`)).status, 200);
  store.db.prepare(`UPDATE listings SET certificate_expires = '2026-09-01' WHERE id = ?`).run(id);
  assert.equal((await req('GET', `/listings/${id}`)).status, 404);
});

test('unknown pages 404; wrong method 405; static path traversal blocked', async () => {
  assert.equal((await req('GET', '/nope')).status, 404);
  assert.equal((await req('DELETE', '/')).status, 405);
  assert.equal((await req('GET', '/static/..%2Fpackage.json')).status, 404);
  assert.equal((await req('GET', '/static/styles.css')).status, 200);
});
