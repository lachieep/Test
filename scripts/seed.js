// Reset the local database and load demo agencies and listings across all
// states, with rent ledgers generated relative to today.
//   npm run seed

import fs from 'node:fs';
import { openDb } from '../src/db.js';
import { certify } from '../src/lib/certify.js';
import { addMonths, addDays, today } from '../src/lib/dates.js';

const file = process.env.DB_FILE || 'data/tenanted.db';
for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
const store = openDb(file);
const asOf = today();

const bathurst = store.createAgency({
  name: 'Demo Realty Bathurst', state: 'NSW', licence_number: 'NSW-DEMO-001',
  email: 'rentals@demo-bathurst.example', access_code: 'demo-bathurst',
});
const national = store.createAgency({
  name: 'Demo Property Group', state: 'QLD', licence_number: 'QLD-DEMO-002',
  email: 'sales@demo-national.example', access_code: 'demo-national',
});

// Deterministic pseudo-random so the demo looks the same every time.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

function monthlyLedger(weeklyRent, months, lateProbability) {
  const monthly = Math.round((weeklyRent * 52) / 12 * 100) / 100;
  const rows = [];
  for (let i = months; i >= 1; i--) {
    const due = addMonths(asOf, -i);
    const late = rand() < lateProbability;
    const daysLate = late ? 1 + Math.floor(rand() * 9) : 0;
    rows.push({ due_date: due, amount_due: monthly, paid_date: addDays(due, daysLate), amount_paid: monthly });
  }
  return rows;
}

const ago = (months) => addMonths(asOf, -months);
const ahead = (months) => addMonths(asOf, months);

