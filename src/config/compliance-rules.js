// Rental safety/compliance items a certified listing must evidence, by state.
// INDICATIVE ONLY: a starting rule set for the MVP. Have each state's rules
// reviewed by a tenancy lawyer before launch and keep this file current.
//
// validityMonths: how long a completed check stays current (null = once per
//   tenancy / one-off, only needs a completion date).
// appliesIf: listing feature flag that must be true for the item to apply.

export const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

const smokeAlarm = { key: 'smoke_alarm', label: 'Smoke alarm check', validityMonths: 12 };

export const COMPLIANCE_RULES = {
  NSW: [
    smokeAlarm,
    { key: 'pool_certificate', label: 'Pool compliance certificate', validityMonths: 36, appliesIf: 'has_pool' },
  ],
  VIC: [
    smokeAlarm,
    { key: 'gas_safety', label: 'Gas safety check', validityMonths: 24, appliesIf: 'has_gas' },
    { key: 'electrical_safety', label: 'Electrical safety check', validityMonths: 24 },
    { key: 'pool_barrier', label: 'Pool barrier compliance certificate', validityMonths: 48, appliesIf: 'has_pool' },
    { key: 'minimum_standards', label: 'Rental minimum standards met', validityMonths: null },
  ],
  QLD: [
    smokeAlarm,
    { key: 'pool_safety', label: 'Pool safety certificate', validityMonths: 24, appliesIf: 'has_pool' },
    { key: 'minimum_standards', label: 'Minimum housing standards met', validityMonths: null },
  ],
  SA: [smokeAlarm],
  WA: [
    smokeAlarm,
    { key: 'rcd', label: 'Two RCDs installed', validityMonths: null },
    { key: 'pool_barrier', label: 'Pool barrier inspection', validityMonths: 48, appliesIf: 'has_pool' },
  ],
  TAS: [
    smokeAlarm,
    { key: 'minimum_standards', label: 'Minimum standards met', validityMonths: null },
  ],
  ACT: [
    smokeAlarm,
    { key: 'ceiling_insulation', label: 'Ceiling insulation minimum standard', validityMonths: null },
    { key: 'energy_rating', label: 'Energy efficiency rating (EER) on file', validityMonths: null },
  ],
  NT: [
    smokeAlarm,
    { key: 'pool_certificate', label: 'Pool compliance certificate', validityMonths: null, appliesIf: 'has_pool' },
  ],
};

export function rulesFor(state, features = {}) {
  const rules = COMPLIANCE_RULES[state];
  if (!rules) throw new Error(`Unknown state: ${state}`);
  return rules.filter((r) => !r.appliesIf || features[r.appliesIf]);
}
