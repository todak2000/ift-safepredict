/**
 * Comprehensive verification: web tool predictions vs test data.
 * Uses production predict.js, marsEngine.js, scalers.js.
 */
import { readFileSync } from 'fs';

// Import production code
import { predict, detectRegime } from '../src/logic/predict.js';
import { marsSubcritical, marsSupercritical } from '../src/logic/marsEngine.js';
import { scaleFeatures, DOMAIN_BOUNDS } from '../src/logic/scalers.js';
import { calculateP10P90 } from '../src/logic/qaValidator.js';

// ============================================================
// HELPERS
// ============================================================
const round = (v, d) => Number(v.toFixed(d));

// ============================================================
// TEST SCENARIOS
// ============================================================
// From paper draft worked examples + EV CSV data
const SCENARIOS = [

  // ---- Subcritical ----
  { label: 'SUB-1: pure CO₂, low P, CaCl₂ brine',
    desc: 'EV: Aggelopoulos 2010, 5.07MPa, 27°C, BCM=0.045',
    P: 5.07, T: 300.15, drho: 0.8817, MCM: 0, BCM: 0.045,
    x_CH4: 0, x_N2: 0, brineType: 'CaCl2', trueIFT: 39.61 },

  { label: 'SUB-2: pure CO₂, NaCl brine',
    desc: 'EV: Li et al 2012, 3.93MPa, 60°C, MCM=1.0',
    P: 3.93, T: 333.15, drho: 0.45, MCM: 1.0, BCM: 0,
    x_CH4: 0, x_N2: 0, brineType: 'NaCl', trueIFT: 50.63 },

  { label: 'SUB-3: Na₂SO₄ brine (YELLOW UIF trigger)',
    desc: 'EV: Li et al 2012, 5.0MPa, 25°C, MCM=0.68, BCM=0.34',
    P: 5.0, T: 298.15, drho: 0.8, MCM: 0.68, BCM: 0.34,
    x_CH4: 0, x_N2: 0, brineType: 'Na2SO4', trueIFT: 45.5 },

  { label: 'SUB-4: with CH4 impurity',
    desc: 'Train: Ren et al 2000, 1.0MPa, 80°C, 40% CH4',
    P: 1.0, T: 353.15, drho: 0.9336, MCM: 0, BCM: 0,
    x_CH4: 0.40, x_N2: 0, brineType: 'Water', trueIFT: 60.76 },

  { label: 'SUB-5: high T, near-critical boundary',
    desc: 'EV: Aggelopoulos 2010, 11.05MPa, 27°C, BCM=0.045',
    P: 11.05, T: 300.15, drho: 0.1977, MCM: 0, BCM: 0.045,
    x_CH4: 0, x_N2: 0, brineType: 'CaCl2', trueIFT: 30.49 },

  // ---- Supercritical ----
  { label: 'SUP-1: pure CO₂, NaCl+CaCl₂ brine',
    desc: 'EV: Aggelopoulos 2011, 10MPa, 70.9°C',
    P: 10.0, T: 344.05, drho: 0.75144, MCM: 0.045, BCM: 0.045,
    x_CH4: 0, x_N2: 0, brineType: 'NaCl+CaCl2', trueIFT: 35.78 },

  { label: 'SUP-2: pure CO₂, higher P',
    desc: 'EV: Aggelopoulos 2011, 18.02MPa, 70.9°C',
    P: 18.02, T: 344.05, drho: 0.39621, MCM: 0.045, BCM: 0.045,
    x_CH4: 0, x_N2: 0, brineType: 'NaCl+CaCl2', trueIFT: 29.85 },

  { label: 'SUP-3: high MCM+BCM',
    desc: 'EV: Aggelopoulos 2011, 13.95MPa, 70.9°C, MCM=BCM=1.5',
    P: 13.95, T: 344.05, drho: 0.7051, MCM: 1.5, BCM: 1.5,
    x_CH4: 0, x_N2: 0, brineType: 'NaCl+CaCl2', trueIFT: 37.92 },

  { label: 'SUP-4: with CH4 impurity',
    desc: 'Train: Ren et al 2000, 15MPa, 25°C, 80% CH4',
    P: 15.0, T: 298.15, drho: 0.8377, MCM: 0, BCM: 0,
    x_CH4: 0.80, x_N2: 0, brineType: 'Water', trueIFT: 54.58 },

  { label: 'SUP-5: near-critical, low drho',
    desc: 'EV: Aggelopoulos 2011, 20.95MPa, 71°C',
    P: 20.95, T: 344.15, drho: 0.33286, MCM: 0.045, BCM: 0.045,
    x_CH4: 0, x_N2: 0, brineType: 'NaCl+CaCl2', trueIFT: 27.42 },
];

