// Search and buyer-alert matching over certified listings.

import { investorNumbers } from './finance.js';

const GRADE_RANK = { A: 2, B: 1 };

export function withNumbers(listing) {
  const certification = listing.certification_json ? JSON.parse(listing.certification_json) : null;
  return { ...listing, certification, numbers: investorNumbers(listing) };
}

// Normalise raw query/form input into typed filters.
export function parseFilters(q = {}) {
  const num = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : Number(v));
  const str = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
  const f = {
    state: str(q.state)?.toUpperCase() ?? null,
    suburb: str(q.suburb),
    property_type: str(q.property_type),
    max_price: num(q.max_price),
    min_net_yield: num(q.min_net_yield), // percent, e.g. 4.5
    min_grade: str(q.min_grade)?.toUpperCase() ?? null,
  };
  for (const k of ['max_price', 'min_net_yield']) if (f[k] !== null && !Number.isFinite(f[k])) f[k] = null;
  if (f.min_grade && !GRADE_RANK[f.min_grade]) f.min_grade = null;
  return f;
}

export function matches(listing, f) {
  if (f.state && listing.state !== f.state) return false;
  if (f.suburb && !listing.suburb.toLowerCase().includes(f.suburb.toLowerCase())) return false;
  if (f.property_type && listing.property_type !== f.property_type) return false;
  if (f.max_price !== null && listing.price > f.max_price) return false;
  if (f.min_net_yield !== null && listing.numbers.netYield * 100 < f.min_net_yield) return false;
  if (f.min_grade && (GRADE_RANK[listing.certification?.grade] ?? 0) < GRADE_RANK[f.min_grade]) return false;
  return true;
}

export function search(store, filters, asOf) {
  return store.certifiedListings(asOf).map(withNumbers).filter((l) => matches(l, filters));
}

// After a listing becomes certified, queue an alert for every matching saved search.
export function queueAlertsFor(store, listingId, baseUrl) {
  const listing = withNumbers(store.listing(listingId));
  if (listing.status !== 'certified') return 0;
  let queued = 0;
  for (const s of store.savedSearches()) {
    if (!matches(listing, parseFilters(s))) continue;
    const subject = `New certified tenanted property: ${listing.address}, ${listing.suburb} ${listing.state}`;
    const body = [
      `${listing.address}, ${listing.suburb} ${listing.state} ${listing.postcode}`,
      `Price: $${listing.price.toLocaleString('en-AU')}  |  Rent: $${listing.weekly_rent}/wk`,
      `Net yield: ${(listing.numbers.netYield * 100).toFixed(2)}%  |  Grade ${listing.certification.grade}`,
      `View the certified pack: ${baseUrl}/listings/${listing.id}`,
      '',
      `Unsubscribe: ${baseUrl}/alerts/unsubscribe/${s.unsubscribe_token}`,
    ].join('\n');
    if (store.queueAlert({ saved_search_id: s.id, listing_id: listing.id, email: s.email, subject, body })) queued++;
  }
  return queued;
}
