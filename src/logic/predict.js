/**
 * Main prediction pipeline — orchestrates all deterministic physics & MARS modules.
 *
 * Strict alignment with training pipeline (00b_global_merger.py):
 *   1. Kay's mixing rule for Pc_mix, Tc_mix
 *   2. Strict thermodynamic regime: Supercritical iff Pr >= 1.0 AND Tr >= 1.0 (never misrouted!)
 *   3. Near-critical training data gap: |T - Tc_mix| <= 2.0 K AND |P - Pc_mix| <= 0.5 MPa
 *   4. MinMax feature scaling to [-1, +1] + binary hurdle flags {-1, +1}
 *   5. Exact MARS hinge equation evaluation (Sub-16t / Sup-35t)
 *   6. Unified 5-gate Composite Trust Verdict & conformal interval propagation
 */

import { scaleFeatures } from './scalers.js';
import { marsSubcritical, marsSupercritical } from './marsEngine.js';
import { calculateP10P90 } from './qaValidator.js';
import { co2Density, brineDensity } from './eosEngine.js';

// Pure-component critical constants (Kay's mixing rule, Thesis §3.4)
export const Pc = { CO2: 7.377, CH4: 4.600, N2: 3.390 }; // MPa
export const Tc = { CO2: 304.28, CH4: 190.56, N2: 126.19 }; // K

/**
 * Kay's mixing rule for Pc_mix and Tc_mix.
 * @param {number} x_CH4 — mole fraction of CH₄ in [0, 1]
 * @param {number} x_N2  — mole fraction of N₂ in [0, 1]
 * @returns {{ Pc_mix: number, Tc_mix: number }}
 */
export const kaysMixing = (x_CH4 = 0, x_N2 = 0) => {
  const x_CO2 = 1 - (x_CH4 || 0) - (x_N2 || 0);
  const Pc_mix = x_CO2 * Pc.CO2 + (x_CH4 || 0) * Pc.CH4 + (x_N2 || 0) * Pc.N2;
  const Tc_mix = x_CO2 * Tc.CO2 + (x_CH4 || 0) * Tc.CH4 + (x_N2 || 0) * Tc.N2;
  return { Pc_mix, Tc_mix };
};

/**
 * Detect thermodynamic regime strictly via Kay's rule and flag the pipeline
 * near-critical exclusion window (|T - Tc_mix| <= 2.0 K AND |P - Pc_mix| <= 0.5 MPa).
 *
 * Never overrides a supercritical point (Pr >= 1 && Tr >= 1) into the subcritical model.
 *
 * @param {number} Pr
 * @param {number} Tr
 * @param {number} [Pc_mix=7.377]
 * @param {number} [Tc_mix=304.28]
 * @returns {{ regime: 'sub'|'sup', isNearCritical: boolean, isBoundaryAdjacent: boolean }}
 */
export const detectRegime = (Pr, Tr, Pc_mix = Pc.CO2, Tc_mix = Tc.CO2) => {
  const supercritical = Pr >= 1.0 && Tr >= 1.0;
  const dP = Math.abs(Pr * Pc_mix - Pc_mix);
  const dT = Math.abs(Tr * Tc_mix - Tc_mix);

  // Exact training-pipeline near-critical data gap (Thesis §3.2, §5.3.i):
  // zero observations within ±2.0 °C (K) AND ±0.5 MPa of mixture critical point
  const isNearCritical = dT <= 2.0 && dP <= 0.5;

  // Paper 3 §8.7.iv boundary-adjacent diagnostic (±5% of Pc,eff or Tc,eff)
  const isBoundaryAdjacent = Math.abs(Pr - 1.0) <= 0.05 || Math.abs(Tr - 1.0) <= 0.05;

  return {
    regime: supercritical ? 'sup' : 'sub',
    isNearCritical,
    isBoundaryAdjacent,
  };
};

/**
 * Full deterministic prediction pipeline.
 */
export const predict = (userInputs) => {
  const {
    P,
    T,
    drho,
    MCM = 0,
    BCM = 0,
    x_CH4 = 0,
    x_N2 = 0,
    brineType = 'NaCl',
    eosEstimated = false,
    localCalibrated = false,
  } = userInputs;

  // 1. Derived critical & reduced quantities
  const { Pc_mix, Tc_mix } = kaysMixing(x_CH4, x_N2);
  const Pr = P / Pc_mix;
  const Tr = T / Tc_mix;
  const drho_sq = drho * drho;

  // 2. Strict Kay's rule regime detection
  const { regime, isNearCritical, isBoundaryAdjacent } = detectRegime(Pr, Tr, Pc_mix, Tc_mix);

  // 3. Binary hurdle flags
  const BCM_bin = BCM > 0 ? 1 : 0;
  const CH4_bin = x_CH4 > 0 ? 1 : 0;
  const N2_bin  = x_N2 > 0 ? 1 : 0;

  // 4. Unscaled continuous features
  const features = { Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq };

  // 5. Regime-matched MinMax scaling [-1, +1]
  const scaled = scaleFeatures(features, regime);
  scaled.BCM_bin = BCM_bin * 2 - 1;
  scaled.CH4_bin = CH4_bin * 2 - 1;
  scaled.N2_bin  = N2_bin * 2 - 1;

  // 6. Evaluate MARS production equation
  const rawP50 = regime === 'sup'
    ? marsSupercritical(scaled)
    : marsSubcritical(scaled);

  const p50 = Math.max(12.4, Math.min(78.88, rawP50));
  const p50Clipped = p50 !== rawP50;

  // Optional boundary-discontinuity diagnostic (Paper 3 §8.7.iv)
  let boundaryDelta = null;
  if (isBoundaryAdjacent) {
    const altRegime = regime === 'sup' ? 'sub' : 'sup';
    const altScaled = scaleFeatures(features, altRegime);
    altScaled.BCM_bin = scaled.BCM_bin;
    altScaled.CH4_bin = scaled.CH4_bin;
    altScaled.N2_bin  = scaled.N2_bin;
    const altP50 = Math.max(
      12.4,
      Math.min(78.88, altRegime === 'sup' ? marsSupercritical(altScaled) : marsSubcritical(altScaled))
    );
    boundaryDelta = Math.abs(p50 - altP50);
  }

  // EOS reference phase densities for downstream calculators
  const rho_co2 = co2Density(P, T, x_CH4, x_N2);
  const rho_brine = brineDensity(P, T, userInputs.salinity ?? MCM, BCM);

  // 7. Unified 5-gate QA / Conformal UQ evaluation
  const qaInputs = {
    ...features,
    P,
    T,
    brineType,
    eosEstimated,
    isNearCritical,
    p50Clipped,
    localCalibrated,
  };
  const qaResult = calculateP10P90(p50, qaInputs, scaled, regime);

  return {
    regime,
    isNearCritical,
    isBoundaryAdjacent,
    boundaryDelta,
    Pr,
    Tr,
    drho,
    drho_sq,
    rho_co2,
    rho_brine,
    Pc_mix,
    Tc_mix,
    eosEstimated: !!eosEstimated,
    p50Clipped,
    rawP50,
    ...qaResult,
  };
};
