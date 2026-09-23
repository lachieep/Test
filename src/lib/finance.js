// Investor numbers for a listing. All figures are annual unless named weekly.

import { stampDuty } from '../config/stamp-duty.js';

export const DEFAULT_ASSUMPTIONS = {
  lvr: 0.8, // loan-to-value ratio
  interestRatePct: 6.2, // interest-only, for cash flow illustration
  conveyancing: 2_000,
  inspections: 600,
};

export function investorNumbers(listing, assumptions = {}) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const price = Number(listing.price);
  const annualRent = Number(listing.weekly_rent) * 52;

  const managementFee = annualRent * (Number(listing.management_fee_pct || 0) / 100);
  const expenses = {
    managementFee,
    councilRates: Number(listing.council_rates || 0),
    strataFees: Number(listing.strata_fees || 0),
    insurance: Number(listing.insurance || 0),
    landTax: Number(listing.land_tax || 0),
    maintenance: Number(listing.maintenance || 0),
  };
  const annualExpenses = Object.values(expenses).reduce((s, v) => s + v, 0);
  const netIncome = annualRent - annualExpenses;

  const duty = stampDuty(listing.state, price);
  const purchaseCosts = duty + a.conveyancing + a.inspections;
  const loanAmount = price * a.lvr;
  const cashRequired = price - loanAmount + purchaseCosts;
  const annualInterest = loanAmount * (a.interestRatePct / 100);
  const annualCashflow = netIncome - annualInterest;

  return {
    price,
    annualRent,
    expenses,
    annualExpenses,
    netIncome,
    grossYield: price > 0 ? annualRent / price : 0,
    netYield: price > 0 ? netIncome / price : 0,
    stampDuty: duty,
    purchaseCosts,
    loanAmount,
    cashRequired,
    annualInterest,
    annualCashflow,
    weeklyCashflow: annualCashflow / 52,
    assumptions: a,
  };
}

export function rentVsMarket(weeklyRent, marketRent) {
  const rent = Number(weeklyRent);
  const market = Number(marketRent);
  if (!(market > 0)) return null;
  const diff = (rent - market) / market;
  let label = 'At market';
  if (diff <= -0.05) label = 'Below market (rent upside)';
  else if (diff >= 0.05) label = 'Above market';
  return { diff, label };
}