// ============================================================
// RUN PREDICTIONS
// ============================================================
console.log('='.repeat(100));
console.log('IFT-SafePredict Web Tool — Prediction Verification');
console.log('='.repeat(100));

let totalAbsErr = 0;
let subCount = 0, supCount = 0;
let subRMSE = 0, supRMSE = 0;

for (const sc of SCENARIOS) {
  const inputs = {
    P: sc.P, T: sc.T, drho: sc.drho,
    MCM: sc.MCM, BCM: sc.BCM,
    x_CH4: sc.x_CH4, x_N2: sc.x_N2,
    brineType: sc.brineType,
  };

  const res = predict(inputs);

  const err = res.p50 - sc.trueIFT;
  const absErr = Math.abs(err);
  const pctErr = (absErr / sc.trueIFT) * 100;
  totalAbsErr += absErr;

  const regLabel = res.regime === 'sub' ? 'SUB' : 'SUP';

  console.log(`\n${regLabel}: ${sc.label}`);
  console.log(`  Inputs: P=${sc.P} MPa, T=${sc.T} K, drho=${sc.drho}, MCM=${sc.MCM}, BCM=${sc.BCM}, CH4=${sc.x_CH4}, N2=${sc.x_N2}`);
  console.log(`  Pr=${res.Pr.toFixed(4)}, Tr=${res.Tr.toFixed(4)}, drho_sq=${res.drho_sq.toFixed(6)}`);
  console.log(`  Regime: ${res.regime}${res.isNearCritical ? ' (near-critical)' : ''}`);
  console.log(`  P50=${res.p50.toFixed(4)} mN/m, PI=[${res.p10.toFixed(4)}, ${res.p90.toFixed(4)}]`);
  console.log(`  True IFT=${sc.trueIFT}, Error=${err.toFixed(4)} mN/m (${pctErr.toFixed(2)}%)`);
  console.log(`  QA: ${res.status} (UIF=${res.uif})${res.violatingFeatures.length ? ', violations: '+res.violatingFeatures.join(',') : ''}`);

  if (res.regime === 'sub') { subCount++; subRMSE += err * err; }
  else { supCount++; supRMSE += err * err; }
}

subRMSE = subCount ? Math.sqrt(subRMSE / subCount) : 0;
supRMSE = supCount ? Math.sqrt(supRMSE / supCount) : 0;
const totalRMSE = Math.sqrt(totalAbsErr / SCENARIOS.length);

console.log('\n' + '='.repeat(100));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(100));
console.log(`Subcritical (${subCount} scenarios): RMSE = ${subRMSE.toFixed(4)} mN/m`);
console.log(`Supercritical (${supCount} scenarios): RMSE = ${supRMSE.toFixed(4)} mN/m`);
console.log(`Overall (${SCENARIOS.length} scenarios): RMSE = ${totalRMSE.toFixed(4)} mN/m`);

// ============================================================
// RAW MARS ENGINE vs SCALED FEATURES CHECK
// ============================================================
console.log('\n' + '='.repeat(100));
console.log('RAW MARS ENGINE OUTPUT (decomposed):');
console.log('='.repeat(100));

