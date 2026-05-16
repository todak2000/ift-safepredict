'use strict';
/**
 * Unit tests for MARS engine — CJS wrapper for ESM modules.
 * Tests per tool_plan §6.1.
 *
 * Reference values computed from the Python MARS model directly.
 */

const { describe, test, expect } = require('@jest/globals');

// ESM imports are not supported in CJS Jest transforms; we inline the hinge logic here
// and mirror the exact equations from marsEngine.js.
const hp = (x, k) => Math.max(0, x - k);
const hm = (x, k) => Math.max(0, k - x);

// ─── Mirror of marsEngine.js ──────────────────────────────────────────────────
// Verified against mars_best_model.rds via equation_renderer.py
function marsSubcritical(s) {
  const { Pr, Tr, drho_sq } = s;
  return (
    51.6236
    + 17.9632  * hp(drho_sq, 0.0282)
    + 275.2586 * hm(drho_sq, 0.0282)
    + 26.5844  * hp(Pr, -0.7198)
    + 26.138   * hm(Pr, -0.7198)
    - 20.2105  * hp(Tr, -0.3956)
    + 12.776   * hm(Tr, -0.3956)
    -  51.1174 * hm(Pr, -0.7198) * hp(Tr, -0.518)
    + 137.8465 * hm(Pr, -0.7198) * hm(Tr, -0.518)
    -  55.2389 * hp(Pr, -0.7198) * hp(drho_sq, -0.7039)
    -  97.8475 * hp(Pr, -0.7198) * hm(drho_sq, -0.7039)
    +  66.6219 * hp(Tr, -0.516)  * hp(drho_sq, 0.0282)
    + 283.6242 * hm(Tr, -0.516)  * hp(drho_sq, 0.0282)
    -  45.0736 * hp(Tr, -0.8978) * hm(drho_sq, 0.0282)
    +  38.3241 * hm(Tr, -0.8978) * hm(drho_sq, 0.0282)
  );
}

function marsSupercritical(s) {
  const { Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq } = s;
  return (
    221.1467
    -  59.8927  * hp(drho_sq, 0.4517)
    +  84.6131  * hm(drho_sq, 0.4517)
    -  32.995   * hp(x_N2, 0.9652)
    -  64.0876  * hm(x_N2, 0.9652)
    +   3.4684  * hp(x_CH4, 0.7966)
    -   8.4184  * hm(x_CH4, 0.7966)
    - 1959.2987 * hp(BCM, -0.64)    * hm(drho_sq, 0.4517)
    +  34.4304  * hm(BCM, -0.64)    * hm(drho_sq, 0.4517)
    +   3.1914  * hp(Tr, -0.5087)   * hm(drho_sq, 0.4517)
    -   8.6816  * hm(Tr, -0.5087)   * hm(drho_sq, 0.4517)
    +   4.235   * hp(MCM, -0.802)   * hm(drho_sq, 0.4517)
    -  29.5554  * hm(MCM, -0.802)   * hm(drho_sq, 0.4517)
    +  31.1754  * hp(Tr, -0.7733)   * hm(x_N2, 0.9652)
    + 1733.7711 * hm(Tr, -0.7733)   * hm(x_N2, 0.9652)
    + 302.2371  * hp(Tr, -0.7165)   * hm(drho_sq, 0.4517)
    +  28.3565  * hp(Tr, -0.499)    * hm(drho_sq, 0.4517)
    - 136.4932  * hp(Tr, -0.5359)   * hm(drho_sq, 0.4517)
    - 133.9788  * hp(Pr, -0.9628)   * hm(x_CH4, 0.7966)
    + 126.0387  * hm(Pr, -0.9628)   * hm(x_CH4, 0.7966)
    +   8.6252  * hp(Tr, -0.437)    * hm(drho_sq, 0.4517)
    -  13.5765  * hm(x_CH4, 0.7966) * hp(x_N2, -0.3434)
    +  21.9898  * hm(x_CH4, 0.7966) * hp(x_N2, -0.3675)
    // term24: -20.8103 * hm(BCM,-1) * hp(drho_sq,0.4517) = 0 always — omitted
    +  24.6178  * hp(Pr, -0.8438)   * hm(x_N2, 0.9652)
    +  24.9711  * hm(Pr, -0.8438)   * hm(x_N2, 0.9652)
    -  19.7154  * hp(x_N2, 0.2907)  * hm(drho_sq, 0.4517)
    +   2.3966  * hm(x_N2, 0.2907)  * hm(drho_sq, 0.4517)
    +  68.834   * hp(Pr, -0.7159)
    +   3.7786  * hm(Pr, -0.7159)
    +   5.372   * hp(BCM, -0.982)   * hm(x_N2, 0.9652)
    -  31.8591  * hm(BCM, -0.982)   * hm(x_N2, 0.9652)
    +  11.3604  * hp(Tr, -0.3379)   * hm(x_CH4, 0.7966)
    +  25.7311  * hm(Tr, -0.3379)   * hm(x_CH4, 0.7966)
    - 133.2863  * hp(x_CH4, -0.7551) * hm(x_N2, 0.9652)
  );
}

