import { describe, test, expect } from '@jest/globals';

import { predict, detectRegime } from '../src/logic/predict.js';
import { marsSubcritical, marsSupercritical } from '../src/logic/marsEngine.js';
import { scaleFeatures, minMaxScale, DOMAIN_BOUNDS } from '../src/logic/scalers.js';
import { calculateP10P90, computeADStatus } from '../src/logic/qaValidator.js';
import { computeLeverage, H_STAR } from '../src/logic/hatMatrix.js';

const bounds = (regime) => DOMAIN_BOUNDS[regime];

describe('scalers — MinMax bounds match training scaler', () => {
  test('boundary values scale to exactly ±1 (sub)', () => {
    const sub = bounds('sub');
    for (const [key, [min, max]] of Object.entries(sub)) {
      expect(minMaxScale(min, min, max)).toBeCloseTo(-1, 10);
      expect(minMaxScale(max, min, max)).toBeCloseTo(1, 10);
    }
  });

  test('boundary values scale to exactly ±1 (sup)', () => {
    const sup = bounds('sup');
    for (const [key, [min, max]] of Object.entries(sup)) {
      expect(minMaxScale(min, min, max)).toBeCloseTo(-1, 10);
      expect(minMaxScale(max, min, max)).toBeCloseTo(1, 10);
    }
  });

  test('x_CH4/x_N2 bounds use mol/mol scale (max 0.890 / 0.7636)', () => {
    expect(bounds('sub').x_CH4[1]).toBeCloseTo(0.890, 10);
    expect(bounds('sub').x_N2[1]).toBeCloseTo(0.7636, 10);
    expect(bounds('sup').x_CH4[1]).toBeCloseTo(0.890, 10);
    expect(bounds('sup').x_N2[1]).toBeCloseTo(0.7636, 10);
  });
});

describe('marsEngine.sub — 16-term subcritical', () => {
  test('intercept-only at domain midpoint returns finite IFT', () => {
    const raw = {
      Pr: (bounds('sub').Pr[0] + bounds('sub').Pr[1]) / 2,
      Tr: (bounds('sub').Tr[0] + bounds('sub').Tr[1]) / 2,
      MCM: 2.45, BCM: 0.75, x_CH4: 0.445, x_N2: 0.3818,
      drho_sq: (bounds('sub').drho_sq[0] + bounds('sub').drho_sq[1]) / 2,
    };
    const s = scaleFeatures(raw, 'sub');
    s.CH4_bin = 1; s.BCM_bin = -1; s.N2_bin = -1;
    const ift = marsSubcritical(s);
    expect(typeof ift).toBe('number');
    expect(Number.isFinite(ift)).toBe(true);
    expect(ift).toBeGreaterThan(0);
    expect(ift).toBeLessThan(100);
  });

  test('pure CO₂ low-pressure reference in 20–80 range', () => {
    const raw = { Pr: 0.678, Tr: 0.9965, MCM: 1.0, BCM: 0.0, x_CH4: 0, x_N2: 0, drho_sq: 0.85 * 0.85 };
    const s = scaleFeatures(raw, 'sub');
    s.CH4_bin = -1; s.BCM_bin = -1; s.N2_bin = -1;
    const ift = marsSubcritical(s);
    expect(ift).toBeGreaterThan(20);
    expect(ift).toBeLessThan(80);
  });
});

describe('marsEngine.sup — 35-term supercritical', () => {
  test('supercritical reference returns finite IFT', () => {
    const raw = { Pr: 2.034, Tr: 1.095, MCM: 1.0, BCM: 0.0, x_CH4: 0, x_N2: 0, drho_sq: 0.35 * 0.35 };
    const s = scaleFeatures(raw, 'sup');
    s.BCM_bin = -1; s.CH4_bin = -1; s.N2_bin = -1;
    const ift = marsSupercritical(s);
    expect(typeof ift).toBe('number');
    expect(Number.isFinite(ift)).toBe(true);
    expect(ift).toBeGreaterThan(10);
    expect(ift).toBeLessThan(79);
  });
});

describe('hatMatrix — leverage thresholds (thesis §3.12, Eq 3.14)', () => {
  test('h* = 3(p+1)/n matches thesis values', () => {
    expect(H_STAR.sub).toBeCloseTo(3 * 11 / 965, 5);
    expect(H_STAR.sup).toBeCloseTo(3 * 11 / 1417, 5);
  });

  test('leverage of training centroid ≈ 1/n (GREEN zone)', () => {
    // Sleipner query (thesis §4.11) — near-domain point
    const raw = { Pr: 1.3962, Tr: 1.0193, MCM: 0.6, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 0.3916 * 0.3916 };
    const s = scaleFeatures(raw, 'sub');
    s.BCM_bin = -1; s.CH4_bin = -1; s.N2_bin = -1;
    const h = computeLeverage(s, 'sub');
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(H_STAR.sub);
  });

  test('binary flag convention: 0 → -1, 1 → +1 (predict.js)', () => {
    const raw = { Pr: 1.0, Tr: 1.1, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 0.16 };
    const s = scaleFeatures(raw, 'sup');
    const withBc = { ...s, BCM_bin: 1, CH4_bin: -1, N2_bin: -1 };
    const noBc   = { ...s, BCM_bin: -1, CH4_bin: -1, N2_bin: -1 };
    expect(computeLeverage(withBc, 'sup')).not.toBe(computeLeverage(noBc, 'sup'));
  });
});

