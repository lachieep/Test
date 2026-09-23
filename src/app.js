// HTTP request handling. createApp() returns a plain (req, res) handler so the
// server and the tests share exactly the same code.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as views from './views.js';
import { certify, parseComplianceCsv } from './lib/certify.js';
import { parseLedgerCsv } from './lib/ledger.js';
import { validateListing } from './lib/validate.js';
import { search, parseFilters, withNumbers, queueAlertsFor } from './lib/search.js';
import { reaxmlFeed } from './lib/reaxml.js';
import { today } from './lib/dates.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const MAX_BODY = 5 * 1024 * 1024;
const SESSION_COOKIE = 'tnt_session';
const SESSION_DAYS = 7;

export function createApp({ store, secret = crypto.randomBytes(32).toString('hex'), baseUrl = 'http://localhost:3000', now = today } = {}) {
  const sign = (v) => crypto.createHmac('sha256', secret).update(v).digest('hex');

  function sessionCookie(agencyId) {
    const expires = Date.now() + SESSION_DAYS * 86_400_000;
    const value = `${agencyId}.${expires}`;
    return `${SESSION_COOKIE}=${value}.${sign(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${baseUrl.startsWith('https') ? '; Secure' : ''}`;
  }

  function currentAgency(req) {
    const raw = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!raw) return null;
    const [id, expires, sig] = raw.split('.');
    const value = `${id}.${expires}`;
    if (!sig || !safeEqual(sig, sign(value)) || Number(expires) < Date.now()) return null;
    return store.agency(Number(id)) ?? null;
  }

  function certifyListing(id) {
    const listing = store.listing(id);
    const result = certify({ listing, ledger: store.ledger(id), compliance: store.compliance(id), asOf: now() });
    store.saveCertification(id, result);
    if (result.certified) queueAlertsFor(store, id, baseUrl);
    return result;
  }

  const routes = [
    ['GET', /^\/$/, (req, res, _m, url) => {
      const filters = parseFilters(Object.fromEntries(url.searchParams));
      html(res, 200, views.layout('Certified tenanted properties', views.homePage(search(store, filters, now()), filters), { agency: currentAgency(req) }));
    }],

    ['GET', /^\/listings\/(\d+)$/, (req, res, m, url) => {
      const l = publicListing(Number(m[1]));
      if (!l) return notFound(req, res);
      html(res, 200, views.layout(l.address, views.listingPage(l, { sent: url.searchParams.has('sent') }), { agency: currentAgency(req) }));
    }],

    ['POST', /^\/listings\/(\d+)\/enquire$/, async (req, res, m) => {
      const id = Number(m[1]);
      if (!publicListing(id)) return notFound(req, res);
      const b = await readForm(req);
      const name = str(b.name, 120);
      const email = str(b.email, 200);
      if (!name || !isEmail(email)) return html(res, 400, views.layout('Check your details', views.messagePage('Check your details', 'A name and a valid email are required.')));
      store.createEnquiry(id, { name, email, phone: str(b.phone, 40), message: str(b.message, 2000), keep_manager: !!b.keep_manager });
      redirect(res, `/listings/${id}?sent=1#enquire`);
    }],

    ['GET', /^\/alerts\/new$/, (req, res, _m, url) => {
      html(res, 200, views.layout('Get alerts', views.alertsPage(parseFilters(Object.fromEntries(url.searchParams))), { agency: currentAgency(req) }));
    }],

    ['POST', /^\/alerts$/, async (req, res) => {
      const b = await readForm(req);
      if (!isEmail(str(b.email, 200))) return html(res, 400, views.layout('Get alerts', views.messagePage('Check your email', 'Please enter a valid email address.')));
      store.createSavedSearch({ email: str(b.email, 200), ...parseFilters(b) });
      html(res, 200, views.layout('Alert saved', views.alertsPage({}, { done: true })));
    }],

    ['GET', /^\/alerts\/unsubscribe\/([a-f0-9]{32})$/, (req, res, m) => {
      const ok = store.deleteSavedSearchByToken(m[1]);
      html(res, 200, views.layout('Unsubscribe', views.messagePage(ok ? 'Unsubscribed' : 'Already unsubscribed', ok ? 'You will not receive this alert again.' : 'This alert no longer exists.')));
    }],

    ['GET', /^\/feed\.xml$/, (_req, res) => {
      const listings = store.certifiedListings(now()).map(withNumbers);
      send(res, 200, 'application/xml; charset=utf-8', reaxmlFeed(listings, baseUrl));
    }],

    ['GET', /^\/api\/listings$/, (_req, res, _m, url) => {
      const results = search(store, parseFilters(Object.fromEntries(url.searchParams)), now()).map(publicJson);
      json(res, 200, { count: results.length, listings: results });
    }],

    ['GET', /^\/api\/listings\/(\d+)$/, (_req, res, m) => {
      const l = publicListing(Number(m[1]));
      if (!l) return json(res, 404, { error: 'not_found' });
      json(res, 200, publicJson(l));
    }],

    ['GET', /^\/health$/, (_req, res) => json(res, 200, { ok: true })],

    // Agency area
    ['GET', /^\/agency\/login$/, (req, res) => {
      if (currentAgency(req)) return redirect(res, '/agency');
      html(res, 200, views.layout('Agency login', views.loginPage()));
    }],

    ['POST', /^\/agency\/login$/, async (req, res) => {
      const b = await readForm(req);
      const agency = b.access_code ? store.agencyByAccessCode(String(b.access_code)) : null;
      if (!agency) return html(res, 401, views.layout('Agency login', views.loginPage('That access code was not recognised.')));
      redirect(res, '/agency', { 'Set-Cookie': sessionCookie(agency.id) });
    }],

    ['POST', /^\/agency\/logout$/, (_req, res) => {
      redirect(res, '/', { 'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` });
    }],

    ['GET', /^\/agency$/, agencyOnly((req, res, agency) => {
      html(res, 200, views.layout('Dashboard', views.dashboardPage(agency, store.agencyListings(agency.id), store.agencyEnquiries(agency.id), now()), { agency }));
    })],

    ['GET', /^\/agency\/listings\/new$/, agencyOnly((req, res, agency) => {
      html(res, 200, views.layout('New listing', views.listingFormPage({ listing: { state: agency.state }, action: '/agency/listings', title: 'New tenanted listing' }), { agency }));
    })],

    ['POST', /^\/agency\/listings$/, agencyOnly(async (req, res, agency) => {
      const b = await readForm(req);
      const parsed = parseSubmission(b);
      if (parsed.errors.length) {
        return html(res, 422, views.layout('New listing', views.listingFormPage({
          listing: { ...b, ...parsed.data }, ledgerCsv: b.ledger_csv, complianceCsv: b.compliance_csv,
          errors: parsed.errors, action: '/agency/listings', title: 'New tenanted listing',
        }), { agency }));
      }
      const id = store.createListing(agency.id, parsed.data);
      store.replaceLedger(id, parsed.ledger);
      store.replaceCompliance(id, parsed.compliance);
      certifyListing(id);
      redirect(res, `/agency/listings/${id}`);
    })],

    ['GET', /^\/agency\/listings\/(\d+)$/, agencyOnly((req, res, agency, m) => {
      const l = ownListing(agency, Number(m[1]));
      if (!l) return notFound(req, res);
      html(res, 200, views.layout(l.address, views.agencyListingPage(l, {
        ledgerCount: store.ledger(l.id).length, complianceCount: store.compliance(l.id).length,
      }), { agency }));
    })],

    ['GET', /^\/agency\/listings\/(\d+)\/edit$/, agencyOnly((req, res, agency, m) => {
      const l = ownListing(agency, Number(m[1]));
      if (!l) return notFound(req, res);
      html(res, 200, views.layout('Edit listing', views.listingFormPage({
        listing: l, ledgerCsv: toCsv(store.ledger(l.id), ['due_date', 'amount_due', 'paid_date', 'amount_paid']),
        complianceCsv: toCsv(store.compliance(l.id), ['item', 'completed_date']),
        action: `/agency/listings/${l.id}/edit`, title: 'Edit listing',
      }), { agency }));
    })],

    ['POST', /^\/agency\/listings\/(\d+)\/edit$/, agencyOnly(async (req, res, agency, m) => {
      const l = ownListing(agency, Number(m[1]));
      if (!l) return notFound(req, res);
      const b = await readForm(req);
      const parsed = parseSubmission(b);
      if (parsed.errors.length) {
        return html(res, 422, views.layout('Edit listing', views.listingFormPage({
          listing: { ...b, ...parsed.data }, ledgerCsv: b.ledger_csv, complianceCsv: b.compliance_csv,
          errors: parsed.errors, action: `/agency/listings/${l.id}/edit`, title: 'Edit listing',
        }), { agency }));
      }
      store.updateListing(l.id, parsed.data);
      store.replaceLedger(l.id, parsed.ledger);
      store.replaceCompliance(l.id, parsed.compliance);
      certifyListing(l.id);
      redirect(res, `/agency/listings/${l.id}`);
    })],

    ['POST', /^\/agency\/listings\/(\d+)\/certify$/, agencyOnly((req, res, agency, m) => {
      const l = ownListing(agency, Number(m[1]));
      if (!l) return notFound(req, res);
      certifyListing(l.id);
      redirect(res, `/agency/listings/${l.id}`);
    })],

    ['POST', /^\/agency\/listings\/(\d+)\/status$/, agencyOnly(async (req, res, agency, m) => {
      const l = ownListing(agency, Number(m[1]));
      if (!l) return notFound(req, res);
      const b = await readForm(req);
      if (!['under_offer', 'sold', 'withdrawn'].includes(b.status)) return html(res, 400, views.layout('Error', views.messagePage('Invalid status', 'Choose under offer, sold or withdrawn.')));
      store.setStatus(l.id, b.status);
      redirect(res, `/agency/listings/${l.id}`);
    })],

    ['GET', /^\/static\/([\w.-]+)$/, (req, res, m) => {
      const file = path.join(PUBLIC_DIR, m[1]);
      if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file)) return notFound(req, res);
      const type = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }[path.extname(file)] ?? 'application/octet-stream';
      send(res, 200, type, fs.readFileSync(file), { 'Cache-Control': 'public, max-age=3600' });
    }],
  ];

  function agencyOnly(handler) {
    return (req, res, m, url) => {
      const agency = currentAgency(req);
      if (!agency) return redirect(res, '/agency/login');
      return handler(req, res, agency, m, url);
    };
  }

  function ownListing(agency, id) {
    const l = store.listing(id);
    if (!l || l.agency_id !== agency.id) return null;
    return { ...l, certification: l.certification_json ? JSON.parse(l.certification_json) : null };
  }

  function publicListing(id) {
    const l = store.listing(id);
    if (!l || l.status !== 'certified' || !l.certificate_expires || l.certificate_expires < now()) return null;
    return withNumbers(l);
  }

  function notFound(req, res) {
    html(res, 404, views.layout('Not found', views.messagePage('Not found', 'That page does not exist or the listing is no longer live.'), { agency: currentAgency(req) }));
  }

  return async function handle(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      for (const [method, re, fn] of routes) {
        const m = url.pathname.match(re);
        if (m && req.method === method) return await fn(req, res, m, url);
      }
      const pathMatches = routes.some(([, re]) => re.test(url.pathname));
      if (pathMatches) return send(res, 405, 'text/plain', 'Method not allowed');
      notFound(req, res);
    } catch (err) {
      if (err.status === 413) return send(res, 413, 'text/plain', 'Upload too large');
      console.error(err);
      if (!res.headersSent) send(res, 500, 'text/plain', 'Something went wrong');
    }
  };
}

