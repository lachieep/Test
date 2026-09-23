# Real Estate Opportunities, Round 2 (Australia-wide, September 2026)

Round 1 was mostly specific to NSW. This round looked for something that **works in every state**, is **needed now**, and **has no Australian product yet**. I used web searches run on 23 September 2026. As before, a search can show a competitor exists but can't prove none do, so check with customers before building.

---

## Ideas checked this round and dropped (already on the market)

| Idea | Who already does it |
|---|---|
| Anti-money-laundering (AML/CTF) compliance for agents. Every agency in Australia came under AUSTRAC regulation on 1 July 2026 | easyAML, AMLTranche, Trancher, NameScan, Didit, Persona and others. Already crowded |
| One identity check reused by the agent, conveyancer and broker | ShareRing and Ratified |
| Settlement status tracker shared by everyone in the deal | PEXA Tracker, Pathway to Settlement, Transactor |
| Protecting deposits and settlement funds from fake bank-detail emails | PEXA Key, plus Confirmation of Payee at the banks |
| Digital home logbook that passes to each new owner | inndox, Property Logger |
| One building and pest report shared by several buyers | Before You Buy |
| Predicting which owners will sell soon | Cotality's Propensity to List, Propic's ReVeal |
| Software for executors of deceased estates | simplyEstate, Legasy, EstateExec |
| Filtering listings by eligibility for the 5% deposit scheme | Weak: realestate.com.au or Domain could add it in a week |

---

## ★ The pick: a marketplace for rental properties sold with the tenant in place (an "Australian Roofstock")

### The problem, nationwide
- **Investors are selling at record rates.** In the past year 16.7% of investors sold at least one property, up from 14.1% in 2024 and 12.1% in 2023.
- **22,640 former rental properties were listed for sale in just three months**, in every state.
- **Rentals are disappearing.** Most ex-rentals are bought by people who live in them, so they leave the rental market for good. In May 2026, 5,447 rental homes were sold but only 3,915 were bought as rentals: **1,532 rentals lost in a single month.** Vacancy rates are about 1.3% in Sydney and 1.5% in Melbourne, against roughly 3% for a balanced market.
- **Agencies lose income every time.** When the buyer is an owner-occupier, the agency loses that management fee permanently. Rent rolls are shrinking about 15% a year in hard-hit markets, and new-investor rent rolls are down more than 35% in Perth, Townsville, Toowoomba and Cairns.
- **Selling with a tenant in place is painful under current portals.** Tenants must be given notice for every open home. Evicting to sell now needs proper grounds and evidence in most states. The vendor loses rent while the property is empty, and tenants lose their homes.
- **Buyers can't see the numbers that matter.** A buyer looking at a tenanted property on realestate.com.au or Domain can't see:
  - the verified rent ledger (payment history)
  - how long the lease runs
  - the bond
  - the condition report
  - compliance status (smoke alarms, minimum standards)
  - whether the tenant pays on time

  They get "currently leased at $X per week" in the description, and that's all.

### Does it already exist?
- **In the US, yes.** Roofstock is an online marketplace for leased single-family rental homes. It has done **about US$5 billion in transactions** and serves 400,000+ investors. It "certifies" each listing with the inspection, lease review, tenant review, valuation and property manager, and investors buy remotely.
- **In Australia, no.** My searches for an Australian marketplace selling tenanted properties with verified rental data found only general advice articles and US platforms. The portals list tenanted properties, but with no verified data and no investor-to-investor workflow.

