// Server-rendered pages. Every dynamic value goes through esc().

import { esc, money, pct } from './lib/html.js';
import { STATES, rulesFor } from './config/compliance-rules.js';
import { STAMP_DUTY_AS_AT } from './config/stamp-duty.js';
import { PROPERTY_TYPES } from './lib/validate.js';
import { rentVsMarket } from './lib/finance.js';

export function layout(title, body, { agency = null, flash = null } = {}) {
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Tenanted</title>
<link rel="stylesheet" href="/static/styles.css">
</head>
<body>
<header class="site">
  <a class="brand" href="/">Tenanted<span>.</span></a>
  <nav>
    <a href="/">Browse</a>
    <a href="/alerts/new">Get alerts</a>
    ${agency ? `<a href="/agency">${esc(agency.name)}</a>
    <form method="post" action="/agency/logout" class="inline"><button class="link">Log out</button></form>`
    : '<a href="/agency/login">For agencies</a>'}
  </nav>
</header>
<main>
${flash ? `<div class="flash">${esc(flash)}</div>` : ''}
${body}
</main>
<footer class="site">
  <p>Tenanted lists certified tenanted investment properties marketed by licensed real estate agencies.
  Figures are estimates and are not financial, tax or legal advice. Stamp duty scales are indicative (${esc(STAMP_DUTY_AS_AT)}).</p>
</footer>
</body>
</html>`;
}

function stateOptions(selected, { any = true } = {}) {
  return (any ? '<option value="">Any state</option>' : '') +
    STATES.map((s) => `<option${s === selected ? ' selected' : ''}>${s}</option>`).join('');
}

function typeOptions(selected, { any = true } = {}) {
  return (any ? '<option value="">Any type</option>' : '') +
    PROPERTY_TYPES.map((t) => `<option${t === selected ? ' selected' : ''}>${t}</option>`).join('');
}

function gradeBadge(grade) {
  return grade ? `<span class="badge grade-${esc(grade)}">Certified · Grade ${esc(grade)}</span>` : '';
}

export function searchFields(f) {
  return `
  <label>State<select name="state">${stateOptions(f.state)}</select></label>
  <label>Suburb<input name="suburb" value="${esc(f.suburb)}" placeholder="e.g. Bathurst"></label>
  <label>Type<select name="property_type">${typeOptions(f.property_type)}</select></label>
  <label>Max price<input name="max_price" type="number" min="0" step="10000" value="${esc(f.max_price)}"></label>
  <label>Min net yield %<input name="min_net_yield" type="number" min="0" step="0.1" value="${esc(f.min_net_yield)}"></label>
  <label>Min grade<select name="min_grade">
    <option value="">Any</option>
    <option${f.min_grade === 'B' ? ' selected' : ''}>B</option>
    <option${f.min_grade === 'A' ? ' selected' : ''}>A</option>
  </select></label>`;
}

export function homePage(listings, filters) {
  const cards = listings.map((l) => `
    <a class="card" href="/listings/${l.id}">
      <div class="card-top">${gradeBadge(l.certification?.grade)}<span class="type">${esc(l.property_type)}</span></div>
      <h3>${esc(l.address)}</h3>
      <p class="muted">${esc(l.suburb)} ${esc(l.state)} ${esc(l.postcode)}</p>
      <p class="price">${money(l.price)}</p>
      <dl class="stats">
        <div><dt>Rent</dt><dd>${money(l.weekly_rent)}/wk</dd></div>
        <div><dt>Gross</dt><dd>${pct(l.numbers.grossYield)}</dd></div>
        <div><dt>Net</dt><dd>${pct(l.numbers.netYield)}</dd></div>
        <div><dt>Lease</dt><dd>${l.periodic ? 'Periodic' : `to ${esc(l.lease_end)}`}</dd></div>
      </dl>
      <p class="muted small">${esc(l.bedrooms ?? '–')} bed · ${esc(l.bathrooms ?? '–')} bath · ${esc(l.agency_name)}</p>
    </a>`).join('');

  return `
<section class="hero">
  <h1>Buy rental properties with the tenant in place. Every listing verified.</h1>
  <p>Each listing comes with a certified pack from the managing agency's own records: rent ledger, lease, bond, inspections and the state's compliance checks. You get rent from day one, and the tenant keeps their home.</p>
</section>
<form class="filters" method="get" action="/">
  ${searchFields(filters)}
  <button>Search</button>
</form>
<p class="muted">${listings.length} certified ${listings.length === 1 ? 'property' : 'properties'}. <a href="/alerts/new">Email me new matches</a></p>
<section class="grid">${cards || '<p>No certified properties match those filters yet.</p>'}</section>`;
}

function checkRow(c) {
  const icon = { pass: '✓', fail: '✕', warn: '!', info: 'i' }[c.status];
  return `<li class="check ${esc(c.status)}"><span class="icon" aria-label="${esc(c.status)}">${icon}</span>
    <div><strong>${esc(c.label)}</strong><br><span class="muted">${esc(c.detail)}</span></div></li>`;
}

export function listingPage(l, { sent = false } = {}) {
  const c = l.certification;
  const n = l.numbers;
  const perf = c.performance;
  const rvm = rentVsMarket(l.weekly_rent, l.market_rent);

  const performance = l.tenant_consent
    ? `<dl class="kv">
        <dt>Payment rating</dt><dd><strong>${esc(perf.band)}</strong></dd>
        <dt>On-time payments</dt><dd>${pct(perf.onTimeRate, 1)} of ${esc(perf.periods)} rent periods</dd>
        <dt>Late payments</dt><dd>${esc(perf.latePayments)} (longest ${esc(perf.maxDaysLate)} days)</dd>
        <dt>14+ day arrears events</dt><dd>${esc(perf.seriousArrearsEvents)}</dd>
        <dt>History covered</dt><dd>${esc(perf.coverageMonths)} months</dd>
      </dl>
      <p class="muted small">Shared with the tenant's written consent (${esc(l.tenant_consent_date)}). No personal details are held or shown.</p>`
    : `<p>The tenant has not consented to share their payment history. The certified checks confirm the rent ledger was verified and whether rent is paid to date.</p>`;

  const expenses = Object.entries({
    'Management fee': n.expenses.managementFee,
    'Council rates': n.expenses.councilRates,
    'Strata / body corporate': n.expenses.strataFees,
    'Landlord insurance': n.expenses.insurance,
    'Land tax': n.expenses.landTax,
    'Maintenance allowance': n.expenses.maintenance,
  }).filter(([, v]) => v > 0).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${money(v)}</dd>`).join('');

  return `
<p><a href="/">← All certified properties</a></p>
<section class="listing-head">
  <div>
    ${gradeBadge(c.grade)}
    <h1>${esc(l.address)}</h1>
    <p class="muted">${esc(l.suburb)} ${esc(l.state)} ${esc(l.postcode)} · ${esc(l.property_type)} ·
      ${esc(l.bedrooms ?? '–')} bed · ${esc(l.bathrooms ?? '–')} bath · ${esc(l.parking ?? '–')} car${l.land_size ? ` · ${esc(l.land_size)} m²` : ''}</p>
  </div>
  <div class="price-box">
    <p class="price">${money(l.price)}</p>
    <p>Leased at <strong>${money(l.weekly_rent)}/wk</strong></p>
  </div>
</section>

<section class="cert-strip">
  <div><span class="muted small">Certificate</span><br><strong>${esc(c.certificateId)}</strong></div>
  <div><span class="muted small">Verified</span><br><strong>${esc(c.issuedAt)}</strong></div>
  <div><span class="muted small">Valid until</span><br><strong>${esc(c.expiresAt)}</strong></div>
  <div><span class="muted small">Marketed by</span><br><strong>${esc(l.agency_name)}</strong>${l.agency_licence ? `<br><span class="muted small">Licence ${esc(l.agency_licence)}</span>` : ''}</div>
</section>

<div class="two-col">
  <div>
    <section class="panel">
      <h2>Verified tenancy pack</h2>
      <ul class="checks">${c.checks.map(checkRow).join('')}</ul>
    </section>

    <section class="panel">
      <h2>Tenancy</h2>
      <dl class="kv">
        <dt>Lease</dt><dd>${l.periodic ? `Periodic (since ${esc(l.lease_start)})` : `${esc(l.lease_start)} to ${esc(l.lease_end)}`}</dd>
        <dt>Rent</dt><dd>${money(l.weekly_rent)}/wk (${money(n.annualRent)} a year)</dd>
        ${rvm ? `<dt>Market appraisal</dt><dd>${money(l.market_rent)}/wk: ${esc(rvm.label)}</dd>` : ''}
        <dt>Bond held</dt><dd>${money(l.bond_amount)}</dd>
      </dl>
    </section>

    <section class="panel">
      <h2>Tenant payment performance</h2>
      ${performance}
    </section>

    ${l.description ? `<section class="panel"><h2>About the property</h2><p class="pre">${esc(l.description)}</p></section>` : ''}
    ${l.tour_url ? `<p><a class="button secondary" href="${esc(l.tour_url)}" rel="noopener" target="_blank">Open virtual tour</a></p>` : ''}
  </div>

  <aside>
    <section class="panel">
      <h2>Investor numbers</h2>
      <dl class="kv">
        <dt>Gross yield</dt><dd><strong>${pct(n.grossYield)}</strong></dd>
        <dt>Net yield</dt><dd><strong>${pct(n.netYield)}</strong></dd>
        ${expenses}
        <dt>Annual expenses</dt><dd>${money(n.annualExpenses)}</dd>
        <dt>Net income</dt><dd>${money(n.netIncome)}</dd>
      </dl>
      <h3>Buying it</h3>
      <dl class="kv">
        <dt>Stamp duty (${esc(l.state)}, est.)</dt><dd>${money(n.stampDuty)}</dd>
        <dt>Conveyancing + inspections</dt><dd>${money(n.assumptions.conveyancing + n.assumptions.inspections)}</dd>
        <dt>Loan at ${pct(n.assumptions.lvr, 0)} LVR</dt><dd>${money(n.loanAmount)}</dd>
        <dt>Cash required</dt><dd><strong>${money(n.cashRequired)}</strong></dd>
        <dt>Interest at ${esc(n.assumptions.interestRatePct)}% (IO)</dt><dd>${money(n.annualInterest)}</dd>
        <dt>Cash flow before tax</dt><dd><strong>${money(n.weeklyCashflow)}/wk</strong></dd>
      </dl>
      <p class="muted small">Estimates only. Excludes depreciation, tax and foreign purchaser surcharges.</p>
    </section>

    <section class="panel" id="enquire">
      <h2>Enquire or make an offer</h2>
      ${sent ? '<p class="flash">Thanks. The agency has your enquiry and will be in touch.</p>' : `
      <form method="post" action="/listings/${l.id}/enquire" class="stack">
        <label>Name<input name="name" required maxlength="120"></label>
        <label>Email<input name="email" type="email" required maxlength="200"></label>
        <label>Phone<input name="phone" maxlength="40"></label>
        <label>Message<textarea name="message" rows="3" maxlength="2000"></textarea></label>
        <label class="check-label"><input type="checkbox" name="keep_manager" checked>
          Keep ${esc(l.agency_name)} as property manager after settlement</label>
        <button>Send to agency</button>
      </form>`}
    </section>
  </aside>
</div>`;
}

export function alertsPage(filters, { done = false } = {}) {
  if (done) {
    return `<section class="panel narrow"><h1>Alert saved</h1>
      <p>We'll email you when a newly certified property matches. Each email has an unsubscribe link.</p>
      <p><a href="/">Back to listings</a></p></section>`;
  }
  return `<section class="panel narrow">
  <h1>Get new matches by email</h1>
  <p>We'll email you when a newly certified tenanted property matches your search.</p>
  <form method="post" action="/alerts" class="filters">
    <label class="wide">Email<input name="email" type="email" required></label>
    ${searchFields(filters)}
    <button>Save alert</button>
  </form>
</section>`;
}

export function loginPage(error) {
  return `<section class="panel narrow">
  <h1>Agency login</h1>
  <p>Licensed agencies list tenanted properties and certify them from their property management records.</p>
  ${error ? `<p class="error">${esc(error)}</p>` : ''}
  <form method="post" action="/agency/login" class="stack">
    <label>Access code<input name="access_code" type="password" required autocomplete="current-password"></label>
    <button>Log in</button>
  </form>
</section>`;
}

const STATUS_LABEL = { draft: 'Draft', certified: 'Certified · live', under_offer: 'Under offer', sold: 'Sold', withdrawn: 'Withdrawn' };

export function dashboardPage(agency, listings, enquiries, asOf) {
  const rows = listings.map((l) => {
    const expired = l.status === 'certified' && l.certificate_expires < asOf;
    return `<tr>
      <td><a href="/agency/listings/${l.id}">${esc(l.address)}, ${esc(l.suburb)} ${esc(l.state)}</a></td>
      <td>${money(l.price)}</td>
      <td><span class="status ${esc(l.status)}${expired ? ' expired' : ''}">${expired ? 'Certificate expired' : esc(STATUS_LABEL[l.status] ?? l.status)}</span></td>
      <td>${esc(l.certificate_expires ?? '–')}</td>
    </tr>`;
  }).join('');

  const enq = enquiries.map((e) => `<tr>
      <td>${esc(e.created_at)}</td>
      <td>${esc(e.address)}, ${esc(e.suburb)}</td>
      <td>${esc(e.name)}<br><span class="muted small">${esc(e.email)} ${esc(e.phone ?? '')}</span></td>
      <td>${e.keep_manager ? '<strong>Yes</strong>' : 'No'}</td>
      <td class="pre">${esc(e.message ?? '')}</td>
    </tr>`).join('');

  const keep = enquiries.filter((e) => e.keep_manager).length;

  return `
<section class="dash-head">
  <div><h1>${esc(agency.name)}</h1><p class="muted">${esc(agency.state)}${agency.licence_number ? ` · Licence ${esc(agency.licence_number)}` : ''}</p></div>
  <a class="button" href="/agency/listings/new">+ New tenanted listing</a>
</section>
<section class="kpis">
  <div><span>${listings.filter((l) => l.status === 'certified').length}</span>Live certified</div>
  <div><span>${listings.filter((l) => l.status === 'draft').length}</span>Drafts</div>
  <div><span>${enquiries.length}</span>Buyer enquiries</div>
  <div><span>${keep}</span>Want to keep you as manager</div>
</section>
<section class="panel">
  <h2>Listings</h2>
  ${rows ? `<div class="table-wrap"><table><thead><tr><th>Property</th><th>Price</th><th>Status</th><th>Cert. expires</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : '<p>No listings yet. Create one to certify a tenanted property.</p>'}
</section>
<section class="panel">
  <h2>Enquiries</h2>
  ${enq ? `<div class="table-wrap"><table><thead><tr><th>When</th><th>Property</th><th>Buyer</th><th>Keep manager</th><th>Message</th></tr></thead><tbody>${enq}</tbody></table></div>`
    : '<p>No enquiries yet.</p>'}
</section>`;
}

const LEDGER_HELP = 'due_date,amount_due,paid_date,amount_paid\n2025-09-01,650,2025-09-01,650';
const COMPLIANCE_HELP = 'item,completed_date\nsmoke_alarm,2026-03-10';

export function listingFormPage({ listing = {}, ledgerCsv = '', complianceCsv = '', errors = [], action, title }) {
  const v = (k) => esc(listing[k] ?? '');
  const checked = (k) => (listing[k] ? ' checked' : '');
  const state = listing.state || 'NSW';
  const complianceKeys = STATES.map((s) => `${s}: ${rulesFor(s, { has_pool: 1, has_gas: 1 }).map((r) => r.key).join(', ')}`);

  return `
<p><a href="/agency">← Dashboard</a></p>
<h1>${esc(title)}</h1>
${errors.length ? `<div class="error"><strong>Please fix:</strong><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
<form method="post" action="${esc(action)}" class="listing-form">
  <fieldset><legend>Property</legend>
    <label class="wide">Street address<input name="address" value="${v('address')}" required></label>
    <label>Suburb<input name="suburb" value="${v('suburb')}" required></label>
    <label>State<select name="state">${stateOptions(state, { any: false })}</select></label>
    <label>Postcode<input name="postcode" value="${v('postcode')}" required pattern="\\d{4}"></label>
    <label>Type<select name="property_type">${typeOptions(listing.property_type, { any: false })}</select></label>
    <label>Bedrooms<input name="bedrooms" type="number" min="0" value="${v('bedrooms')}"></label>
    <label>Bathrooms<input name="bathrooms" type="number" min="0" value="${v('bathrooms')}"></label>
    <label>Parking<input name="parking" type="number" min="0" value="${v('parking')}"></label>
    <label>Land m²<input name="land_size" type="number" min="0" value="${v('land_size')}"></label>
    <label class="check-label"><input type="checkbox" name="has_pool"${checked('has_pool')}> Pool or spa</label>
    <label class="check-label"><input type="checkbox" name="has_gas"${checked('has_gas')}> Gas appliances</label>
    <label class="wide">Description<textarea name="description" rows="3">${v('description')}</textarea></label>
    <label class="wide">Virtual tour link (https)<input name="tour_url" value="${v('tour_url')}"></label>
  </fieldset>

  <fieldset><legend>Price and outgoings</legend>
    <label>Asking price $<input name="price" type="number" min="1" value="${v('price')}" required></label>
    <label>Current rent $/wk<input name="weekly_rent" type="number" min="1" step="any" value="${v('weekly_rent')}" required></label>
    <label>Market rent appraisal $/wk<input name="market_rent" type="number" min="0" step="any" value="${v('market_rent')}"></label>
    <label>Management fee %<input name="management_fee_pct" type="number" min="0" step="0.1" value="${v('management_fee_pct')}"></label>
    <label>Council rates $/yr<input name="council_rates" type="number" min="0" value="${v('council_rates')}"></label>
    <label>Strata $/yr<input name="strata_fees" type="number" min="0" value="${v('strata_fees')}"></label>
    <label>Landlord insurance $/yr<input name="insurance" type="number" min="0" value="${v('insurance')}"></label>
    <label>Land tax $/yr<input name="land_tax" type="number" min="0" value="${v('land_tax')}"></label>
    <label>Maintenance $/yr<input name="maintenance" type="number" min="0" value="${v('maintenance')}"></label>
  </fieldset>

  <fieldset><legend>Tenancy</legend>
    <label>Lease start<input name="lease_start" type="date" value="${v('lease_start')}"></label>
    <label>Lease end<input name="lease_end" type="date" value="${v('lease_end')}"></label>
    <label class="check-label"><input type="checkbox" name="periodic"${checked('periodic')}> Periodic (month to month)</label>
    <label>Bond $<input name="bond_amount" type="number" min="0" value="${v('bond_amount')}"></label>
    <label>Bond lodgement ref<input name="bond_reference" value="${v('bond_reference')}"></label>
    <label>Entry condition report date<input name="entry_condition_date" type="date" value="${v('entry_condition_date')}"></label>
    <label>Last routine inspection<input name="last_inspection_date" type="date" value="${v('last_inspection_date')}"></label>
    <label class="check-label wide"><input type="checkbox" name="tenant_consent"${checked('tenant_consent')}>
      Tenant has given written consent to share their payment performance (aggregate only)</label>
    <label>Consent date<input name="tenant_consent_date" type="date" value="${v('tenant_consent_date')}"></label>
  </fieldset>

  <fieldset><legend>Rent ledger (CSV export from your PM software)</legend>
    <p class="muted small wide">Columns: <code>due_date, amount_due, paid_date, amount_paid</code>. Other columns, such as tenant names, are removed on import and never stored.</p>
    <label class="wide"><input type="file" accept=".csv,text/csv" data-target="ledger_csv"></label>
    <label class="wide"><textarea name="ledger_csv" id="ledger_csv" rows="6" placeholder="${esc(LEDGER_HELP)}">${esc(ledgerCsv)}</textarea></label>
  </fieldset>

  <fieldset><legend>Compliance records (CSV)</legend>
    <p class="muted small wide">Columns: <code>item, completed_date</code>. Item keys by state (pool and gas items only apply if ticked above): ${esc(complianceKeys.join('; '))}.</p>
    <label class="wide"><input type="file" accept=".csv,text/csv" data-target="compliance_csv"></label>
    <label class="wide"><textarea name="compliance_csv" id="compliance_csv" rows="4" placeholder="${esc(COMPLIANCE_HELP)}">${esc(complianceCsv)}</textarea></label>
  </fieldset>

  <button>Save and run certification</button>
</form>
<script>
document.querySelectorAll('input[type=file][data-target]').forEach(function (input) {
  input.addEventListener('change', function () {
    var f = input.files[0]; if (!f) return;
    var reader = new FileReader();
    reader.onload = function () { document.getElementById(input.dataset.target).value = reader.result; };
    reader.readAsText(f);
  });
});
</script>`;
}

export function agencyListingPage(l, { ledgerCount, complianceCount }) {
  const c = l.certification;
  const statusBlock = !c
    ? '<p>Not yet certified.</p>'
    : c.certified
      ? `<p class="ok-box"><strong>Certified, grade ${esc(c.grade)}</strong>. Certificate ${esc(c.certificateId)}, valid until ${esc(c.expiresAt)}.
         ${l.status === 'certified' ? `<a href="/listings/${l.id}">View public listing →</a>` : ''}</p>`
      : `<p class="error"><strong>Not certified.</strong> Fix the items marked ✕ below, then re-run certification.</p>`;

  return `
<p><a href="/agency">← Dashboard</a></p>
<section class="dash-head">
  <div><h1>${esc(l.address)}</h1><p class="muted">${esc(l.suburb)} ${esc(l.state)} ${esc(l.postcode)} · ${money(l.price)} · ${esc(ledgerCount)} ledger rows · ${esc(complianceCount)} compliance records</p></div>
  <div class="actions">
    <a class="button secondary" href="/agency/listings/${l.id}/edit">Edit / upload data</a>
    <form method="post" action="/agency/listings/${l.id}/certify" class="inline"><button>Re-run certification</button></form>
  </div>
</section>
<section class="panel">
  <h2>Certification</h2>
  ${statusBlock}
  ${c ? `<ul class="checks">${c.checks.map(checkRow).join('')}</ul>` : ''}
</section>
<section class="panel">
  <h2>Listing status</h2>
  <form method="post" action="/agency/listings/${l.id}/status" class="inline-form">
    <select name="status" required>
      <option value="">Mark as…</option>
      ${['under_offer', 'sold', 'withdrawn'].map((s) => `<option value="${s}"${l.status === s ? ' selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
    </select>
    <button class="secondary">Update</button>
  </form>
  <p class="muted small">Re-running certification puts a withdrawn or under-offer listing back on the market if it passes.</p>
</section>`;
}

export function messagePage(title, message) {
  return `<section class="panel narrow"><h1>${esc(title)}</h1><p>${esc(message)}</p><p><a href="/">Home</a></p></section>`;
}
