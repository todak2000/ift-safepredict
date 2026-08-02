import { computeLeverage, H_STAR } from './hatMatrix.js';

// Conformal prediction base half-widths (80% CI)
// sub: q80(calibration) = 2.6928 mN/m per paper4 §4.1.3; sup: 2.25 mN/m
const Q_BASE = { sub: 2.6928, sup: 2.25 };

// Composite UIFinterval from paper4 Table 2 — applied in Amber tier (h* < h <= 3h*)
const UIF_AMBER = { sub: 3.5855, sup: 1.0559 };

// Red tier UIF (h > 3h*) — approximates 95% PI per paper4 Table 1
const UIF_RED = 5.0;

/**
 * Compute Williams-Plot AD status using hat-matrix leverage.
 *
 * Three-tier classification (thesis §3.12.2):
 *   GREEN — h <= h*          calibrated 80% PI, UIF = 1.0
 *   AMBER — h* < h <= 3h*   UIF-adjusted interval (paper4 Table 1 Yellow tier)
 *   RED   — h > 3h*          ~95% PI (paper4 Table 1 Red tier), UIF = 5.0
 *
 * @param {object} scaledFeatures — MinMax-scaled + binary-mapped features
 *   keys: Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq, BCM_bin, CH4_bin, N2_bin
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

/**
 * Calculate P10/P50/P90 prediction interval with leverage-based UIF escalation.
 *
 * AD hierarchy (thesis §3.12.2, paper4 Table 1):
 *   GREEN — h <= h*          UIF = 1.0
 *   AMBER — h* < h <= 3h*   UIF = composite UIFinterval (paper4 Table 2)
 *   RED   — h > 3h*          UIF = 5.0 (~95% PI)
 *
 * Na2SO4 / high-MCM conditions (Li et al. apparatus bias) are flagged as a
 * secondary warning alongside the leverage-based tier but do not override it.
 *
 * @param {number} prediction — P50 (mN/m) from MARS
 * @param {object} inputs — unscaled physical values + metadata
 *   { Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq, brineType }
 * @param {object} scaledFeatures — MinMax-scaled + binary-mapped features
 * @param {'sub'|'sup'} regime
 * @returns {{ p10, p50, p90, status, message, uif, h, hStar, liEtAlFlag }}
 */
export const calculateP10P90 = (prediction, inputs, scaledFeatures, regime) => {
  const qBase = Q_BASE[regime];
  const { adStatus, h, hStar } = computeADStatus(scaledFeatures, regime);

  // Secondary flag: Li et al. (2012) apparatus bias (+13.51% offset)
  const liEtAlFlag = inputs.brineType === 'Na2SO4' || inputs.MCM > 2.5;

  let uif, status, message;

  if (adStatus === 'GREEN') {
    uif = 1.0;
    status = 'GREEN';
    message = liEtAlFlag
      ? 'Within applicability domain. Note: Na\u2082SO\u2084 / high-MCM conditions carry +13.51% apparatus bias (Li et al. 2012).'
      : 'Within applicability domain. Calibrated 80% prediction interval applied.';
  } else if (adStatus === 'AMBER') {
    uif = UIF_AMBER[regime];
    status = 'AMBER';
    message =
      `Leverage h = ${h.toFixed(4)} exceeds h* = ${hStar.toFixed(4)} (graduated extrapolation zone). ` +
      'Prediction interval widened by UIFinterval.' +
      (liEtAlFlag ? ' Also: Na\u2082SO\u2084 / high-MCM apparatus bias detected.' : '');
  } else {
    uif = UIF_RED;
    status = 'RED';
    message =
      `Leverage h = ${h.toFixed(4)} > 3h* = ${(3 * hStar).toFixed(4)} (strong extrapolation). ` +
      'Use with caution — 95% PI approximation applied.';
  }

  // Petroleum engineering convention: P10 = optimistic (high IFT) bound;
  // P90 = conservative (low IFT) bound (thesis §4.12, paper4 §5.2).
  const halfWidth = qBase * uif;
  let rawP10 = prediction + halfWidth;
  let rawP90 = prediction - halfWidth;
  if (rawP10 < rawP90) [rawP10, rawP90] = [rawP90, rawP10];

  return {
    p50: prediction,
    p10: Math.max(12.4, Math.min(78.88, rawP10)),
    p90: Math.max(12.4, Math.min(78.88, rawP90)),
    status,
    message,
    uif,
    h,
    hStar,
    liEtAlFlag,
  };
};
