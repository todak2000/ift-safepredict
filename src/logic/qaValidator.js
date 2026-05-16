import { DOMAIN_BOUNDS } from './scalers.js';

// Conformal prediction base half-widths (80% CI)
const Q_BASE = { sub: 2.44, sup: 2.25 };

/**
 * Check if any derived feature is outside the validated training domain.
 * @param {{ Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq }} features — UNSCALED physical values
 * @param {'sub'|'sup'} regime
 * @returns {{ outOfDomain: boolean, violatingFeatures: string[] }}
 */
export const isOutOfDomain = (features, regime) => {
  const bounds = DOMAIN_BOUNDS[regime];
  const violatingFeatures = [];
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const v = features[key];
    if (v === undefined || v < min || v > max) {
      violatingFeatures.push(key);
    }
  }
  return { outOfDomain: violatingFeatures.length > 0, violatingFeatures };
};

/**
 * Calculate P10/P50/P90 prediction interval with UIF escalation.
 *
 * QA hierarchy (highest priority wins):
 *   RED   — any feature outside domain bounds
 *   YELLOW — Na2SO4 brine OR MCM > 2.5 mol/kg (Li et al. apparatus bias)
 *   GREEN  — everything else
 *
 * @param {number} prediction — P50 (mN/m) from MARS
 * @param {{ Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq, brineType }} inputs — unscaled
 * @param {'sub'|'sup'} regime
 * @returns {{ p10, p50, p90, status, message, uif, violatingFeatures }}
 */
export const calculateP10P90 = (prediction, inputs, regime) => {
  const qBase = Q_BASE[regime];
  const { outOfDomain, violatingFeatures } = isOutOfDomain(inputs, regime);

  let uif = 1.0;
  let status = 'GREEN';
  let message = 'Consistent with global laboratory trends.';

  // YELLOW: Li et al. (2012) apparatus-level bias
  // Root cause: +11.1% systematic offset across all brine types in that pressure range.
  if (inputs.brineType === 'Na2SO4' || inputs.MCM > 2.5) {
    uif = 3.41;
    status = 'YELLOW';
    message =
      'High lab-to-lab variation detected (+11% bias in this chemical space). ' +
      'Prediction interval widened automatically.';
  }

  // RED overrides YELLOW
  if (outOfDomain) {
    uif = 5.0;
    status = 'RED';
    message =
      'Extrapolation Alert: One or more inputs are outside the validated training range. ' +
      'Use with caution.';
  }

  const halfWidth = qBase * uif;

  return {
    p50: prediction,
    p10: Math.max(12.4,  prediction - halfWidth),
    p90: Math.min(78.88, prediction + halfWidth),
    status,
    message,
    uif,
    violatingFeatures,
  };
};