### What it would do
1. **Certified investment listing.** The selling agency connects its property management software (PropertyMe, Console, PropertyTree, Ailo or Rex PM). The platform creates a verified pack containing:
   - 12–24 months of rent ledger
   - lease terms and end date
   - bond held
   - entry condition report and latest routine inspection
   - maintenance history
   - compliance status for that state (smoke alarms, pool certificate, and Victoria's minimum standards)
   - current market rent compared with the rent actually charged
2. **Tenant performance score, with the tenant's consent.** Shows only on-time payment rate and arrears events, with no personal details. This protects tenants under the Privacy Act while giving buyers confidence.
3. **Investor numbers worked out automatically.** Gross and net yield, cash flow at current interest rates, a depreciation estimate, and land tax and stamp duty for that state.
4. **Fewer open homes.** A 3D tour plus the verified pack means buyers can make offers remotely, with at most one or two physical inspections. That's less disruption for the tenant and wider reach to interstate investors.
5. **Management moves with the property.** The buyer is offered continued management by the existing agency, with one click. **This is the hook for agencies: they keep the rent roll.**
6. **Alerts for buyers.** "Tell me when a certified house in Toowoomba returning over 5.5% net comes up."
7. **Syndication.** Certified listings also appear on realestate.com.au and Domain with a "Certified Tenanted" badge and a link back to the full pack.

### Why each group wants it
| Who | What they get |
|---|---|
| **Investor selling** | Rent keeps coming in during the campaign, no need to end the tenancy, a buyer pool that values the lease rather than being put off by it, and fewer open homes |
| **Investor buying** | Income from day one, verified numbers, no vacancy or re-letting costs, and the ability to buy from interstate with confidence |
| **Agency** | **Keeps the management** (currently worth about 2.5–3.5 times annual fees when a rent roll is sold), earns a sales commission, and gets a data-backed listing |
| **Tenant** | Keeps their home |
| **Government** | Rental supply retained. That fits every state's policy goal, and could support lobbying for incentives such as stamp duty relief for sales that keep the property as a rental |

### How it makes money
- **Certification fee:** $495–$995 per listing, paid by the vendor or included in the agency's marketing fees
- **Agency subscription:** $199–$499 per office per month for unlimited certifications, a page of the office's investor stock, and a list of landlords likely to sell
- **Investor Pro tier:** $29–$49 a month for alerts, full data and portfolio tools
- **Referral fees** from finance brokers, landlord insurance, depreciation schedules and conveyancing, triggered at the point of purchase
- **Later:** portfolio sales (several properties in one deal), build-to-rent sell-downs, and a data product selling verified-yield indexes to lenders and researchers

### Licensing (important)
Arranging property sales for a fee needs a real estate licence **in each state**. The model avoids this by working like realestate.com.au and Domain: **every listing comes through a licensed agency**, and the platform provides data, certification and marketing without negotiating sales itself. Get this reviewed by a lawyer in each state before launch.

### What to build first
1. A certification pack generator using the PropertyMe API first (it has the largest share of Australian agencies), with CSV upload as a fallback
2. A public page for each certified listing, and a syndication feed to the portals
3. Buyer alerts
4. Pilot with 5–10 agencies in two contrasting markets, such as regional NSW (Bathurst or Orange) and a capital city, to prove both ends

### Risks and how to handle them
- **realestate.com.au or Domain copy it.** They can add a badge, but they don't have verified data from property management systems or the agency relationships. Lock in agencies early and make the certification the brand.
- **Tenant privacy.** Get consent, show only aggregated results, and be ready to meet Australian Privacy Principles and any state-specific consent rules.
- **Access to property management system data.** Start with CSV exports and partnership APIs. PropertyMe and Console both have partner programs.
- **Chicken-and-egg.** Start with the supply side, because agencies already have tenanted properties to sell. Investor buyers are easy to reach through property investor communities, buyers' agents and brokers.

---

## Runner-up: verified finance check for property buyers

A single purchase already triggers identity checks by the agent, conveyancer and broker. Reusable identity checks exist (ShareRing, Ratified). **What I found no product for is proof that the buyer can pay:** a way to show an agent verified funds and borrowing capacity before an offer or auction. Consumer Data Right banking access could supply it. Agents would use it to rank offers, and vendors would trust unconditional offers more.

It's weaker than the pick because banks and brokers own the pre-approval relationship, and it would need Consumer Data Right accreditation, which is slow and costly. It would work better as a later feature of the marketplace ("certified buyer" alongside "certified property") than as a standalone business.

---

## Sources
- [Broker News: Landlord exodus drains thousands of rentals](https://www.brokernews.com.au/news/breaking-news/landlord-exodus-drains-thousands-of-rentals-from-market-289328.aspx)
- [PropertyGo: 2026 investor exodus](https://propertygo.com.au/blog/investor-exodus-2026-what-landlords-selling-means-buyers-renters)
- [API Magazine: Why the rental crisis won't ease in 2026](https://www.apimagazine.com.au/news/article/why-australia-s-rental-crisis-won-t-ease-in-2026-despite-investor-comeback)
- [Real Estate Business: Investor fallback and rent rolls](https://www.realestatebusiness.com.au/property-management/31696-investor-fallback-where-rent-rolls-will-be-impacted-as-landlords-cash-in)
- [The Conversation: Half of landlords sell after 2 years](https://theconversation.com/half-of-australian-landlords-sell-their-investments-after-2-years-adding-to-renters-insecurity-254578)
- [Roofstock](https://www.roofstock.com/), [Roofstock on Wikipedia](https://en.wikipedia.org/wiki/Roofstock), [Roofstock Marketplace explained](https://www.hellodata.ai/help-articles/what-is-roofstock-marketplace)
- [Inspired PG: Buying a tenanted property](https://inspiredpg.com.au/buying-a-tenanted-property-what-investors-should-check-before-settlement/)
- [PMVA: Rent roll guide (multiples)](https://www.pmva.com.au/rent-roll/)
- [Didit: AUSTRAC Tranche 2 for agents](https://didit.me/blog/austrac-tranche-2-real-estate-agents-guide/), [easyAML](https://easyaml.com/industries/real-estate-agents/)
- [ShareRing](https://sharering.network/real-estate/), [Ratified](https://ratified.com.au/identity-verification/)
- [PEXA Tracker](https://www.pexa.com.au/products/pexa-tracker/), [PEXA Key](https://www.pexa.com.au/products/pexa-key/), [Pathway to Settlement](https://realtimeconveyancer.com.au/pts)
- [inndox](https://www.inndox.com/), [Before You Buy](https://www.beforeyoubuy.com.au/building-and-pest-inspection)
- [Propic](https://www.therealestatevoice.com.au/propic/)
- [Legasy: executor software](https://legasy.com.au/executors/software/)
- [PropertyGo: Payment redirection scams 2026](https://propertygo.com.au/blog/payment-redirection-scams-property-settlement-australia-2026)
- [Elite Agent: PM vacancies hit 5,300](https://eliteagent.com/property-manager-vacancies-hit-5300-as-six-figure-salaries-fail-to-stem-exodus/)