function parseSubmission(b) {
  const { data, errors } = validateListing(b);
  const ledger = parseLedgerCsv(b.ledger_csv ?? '');
  const compliance = parseComplianceCsv(b.compliance_csv ?? '');
  errors.push(...ledger.errors.slice(0, 10).map((e) => `Rent ledger: ${e}`));
  errors.push(...compliance.errors.slice(0, 10).map((e) => `Compliance: ${e}`));
  return { data, errors, ledger: ledger.rows, compliance: compliance.items };
}

function publicJson(l) {
  const c = l.certification;
  return {
    id: l.id,
    address: l.address, suburb: l.suburb, state: l.state, postcode: l.postcode,
    property_type: l.property_type, bedrooms: l.bedrooms, bathrooms: l.bathrooms, parking: l.parking,
    price: l.price, weekly_rent: l.weekly_rent, market_rent: l.market_rent,
    lease: { start: l.lease_start, end: l.lease_end, periodic: !!l.periodic },
    agency: l.agency_name,
    certificate: { id: c.certificateId, grade: c.grade, issued: c.issuedAt, expires: c.expiresAt },
    checks: c.checks.map(({ key, label, status, detail }) => ({ key, label, status, detail })),
    tenant_performance: l.tenant_consent ? {
      band: c.performance.band, on_time_rate: c.performance.onTimeRate,
      periods: c.performance.periods, serious_arrears_events: c.performance.seriousArrearsEvents,
    } : null,
    numbers: {
      gross_yield: l.numbers.grossYield, net_yield: l.numbers.netYield,
      stamp_duty_estimate: l.numbers.stampDuty, weekly_cashflow_estimate: l.numbers.weeklyCashflow,
    },
  };
}

function toCsv(rows, cols) {
  return [cols.join(','), ...rows.map((r) => cols.map((c) => r[c] ?? '').join(','))].join('\n');
}

function str(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

function isEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function readForm(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) {
      const e = new Error('Body too large');
      e.status = 413;
      throw e;
    }
    chunks.push(chunk);
  }
  return Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'",
};

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

function html(res, status, body) {
  send(res, status, 'text/html; charset=utf-8', body);
}

function json(res, status, body) {
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(body, null, 2));
}

function redirect(res, location, headers = {}) {
  res.writeHead(303, { Location: location, ...SECURITY_HEADERS, ...headers });
  res.end();
}