for (const sc of [SCENARIOS[0], SCENARIOS[4], SCENARIOS[5], SCENARIOS[7]]) {
  const inputs = {
    P: sc.P, T: sc.T, drho: sc.drho,
    MCM: sc.MCM, BCM: sc.BCM,
    x_CH4: sc.x_CH4, x_N2: sc.x_N2,
    brineType: sc.brineType,
  };

  const { Pc_mix, Tc_mix } = (() => {
    const Pc = { CO2: 7.377, CH4: 4.600, N2: 3.390 };
    const Tc = { CO2: 304.13, CH4: 190.56, N2: 126.19 };
    const x_CO2 = 1 - inputs.x_CH4 - inputs.x_N2;
    return {
      Pc_mix: x_CO2 * Pc.CO2 + inputs.x_CH4 * Pc.CH4 + inputs.x_N2 * Pc.N2,
      Tc_mix: x_CO2 * Tc.CO2 + inputs.x_CH4 * Tc.CH4 + inputs.x_N2 * Tc.N2,
    };
  })();
  const Pr = inputs.P / Pc_mix;
  const Tr = inputs.T / Tc_mix;
  const drho_sq = inputs.drho * inputs.drho;

  const regime = (Pr >= 1.0 && Tr >= 1.0) ? 'sup' : 'sub';
  const rawFeatures = { Pr, Tr, MCM: inputs.MCM, BCM: inputs.BCM, x_CH4: inputs.x_CH4, x_N2: inputs.x_N2, drho_sq };
  const scaled = scaleFeatures(rawFeatures, regime);

  scaled.BCM_bin = (inputs.BCM > 0 ? 1 : 0) * 2 - 1;
  scaled.CH4_bin = (inputs.x_CH4 > 0 ? 1 : 0) * 2 - 1;
  scaled.N2_bin = (inputs.x_N2 > 0 ? 1 : 0) * 2 - 1;

  const engineOutput = regime === 'sup'
    ? marsSupercritical(scaled)
    : marsSubcritical(scaled);

  console.log(`\n${sc.label}`);
  console.log(`  Pr=${Pr.toFixed(6)} → scaled=${scaled.Pr.toFixed(6)}`);
  console.log(`  Tr=${Tr.toFixed(6)} → scaled=${scaled.Tr.toFixed(6)}`);
  console.log(`  drho_sq=${drho_sq.toFixed(8)} → scaled=${scaled.drho_sq.toFixed(6)}`);
  console.log(`  MCM=${inputs.MCM} → scaled=${scaled.MCM.toFixed(6)}`);
  console.log(`  BCM=${inputs.BCM} → scaled=${scaled.BCM.toFixed(6)}`);
  console.log(`  x_CH4=${inputs.x_CH4} → scaled=${scaled.x_CH4.toFixed(6)}`);
  console.log(`  x_N2=${inputs.x_N2} → scaled=${scaled.x_N2.toFixed(6)}`);
  console.log(`  Flags: CH4_bin=${scaled.CH4_bin}, BCM_bin=${scaled.BCM_bin}, N2_bin=${scaled.N2_bin}`);
  console.log(`  MARS engine output: ${engineOutput.toFixed(6)} mN/m`);
}

// ============================================================
// DOMAIN BOUNDS CHECK
// ============================================================
console.log('\n' + '='.repeat(100));
console.log('DOMAIN BOUNDS CROSS-CHECK (vs JSON scaler files):');
console.log('='.repeat(100));

// Compare web tool bounds with JSON scaler parmas
const subBounds = DOMAIN_BOUNDS.sub;
const supBounds = DOMAIN_BOUNDS.sup;

// JSON scaler reference
const SUB_JSON = {
  Pr: [0.013550135501355, 4.694600993224932],
  Tr: [0.91494675956356, 2.2171965898227066],
  MCM: [0, 4.9], BCM: [0, 1.5],
  x_CH4: [0, 0.890], x_N2: [0, 0.7636],
  drho_sq: [0.0001323598954303, 1.294887038140309],
};

const SUP_JSON = {
  Pr: [1.0027100271002711, 9.418699186991873],
  Tr: [1.0125542263704483, 2.2171965898227066],
  MCM: [0, 4.95], BCM: [0, 5.0],
  x_CH4: [0, 0.890], x_N2: [0, 0.7636],
  drho_sq: [0.001681, 1.6030851769],
};

const checkBounds = (label, web, json) => {
  let allOk = true;
  for (const key of Object.keys(json)) {
    const w = web[key], j = json[key];
    const match = Math.abs(w[0] - j[0]) < 1e-10 && Math.abs(w[1] - j[1]) < 1e-10;
    if (!match) {
      console.log(`  ❌ ${key}: web=[${w}], json=[${j}]`);
      allOk = false;
    }
  }
  if (allOk) console.log(`  ✓ ${label}: All bounds match JSON`);
};

checkBounds('Subcritical', subBounds, SUB_JSON);
checkBounds('Supercritical', supBounds, SUP_JSON);
