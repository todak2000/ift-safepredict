import { computeLeverage, H_STAR } from './hatMatrix.js';

// Split-conformal base half-widths q80 (80% nominal coverage on held-out 20% test/calibration set)
// sub: 2.6928 mN/m (n_calib = 247); sup: 2.2507 mN/m (n_calib = 356)
export const Q_BASE = { sub: 2.6928, sup: 2.2507 };

// Cross-laboratory empirical quantile ratios UIF_interval = q80(EV) / q80(calibration)
export const UIF_PORTABILITY = { sub: 3.5855, sup: 1.0559 };

// Amber leverage-extrapolation multiplier & capped 2.5× escalated screening multiplier
const UIF_RED = 2.5;
const UIF_NEAR_CRIT = 1.97; // Yellow-tier escalation for near-critical gap

/**
 * Compute Williams-Plot Applicability Domain (AD) status using 10-feature Hat-matrix leverage.
 *
 * Three-tier leverage classification (Thesis §3.12.2):
 *   GREEN — h <= h*          inside training manifold
 *   AMBER — h* < h <= 3h*   graduated boundary extrapolation zone
 *   RED   — h > 3h*          strong structural extrapolation
 *
 * @param {object} scaledFeatures — MinMax-scaled + binary-mapped features
 * @param {'sub'|'sup'} regime
 * @returns {{ adStatus: 'GREEN'|'AMBER'|'RED', h: number, hStar: number }}
 */
export const computeADStatus = (scaledFeatures, regime) => {
  const h = computeLeverage(scaledFeatures, regime);
  const hStar = H_STAR[regime];
  let adStatus;
  if (h <= hStar) {
    adStatus = 'GREEN';
  } else if (h <= 3 * hStar) {
    adStatus = 'AMBER';
  } else {
    adStatus = 'RED';
  }
  return { adStatus, h, hStar };
};

const TIER_RANK = { GREEN: 0, AMBER: 1, RED: 2 };
const maxTier = (a, b) => (TIER_RANK[b] > TIER_RANK[a] ? b : a);

/**
 * Calculate P10/P50/P90 conformal prediction intervals and synthesise all 5 safety checks
 * into a single Unified Composite Trust Verdict (eliminating contradictory Green + Warning signals).
 *
 * Five-gate assurance audit:
 *   1. Hat-matrix leverage AD (h vs h* and 3h*)
 *   2. Near-critical training data gap (|T - Tc,eff| <= 2.0 K AND |P - Pc,eff| <= 0.5 MPa)
 *   3. Cross-laboratory conformal portability (UIF_interval = 1.06 sup [Green] vs 3.59 sub [Red])
 *   4. Electrolyte & divalent bounds (Na₂SO₄ unseen subcritical anion; sub BCM > 1.5 mol/kg)
 *   5. High-T sparse knot region (T > 398.15 K at P > 35 MPa in sup) & physical clamping
 *
 * @param {number} prediction — clamped P50 (mN/m) from MARS
 * @param {object} inputs — physical + derived metadata
 * @param {object} scaledFeatures — MinMax-scaled + binary-mapped features
 * @param {'sub'|'sup'} regime
 * @returns {object}
 */
