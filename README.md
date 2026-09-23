# Tenanted

A marketplace for buying and selling **Australian rental properties with the tenant still in place**. Every listing is **certified** from the managing agency's own records.

This is a working MVP of the idea researched in [`real-estate-opportunities-round-2.md`](real-estate-opportunities-round-2.md). It is a similar model to Roofstock in the US, built for all eight Australian states and territories.

## What it does

**For agencies** (they log in with an access code):
- Create a tenanted listing with property, price, outgoings and tenancy details.
- Upload the **rent ledger** and **compliance records** as CSV exports from their property management software. Any column not on the allow-list is removed on import, including tenant names, so personal details are never stored.
- The **certification engine** checks:
  - the lease is current, or periodic
  - the bond is lodged
  - there's an entry condition report
  - there's been a routine inspection in the last 6 months
  - there are 12+ months of verified rent history
  - rent is paid to date (arrears are disclosed, not blocking)
  - the **state's compliance items** are done and still current
  - rent compared with the market appraisal
- A listing that passes is published with a **certificate ID and grade (A or B)**, valid for 30 days. One that fails stays private and shows exactly what to fix.
- The dashboard lists buyer enquiries and **how many buyers want to keep the agency as property manager**.

**For buyers:**
- Search certified listings by state, suburb, type, maximum price, minimum net yield and minimum grade.
- Each listing shows a full verified pack:
  - every check, with its evidence
  - tenancy terms
  - the tenant's payment performance (**only with the tenant's written consent**, and in aggregate only)
  - investor numbers: gross and net yield, expenses, **stamp duty for that state**, cash required, and cash flow at an assumed interest rate
- Enquire, with a "keep the current manager" option ticked by default.
- **Email alerts**: saved searches are matched whenever a listing becomes certified, and every email has an unsubscribe link.

**Integrations:**
- `GET /feed.xml` is a syndication feed in REAXML style for realestate.com.au and Domain. Each item carries a "Certified Tenanted" line and a link to the full pack.
- `GET /api/listings` and `GET /api/listings/:id` are the public JSON API.

## Run it

Needs **Node.js 22.13 or later**. There are no npm dependencies: it uses Node's built-in SQLite, HTTP server and test runner.

```bash
npm run seed    # resets data/tenanted.db with 9 demo listings across all states
npm start       # http://localhost:3000
npm test        # 28 tests: unit tests plus end-to-end tests over HTTP
```

Demo agency logins: `demo-bathurst` (NSW) and `demo-national` (the other states). The Bathurst unit at 3/41 Havannah Street is deliberately **not** certified because its smoke alarm check is overdue. Log in and fix it through **Edit / upload data** to see the whole workflow.

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `BASE_URL` | `http://localhost:$PORT` | Used in alert emails and the feed. Set to `https://…` in production (this also sets secure cookies) |
| `SESSION_SECRET` | random at each start | Signs agency login cookies. **Set it in production** |
| `DB_FILE` | `data/tenanted.db` | SQLite database path |

Sample CSVs are in `sample-data/`. Note that the ledger example includes a `tenant_name` column to show it being removed on import.

## Layout

```
src/
  server.js                 HTTP server + alert outbox worker (currently logs emails)
  app.js                    routes, sessions, request handling
  views.js                  server-rendered pages (all output escaped)
  db.js                     SQLite schema and data access
  config/stamp-duty.js      transfer duty scales, all 8 states and territories
  config/compliance-rules.js  rental compliance items per state
  lib/certify.js            certification engine
  lib/ledger.js             tenant payment performance from a rent ledger
  lib/finance.js            yields, costs, cash flow
  lib/search.js             search filters + alert matching
  lib/reaxml.js             portal syndication feed
scripts/seed.js             demo data
test/                       node:test suites
```

## Before this goes live: must-do list

1. **Legal review.**
   - Confirm the marketplace model, where every listing comes through a licensed agency, doesn't need a real estate licence in each state.
   - Have a tenancy lawyer review `src/config/compliance-rules.js`.
   - Check that the tenant consent wording meets the Privacy Act.
2. **Check the numbers.** `src/config/stamp-duty.js` holds **indicative** duty scales (2024–25). Check each state against its revenue office and update them every financial year.
3. **Real email delivery.** Replace the logging worker in `src/server.js` with an email provider such as Postmark, SES or SendGrid.
4. **Agency accounts.** Replace the shared access codes with proper user accounts (email and password, or SSO) and CSRF tokens. Agency onboarding should check the licence number against each state's public licence register.
5. **Property management software integrations.** Swap CSV upload for direct API pulls (PropertyMe first, then Console, PropertyTree and Ailo). That makes the ledger truly "verified at source" rather than uploaded by the agent.
6. **Portal feed.** Confirm the required fields with the realestate.com.au and Domain feed teams.
7. **Hosting.** Run it behind HTTPS with a managed database (Postgres) once past pilot scale, and back up the database.
