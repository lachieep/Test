// Validation for the agency listing form.

import { STATES } from '../config/compliance-rules.js';
import { isValidDate } from './dates.js';

export const PROPERTY_TYPES = ['House', 'Unit', 'Apartment', 'Townhouse', 'Villa', 'Duplex'];

const REQUIRED_TEXT = ['address', 'suburb', 'postcode'];
const OPTIONAL_TEXT = ['bond_reference', 'description', 'tour_url'];
const INTEGERS = ['bedrooms', 'bathrooms', 'parking', 'land_size'];
const MONEY = ['market_rent', 'management_fee_pct', 'council_rates', 'strata_fees', 'insurance', 'land_tax', 'maintenance', 'bond_amount'];
const DATES = ['lease_start', 'lease_end', 'entry_condition_date', 'last_inspection_date', 'tenant_consent_date'];
const FLAGS = ['has_pool', 'has_gas', 'periodic', 'tenant_consent'];

export function validateListing(body) {
  const errors = [];
  const data = {};
  const val = (k) => (body[k] === undefined || body[k] === null ? '' : String(body[k]).trim());

  for (const k of REQUIRED_TEXT) {
    if (!val(k)) errors.push(`${label(k)} is required`);
    else data[k] = val(k).slice(0, 200);
  }
  for (const k of OPTIONAL_TEXT) data[k] = val(k) ? val(k).slice(0, 4000) : null;

  const state = val('state').toUpperCase();
  if (!STATES.includes(state)) errors.push('State must be one of ' + STATES.join(', '));
  else data.state = state;

  if (data.postcode && !/^\d{4}$/.test(data.postcode)) errors.push('Postcode must be 4 digits');

  const type = val('property_type');
  if (!PROPERTY_TYPES.includes(type)) errors.push('Property type is required');
  else data.property_type = type;

  const price = Number(val('price'));
  if (!(price > 0) || !Number.isInteger(price)) errors.push('Price must be a whole dollar amount');
  else data.price = price;

  const rent = Number(val('weekly_rent'));
  if (!(rent > 0)) errors.push('Weekly rent is required');
  else data.weekly_rent = rent;

  for (const k of INTEGERS) {
    if (!val(k)) { data[k] = null; continue; }
    const n = Number(val(k));
    if (!Number.isInteger(n) || n < 0) errors.push(`${label(k)} must be a whole number`);
    else data[k] = n;
  }
  for (const k of MONEY) {
    if (!val(k)) { data[k] = null; continue; }
    const n = Number(val(k));
    if (!Number.isFinite(n) || n < 0) errors.push(`${label(k)} must be a positive number`);
    else data[k] = n;
  }
  for (const k of DATES) {
    if (!val(k)) { data[k] = null; continue; }
    if (!isValidDate(val(k))) errors.push(`${label(k)} must be a date (YYYY-MM-DD)`);
    else data[k] = val(k);
  }
  for (const k of FLAGS) data[k] = ['on', '1', 'true', 'yes'].includes(val(k).toLowerCase()) ? 1 : 0;

  if (data.tour_url && !/^https:\/\//i.test(data.tour_url)) errors.push('Virtual tour link must start with https://');
  if (data.tenant_consent && !data.tenant_consent_date) errors.push('Tenant consent date is required when consent is ticked');
  if (data.lease_start && data.lease_end && data.lease_end < data.lease_start) errors.push('Lease end is before lease start');

  return { data, errors };
}

function label(k) {
  return k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
