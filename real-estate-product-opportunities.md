# Real Estate Product Opportunities (researched September 2026)

The ask: find products the real estate industry could use that **don't exist yet**, that **we can build and sell**, and that have **real demand**.

**How I tested each idea:** web searches for existing products, vendor features and regulator guidance, run on 23 September 2026. I focused on Australia (NSW first), because that's the home market.

**A word of caution:** searching the web can show that competitors exist. It can't prove none do. Before building anything, spend a week on customer calls, including asking the big platforms (PropertyMe, Console, MRI, Rex, AgentBox, Cotality/Pricefinder) what they plan to release.

---

## Ideas I checked and dropped (already on the market)

| Idea | Why I dropped it |
|---|---|
| AI tool that reads strata reports for buyers | At least six products already do this: Cohabit's Instant Intelligence, Strata Report Summariser, StrataClear, CheckStrata.ai, StrataRadar and PropVista |
| Due-diligence report for rural land in NSW | MapCheck already covers zoning, bushfire, flood, vegetation and native title from $499. InfoTrack handles water certificates |
| Victorian rental minimum-standards and energy compliance tracker | Properteasy, Safehaus, JT Compliance and Taskforce already cover it |
| NCAT bond-claim evidence bundle builder | ClaimDone ($49) and TribunalReady already exist, and ConditionHQ aims at property managers |
| Victorian Statement of Information generator | Pricefinder already does it |

---

## Opportunity 1: Underquoting Compliance Ledger for NSW (best of the four)

### The gap
NSW passed the *Property and Stock Agents Amendment (Underquoting and Other Agent Conduct) Act 2026* on 24 June 2026. **Stage 2 is expected to start late in 2026.** Once it does, every NSW sales agent must:

- set an **estimated selling price (ESP)** using comparable sales, **keep records of how they worked it out**, and revise it when it stops being reasonable, with written notice and evidence each time
- prepare a **Statement of Information** on an approved form, put it in every online ad, display it at inspections, give it to buyers within 2 business days of a request, and **keep every version for 3 years**
- **never advertise a price below** the ESP, the highest passed-in auction bid, or any rejected written offer. **Online ads must be updated within 1 business day**
- face penalties of **$110,000 or three times the commission, whichever is higher**, for underquoting, and up to $27,500 for Statement of Information breaches. Fair Trading now keeps a public "name and shame" register

Pricefinder can produce a Victorian Statement of Information, but it's a one-off document. **I found no product that tracks the obligation over the whole campaign.** That means logging every offer, bid and piece of buyer feedback, spotting when the advertised guide has become illegal, and keeping a record an auditor can check.

### What it would do
1. **Offer and bid register.** Agents log offers from their phone in seconds, or by forwarding the offer email. Auction bids are captured on the day.
2. **Live breach alarm.** As soon as a rejected offer or passed-in bid is higher than the advertised guide, the agent and the principal get an alert saying "update online ads by 5pm tomorrow". It links straight to the listing on each portal.
3. **ESP evidence engine.** It pulls comparable sales (licensed data from Cotality, Pricefinder or Domain), records why each comparable was chosen, and produces the ESP evidence pack the vendor must receive.
4. **Statement of Information builder with versions.** Builds the approved NSW form, automatically creates a new version when the ESP changes, and stores every version for 3 years.
5. **Audit-ready export.** One click gives the principal, or Fair Trading, a timeline showing each price, why it was set, and what evidence backed it.
6. **Principal dashboard.** Shows every live listing across the office, rated green, amber or red for compliance risk.

### Who buys it and why
NSW sales principals, franchise groups (compliance managers at Ray White, LJ Hooker and others) and professional-indemnity insurers. It's cheap insurance: one breach can cost **three times the commission** and a public naming.

### Commercial shape
- $49–$99 per agent per month, or $15–$25 per listing
- Plug-ins for the CRMs agents already use (Rex, AgentBox, VaultRE) so agents don't have to change systems
- **Timing:** this has to launch before Stage 2 starts. The window is open now

