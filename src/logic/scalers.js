// MinMax scaler bounds per regime — sourced directly from equations/global_{sub,sup}_scaler_v2.json
// These MUST match the Python scaler used to pre-scale the training feature CSVs
// before R/MARS fitting, otherwise hinge knots (already in [-1,1] space) are
// applied to incorrectly scaled inputs and predictions blow up.
//
// x_CH4 and x_N2 are stored as mol% (0–100) in the master CSV; the scaler JSON
// reflects that scale (max 89.0 and 76.36).  predict.js accepts mol/mol (0–1),
// so bounds are divided by 100 here: [0, 0.890] and [0, 0.7636].
//
// drho_sq bounds cover the SQUARED density difference (g/cm³)² on the full
// training pool (includes CH4-heavy mixtures where ρ_CO2 ≈ ρ_brine).

export const DOMAIN_BOUNDS = {
  sub: {
    Pr:      [0.013550135501355,  4.694600993224932],
    Tr:      [0.91494675956356,   2.2171965898227066],
    MCM:     [0.0,                4.9],
    BCM:     [0.0,                1.5],
    x_CH4:   [0.0,                0.890],
    x_N2:    [0.0,                0.7636],
    drho_sq: [0.0001323598954303, 1.294887038140309],
  },
  sup: {
    Pr:      [1.0027100271002711, 9.418699186991873],
    Tr:      [1.0125542263704483, 2.2171965898227066],
    MCM:     [0.0,                4.95],
    BCM:     [0.0,                5.0],
    x_CH4:   [0.0,                0.890],
    x_N2:    [0.0,                0.7636],
    drho_sq: [0.001681,           1.6030851769],
  },
};

/**
 * Scale a single value to [-1, 1] using MinMax bounds.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const minMaxScale = (value, min, max) => {
  return 2 * (value - min) / (max - min) - 1;
};

/**
 * Scale all 7 MARS features to [-1, 1] for a given regime.
 * Input object keys: Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq
 * Returns scaled object with same keys.
 * @param {{ Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq }} features
 * @param {'sub'|'sup'} regime
 * @returns {{ Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq }}
 */
export const scaleFeatures = (features, regime) => {
  const bounds = DOMAIN_BOUNDS[regime];
  const scaled = {};
  for (const key of Object.keys(bounds)) {
    const [min, max] = bounds[key];
    scaled[key] = minMaxScale(features[key], min, max);
  }
  return scaled;
};
