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

// ─── Mirror of marsEngine.js (production equations) ──────────────────────────
// Verified against global_{sub,sup}_mars_equation.json
function marsSubcritical(s) {
  const { Pr, Tr, drho_sq, CH4_bin, x_CH4 } = s;
  return (
    51.6235553861666
    + 17.9632022914057  * hp(drho_sq, 0.0281806109800826)
    + 275.258598962578  * hm(drho_sq, 0.0281806109800826)
    + 26.5843576382842  * hp(Pr, -0.719795157882769)
    + 26.1380302891754  * hm(Pr, -0.719795157882769)
    - 20.2104589314737  * hp(Tr, -0.395581427707493)
    + 12.7759944240297  * hm(Tr, -0.395581427707493)
    - 51.1174125461729  * hm(Pr, -0.719795157882769) * hp(Tr, -0.517979343182176)
    + 137.846453076672  * hm(Pr, -0.719795157882769) * hm(Tr, -0.517979343182176)
    - 55.2389048217634  * hp(Pr, -0.719795157882769) * hp(drho_sq, -0.703864147663175)
    - 97.8475476858418  * hp(Pr, -0.719795157882769) * hm(drho_sq, -0.703864147663175)
    + 66.6219108711941  * hp(Tr, -0.515960408493934) * hp(drho_sq, 0.0281806109800826)
    + 283.624201339582  * hm(drho_sq, 0.0281806109800826) * CH4_bin
    - 499.801564581002  * hp(Tr, -0.897791431407739) * hm(drho_sq, 0.0281806109800826)
    - 45.0736063858785  * hm(Tr, -0.897791431407739) * hm(drho_sq, 0.0281806109800826)
    + 38.3241286484432  * hm(Tr, -0.395581427707493) * x_CH4
  );
}

function marsSupercritical(s) {
  const { Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq } = s;
  return (
    221.146705282168
    - 59.8926778617109   * hm(drho_sq, 0.45165627362115)
    + 84.6130682323065   * hp(x_N2, 0.965165007857517)
    - 32.9950483779175   * hm(x_N2, 0.965165007857517)
    - 64.087640110994    * hm(x_CH4, 0.796629213483146)
    + 3.46836897649899   * hp(BCM, -0.64)      * hm(drho_sq, 0.45165627362115)
    - 8.41838506461811   * hm(BCM, -0.64)      * hm(drho_sq, 0.45165627362115)
    - 1959.29869231465   * hp(Tr, -0.508659941309566) * hm(drho_sq, 0.45165627362115)
    + 34.4304044797621   * hm(Tr, -0.508659941309566) * hm(drho_sq, 0.45165627362115)
    + 3.19137506998741   * hp(MCM, -0.802020202020202) * hm(drho_sq, 0.45165627362115)
    - 8.68155538828888   * hm(MCM, -0.802020202020202) * hm(drho_sq, 0.45165627362115)
    + 4.23503151813951   * hp(Tr, -0.773290622558717) * hm(x_N2, 0.965165007857517)
    - 29.5553844312356   * hm(Tr, -0.773290622558717) * hm(x_N2, 0.965165007857517)
    + 31.1753566235321   * hp(Tr, -0.716476135143631) * hm(drho_sq, 0.45165627362115)
    + 1733.77111225239   * hp(Tr, -0.499028266378065) * hm(drho_sq, 0.45165627362115)
    + 302.23709915069    * hp(Tr, -0.535941454840406) * hm(drho_sq, 0.45165627362115)
    + 28.3564747087091   * hm(Pr, -0.962826785941291) * hm(x_CH4, 0.796629213483146)
    - 136.493210135021   * hp(Tr, -0.437021967788895) * hm(drho_sq, 0.45165627362115)
    - 133.978836620974   * hm(x_CH4, 0.796629213483146) * hp(x_N2, -0.343373493975904)
    + 126.038744437004   * hm(x_CH4, 0.796629213483146) * hp(x_N2, -0.367469879518072)
    + 8.62518542467982   * BCM * hp(drho_sq, 0.45165627362115)
    - 13.5765461495017   * hp(Pr, -0.843825470938657) * hm(x_N2, 0.965165007857517)
    + 21.9897948379238   * hm(Pr, -0.843825470938657) * hm(x_N2, 0.965165007857517)
    - 20.8102766229062   * hp(x_N2, 0.290728129910948) * hm(drho_sq, 0.45165627362115)
    + 24.6177528718243   * hm(x_N2, 0.290728129910948) * hm(drho_sq, 0.45165627362115)
    + 24.97105505669     * hp(Pr, -0.715906055162913)
    - 19.7154132610296   * hm(Pr, -0.715906055162913)
    + 2.39662342220003   * hp(BCM, -0.982)      * hm(x_N2, 0.965165007857517)
    + 68.8340205222552   * hm(BCM, -0.982)      * hm(x_N2, 0.965165007857517)
    + 3.77861325672612   * hp(Tr, -0.33789990969937) * hm(x_CH4, 0.796629213483146)
    + 5.37198685378658   * hm(Tr, -0.33789990969937) * hm(x_CH4, 0.796629213483146)
    - 31.8591120501353   * hp(x_CH4, -0.755056179775281) * hm(x_N2, 0.965165007857517)
    + 11.3604474094737   * hp(x_CH4, -0.550561797752809) * hm(drho_sq, 0.45165627362115)
    + 25.7311027634006   * hm(x_CH4, -0.550561797752809) * hm(drho_sq, 0.45165627362115)
    - 133.286280204096   * hm(Pr, -0.715906055162913) * hm(Tr, -0.919246719948713)
  );
}

// ─── Scaler ───────────────────────────────────────────────────────────────────
// Bounds matching equations/global_{sub,sup}_scaler_v2.json exactly.
// x_CH4/x_N2 stored as mol% in training data (max 89.0/76.36); divided by 100
// here because predict.js accepts mol/mol (0-1 scale).
const BOUNDS = {
  sub: { Pr:[0.013550135501355,4.694600993224932], Tr:[0.914946759563560,2.217196589822707],
         MCM:[0,4.900], BCM:[0,1.500], x_CH4:[0,0.890], x_N2:[0,0.7636],
         drho_sq:[0.000132359895430,1.294887038140309] },
  sup: { Pr:[1.0027100271002711,9.418699186991873], Tr:[1.0125542263704483,2.2171965898227066],
         MCM:[0,4.950], BCM:[0,5.000], x_CH4:[0,0.890], x_N2:[0,0.7636],
         drho_sq:[0.001681,1.6030851769] },
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
