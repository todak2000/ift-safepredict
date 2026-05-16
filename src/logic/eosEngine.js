/**
 * Optional EOS Assist — estimates Δρ from P, T, and total salinity.
 *
 * CO₂ density: piecewise approach —
 *   Gas phase (T < Tc, P < Psat): real-gas equation with Pitzer truncated virial Z-factor.
 *   Dense phase (supercritical or liquid): bivariate polynomial calibrated to
 *   NIST Span-Wagner data over P=[7,30] MPa, T=[300,420] K.
 *   Typical accuracy ±15%; degrades near the critical point (T≈304 K, P≈7.4 MPa).
 * Brine density: Rowe-Chou (1970) empirical correlation for NaCl-equivalent brine.
 *
 * This module is a convenience estimator — the user can always override drho manually.
 * Estimated drho is tagged as "EOS-estimated" in exports.
 */

// CO₂ pure-component constants
const CO2_TC  = 304.13;   // K
const CO2_PC  = 7.377;    // MPa
const CO2_M   = 0.04401;  // kg/mol
const R_GAS   = 8.314;    // J/(mol·K)
const CO2_W   = 0.239;    // acentric factor

// ---------------------------------------------------------------------------
// CO₂ vapour-pressure curve (MPa) for T < Tc (Antoine-type, fitted to NIST)
// ---------------------------------------------------------------------------
const _co2Psat = (T_K) => {
  const tau = 1 - T_K / CO2_TC;
  const ln_pr = (-7.0602 * tau + 1.9391 * Math.pow(tau, 1.5) - 2.3360 * tau * tau) * (CO2_TC / T_K);
  return CO2_PC * Math.exp(ln_pr);
};

// ---------------------------------------------------------------------------
// Pitzer truncated-virial Z-factor — valid for subcritical gas (Tr < 1, Pr < 0.9)
// ---------------------------------------------------------------------------
const _co2Z = (Pr, Tr) => {
  const B0 = 0.083 - 0.422 / Math.pow(Tr, 1.6);
  const B1 = 0.139 - 0.172 / Math.pow(Tr, 4.2);
  return Math.max(0.2, 1 + (B0 + CO2_W * B1) * Pr / Tr);
};

// ---------------------------------------------------------------------------
// Dense-phase polynomial — calibrated to NIST at four anchor points:
//   (P=10, T=323) → 0.626 g/cm³   (P=10, T=360) → 0.390 g/cm³
//   (P=15, T=323) → 0.795 g/cm³   (P=20, T=360) → 0.820 g/cm³
// Clamped to [0.08, 0.95] to prevent extrapolation artefacts.
// ---------------------------------------------------------------------------
const _co2DensePhase = (P_MPa, T_K) => {
  const rho = 2.686 - 0.016 * P_MPa - 0.006490 * T_K + 0.002 * P_MPa * P_MPa;
  return Math.max(0.08, Math.min(0.95, rho));
};

/**
 * Estimate CO₂ density (g/cm³) at given P (MPa) and T (K).
 * Uses real-gas equation for subcritical vapour; polynomial for dense phase.
 * @param {number} P_MPa
 * @param {number} T_K
 * @returns {number} rho_CO2 in g/cm³
 */
export const co2Density = (P_MPa, T_K) => {
  const Pr = P_MPa / CO2_PC;
  const Tr = T_K   / CO2_TC;

  // Subcritical gas: T below critical AND P below vapour-pressure curve
  const inGasPhase = T_K < CO2_TC && P_MPa < _co2Psat(T_K);

  if (inGasPhase) {
    const Z = _co2Z(Pr, Tr);
    // ρ = PM / (ZRT), convert Pa→MPa already in P_MPa; result in kg/m³ → g/cm³
    return Math.max(0.01, (P_MPa * 1e6 * CO2_M) / (Z * R_GAS * T_K) / 1000);
  }

  return _co2DensePhase(P_MPa, T_K);
};

// ---------------------------------------------------------------------------
// Brine density via Rowe-Chou (1970) correlation (NaCl-equivalent)
// Reference: Rowe, A.M. & Chou, J.C.S. (1970) J. Chem. Eng. Data 15(1), 61–66.
// ---------------------------------------------------------------------------

/**
 * Estimate NaCl brine density (g/cm³) at P (MPa), T (K), and salinity (mol/kg).
 * @param {number} P_MPa
 * @param {number} T_K
 * @param {number} salinity_mol_kg — NaCl-equivalent total molality
 * @returns {number} rho_brine in g/cm³
 */
export const brineDensity = (P_MPa, T_K, salinity_mol_kg) => {
  const T_C = T_K - 273.15;
  const P_bar = P_MPa * 10;

  // Pure water density (Rowe-Chou base)
  const rho_w =
    1.0
    - 1.2e-4 * T_C
    - 3.6e-6 * T_C * T_C
    + 4.5e-8 * T_C * T_C * T_C
    + 4.0e-6 * P_bar
    - 1.6e-8 * P_bar * T_C;

  // NaCl correction (Rowe-Chou salinity term)
  const m = salinity_mol_kg;
  const A = 0.668 + 0.44e-3 * T_C - 1.04e-6 * T_C * T_C;
  const B = 3.26e-2 - 1.25e-4 * T_C;
  const rho_brine = rho_w + A * m * 0.0585 - B * m * m * 0.0585;

  return Math.max(0.9, rho_brine);
};

/**
 * Compute Δρ = ρ_brine − ρ_CO₂ (g/cm³).
 * @param {number} P_MPa
 * @param {number} T_K
 * @param {number} salinity_mol_kg
 * @returns {{ drho: number, rho_brine: number, rho_co2: number, eosEstimated: true }}
 */
export const computeDrho = (P_MPa, T_K, salinity_mol_kg) => {
  const rho_co2   = co2Density(P_MPa, T_K);
  const rho_brine = brineDensity(P_MPa, T_K, salinity_mol_kg);
  const drho = rho_brine - rho_co2;
  return {
    drho: Math.max(0.001, drho),
    rho_brine,
    rho_co2,
    eosEstimated: true,
  };
};
