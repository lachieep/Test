import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agencies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  licence_number TEXT,
  email TEXT,
  access_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  status TEXT NOT NULL DEFAULT 'draft',
  address TEXT NOT NULL,
  suburb TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT NOT NULL,
  property_type TEXT NOT NULL,
  bedrooms INTEGER, bathrooms INTEGER, parking INTEGER,
  land_size INTEGER,
  has_pool INTEGER NOT NULL DEFAULT 0,
  has_gas INTEGER NOT NULL DEFAULT 0,
  price INTEGER NOT NULL,
  weekly_rent REAL NOT NULL,
  market_rent REAL,
  management_fee_pct REAL, council_rates REAL, strata_fees REAL,
  insurance REAL, land_tax REAL, maintenance REAL,
  lease_start TEXT, lease_end TEXT,
  periodic INTEGER NOT NULL DEFAULT 0,
  bond_amount REAL, bond_reference TEXT,
  entry_condition_date TEXT, last_inspection_date TEXT,
  tenant_consent INTEGER NOT NULL DEFAULT 0,
  tenant_consent_date TEXT,
  description TEXT, tour_url TEXT,
  certification_json TEXT,
  certificate_id TEXT, certified_at TEXT, certificate_expires TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  due_date TEXT NOT NULL, amount_due REAL NOT NULL,
  paid_date TEXT, amount_paid REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS compliance_records (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  item TEXT NOT NULL, completed_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, message TEXT,
  keep_manager INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  state TEXT, suburb TEXT, property_type TEXT,
  max_price INTEGER, min_net_yield REAL, min_grade TEXT,
  unsubscribe_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alert_outbox (
  id INTEGER PRIMARY KEY,
  saved_search_id INTEGER NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  UNIQUE (saved_search_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status, state);
CREATE INDEX IF NOT EXISTS idx_ledger_listing ON ledger_entries(listing_id);
CREATE INDEX IF NOT EXISTS idx_compliance_listing ON compliance_records(listing_id);
`;

export const LISTING_FIELDS = [
  'address', 'suburb', 'state', 'postcode', 'property_type',
  'bedrooms', 'bathrooms', 'parking', 'land_size', 'has_pool', 'has_gas',
  'price', 'weekly_rent', 'market_rent',
  'management_fee_pct', 'council_rates', 'strata_fees', 'insurance', 'land_tax', 'maintenance',
  'lease_start', 'lease_end', 'periodic', 'bond_amount', 'bond_reference',
  'entry_condition_date', 'last_inspection_date',
  'tenant_consent', 'tenant_consent_date', 'description', 'tour_url',
];

export function hashAccessCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

export function openDb(file = process.env.DB_FILE || 'data/tenanted.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return new Store(db);
}

export class Store {
  constructor(db) {
    this.db = db;
  }

  close() {
    this.db.close();
  }

  transaction(fn) {
    this.db.exec('BEGIN');
    try {
      const r = fn();
      this.db.exec('COMMIT');
      return r;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  // Agencies
  createAgency({ name, state, licence_number, email, access_code }) {
    const r = this.db.prepare(
      'INSERT INTO agencies (name, state, licence_number, email, access_hash) VALUES (?, ?, ?, ?, ?)'
    ).run(name, state, licence_number ?? null, email ?? null, hashAccessCode(access_code));
    return Number(r.lastInsertRowid);
  }

  agencyByAccessCode(code) {
    return this.db.prepare('SELECT * FROM agencies WHERE access_hash = ?').get(hashAccessCode(code));
  }

  agency(id) {
    return this.db.prepare('SELECT * FROM agencies WHERE id = ?').get(id);
  }

  // Listings
  createListing(agencyId, data) {
    const cols = LISTING_FIELDS.filter((f) => data[f] !== undefined);
    const r = this.db.prepare(
      `INSERT INTO listings (agency_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`
    ).run(agencyId, ...cols.map((c) => data[c]));
    return Number(r.lastInsertRowid);
  }

  updateListing(id, data) {
    const cols = LISTING_FIELDS.filter((f) => data[f] !== undefined);
    if (!cols.length) return;
    this.db.prepare(
      `UPDATE listings SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).run(...cols.map((c) => data[c]), id);
  }

  listing(id) {
    return this.db.prepare(
      `SELECT l.*, a.name AS agency_name, a.licence_number AS agency_licence, a.email AS agency_email
       FROM listings l JOIN agencies a ON a.id = l.agency_id WHERE l.id = ?`
    ).get(id);
  }

  agencyListings(agencyId) {
    return this.db.prepare('SELECT * FROM listings WHERE agency_id = ? ORDER BY updated_at DESC, id DESC').all(agencyId);
  }

  setStatus(id, status) {
    this.db.prepare(`UPDATE listings SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  }

  saveCertification(id, result) {
    this.db.prepare(
      `UPDATE listings SET certification_json = ?, certificate_id = ?, certified_at = ?, certificate_expires = ?,
         status = CASE WHEN ? THEN 'certified' WHEN status = 'certified' THEN 'draft' ELSE status END,
         updated_at = datetime('now')
       WHERE id = ?`
    ).run(JSON.stringify(result), result.certificateId, result.issuedAt, result.expiresAt, result.certified ? 1 : 0, id);
  }

  // Public certified listings that have not expired.
  certifiedListings(asOf) {
    return this.db.prepare(
      `SELECT l.*, a.name AS agency_name FROM listings l JOIN agencies a ON a.id = l.agency_id
       WHERE l.status = 'certified' AND l.certificate_expires >= ? ORDER BY l.certified_at DESC, l.id DESC`
    ).all(asOf);
  }

  // Ledger / compliance
  replaceLedger(listingId, rows) {
    this.transaction(() => {
      this.db.prepare('DELETE FROM ledger_entries WHERE listing_id = ?').run(listingId);
      const ins = this.db.prepare(
        'INSERT INTO ledger_entries (listing_id, due_date, amount_due, paid_date, amount_paid) VALUES (?, ?, ?, ?, ?)'
      );
      for (const r of rows) ins.run(listingId, r.due_date, r.amount_due, r.paid_date, r.amount_paid);
    });
  }

  ledger(listingId) {
    return this.db.prepare(
      'SELECT due_date, amount_due, paid_date, amount_paid FROM ledger_entries WHERE listing_id = ? ORDER BY due_date'
    ).all(listingId);
  }

  replaceCompliance(listingId, items) {
    this.transaction(() => {
      this.db.prepare('DELETE FROM compliance_records WHERE listing_id = ?').run(listingId);
      const ins = this.db.prepare('INSERT INTO compliance_records (listing_id, item, completed_date) VALUES (?, ?, ?)');
      for (const c of items) ins.run(listingId, c.item, c.completed_date);
    });
  }

  compliance(listingId) {
    return this.db.prepare(
      'SELECT item, completed_date FROM compliance_records WHERE listing_id = ? ORDER BY completed_date'
    ).all(listingId);
  }

  // Enquiries
  createEnquiry(listingId, { name, email, phone, message, keep_manager }) {
    const r = this.db.prepare(
      'INSERT INTO enquiries (listing_id, name, email, phone, message, keep_manager) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(listingId, name, email, phone ?? null, message ?? null, keep_manager ? 1 : 0);
    return Number(r.lastInsertRowid);
  }

  agencyEnquiries(agencyId) {
    return this.db.prepare(
      `SELECT e.*, l.address, l.suburb FROM enquiries e JOIN listings l ON l.id = e.listing_id
       WHERE l.agency_id = ? ORDER BY e.id DESC`
    ).all(agencyId);
  }

  // Saved searches / alerts
  createSavedSearch(s) {
    const token = crypto.randomBytes(16).toString('hex');
    const r = this.db.prepare(
      `INSERT INTO saved_searches (email, state, suburb, property_type, max_price, min_net_yield, min_grade, unsubscribe_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(s.email, s.state ?? null, s.suburb ?? null, s.property_type ?? null,
      s.max_price ?? null, s.min_net_yield ?? null, s.min_grade ?? null, token);
    return { id: Number(r.lastInsertRowid), token };
  }

  savedSearches() {
    return this.db.prepare('SELECT * FROM saved_searches').all();
  }

  deleteSavedSearchByToken(token) {
    return this.db.prepare('DELETE FROM saved_searches WHERE unsubscribe_token = ?').run(token).changes > 0;
  }

  queueAlert({ saved_search_id, listing_id, email, subject, body }) {
    const r = this.db.prepare(
      `INSERT OR IGNORE INTO alert_outbox (saved_search_id, listing_id, email, subject, body) VALUES (?, ?, ?, ?, ?)`
    ).run(saved_search_id, listing_id, email, subject, body);
    return r.changes > 0;
  }

  pendingAlerts() {
    return this.db.prepare('SELECT * FROM alert_outbox WHERE sent_at IS NULL ORDER BY id').all();
  }

  markAlertSent(id) {
    this.db.prepare(`UPDATE alert_outbox SET sent_at = datetime('now') WHERE id = ?`).run(id);
  }
}
