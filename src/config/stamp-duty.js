// General (investor, non-concessional) transfer duty scales by state.
// INDICATIVE ONLY: scales change most financial years. Verify against each
// state revenue office before relying on these figures. Update `asAt` when you do.
//
// Each bracket: { upTo, base, rate } → duty = base + rate * (value - previous upTo).
// `flatOver` brackets apply the rate to the whole value instead.

export const STAMP_DUTY_AS_AT = '2024-25';

export const STAMP_DUTY_SCALES = {
  NSW: [
    { upTo: 17_000, base: 0, rate: 0.0125 },
    { upTo: 35_000, base: 212, rate: 0.015 },
    { upTo: 93_000, base: 482, rate: 0.0175 },
    { upTo: 351_000, base: 1_497, rate: 0.035 },
    { upTo: 1_168_000, base: 10_527, rate: 0.045 },
    { upTo: Infinity, base: 47_292, rate: 0.055 },
  ],
  VIC: [
    { upTo: 25_000, base: 0, rate: 0.014 },
    { upTo: 130_000, base: 350, rate: 0.024 },
    { upTo: 960_000, base: 2_870, rate: 0.06 },
    { upTo: 2_000_000, flatRate: 0.055 },
    { upTo: Infinity, base: 110_000, rate: 0.065 },
  ],
  QLD: [
    { upTo: 5_000, base: 0, rate: 0 },
    { upTo: 75_000, base: 0, rate: 0.015 },
    { upTo: 540_000, base: 1_050, rate: 0.035 },
    { upTo: 1_000_000, base: 17_325, rate: 0.045 },
    { upTo: Infinity, base: 38_025, rate: 0.0575 },
  ],
  SA: [
    { upTo: 12_000, base: 0, rate: 0.01 },
    { upTo: 30_000, base: 120, rate: 0.02 },
    { upTo: 50_000, base: 480, rate: 0.03 },
    { upTo: 100_000, base: 1_080, rate: 0.035 },
    { upTo: 200_000, base: 2_830, rate: 0.04 },
    { upTo: 250_000, base: 6_830, rate: 0.0425 },
    { upTo: 300_000, base: 8_955, rate: 0.0475 },
    { upTo: 500_000, base: 11_330, rate: 0.05 },
    { upTo: Infinity, base: 21_330, rate: 0.055 },
  ],
  WA: [
    { upTo: 120_000, base: 0, rate: 0.019 },
    { upTo: 150_000, base: 2_280, rate: 0.0285 },
    { upTo: 360_000, base: 3_135, rate: 0.038 },
    { upTo: 725_000, base: 11_115, rate: 0.0475 },
    { upTo: Infinity, base: 28_453, rate: 0.0515 },
  ],
  TAS: [
    { upTo: 3_000, flatAmount: 50 },
    { upTo: 25_000, base: 50, rate: 0.0175 },
    { upTo: 75_000, base: 435, rate: 0.0225 },
    { upTo: 200_000, base: 1_560, rate: 0.035 },
    { upTo: 375_000, base: 5_935, rate: 0.04 },
    { upTo: 725_000, base: 12_935, rate: 0.0425 },
    { upTo: Infinity, base: 27_810, rate: 0.045 },
  ],
  ACT: [
    { upTo: 200_000, base: 0, rate: 0.012, minimum: 20 },
    { upTo: 300_000, base: 2_400, rate: 0.022 },
    { upTo: 500_000, base: 4_600, rate: 0.034 },
    { upTo: 750_000, base: 11_400, rate: 0.0432 },
    { upTo: 1_000_000, base: 22_200, rate: 0.059 },
    { upTo: 1_455_000, base: 36_950, rate: 0.064 },
    { upTo: Infinity, flatRate: 0.0454 },
  ],
  // NT uses a formula up to $525k, then flat rates on the whole value.
  NT: 'formula',
};

function ntDuty(value) {
  if (value <= 525_000) {
    const v = value / 1000;
    return 0.06571441 * v * v + 15 * v;
  }
  if (value <= 3_000_000) return value * 0.0495;
  if (value <= 5_000_000) return value * 0.0575;
  return value * 0.0595;
}

export function stampDuty(state, value) {
  const scale = STAMP_DUTY_SCALES[state];
  if (!scale) throw new Error(`Unknown state: ${state}`);
  if (!(value > 0)) return 0;
  if (scale === 'formula') return Math.round(ntDuty(value));

  let lower = 0;
  for (const b of scale) {
    if (value <= b.upTo) {
      let duty;
      if (b.flatAmount !== undefined) duty = b.flatAmount;
      else if (b.flatRate !== undefined) duty = value * b.flatRate;
      else duty = b.base + b.rate * (value - lower);
      if (b.minimum !== undefined) duty = Math.max(duty, b.minimum);
      return Math.round(duty);
    }
    lower = b.upTo;
  }
  return 0;
}