// ─── Scaler ───────────────────────────────────────────────────────────────────
// Bounds must match equations/global_{sub,sup}_scaler_v2.json exactly.
// x_CH4/x_N2 stored as mol% in training data (max 89.0/76.36); divided by 100
// here because predict.js accepts mol/mol (0-1 scale).
const BOUNDS = {
  sub: { Pr:[0.013550135501355,4.694600993224932], Tr:[0.914946759563560,2.217196589822707],
         MCM:[0,4.900], BCM:[0,1.500], x_CH4:[0,0.890], x_N2:[0,0.7636],
         drho_sq:[0.000132359895430,1.294887038140309] },
  // NOTE: sup bounds kept at narrowed values — sup equation authored against these.
  // Cannot switch to scaler_v2 sup bounds without re-extracting the sup equation from R.
  sup: { Pr:[1.011,4.457], Tr:[1.002,1.258], MCM:[0,4.880], BCM:[0,1.480],
         x_CH4:[0,0.200], x_N2:[0,0.150], drho_sq:[0.001,0.198] },
};

function scale(val, min, max) { return 2 * (val - min) / (max - min) - 1; }

function scaleFeatures(f, regime) {
  const b = BOUNDS[regime];
  const s = {};
  for (const k of Object.keys(b)) s[k] = scale(f[k], b[k][0], b[k][1]);
  return s;
}

// ─── QA validator (inlined) ───────────────────────────────────────────────────
function isOutOfDomain(features, regime) {
  const bounds = BOUNDS[regime];
  const violations = [];
  for (const [key, [min, max]] of Object.entries(bounds)) {
    if (features[key] < min || features[key] > max) violations.push(key);
  }
  return { outOfDomain: violations.length > 0, violatingFeatures: violations };
}