### Risks
- CRM vendors may add a basic version. Our defence is to go deeper (the breach alarm, the audit trail) and work across all CRMs
- We need a licence for comparable-sales data
- The approved Statement of Information form hasn't been published yet, so the product has to be quick to update

---

## Opportunity 2: Rent Roll Health Scanner (due diligence and valuation software)

### The gap
Australian rent rolls (portfolios of managed rental properties) usually sell for **about 2.5–3.5 times annual management fees**, and the industry is consolidating steadily. Buyers have 14–45 days of due diligence to check fees, landlord agreements, arrears, vacancies, landlord churn, trust account records and data quality. Today that work is done **by hand, by consultants and brokers** such as Graphite's Real Estate Audit, businessDEPOT and Honeycombe.

The analysis tools I found (Kolena, Megalytics, PRODA) are built for **US and commercial** "rent rolls", which are tenant lists for a building. That's a different product. **I found no software that reads an Australian agency's data export and scores the rent roll automatically.**

### What it would do
1. **Upload or connect.** Read an export from PropertyMe, Console Cloud, PropertyTree, Ailo or Rex PM.
2. **Health score out of 100** across:
   - fee level compared with regional benchmarks
   - landlord concentration (how much depends on a few landlords)
   - arrears and vacancy trends
   - how long landlords stay, and which ones look likely to leave
   - expired or unsigned management agreements
   - properties missing compliance items such as smoke alarms or pool certificates
3. **Unbilled fee finder.** Compares what each management agreement allows the agency to charge with what was actually charged. The industry estimate is **3–7% of revenue lost** this way.
4. **Valuation range.** A suggested multiple, with the factors that push it up or down.
5. **Data room for sellers.** Sellers can share a verified, anonymised report with buyers.

### Who buys it and why
- **Rent roll buyers**, to check before paying millions
- **Sellers and brokers**, to support the asking price
- **Lenders** financing the purchase
- **Every agency that isn't selling**, as a monthly health check that finds unbilled fees. This is the recurring revenue

### Commercial shape
- $750–$2,500 per due-diligence report
- $99–$299 a month for ongoing monitoring of the agency's own rent roll
- Sell to brokers and lenders as a white-label product

### Risks
- Getting data out of the property management systems depends on each vendor's API access. Start with CSV exports
- Trust account data is sensitive, so the product needs strong security from day one

---

## Opportunity 3: Agent Quote Accuracy Index (for vendors and buyers)

### The gap
CHOICE found that **52% of properties sold above the agent's top quoted price, and 25% sold more than 10% above it.** Buyers' agents say underquoting still happens about 85% of the time. RateMyAgent and OpenAgent rank agents on reviews, sales volume and days on market. **Neither shows how close an agent's price guide comes to the final sale price.**

Once NSW makes price guides compulsory, every listing will have a guide on record. That makes an accuracy score **possible to measure** for the first time.

### What it would do
- Records each listing's advertised guide and every change to it, then matches that to the final sale price
- Gives each agent and agency a **Quote Accuracy Score**: the average gap between guide and sale price, how often the guide was exceeded, and how often it was changed
- **For vendors:** choose an agent who quotes honestly, rather than one who "buys" the listing with an inflated appraisal
- **For buyers and buyers' agents:** "This agent's guides usually finish 12% higher than advertised"
- **For good agents:** a verified badge they can use in their marketing

### Commercial shape
- Free for consumers, to build traffic
- Paid tier for buyers' agents at $49–$149 a month
- Agencies pay for verified profiles and badges
- Pairs naturally with Opportunity 1: agents who use the Compliance Ledger get a verified score

### Risks
- **This is the biggest risk of the four.** Collecting listing data from realestate.com.au or Domain may breach their terms of use. We'd need a licensed data feed or partnership, such as the Domain API or Cotality
- Agents will push back on a public score, so the method has to be defensible

---

## Opportunity 4: NSW Rental Reform Workflow Pack (weaker; check before building)

NSW rental changes since May 2025 have added deadlines property managers can miss:

- **Pet requests:** a refusal must be sent within 21 days on allowed grounds, or the pet is automatically approved
- **Ending a tenancy:** there must be a genuine reason with prescribed evidence, plus a Termination Information Statement
- **Rent increases:** limited to once a year

A small add-on could track these deadlines, check each notice against the rules before it goes out, and keep the evidence file. **I couldn't confirm whether PropertyMe or Console already do this well.** They may well have done so since 2025. Talk to 10 NSW property managers before committing, because this could turn out to be a feature of their existing software rather than a separate product.

---

## Recommendation

1. **Build Opportunity 1 first.** It's driven by a new law, starts late 2026, carries fines of up to three times commission, and no product covers it. The first to market gets the franchise groups.
2. **Build Opportunity 2 second.** It's a proven, high-value manual service that's ripe to automate, and it earns recurring revenue from agencies that aren't selling.
3. **Keep Opportunity 3 as a later layer** that uses Opportunity 1's data. Only build it once a licensed data source is secured.

## Sources
- NSW Fair Trading: [Changes to property and stock agents laws](https://www.nsw.gov.au/departments-and-agencies/fair-trading/news/changes-to-property-and-stock-agents-laws)
- [LSJ: New laws crack down on underquoting in NSW](https://lsj.com.au/articles/new-laws-crack-down-on-underquoting-in-nsw/)
- [REINSW: New underquoting reforms introduced](https://www.reinsw.com.au/Web/Web/News/REINSW_Updates/2026/March/new-underquoting-reforms-introduced.aspx)
- [Act as made (2026 No 18)](https://legislation.nsw.gov.au/view/pdf/asmade/act-2026-18)
- [Pricefinder: Generate a Statement of Information](https://help.pricefinder.com.au/hc/en-us/articles/360053485034-Generate-a-Statement-of-Information-SOI-in-Pricefinder)
- [CHOICE: Real estate price underquoting](https://www.choice.com.au/money/property/buying/articles/real-estate-price-underquoting)
- [RateMyAgent: Stamping out underquoting](https://www.ratemyagent.com.au/blog/post/stamping-out-underquoting)
- [PMVA: Rent roll guide](https://www.pmva.com.au/rent-roll/)
- [businessDEPOT: Rent roll due diligence](https://businessdepot.com.au/blog/knowledge-is-power-the-value-of-due-diligence-for-rent-roll-transactions/)
- [Real Estate Audit: Rent roll due diligence](https://www.real-estate-audit.com.au/post/rent-roll-due-diligence-for-real-estate-agencies-in-melbourne-and-victoria)
- [Kolena: Rent roll analysis](https://www.kolena.com/agent-library/rent-roll-analysis/)
- [REDA One: 3–7% revenue leakage](https://www.reda.one/blog/3-7-revenue-leakage-in-property-management-where-it-happens-and-how-to-stop-it)
- [PMVA: Ancillary revenue](https://www.pmva.com.au/property-management-ancillary-revenue/)
- [Real Estate Business: AI strata tool](https://www.realestatebusiness.com.au/tech/31612-new-ai-tool-to-read-and-simplify-strata-reports)
- [StrataRadar](https://www.strataradar.com.au/), [CheckStrata.ai](https://checkstrata.ai/)
- [MapCheck](https://mapcheck.com.au/)
- [Properteasy: Rental minimum standards Victoria 2026](https://www.properteasy.com.au/blog/managing-rental-minimum-standards-victoria-2026)
- [ClaimDone](https://claimdone.com.au/how-to-prepare-hearing-bundle-ncat-nsw/), [TribunalReady](https://www.tribunalready.com.au/tenancy-bond), [ConditionHQ](https://conditionhq.app/blog/ncat-bond-dispute-guide-nsw)
- [NSW pets in rentals: 21-day rule](https://jamesonlaw.com.au/civil-law/nsw-rental-law-reforms-2025-essential-guide-for-tenants-and-landlords/)
- [Landager: NSW eviction process](https://landager.com/en/property-compliance/australia/new-south-wales/eviction-process)