describe('computeADStatus — three-tier gating (thesis §3.12.2)', () => {
  test('Sleipner GREEN (h < h*)', () => {
    const raw = { Pr: 1.3962, Tr: 1.0193, MCM: 0.6, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 0.3916 * 0.3916 };
    const s = scaleFeatures(raw, 'sub');
    s.BCM_bin = -1; s.CH4_bin = -1; s.N2_bin = -1;
    const { adStatus, h, hStar } = computeADStatus(s, 'sub');
    expect(adStatus).toBe('GREEN');
    expect(h).toBeLessThan(hStar);
  });

  test('AMBER when h* < h <= 3h* (far-query case)', () => {
    // P=30, T=340 K sup query → h=0.0263 > h*=0.0233 but < 3h*
    const raw = { Pr: 4.07, Tr: 1.117, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 1.44 };
    const s = scaleFeatures(raw, 'sup');
    s.BCM_bin = -1; s.CH4_bin = -1; s.N2_bin = -1;
    const { adStatus, h, hStar } = computeADStatus(s, 'sup');
    expect(adStatus).toBe('AMBER');
    expect(h).toBeGreaterThan(hStar);
    expect(h).toBeLessThanOrEqual(3 * hStar);
  });

  test('RED when h > 3h* (strong extrapolation)', () => {
    // P=30, T=650 K → far outside sup training manifold
    const raw = { Pr: 4.07, Tr: 2.136, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 0.16 };
    const s = scaleFeatures(raw, 'sup');
    s.BCM_bin = -1; s.CH4_bin = -1; s.N2_bin = -1;
    const { adStatus, h, hStar } = computeADStatus(s, 'sup');
    expect(adStatus).toBe('RED');
    expect(h).toBeGreaterThan(3 * hStar);
  });
});

describe('predict — thesis field-case regression', () => {
  test('Sleipner (P=10.3 MPa, T=310.15 K, drho=0.3916) → p50=17.14 GREEN', () => {
    const r = predict({ P: 10.3, T: 310.15, drho: 0.3916, MCM: 0.6, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.regime).toBe('sub');
    expect(r.p50).toBeCloseTo(17.14, 2);
    expect(r.status).toBe('GREEN');
    expect(r.p10).toBeGreaterThanOrEqual(r.p50);
    expect(r.p50).toBeGreaterThanOrEqual(r.p90);
  });

  test('In Salah (P=18 MPa, T=363.15 K, drho=0.4) → sup p50≈26.38', () => {
    const r = predict({ P: 18.0, T: 363.15, drho: 0.4, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.regime).toBe('sup');
    expect(r.p50).toBeCloseTo(26.38, 1);
    expect(r.p10).toBeGreaterThanOrEqual(r.p50);
    expect(r.p50).toBeGreaterThanOrEqual(r.p90);
  });

  test('Near-critical Sleipner flagged isNearCritical=true', () => {
    const r = predict({ P: 10.3, T: 310.15, drho: 0.3916, MCM: 0.6, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.isNearCritical).toBe(true);
    expect(r.Pr).toBeCloseTo(1.3962, 3);
    expect(r.Tr).toBeCloseTo(1.0193, 3);
  });

  test('Peterhead (P=5.2 MPa, T=305.15 K) flagged near-critical via Tr (paper4 §5.1)', () => {
    // Tr = 305.15/304.28 = 1.0029 within ±2% of 1.0 → near-critical path,
    // routed to subcritical MARS with indicative-only warning (paper4 §5.1).
    const r = predict({ P: 5.2, T: 305.15, drho: 0.4, MCM: 1.5, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.regime).toBe('sub');
    expect(r.isNearCritical).toBe(true);
    expect(r.Tr).toBeCloseTo(1.0029, 4);
    expect(r.Pr).toBeLessThan(0.98);
  });

  test('UAE supercritical (Pr,Tr far from 1) NOT near-critical', () => {
    const r = predict({ P: 38.22, T: 381.13, drho: 0.4, MCM: 1.9, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.regime).toBe('sup');
    expect(r.isNearCritical).toBe(false);
    expect(r.p50).toBeCloseTo(29.17, 2);
  });
});

describe('calculateP10P90 — QA/UIF tiers', () => {
  test('GREEN tier uses UIF=1.0 (Sleipner)', () => {
    const r = predict({ P: 10.3, T: 310.15, drho: 0.3916, MCM: 0.6, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.uif).toBe(1.0);
    expect(r.p10).toBeCloseTo(r.p50 + 2.6928, 4);
    expect(r.p90).toBeCloseTo(r.p50 - 2.6928, 4);
  });

  test('RED tier uses UIF=5.0', () => {
    const r = predict({ P: 30.0, T: 650.0, drho: 0.4, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.status).toBe('RED');
    expect(r.uif).toBe(5.0);
  });

  test('Na2SO4 / high-MCM sets liEtAlFlag (secondary warning only)', () => {
    const r = predict({ P: 5.0, T: 298.15, drho: 0.8, MCM: 0.68, BCM: 0.34, x_CH4: 0, x_N2: 0, brineType: 'Na2SO4' });
    expect(r.liEtAlFlag).toBe(true);
    // Na2SO4 flag does not override leverage-based tier
    expect(['GREEN', 'AMBER', 'RED']).toContain(r.status);
  });

  test('p10 never below physical floor (12.4 mN/m)', () => {
    const r = predict({ P: 10.3, T: 310.15, drho: 0.3916, MCM: 0.6, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.p90).toBeGreaterThanOrEqual(12.4);
    expect(r.p10).toBeLessThanOrEqual(78.88);
  });

  test('sup regime uses qBase=2.25', () => {
    const r = predict({ P: 18.0, T: 363.15, drho: 0.4, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.uif).toBe(1.0);
    expect(r.p10).toBeCloseTo(r.p50 + 2.25, 4);
    expect(r.p90).toBeCloseTo(r.p50 - 2.25, 4);
  });
});