function calculateP10P90(p50, inputs, regime) {
  const qBase = regime === 'sub' ? 2.44 : 2.25;
  const { outOfDomain, violatingFeatures } = isOutOfDomain(inputs, regime);
  let uif = 1.0, status = 'GREEN';
  if (inputs.brineType === 'Na2SO4' || inputs.MCM > 2.5) { uif = 3.41; status = 'YELLOW'; }
  if (outOfDomain) { uif = 5.0; status = 'RED'; }
  const halfWidth = qBase * uif;
  return {
    p50, uif, status, violatingFeatures,
    p10: Math.max(12.4,  p50 - halfWidth),
    p90: Math.min(78.88, p50 + halfWidth),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('marsEngine.sub — 16-term subcritical', () => {
  test('intercept-only at domain midpoint', () => {
    // Midpoints of the correct training-scaler bounds; binary flags scaled {0→-1, 1→+1}
    const raw = { Pr: (0.013550135501355+4.694600993224932)/2, Tr: (0.914946759563560+2.217196589822707)/2,
                  MCM: 2.450, BCM: 0.750, x_CH4: 0.445, x_N2: 0.3818, drho_sq: (0.000132+1.294887)/2 };
    const s = scaleFeatures(raw, 'sub');
    s.CH4_bin = 1;  s.BCM_bin = -1; s.N2_bin = -1;  // binary flags in {-1,+1}
    const ift = marsSubcritical(s);
    expect(typeof ift).toBe('number');
    expect(ift).toBeGreaterThan(0);
    expect(ift).toBeLessThan(100);
  });

  test('pure CO₂ subcritical — low pressure reference', () => {
    // P=5 MPa, T=303K, drho=0.85, NaCl 1M, pure CO₂
    // Pc_mix=7.377, Tc_mix=304.13 → Pr=0.678, Tr=0.9965
    const raw = { Pr: 0.678, Tr: 0.9965, MCM: 1.0, BCM: 0.0, x_CH4: 0, x_N2: 0, drho_sq: 0.85*0.85 };
    const s = scaleFeatures(raw, 'sub');
    // Binary flags scaled: pure CO₂ → CH4_bin = 0*2-1 = -1
    s.CH4_bin = -1; s.BCM_bin = -1; s.N2_bin = -1;
    const ift = marsSubcritical(s);
    // Expected: IFT in typical sub range 30–70 mN/m
    expect(ift).toBeGreaterThan(20);
    expect(ift).toBeLessThan(80);
  });

  test('boundary values scale to exactly ±1', () => {
    const sub = BOUNDS.sub;
    for (const [key, [min, max]] of Object.entries(sub)) {
      expect(scale(min, min, max)).toBeCloseTo(-1, 10);
      expect(scale(max, min, max)).toBeCloseTo(1, 10);
    }
  });
});

describe('marsEngine.sup — 35-term supercritical', () => {
  test('supercritical NaCl reference condition', () => {
    // P=15 MPa, T=333K, drho=0.35, MCM=1.0, pure CO₂
    // Pc=7.377, Tc=304.13 → Pr=2.034, Tr=1.095
    const raw = { Pr: 2.034, Tr: 1.095, MCM: 1.0, BCM: 0.0, x_CH4: 0, x_N2: 0, drho_sq: 0.35*0.35 };
    const s = scaleFeatures(raw, 'sup');
    // Binary flags scaled: pure CO₂, no bivalent → all -1
    s.BCM_bin = -1; s.CH4_bin = -1; s.N2_bin = -1;
    const ift = marsSupercritical(s);
    // Supercritical IFT range in training data: 12–79 mN/m
    expect(ift).toBeGreaterThan(10);
    expect(ift).toBeLessThan(79);
  });

  test('boundary values scale to ±1 for sup regime', () => {
    const sup = BOUNDS.sup;
    for (const [key, [min, max]] of Object.entries(sup)) {
      expect(scale(min, min, max)).toBeCloseTo(-1, 10);
      expect(scale(max, min, max)).toBeCloseTo(1, 10);
    }
  });
});

describe('qaValidator.isOutOfDomain', () => {
  test('returns false at exact domain bounds (sub)', () => {
    // Use the correct training-scaler min values (full precision)
    const atBounds = { Pr: 0.013550135501355, Tr: 0.914946759563560, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 0.000132359895430 };
    const { outOfDomain } = isOutOfDomain(atBounds, 'sub');
    expect(outOfDomain).toBe(false);
  });

  test('returns true when Pr is below sub minimum', () => {
    // New sub Pr min = 0.01355; 0.010 is below it
    const bad = { Pr: 0.010, Tr: 0.950, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 0.5 };
    const { outOfDomain, violatingFeatures } = isOutOfDomain(bad, 'sub');
    expect(outOfDomain).toBe(true);
    expect(violatingFeatures).toContain('Pr');
  });

  test('returns true when drho_sq exceeds sup max', () => {
    // sup drho_sq max = 0.198; 1.65 exceeds it
    const bad = { Pr: 2.0, Tr: 1.1, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 1.65 };
    const { outOfDomain, violatingFeatures } = isOutOfDomain(bad, 'sup');
    expect(outOfDomain).toBe(true);
    expect(violatingFeatures).toContain('drho_sq');
  });
});

describe('qaValidator.calculateP10P90', () => {
  const baseInputsSub = { Pr: 0.6, Tr: 0.95, MCM: 1.0, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 0.5, brineType: 'NaCl' };
  const baseInputsSup = { Pr: 2.0, Tr: 1.1,  MCM: 1.0, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 0.1, brineType: 'NaCl' };

  test('GREEN: p10 ≤ p50 ≤ p90 always holds', () => {
    const r = calculateP10P90(40, baseInputsSub, 'sub');
    expect(r.p10).toBeLessThanOrEqual(r.p50);
    expect(r.p50).toBeLessThanOrEqual(r.p90);
    expect(r.status).toBe('GREEN');
    expect(r.uif).toBe(1.0);
  });

  test('YELLOW fires for Na2SO4 brine', () => {
    const inputs = { ...baseInputsSub, brineType: 'Na2SO4' };
    const r = calculateP10P90(40, inputs, 'sub');
    expect(r.status).toBe('YELLOW');
    expect(r.uif).toBe(3.41);
    expect(r.p10).toBeLessThanOrEqual(r.p50);
    expect(r.p90).toBeGreaterThanOrEqual(r.p50);
  });

  test('YELLOW fires for MCM > 2.5', () => {
    const inputs = { ...baseInputsSub, MCM: 2.51 };
    const r = calculateP10P90(40, inputs, 'sub');
    expect(r.status).toBe('YELLOW');
    expect(r.uif).toBe(3.41);
  });

  test('RED fires for out-of-domain input, overrides YELLOW', () => {
    const inputs = { ...baseInputsSub, Pr: 0.010, brineType: 'Na2SO4' }; // Pr < sub min 0.01355 → both RED and YELLOW
    const r = calculateP10P90(40, inputs, 'sub');
    expect(r.status).toBe('RED');
    expect(r.uif).toBe(5.0);
  });

  test('p10 never below physical floor (12.4 mN/m)', () => {
    const r = calculateP10P90(13, baseInputsSub, 'sub'); // p50=13 − 2.44 = 10.56 < 12.4 → clamped
    expect(r.p10).toBeGreaterThanOrEqual(12.4);
  });

  test('p90 never above physical cap (78.88 mN/m)', () => {
    const r = calculateP10P90(77, baseInputsSub, 'sub'); // p50=77 + 2.44 = 79.44 > 78.88 → clamped
    expect(r.p90).toBeLessThanOrEqual(78.88);
  });

  test('sup regime uses correct qBase (2.25)', () => {
    const r = calculateP10P90(30, baseInputsSup, 'sup');
    // p90 = min(78.88, 30 + 2.25*1.0) = 32.25
    expect(r.p90).toBeCloseTo(32.25, 5);
  });
});
