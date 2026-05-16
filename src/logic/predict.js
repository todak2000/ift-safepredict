/**
 * Main prediction pipeline — orchestrates all logic modules.
 *
 * Input from user: P, T, drho, MCM, BCM, x_CH4, x_N2, brineType
 * 1. Compute Pr, Tr, drho_sq via Kay's rule
 * 2. Detect regime
 * 3. Compute binary flags
 * 4. Scale features
 * 5. Evaluate MARS
 * 6. Apply QA/UIF
 */

import { scaleFeatures } from './scalers.js';
import { marsSubcritical, marsSupercritical } from './marsEngine.js';
import { calculateP10P90 } from './qaValidator.js';

// Pure-component critical constants
const Pc = { CO2: 7.377, CH4: 4.600, N2: 3.390 }; // MPa
const Tc = { CO2: 304.13, CH4: 190.56, N2: 126.19 }; // K

/**
 * Kay's mixing rule for Pc_mix and Tc_mix.
 * @param {number} x_CH4 — mole fraction of CH₄
 * @param {number} x_N2  — mole fraction of N₂
 * @returns {{ Pc_mix, Tc_mix }}
 */
const kaysMixing = (x_CH4, x_N2) => {
  const x_CO2 = 1 - x_CH4 - x_N2;
  const Pc_mix = x_CO2 * Pc.CO2 + x_CH4 * Pc.CH4 + x_N2 * Pc.N2;
  const Tc_mix = x_CO2 * Tc.CO2 + x_CH4 * Tc.CH4 + x_N2 * Tc.N2;
  return { Pc_mix, Tc_mix };
};

/**
 * Detect regime from Pr and Tr.
 * @param {number} Pr
 * @param {number} Tr
 * @returns {{ regime: 'sub'|'sup'|'near-critical', isNearCritical: boolean }}
 */
export const detectRegime = (Pr, Tr) => {
  const supercritical = Pr >= 1.0 && Tr >= 1.0;
  const subcritical   = Pr <  1.0 || Tr <  1.0;

  // Near-critical: within 2% of critical on both axes
  const nearCritical =
    Math.abs(Pr - 1.0) < 0.02 || Math.abs(Tr - 1.0) < 0.02;

  if (nearCritical && (Pr >= 0.98) && (Tr >= 0.98)) {
    return { regime: 'sub', isNearCritical: true };
  }
  return { regime: supercritical ? 'sup' : 'sub', isNearCritical: false };
};

/**
 * Full prediction pipeline.
 *
 * @param {{
 *   P: number,       // MPa
 *   T: number,       // K
 *   drho: number,    // g/cm³  (Δρ = ρ_brine − ρ_CO₂)
 *   MCM: number,     // mol/kg
 *   BCM: number,     // mol/kg
 *   x_CH4: number,   // mol/mol
 *   x_N2: number,    // mol/mol
 *   brineType: string,
 *   eosEstimated?: boolean,
 * }} userInputs
 *
 * @returns {{
 *   regime: 'sub'|'sup',
 *   isNearCritical: boolean,
 *   Pr: number, Tr: number, drho_sq: number,
 *   p10: number, p50: number, p90: number,
 *   status: string, message: string, uif: number,
 *   violatingFeatures: string[],
 * }}
 */
export const predict = (userInputs) => {
  const { P, T, drho, MCM, BCM, x_CH4, x_N2, brineType, eosEstimated } = userInputs;

  // 1. Derived quantities
  const { Pc_mix, Tc_mix } = kaysMixing(x_CH4, x_N2);
  const Pr      = P / Pc_mix;
  const Tr      = T / Tc_mix;
  const drho_sq = drho * drho;

  // 2. Regime detection
  const { regime, isNearCritical } = detectRegime(Pr, Tr);

  // 3. Binary flags
  const BCM_bin  = BCM  > 0 ? 1 : 0;
  const CH4_bin  = x_CH4 > 0 ? 1 : 0;
  const N2_bin   = x_N2  > 0 ? 1 : 0;

  // 4. Assemble unscaled features
  const features = { Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq };

  // 5. Scale
  const scaled = scaleFeatures(features, regime);
  // Binary flags: training CSV pre-scales these to {-1, +1} (MinMax with
  // bounds [0,1] → [-1,+1]).  Apply the same mapping here.
  scaled.BCM_bin  = BCM_bin  * 2 - 1;   // 0 → -1, 1 → +1
  scaled.CH4_bin  = CH4_bin  * 2 - 1;   // 0 → -1, 1 → +1
  scaled.N2_bin   = N2_bin   * 2 - 1;   // 0 → -1, 1 → +1

  // 6. Evaluate MARS
  const rawP50 = regime === 'sup'
    ? marsSupercritical(scaled)
    : marsSubcritical(scaled);

  const p50 = rawP50;
  const p50Clipped = false;

  // 7. QA / UIF
  const qaInputs = { ...features, brineType, eosEstimated };
  const qaResult = calculateP10P90(p50, qaInputs, regime);

  return {
    regime,
    isNearCritical,
    Pr,
    Tr,
    drho_sq,
    Pc_mix,
    Tc_mix,
    eosEstimated: !!eosEstimated,
    p50Clipped,
    rawP50,
    ...qaResult,
  };
};