const listings = [
  {
    agency: bathurst,
    data: {
      address: '14 Keppel Street', suburb: 'Bathurst', state: 'NSW', postcode: '2795', property_type: 'House',
      bedrooms: 3, bathrooms: 1, parking: 1, land_size: 650, price: 620_000, weekly_rent: 540, market_rent: 570,
      management_fee_pct: 7.7, council_rates: 2_300, insurance: 1_600, maintenance: 1_500,
      lease_start: ago(20), lease_end: ahead(4), bond_amount: 2_160, bond_reference: 'NSW-RB-1048821',
      entry_condition_date: ago(20), last_inspection_date: ago(2), tenant_consent: 1, tenant_consent_date: ago(1),
      description: 'Solid brick home a short walk to the CBD and TAFE. Long-term tenant keen to stay.',
    },
    ledger: monthlyLedger(540, 20, 0.05),
    compliance: [{ item: 'smoke_alarm', completed_date: ago(3) }],
  },
  {
    agency: bathurst,
    data: {
      address: '3/41 Havannah Street', suburb: 'Bathurst', state: 'NSW', postcode: '2795', property_type: 'Unit',
      bedrooms: 2, bathrooms: 1, parking: 1, price: 410_000, weekly_rent: 430, market_rent: 430,
      management_fee_pct: 7.7, council_rates: 1_700, strata_fees: 2_400, insurance: 900, maintenance: 800,
      lease_start: ago(9), lease_end: ahead(3), bond_amount: 1_720, bond_reference: 'NSW-RB-1102934',
      entry_condition_date: ago(9), last_inspection_date: ago(1),
      description: 'Draft listing: smoke alarm check is overdue, so certification fails until it is uploaded.',
    },
    ledger: monthlyLedger(430, 9, 0.1),
    compliance: [{ item: 'smoke_alarm', completed_date: ago(15) }],
  },
  {
    agency: national,
    data: {
      address: '22 Hume Street', suburb: 'Toowoomba', state: 'QLD', postcode: '4350', property_type: 'House',
      bedrooms: 4, bathrooms: 2, parking: 2, land_size: 720, price: 640_000, weekly_rent: 580, market_rent: 600,
      management_fee_pct: 8.8, council_rates: 2_900, insurance: 1_900, maintenance: 1_500,
      lease_start: ago(30), periodic: 1, bond_amount: 2_320, bond_reference: 'RTA-5561023',
      entry_condition_date: ago(30), last_inspection_date: ago(3), tenant_consent: 1, tenant_consent_date: ago(1),
      description: 'Family home near the hospital precinct. Tenants in place for 2.5 years.',
    },
    ledger: monthlyLedger(580, 24, 0.08),
    compliance: [{ item: 'smoke_alarm', completed_date: ago(5) }, { item: 'minimum_standards', completed_date: ago(12) }],
  },
  {
    agency: national,
    data: {
      address: '5/18 Myers Street', suburb: 'Geelong', state: 'VIC', postcode: '3220', property_type: 'Unit',
      bedrooms: 2, bathrooms: 1, parking: 1, price: 495_000, weekly_rent: 470, market_rent: 480,
      management_fee_pct: 7.5, council_rates: 1_900, strata_fees: 2_800, insurance: 800, maintenance: 800,
      lease_start: ago(14), lease_end: ahead(10), has_gas: 1, bond_amount: 2_040, bond_reference: 'RTBA-889201',
      entry_condition_date: ago(14), last_inspection_date: ago(4), tenant_consent: 1, tenant_consent_date: ago(1),
    },
    ledger: monthlyLedger(470, 14, 0.02),
    compliance: [
      { item: 'smoke_alarm', completed_date: ago(4) }, { item: 'gas_safety', completed_date: ago(10) },
      { item: 'electrical_safety', completed_date: ago(10) }, { item: 'minimum_standards', completed_date: ago(14) },
    ],
  },
  {
    agency: national,
    data: {
      address: '31 Cambridge Street', suburb: 'Rockingham', state: 'WA', postcode: '6168', property_type: 'House',
      bedrooms: 4, bathrooms: 2, parking: 2, land_size: 600, has_pool: 1, price: 610_000, weekly_rent: 650, market_rent: 680,
      management_fee_pct: 9, council_rates: 2_400, insurance: 1_800, maintenance: 1_800,
      lease_start: ago(16), lease_end: ahead(8), bond_amount: 2_600, bond_reference: 'WA-BOND-773310',
      entry_condition_date: ago(16), last_inspection_date: ago(8),
      description: 'Below-market rent with room to review at renewal. Pool fully fenced.',
    },
    ledger: monthlyLedger(650, 16, 0.12),
    compliance: [
      { item: 'smoke_alarm', completed_date: ago(6) }, { item: 'rcd', completed_date: ago(16) },
      { item: 'pool_barrier', completed_date: ago(20) },
    ],
  },
  {
    agency: national,
    data: {
      address: '12 Lyons Avenue', suburb: 'Elizabeth Park', state: 'SA', postcode: '5113', property_type: 'House',
      bedrooms: 3, bathrooms: 1, parking: 1, land_size: 560, price: 520_000, weekly_rent: 520, market_rent: 530,
      management_fee_pct: 8, council_rates: 1_800, insurance: 1_400, maintenance: 1_200,
      lease_start: ago(13), lease_end: ahead(11), bond_amount: 2_080, bond_reference: 'SA-CBS-4410982',
      entry_condition_date: ago(13), last_inspection_date: ago(2), tenant_consent: 1, tenant_consent_date: ago(1),
    },
    ledger: monthlyLedger(520, 13, 0.0),
    compliance: [{ item: 'smoke_alarm', completed_date: ago(2) }],
  },
  {
    agency: national,
    data: {
      address: '8 Wellington Street', suburb: 'Launceston', state: 'TAS', postcode: '7250', property_type: 'Townhouse',
      bedrooms: 3, bathrooms: 2, parking: 1, price: 540_000, weekly_rent: 500, market_rent: 500,
      management_fee_pct: 8.25, council_rates: 2_000, strata_fees: 1_200, insurance: 1_200, maintenance: 1_000,
      lease_start: ago(18), lease_end: ahead(6), bond_amount: 2_000, bond_reference: 'TAS-RDB-220871',
      entry_condition_date: ago(18), last_inspection_date: ago(5),
    },
    ledger: monthlyLedger(500, 18, 0.06),
    compliance: [{ item: 'smoke_alarm', completed_date: ago(5) }, { item: 'minimum_standards', completed_date: ago(18) }],
  },
  {
    agency: national,
    data: {
      address: '14/60 Swanson Plaza', suburb: 'Belconnen', state: 'ACT', postcode: '2617', property_type: 'Apartment',
      bedrooms: 2, bathrooms: 2, parking: 1, price: 575_000, weekly_rent: 620, market_rent: 610,
      management_fee_pct: 7, council_rates: 2_200, strata_fees: 4_200, land_tax: 2_700, insurance: 700, maintenance: 600,
      lease_start: ago(12), lease_end: ahead(12), bond_amount: 2_480, bond_reference: 'ACT-RB-339104',
      entry_condition_date: ago(12), last_inspection_date: ago(3), tenant_consent: 1, tenant_consent_date: ago(1),
    },
    ledger: monthlyLedger(620, 12, 0.04),
    compliance: [
      { item: 'smoke_alarm', completed_date: ago(3) }, { item: 'ceiling_insulation', completed_date: ago(30) },
      { item: 'energy_rating', completed_date: ago(12) },
    ],
  },
  {
    agency: national,
    data: {
      address: '9/12 Mitchell Street', suburb: 'Darwin City', state: 'NT', postcode: '0800', property_type: 'Apartment',
      bedrooms: 2, bathrooms: 2, parking: 1, price: 385_000, weekly_rent: 600, market_rent: 620,
      management_fee_pct: 8.5, council_rates: 1_900, strata_fees: 6_500, insurance: 900, maintenance: 800,
      lease_start: ago(12), lease_end: ahead(6), bond_amount: 2_400, bond_reference: 'NT-BOND-118832',
      entry_condition_date: ago(12), last_inspection_date: ago(4),
    },
    ledger: monthlyLedger(600, 12, 0.08),
    compliance: [{ item: 'smoke_alarm', completed_date: ago(4) }],
  },
];

let certified = 0;
for (const l of listings) {
  const id = store.createListing(l.agency, l.data);
  store.replaceLedger(id, l.ledger);
  store.replaceCompliance(id, l.compliance);
  const result = certify({ listing: store.listing(id), ledger: store.ledger(id), compliance: store.compliance(id), asOf });
  store.saveCertification(id, result);
  if (result.certified) certified++;
}

store.close();
console.log(`Seeded ${listings.length} listings (${certified} certified) into ${file}.`);
console.log('Agency logins: demo-bathurst (NSW), demo-national (all other states).');