export const calculateP10P90 = (prediction, inputs, scaledFeatures, regime) => {
  const qBase = Q_BASE[regime];
  const { adStatus, h, hStar } = computeADStatus(scaledFeatures, regime);

  const isNearCritical = !!inputs.isNearCritical;
  const isBoundaryAdjacent = !!inputs.isBoundaryAdjacent;
  const p50Clipped = !!inputs.p50Clipped;
  const liEtAlFlag = inputs.brineType === 'Na2SO4';
  const mixedKClFlag = inputs.brineType === 'NaCl+KCl' && regime === 'sub';
  const subDivalentExtrap = regime === 'sub' && (inputs.BCM || 0) > 1.5;
  const highTKnotFlag = regime === 'sup' && (inputs.T || 0) > 398.15 && (inputs.P || 0) > 35.0;
  const thermalExtrapFlag =
    (regime === 'sup' && (inputs.T || 0) > 413.15) ||
    (regime === 'sub' && (inputs.T || 0) > 335.15);
  const pressureExtrapFlag =
    (regime === 'sup' && (inputs.P || 0) > 60.0) ||
    (regime === 'sub' && (inputs.P || 0) > 20.0);
  const localCalibrated = !!inputs.localCalibrated;

  let status = adStatus;
  let uif = 1.0;
  const reasons = [];

  // Gate 1: Leverage AD
  if (adStatus === 'GREEN') {
    uif = 1.0;
  } else if (adStatus === 'AMBER') {
    uif = Math.max(uif, regime === 'sup' ? 1.5 : UIF_PORTABILITY.sub);
    reasons.push(
      `Leverage h = ${h.toFixed(4)} exceeds h* = ${hStar.toFixed(4)} (borderline extrapolation zone).`
    );
  } else {
    uif = UIF_RED;
    reasons.push(
      `Leverage h = ${h.toFixed(4)} > 3h* = ${(3 * hStar).toFixed(4)} (strong out-of-hull extrapolation).`
    );
  }

  // Gate 2: Near-critical data gap (|T - Tc,eff| <= 2 °C AND |P - Pc,eff| <= 0.5 MPa)
  if (isNearCritical) {
    status = maxTier(status, 'AMBER');
    uif = Math.max(uif, UIF_NEAR_CRIT);
    reasons.push(
      'Near-critical exclusion window (within ±2.0 °C and ±0.5 MPa of mixture critical point): zero training observations; interval widened to Yellow tier.'
    );
  }

  // Gate 3: Cross-laboratory conformal portability (UIF_interval)
  if (regime === 'sub' && !localCalibrated) {
    status = maxTier(status, 'AMBER');
    uif = Math.max(uif, UIF_RED);
    reasons.push(
      'Subcritical cross-lab portability caution (UIF_interval = 3.59, Red band): 2.5× escalated screening interval (capped) applied and reported as AMBER; collect n ≥ 30 local measurements for site-specific calibration.'
    );
  }

  // Gate 4: Electrolyte & divalent domain boundaries
  if (subDivalentExtrap) {
    status = maxTier(status, 'RED');
    uif = Math.max(uif, UIF_RED);
    reasons.push(
      `Subcritical BCM (${inputs.BCM} mol/kg) exceeds training maximum (1.50 mol/kg).`
    );
  }
  if (liEtAlFlag) {
    status = maxTier(status, 'AMBER');
    reasons.push(
      'Na₂SO₄ sulphate brine: unseen anion in subcritical training (+12.04% in-domain inter-campaign offset observed in Li et al., 2012).'
    );
  } else if (mixedKClFlag) {
    reasons.push(
      'Mixed NaCl+KCl subcritical brine: monitor for 3–6 mN/m inter-campaign K⁺ offset at 25–30 °C.'
    );
  }

  // Gate 5: High-T sparse knot zone (>125 °C at >35 MPa), thermal/baric bounds & clamping
  if (thermalExtrapFlag) {
    status = maxTier(status, (inputs.T || 0) > 433.15 ? 'RED' : 'AMBER');
    uif = Math.max(uif, UIF_RED);
    reasons.push(
      regime === 'sup'
        ? `Temperature (${((inputs.T || 0) - 273.15).toFixed(1)} °C) exceeds supercritical training ceiling (140.0 °C / 413.15 K); out-of-domain thermal extrapolation.`
        : `Temperature (${((inputs.T || 0) - 273.15).toFixed(1)} °C) exceeds subcritical training ceiling (60.1 °C / 333.25 K).`
    );
  }
  if (pressureExtrapFlag) {
    status = maxTier(status, 'AMBER');
    uif = Math.max(uif, UIF_RED);
    reasons.push(
      `Pressure (${(inputs.P || 0).toFixed(1)} MPa) exceeds ${regime === 'sup' ? '60.0' : '20.0'} MPa training upper bound.`
    );
  }
  if (highTKnotFlag && !thermalExtrapFlag) {
    status = maxTier(status, 'AMBER');
    reasons.push(
      'High-temperature deep supercritical zone (T > 125 °C, P > 35 MPa): sparse training-knot transition between campaigns; verify with lab core/fluid IFT.'
    );
  }
  if (p50Clipped) {
    status = maxTier(status, 'AMBER');
    reasons.push('Raw MARS output reached physical dataset clamp [12.40, 78.88] mN/m.');
  }

  const message =
    reasons.length === 0
      ? `Composite Assurance GREEN: Within applicability domain (h = ${h.toFixed(4)} ≤ h* = ${hStar.toFixed(4)}) and portable supercritical conformal regime (UIF_interval = 1.06). Screening-grade 80% prediction interval applied.`
      : reasons.join(' ');

  // Petroleum engineering convention: P10 = optimistic (high IFT) bound; P90 = conservative (low IFT) bound
  const halfWidth = qBase * uif;
  let rawP10 = prediction + halfWidth;
  let rawP90 = prediction - halfWidth;
  if (rawP10 < rawP90) [rawP10, rawP90] = [rawP90, rawP10];

  // Calibration-apparatus nominal 80% interval (retained for transparent reporting)
  const calibP10 = Math.max(12.4, Math.min(78.88, prediction + qBase));
  const calibP90 = Math.max(12.4, Math.min(78.88, prediction - qBase));

  const checks = [
    {
      id: 'regime',
      label: 'Thermodynamic Regime (Kay\'s Rule)',
      status: isNearCritical ? 'AMBER' : 'GREEN',
      detail: isNearCritical
        ? `${regime === 'sup' ? 'Supercritical' : 'Subcritical'} (inside ±2 °C & ±0.5 MPa near-critical gap)`
        : inputs.isBoundaryAdjacent
        ? `${regime === 'sup' ? 'Supercritical (35-term)' : 'Subcritical (16-term)'} — boundary-adjacent (Pr or Tr within ±5% of 1.0)`
        : `${regime === 'sup' ? 'Supercritical (35-term)' : 'Subcritical (16-term)'} — unambiguous phase state`,
    },
    {
      id: 'ad',
      label: 'Hat-Matrix Leverage AD',
      status: adStatus,
      detail: `h = ${h.toFixed(4)} vs h* = ${hStar.toFixed(4)} (${adStatus})`,
    },
    {
      id: 'portability',
      label: 'Cross-Lab Interval Portability',
      status: regime === 'sup' ? 'GREEN' : localCalibrated ? 'GREEN' : 'AMBER',
      detail:
        regime === 'sup'
          ? 'UIF_interval = 1.06 (Green portable, 75.0% EV coverage)'
          : 'UIF_interval = 3.59 (Red band; multiplier capped at 2.5× → AMBER until n ≥ 30 local calibration)',
    },
    {
      id: 'chemistry',
      label: 'Brine & Thermal Knot Audit',
      status:
        subDivalentExtrap || ((inputs.T || 0) > 433.15)
          ? 'RED'
          : thermalExtrapFlag || pressureExtrapFlag || liEtAlFlag || highTKnotFlag || p50Clipped
          ? 'AMBER'
          : 'GREEN',
      detail: subDivalentExtrap
        ? 'BCM > 1.50 mol/kg subcritical ceiling'
        : thermalExtrapFlag
        ? 'Exceeds training temperature ceiling (≤140 °C sup)'
        : highTKnotFlag
        ? 'High-T (>125 °C) sparse supercritical knot region'
        : liEtAlFlag
        ? 'Na₂SO₄ sulphate inter-campaign offset flag'
        : 'Within validated electrolyte & thermal knot envelope',
    },
  ];

  return {
    p50: prediction,
    p10: Math.max(12.4, Math.min(78.88, rawP10)),
    p90: Math.max(12.4, Math.min(78.88, rawP90)),
    calibP10,
    calibP90,
    qBase,
    halfWidth,
    adStatus,
    status,
    trustVerdict: status,
    reasons,
    checks,
    message,
    uif,
    uifPortability: UIF_PORTABILITY[regime],
    h,
    hStar,
    liEtAlFlag,
    highTKnotFlag,
  };
};
