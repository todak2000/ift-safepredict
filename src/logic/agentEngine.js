/**
 * Agentic Assurance Co-Pilot Engine (Phase 2 — $0 Hybrid Symbolic + Gemini 3.8 Flash)
 *
 * Core Philosophy:
 *   "The AI model calculates. The agent reasons about whether to trust
 *    the calculation and what to do next."
 *
 * Strict Anti-Hallucination Design:
 *   All physics, MARS hinge equations, Peng–Robinson EOS densities, Hat-matrix
 *   leverages, conformal quantiles, reservoir depth sweeps, operating-window
 *   optimizations, and Young–Laplace capillary propagations execute inside
 *   deterministic JS tools.
 */

import { predict } from './predict.js';
import { computeDrho } from './eosEngine.js';
import { REGIONAL_BASINS, CAP_PRESETS } from './presetsData.js';

const G = 9.81;

const Z_QUANTILES_19 = [
  -1.960, -1.645, -1.440, -1.2816, -1.150, -1.036, -0.842, -0.674, -0.385,
   0.000,
   0.385,  0.674,  0.842,  1.036,  1.150,  1.2816,  1.440,  1.645,  1.960,
];

const SITE_ALIASES = [
  { match: /\bsarawak\b|\bkasawari\b|\bluconia\b|\blang\s*lebah\b|\bbintulu\b|\bmiri\b/i, id: 'sarawak', capKey: 'sarawak', defaultTargetM: 150 },
  { match: /\bmalay\s+basin\b|\bbekok\b|\btangga\s*barat\b|\bdulang\b|\bterengganu\b|\bpeninsular\s+malaysia\b/i, id: 'malay_basin', capKey: null, defaultTargetM: 120 },
  { match: /\bsabah\b|\bborneo\b|\bkimanis\b|\bgumusut\b/i, id: 'sabah', capKey: null, defaultTargetM: 120 },
  { match: /\bnatuna\b|\bterumbu\b|\bsunda\b/i, id: 'natuna', capKey: null, defaultTargetM: 150 },
  { match: /\bnorthern\s+lights\b|\bjohansen\b|\bhorda\b|\btroll\b/i, id: 'northern_lights', capKey: null, defaultTargetM: 150 },
  { match: /\bporthos\b|\brotliegend\b|\bp18\b|\bdutch\b/i, id: 'porthos', capKey: null, defaultTargetM: 100 },
  { match: /\bpermian\b|\bellenburger\b|\btexas\b|\bmidland\b|\bdelaware\s+basin\b/i, id: 'permian', capKey: null, defaultTargetM: 120 },
  { match: /\bniger\s+delta\b|\bagbada\b|\bnigeria\b/i, id: 'niger_delta', capKey: null, defaultTargetM: 100 },
  { match: /\bgippsland\b|\bcarbonnet\b|\bpelican\b|\blatrobe\b/i, id: 'gippsland', capKey: null, defaultTargetM: 120 },
  { match: /\bsleipner\b|\butsira\b|\bnordland\b/i, id: 'sleipner', capKey: 'sleipner', defaultTargetM: 200 },
  { match: /\bin\s*salah\b|\bkrechba\b|\balgeria\b/i, id: 'insalah', capKey: 'insalah', defaultTargetM: 15 },
  { match: /\bpeterhead\b|\bscotland\b|\buk\s+shallow\b|\bgoldeneye\b/i, id: 'peterhead', capKey: null, defaultTargetM: 100 },
  { match: /\b10,?865\b|\buae\s+deep\b|\bdeep\s+uae\b|\b134\s*°?c\b/i, id: 'uae_deep', capKey: null, defaultTargetM: 150 },
  { match: /\buae\b|\babu\s+dhabi\b|\b8,?727\b/i, id: 'uae_mid', capKey: null, defaultTargetM: 150 },
  { match: /\bsaudi\b|\bbasalt\b|\bjizan\b/i, id: 'saudi_basalt', capKey: null, defaultTargetM: 120 },
  { match: /\bvietnam\b|\bcuu\s*long\b|\bsong\s*hong\b/i, id: 'vietnam', capKey: null, defaultTargetM: 120 },
  { match: /\bsn[oø]hvit\b|\btub[aå]en\b|\bbarents\b/i, id: 'snohvit', capKey: null, defaultTargetM: 150 },
  { match: /\bquest\b|\balberta\b|\bcambrian\b/i, id: 'quest', capKey: null, defaultTargetM: 120 },
  { match: /\bgorgon\b|\bdupuy\b|\bbarrow\b/i, id: 'gorgon', capKey: null, defaultTargetM: 150 },
  { match: /\bdecatur\b|\billinois\b|\bmt\.?\s*simon\b/i, id: 'decatur', capKey: null, defaultTargetM: 120 },
];

/**
 * Tool 1: Resolve geological formation preset, regional atlas entry, Gemini-inferred
 * literature formation parameters, or depth-gradient specification.
 *
 * IMPORTANT: Never silently inherits an unrelated HUD preset (e.g. Sleipner) unless
 * `allowFallbackInputs` is explicitly true!
 */
export function resolveSiteOrDepth(spec = {}, fallbackInputs = null, allowFallbackInputs = false) {
  const presetObj = spec.siteId
    ? REGIONAL_BASINS.find(p => p.id === spec.siteId) || null
    : null;

  const fb = allowFallbackInputs ? fallbackInputs : null;

  let P = spec.P ?? presetObj?.P ?? fb?.P ?? 15.0;
  let T = spec.T ?? presetObj?.T ?? fb?.T ?? 333.15;
  const BCM = spec.BCM ?? presetObj?.BCM ?? fb?.BCM ?? 0.0;
  const MCM = spec.MCM ?? presetObj?.MCM ?? fb?.MCM ?? 1.0;
  const brineType =
    spec.brineType ||
    presetObj?.brineType ||
    fb?.brineType ||
    (BCM > 0 && MCM > 0 ? 'NaCl+CaCl2' : BCM > 0 ? 'CaCl2' : MCM === 0 ? 'Water' : 'NaCl');
  const x_CH4 = spec.x_CH4 ?? presetObj?.x_CH4 ?? fb?.x_CH4 ?? 0.0;
  const x_N2 = spec.x_N2 ?? presetObj?.x_N2 ?? fb?.x_N2 ?? 0.0;
  const salinity = spec.salinity ?? presetObj?.salinity ?? parseFloat((MCM + BCM).toFixed(3));

  let depthConverted = false;
  if (typeof spec.depthM === 'number' && spec.depthM > 0 && spec.P === undefined) {
    const pGrad = spec.pGrad ?? presetObj?.pGrad ?? 10.0;
    const tGrad = spec.tGrad ?? presetObj?.tGrad ?? 30.0;
    const surfT = spec.surfT ?? presetObj?.surfT ?? 15.0;
    P = parseFloat(((pGrad * spec.depthM) / 1000).toFixed(2));
    T = parseFloat((surfT + 273.15 + (tGrad * spec.depthM) / 1000).toFixed(2));
    depthConverted = true;
  }

  const eos = computeDrho(P, T, salinity, { BCM, x_CH4, x_N2 });
  const usePresetDrho =
    presetObj &&
    presetObj.eosEstimated === false &&
    typeof presetObj.drho === 'number' &&
    spec.P === undefined &&
    spec.T === undefined &&
    !depthConverted;

  const drho = usePresetDrho ? presetObj.drho : parseFloat(eos.drho.toFixed(4));
  const eosEstimated = !usePresetDrho;

  const capKey = spec.capKey || presetObj?.caprockKey || null;
  const capPreset = capKey ? CAP_PRESETS[capKey] : null;

  const rock = {
    trap: spec.trap || capPreset?.trap || presetObj?.trap || 'open',
    rcUm: spec.rcUm ?? capPreset?.rcUm ?? presetObj?.rcUm ?? 0.028,
    theta: spec.theta ?? capPreset?.theta ?? presetObj?.theta ?? 30,
    areaKm2: spec.areaKm2 ?? capPreset?.A ?? presetObj?.A ?? 30,
    phi: spec.phi ?? capPreset?.phi ?? presetObj?.phi ?? 0.16,
    SCO2max: spec.SCO2max ?? capPreset?.SCO2max ?? 0.60,
    gammaLit: capPreset?.gammaLit ?? null,
    litSource: capPreset?.litSource ?? null,
  };

  const siteName =
    spec.siteLabel ||
    presetObj?.label ||
    (allowFallbackInputs && fb?.presetName ? fb.presetName : 'Custom Formation State');

  const basisNote =
    spec.basisNote ||
    presetObj?.basisNote ||
    (depthConverted
      ? `Converted from depth = ${spec.depthM} m using hydrostatic/geothermal gradients`
      : 'Explicit thermobaric & brine specification');

  return {
    siteName,
    siteId: presetObj?.id || 'custom',
    basisNote,
    literatureInferred: !!spec.literatureInferred,
    depthConverted,
    depthM: spec.depthM || null,
    depthRange:
      spec.depthRange ||
      presetObj?.depthRange ||
      (spec.depthM ? [Math.max(300, spec.depthM - 150), spec.depthM + 150] : null),
    pGrad: spec.pGrad ?? presetObj?.pGrad ?? 10.2,
    tGrad: spec.tGrad ?? presetObj?.tGrad ?? 32.0,
    surfT: spec.surfT ?? presetObj?.surfT ?? 18.0,
    inputs: {
      P,
      T,
      salinity,
      MCM,
      BCM,
      x_CH4,
      x_N2,
      brineType,
      drho,
      eosEstimated,
      presetName: presetObj?.label || spec.siteLabel || '',
    },
    eos: {
      rho_brine: parseFloat(eos.rho_brine.toFixed(4)),
      rho_co2: parseFloat(eos.rho_co2.toFixed(4)),
      drho_eos: parseFloat(eos.drho.toFixed(4)),
    },
    rock,
  };
}

/**
 * Tool 2: Evaluate exact MARS production equation (Sub-16t or Sup-35t).
 */
export function evaluateMARSModel(inputs) {
  return predict(inputs);
}

/**
 * Tool 3: Run 5-Gate Composite Trust Audit on the MARS evaluation.
 */
export function auditCompositeTrust(marsResult) {
  return {
    compositeVerdict: marsResult.status,
    adStatus: marsResult.adStatus,
    regime: marsResult.regime,
    isNearCritical: marsResult.isNearCritical,
    isBoundaryAdjacent: marsResult.isBoundaryAdjacent,
    boundaryDelta: marsResult.boundaryDelta,
    leverageH: Number(marsResult.h.toFixed(4)),
    leverageThreshold: Number(marsResult.hStar.toFixed(4)),
    uifApplied: marsResult.uif,
    uifPortability: marsResult.uifPortability,
    reasons: marsResult.reasons,
    checks: marsResult.checks,
    summaryMessage: marsResult.message,
  };
}

/**
 * Tool 4: Sweep plausible formation depth / P–T envelope (11 slices across crest-to-base).
 */
export function sweepReservoirEnvelope(resolvedState, nSlices = 11) {
  const { inputs, depthRange, pGrad, tGrad } = resolvedState;
  const slices = [];

  for (let i = 0; i < nSlices; i++) {
    const frac = nSlices === 1 ? 0.5 : i / (nSlices - 1);
    let P_i, T_i, label;

    if (depthRange && depthRange.length === 2) {
      const d = depthRange[0] + frac * (depthRange[1] - depthRange[0]);
      const dMid = 0.5 * (depthRange[0] + depthRange[1]);
      P_i = Math.max(0.5, inputs.P + ((d - dMid) * pGrad) / 1000);
      T_i = Math.max(275, inputs.T + ((d - dMid) * tGrad) / 1000);
      label = `${Math.round(d)} m`;
    } else {
      P_i = Math.max(0.5, inputs.P * (0.90 + 0.20 * frac));
      T_i = Math.max(275, inputs.T - 5.0 + 10.0 * frac);
      label = `${P_i.toFixed(1)} MPa`;
    }

    const eos_i = computeDrho(P_i, T_i, inputs.salinity, {
      BCM: inputs.BCM,
      x_CH4: inputs.x_CH4,
      x_N2: inputs.x_N2,
    });
    const drhoOffset = inputs.eosEstimated ? 0 : inputs.drho - resolvedState.eos.drho_eos;
    const drho_i = Math.max(0.02, parseFloat((eos_i.drho + drhoOffset).toFixed(4)));

    const r_i = predict({
      ...inputs,
      P: parseFloat(P_i.toFixed(2)),
      T: parseFloat(T_i.toFixed(2)),
      drho: drho_i,
    });

    slices.push({
      label,
      P: parseFloat(P_i.toFixed(2)),
      T: parseFloat(T_i.toFixed(2)),
      drho: drho_i,
      rho_co2: eos_i.rho_co2,
      regime: r_i.regime,
      isNearCritical: r_i.isNearCritical,
      status: r_i.status,
      p90: r_i.p90,
      p50: r_i.p50,
      p10: r_i.p10,
      halfWidth: r_i.halfWidth,
    });
  }

  return {
    nSlices,
    slices,
    envelopeIftMin: Number(Math.min(...slices.map(s => s.p90)).toFixed(2)),
    envelopeIftMax: Number(Math.max(...slices.map(s => s.p10)).toFixed(2)),
    nearCritSlices: slices.filter(s => s.isNearCritical).length,
    cautionSlices: slices.filter(s => s.status !== 'GREEN').length,
    crestSlice: slices[0],
    baseSlice: slices[slices.length - 1],
  };
}

/**
 * Tool 5: Propagate MARS conformal interval & reservoir envelope through Young–Laplace
 * capillary pressure, column height H_cap, static capacity M_cap, and target clearance odds.
 */
export function propagateCapillaryAssurance(resolvedState, marsResult, envelope, targetColumnM = 20) {
  const { rock, inputs } = resolvedState;
  const rcMeters = Math.max(1e-10, rock.rcUm * 1e-6);
  const cosTheta = Math.cos((rock.theta * Math.PI) / 180);
  const drhoKgM3 = inputs.drho * 1000;
  const rhoCo2KgM3 = (marsResult.rho_co2 || resolvedState.eos.rho_co2 || 0.6) * 1000;

  const calcPcMPa = (gamma) => (2 * gamma * 1e-3 * cosTheta) / rcMeters / 1e6;
  const calcH = (gamma, dRho = drhoKgM3, th = rock.theta) => {
    const cTh = Math.cos((th * Math.PI) / 180);
    return (2 * gamma * 1e-3 * cTh) / (rcMeters * dRho * G);
  };
  const calcMt = (Hval, rCo2 = rhoCo2KgM3) =>
    (rock.areaKm2 * Hval * rock.phi * rCo2 * rock.SCO2max * 1e6) / 1e9;

  const Pc90 = calcPcMPa(marsResult.p90);
  const Pc50 = calcPcMPa(marsResult.p50);
  const Pc10 = calcPcMPa(marsResult.p10);

  const H90 = calcH(marsResult.p90);
  const H50 = calcH(marsResult.p50);
  const H10 = calcH(marsResult.p10);
  const Hlit = rock.gammaLit ? calcH(rock.gammaLit) : null;

  const M90 = rock.trap === 'structural' ? calcMt(H90) : null;
  const M50 = rock.trap === 'structural' ? calcMt(H50) : null;
  const M10 = rock.trap === 'structural' ? calcMt(H10) : null;

  const allHeights = [];
  for (const sl of envelope.slices) {
    const scale80 = sl.halfWidth / 1.2816;
    for (const z of Z_QUANTILES_19) {
      const gSample = Math.max(12.4, Math.min(78.88, sl.p50 + z * scale80));
      for (const dTheta of [-5, 0, 5]) {
        const thSample = Math.max(0, Math.min(85, rock.theta + dTheta));
        allHeights.push(calcH(gSample, sl.drho * 1000, thSample));
      }
    }
  }
  allHeights.sort((a, b) => a - b);

  const cleared = allHeights.filter(h => h >= targetColumnM).length;
  const clearancePct = Number(((cleared / allHeights.length) * 100).toFixed(1));

  return {
    targetColumnM,
    rcLabel: rock.rcUm < 0.1 ? `${(rock.rcUm * 1000).toFixed(1)} nm` : `${rock.rcUm.toFixed(2)} µm`,
    thetaDeg: rock.theta,
    drhoKgM3: Number(drhoKgM3.toFixed(1)),
    rhoCo2KgM3: Number(rhoCo2KgM3.toFixed(1)),
    trap: rock.trap,
    Pc_MPa: { p90: Number(Pc90.toFixed(2)), p50: Number(Pc50.toFixed(2)), p10: Number(Pc10.toFixed(2)) },
    H_m: {
      p90: Number(H90.toFixed(1)),
      p50: Number(H50.toFixed(1)),
      p10: Number(H10.toFixed(1)),
      lit: Hlit !== null ? Number(Hlit.toFixed(1)) : null,
    },
    envelopeH_m: {
      p90: Number(allHeights[Math.floor(0.10 * allHeights.length)].toFixed(1)),
      p50: Number(allHeights[Math.floor(0.50 * allHeights.length)].toFixed(1)),
      p10: Number(allHeights[Math.floor(0.90 * allHeights.length)].toFixed(1)),
    },
    M_Mt: M50 !== null
      ? { p90: Number(M90.toFixed(2)), p50: Number(M50.toFixed(2)), p10: Number(M10.toFixed(2)) }
      : null,
    clearancePct,
    nSamples: allHeights.length,
  };
}

/**
 * Tool 6 (Optimization): Deterministic Operating-Window Optimizer (`optimizeOperatingWindow`)
 * Sweeps a 5×5 (P, T) + stream-purity envelope around the target formation to discover
 * the exact GREEN-certified operating state maximizing conservative P90 seal height & storage mass!
 */
export function optimizeOperatingWindow(resolvedState) {
  const { inputs, rock } = resolvedState;
  const rcMeters = Math.max(1e-10, rock.rcUm * 1e-6);
  const cosTheta = Math.cos((rock.theta * Math.PI) / 180);

  const pCenter = Math.max(8.5, inputs.P);
  const pMin = Math.max(8.0, pCenter * 0.78);
  const pMax = Math.min(48.0, pCenter * 1.25);

  const tCenterC = inputs.T - 273.15;
  const tMinC = Math.max(35.0, tCenterC - 18.0);
  const tMaxC = Math.min(132.0, tCenterC + 18.0);

  // If input stream has CH4/N2 gas impurities that push leverage out of GREEN hull,
  // also evaluate dehydrated pipeline-grade pure CO2 (x_CH4=0, x_N2=0) to discover GREEN window
  const streamSpecs =
    inputs.x_CH4 > 0 || inputs.x_N2 > 0
      ? [
          { x_CH4: inputs.x_CH4, x_N2: inputs.x_N2, purified: false },
          { x_CH4: 0, x_N2: 0, purified: true },
        ]
      : [{ x_CH4: 0, x_N2: 0, purified: false }];

  const candidates = [];
  for (const stream of streamSpecs) {
    for (let ip = 0; ip < 5; ip++) {
      const P_cand = parseFloat((pMin + (ip / 4) * (pMax - pMin)).toFixed(2));
      for (let it = 0; it < 5; it++) {
        const T_C_cand = parseFloat((tMinC + (it / 4) * (tMaxC - tMinC)).toFixed(1));
        const T_K_cand = parseFloat((T_C_cand + 273.15).toFixed(2));

        const eos = computeDrho(P_cand, T_K_cand, inputs.salinity, {
          BCM: inputs.BCM,
          x_CH4: stream.x_CH4,
          x_N2: stream.x_N2,
        });
        const drho = parseFloat(eos.drho.toFixed(4));
        const res = predict({
          ...inputs,
          P: P_cand,
          T: T_K_cand,
          x_CH4: stream.x_CH4,
          x_N2: stream.x_N2,
          drho,
          eosEstimated: true,
        });

        const H90 = (2 * res.p90 * 1e-3 * cosTheta) / (rcMeters * (drho * 1000) * G);
        const H50 = (2 * res.p50 * 1e-3 * cosTheta) / (rcMeters * (drho * 1000) * G);
        const storageIndex = H90 * eos.rho_co2;
        candidates.push({
          P: P_cand,
          T_C: T_C_cand,
          T_K: T_K_cand,
          drho,
          rho_co2: Number((eos.rho_co2 * 1000).toFixed(0)),
          purifiedStream: stream.purified,
          status: res.status,
          p90: Number(res.p90.toFixed(2)),
          p50: Number(res.p50.toFixed(2)),
          p10: Number(res.p10.toFixed(2)),
          H90: Number(H90.toFixed(1)),
          H50: Number(H50.toFixed(1)),
          storageIndex,
        });
      }
    }
  }

  const greenCandidates = candidates.filter(c => c.status === 'GREEN');
  const pool = greenCandidates.length > 0 ? greenCandidates : candidates;

  // Best balance of high CO2 density + high conservative P90 seal height (storage efficiency optimum)
  const bestBalanced = [...pool].sort((a, b) => b.storageIndex - a.storageIndex)[0];
  // Maximum pure capillary column height H90
  const maxSealPoint = [...pool].sort((a, b) => b.H90 - a.H90)[0];

  const greenPs = greenCandidates.map(c => c.P);
  const greenTs = greenCandidates.map(c => c.T_C);

  return {
    evaluatedCount: candidates.length,
    greenCount: greenCandidates.length,
    safeWindowP_MPa: greenPs.length ? [Math.min(...greenPs), Math.max(...greenPs)] : [pMin, pMax],
    safeWindowT_C: greenTs.length ? [Math.min(...greenTs), Math.max(...greenTs)] : [tMinC, tMaxC],
    bestBalanced,
    maxSealPoint,
    avoidNotes: [
      'Stay above P > 8.0 MPa & T > 34 °C to avoid the subcritical/near-critical transition where UIF_interval jumps to 3.59.',
      'Keep reservoir/bottomhole temperature ≤ 125 °C where possible (above 125 °C & 35 MPa enters sparse supercritical MARS knots).',
    ],
  };
}

/**
 * Tool 7: Synthesize Decision Verdict, Optimization Summary, & Regulator Report.
 */
export function prescribeEngineeringAction(resolved, marsResult, audit, envelope, prop, optimization = null) {
  const trust = audit.compositeVerdict;
  const odds = prop.clearancePct;
  const target = prop.targetColumnM;

  let decision = 'GO';
  let badgeColor = 'GREEN';
  if (trust === 'RED' || odds < 50.0) {
    decision = 'HOLD / NO-GO';
    badgeColor = 'RED';
  } else if (trust === 'AMBER' || odds < 85.0 || envelope.nearCritSlices > 0) {
    decision = 'CONDITIONAL GO';
    badgeColor = 'AMBER';
  }

  const pLow = Math.max(0.5, resolved.inputs.P - 1.0).toFixed(1);
  const pHigh = (resolved.inputs.P + 1.0).toFixed(1);
  const tLowC = (resolved.inputs.T - 273.15 - 3.0).toFixed(1);
  const tHighC = (resolved.inputs.T - 273.15 + 3.0).toFixed(1);
  const tLowK = (resolved.inputs.T - 3.0).toFixed(1);
  const tHighK = (resolved.inputs.T + 3.0).toFixed(1);

  let primaryRisk = 'Low residual model variance within validated supercritical manifold.';
  let nextAction =
    `Proceed with ${resolved.siteName} screening using P90 conservative column bound (${prop.H_m.p90} m) ` +
    `for DNV-RP-J203 containment risk documentation; confirm site-specific caprock MICP r_c (${prop.rcLabel}) on core plugs.`;
  let logGap = false;

  if (audit.isNearCritical || envelope.nearCritSlices > 0) {
    primaryRisk = 'Near-critical phase transition window (±2 °C & ±0.5 MPa of T_c,mix/P_c,mix) where training data contain zero observations.';
    nextAction =
      `Do not rely on uncalibrated predictions near the crest. Acquire pendant-drop IFT measurements across ` +
      `P = ${pLow}–${pHigh} MPa and T = ${tLowC}–${tHighC} °C at ${resolved.inputs.MCM} mol/kg ${resolved.inputs.brineType}.`;
    logGap = true;
  } else if (audit.regime === 'sub') {
    primaryRisk = 'Subcritical cross-laboratory portability shift (UIF_interval = 3.59 Red tier; 39.4% unadjusted EV coverage).';
    nextAction =
      `Do not use nominal ±2.69 mN/m bounds for permitting. Use escalated ±${marsResult.halfWidth.toFixed(2)} mN/m screening bounds ` +
      `only for preliminary scoping, and measure n ≥ 30 local IFT points across ${pLow}–${pHigh} MPa and ${tLowC}–${tHighC} °C to compute local q80.`;
    logGap = true;
  } else if (marsResult.highTKnotFlag) {
    primaryRisk = 'High-temperature (>125 °C at >35 MPa) sparse supercritical MARS knot transition between training campaigns.';
    nextAction =
      `Verify high-temperature IFT in a high-pressure optical cell at ${pLow}–${pHigh} MPa and ${tLowC}–${tHighC} °C ` +
      `with calibrated in-situ buoyancy correction before finalising deep seal capacity.`;
    logGap = true;
  } else if (trust === 'RED') {
    primaryRisk = `Out-of-domain covariate extrapolation (leverage h = ${audit.leverageH} vs 3h* = ${(3 * audit.leverageThreshold).toFixed(4)}).`;
    nextAction =
      `Halt reliance on surrogate IFT at this composition. Execute n ≥ 30 laboratory pendant-drop campaign at ` +
      `${pLow}–${pHigh} MPa, ${tLowC}–${tHighC} °C (${resolved.inputs.brineType}, MCM=${resolved.inputs.MCM}, BCM=${resolved.inputs.BCM} mol/kg).`;
    logGap = true;
  } else if (odds < 50.0) {
    primaryRisk =
      resolved.rock.trap === 'structural'
        ? `Static passive capillary column (${prop.H_m.p50} m) is below the ${target} m threshold in ${prop.rcLabel} reservoir throats (viscous overpressure governs active injection fill).`
        : `Capillary column distribution (P50 = ${prop.H_m.p50} m, P90 = ${prop.H_m.p90} m) falls below the ${target} m target column height.`;
    nextAction =
      resolved.rock.trap === 'structural'
        ? `Distinguish passive buoyant capillary height (${prop.H_m.p90}–${prop.H_m.p10} m) from dynamic viscous plume invasion; couple MARS IFT bounds [${marsResult.p90.toFixed(2)}, ${marsResult.p10.toFixed(2)}] mN/m into multiphase reservoir simulation.`
        : `Restrict maximum CO₂ plume thickness below ${prop.H_m.p90} m (P90 conservative limit) or verify finer caprock pore throats via core MICP.`;
  }

  if (optimization?.bestBalanced) {
    const b = optimization.bestBalanced;
    nextAction =
      `Optimal GREEN operating point for ${resolved.siteName}: P = ${b.P.toFixed(2)} MPa, T = ${b.T_C.toFixed(1)} °C ` +
      `(Δρ = ${b.drho.toFixed(4)} g/cm³, ρ_CO₂ = ${b.rho_co2} kg/m³ → IFT = ${b.p50} [${b.p90}, ${b.p10}] mN/m, conservative H90 = ${b.H90} m). ` +
      nextAction;
  }

  const eqCited =
    audit.regime === 'sup' ? 'Sup-MARS-35t (35 hinge basis terms, q80 = 2.25 mN/m)' : 'Sub-MARS-16t (16 hinge basis terms, q80 = 2.69 mN/m)';

  const plainReport = [
    `### Executive Containment Assurance Verdict: **${decision}**`,
    `- **Formation & Basis:** ${resolved.siteName} (${resolved.basisNote}) — P = ${resolved.inputs.P.toFixed(2)} MPa, T = ${(resolved.inputs.T - 273.15).toFixed(2)} °C (${resolved.inputs.T.toFixed(2)} K), ${resolved.inputs.brineType} (MCM = ${resolved.inputs.MCM}, BCM = ${resolved.inputs.BCM} mol/kg), Δρ = ${resolved.inputs.drho.toFixed(4)} g/cm³.`,
    `- **MARS Equation & Interval:** Evaluated via **${eqCited}**. Predicted IFT: **P90 = ${marsResult.p90.toFixed(2)}**, **P50 = ${marsResult.p50.toFixed(2)}**, **P10 = ${marsResult.p10.toFixed(2)} mN/m** (applied UIF = ${marsResult.uif.toFixed(2)}×).`,
    `- **Composite Trust Audit:** **${trust}** (Hat leverage h = ${audit.leverageH} / h* = ${audit.leverageThreshold}, cross-lab UIF_interval = ${audit.uifPortability.toFixed(2)}).`,
    `- **Capillary Propagation (MICP r_c = ${prop.rcLabel}, θ = ${prop.thetaDeg}°):** Entry pressure P_c(P50) = ${prop.Pc_MPa.p50.toFixed(2)} MPa; static column height **P90 = ${prop.H_m.p90} m / P50 = ${prop.H_m.p50} m / P10 = ${prop.H_m.p10} m**${prop.M_Mt ? `; static patch capacity (${resolved.rock.areaKm2} km²): **${prop.M_Mt.p90} / ${prop.M_Mt.p50} / ${prop.M_Mt.p10} Mt**` : ''}.`,
    optimization
      ? `- **Optimal GREEN Operating Window:** P ∈ [${optimization.safeWindowP_MPa[0].toFixed(1)}, ${optimization.safeWindowP_MPa[1].toFixed(1)}] MPa, T ∈ [${optimization.safeWindowT_C[0].toFixed(1)}, ${optimization.safeWindowT_C[1].toFixed(1)}] °C; best storage-efficiency operating point at **P* = ${optimization.bestBalanced.P.toFixed(2)} MPa, T* = ${optimization.bestBalanced.T_C.toFixed(1)} °C** (IFT P50 = ${optimization.bestBalanced.p50} mN/m, conservative H90 = ${optimization.bestBalanced.H90} m).`
      : null,
    `- **Target Threshold Odds (≥ ${target} m):** **${odds}%** of the ${prop.nSamples}-point conformal × depth × contact-angle envelope clears ${target} m.`,
    `- **Primary Risk:** ${primaryRisk}`,
    `- **Recommended Next Engineering Action:** ${nextAction}`,
  ].filter(Boolean).join('\n');

  const experimentalGapSpec = logGap
    ? {
        siteName: resolved.siteName,
        regime: audit.regime,
        trustVerdict: trust,
        recommendedP_MPa: `${pLow}–${pHigh}`,
        recommendedT_C: `${tLowC}–${tHighC}`,
        recommendedT_K: `${tLowK}–${tHighK}`,
        brineSpec: `${resolved.inputs.brineType} (MCM=${resolved.inputs.MCM}, BCM=${resolved.inputs.BCM} mol/kg)`,
        minSamplesForConformalRecal: 30,
        reason: primaryRisk,
      }
    : null;

  return {
    decision,
    badgeColor,
    oddsPct: odds,
    targetColumnM: target,
    primaryRisk,
    nextAction,
    eqCited,
    plainReport,
    experimentalGapSpec,
  };
}

/**
 * Parse natural-language engineering question into structured query parameters.
 */
export function parseDecisionQuestion(question = '') {
  const q = question.trim();
  const spec = {};

  for (const alias of SITE_ALIASES) {
    if (alias.match.test(q)) {
      spec.siteId = alias.id;
      if (alias.capKey) spec.capKey = alias.capKey;
      spec.defaultTargetM = alias.defaultTargetM;
      break;
    }
  }

  const isOptimizationQuery =
    /\b(best|optimal|optimise|optimize|ideal|recommend(?:ed)?|window|operating\s+range|values?\s+for)\b/i.test(q);

  const referencesCurrentHud =
    /\b(this\s+formation|this\s+site|current|loaded|active|hud)\b/i.test(q);

  const colMatch =
    q.match(/(?:hold|support|seal|contain|above|exceed|target|column(?:\s+of|\s+height)?)\s*(?:a\s*|an\s*)?(\d+(?:\.\d+)?)\s*m\b/i) ||
    q.match(/(\d+(?:\.\d+)?)\s*m\s+(?:co2\s+|co₂\s+)?(?:column|plume|caprock|seal|pay)/i);
  const targetColumnM = colMatch
    ? parseFloat(colMatch[1])
    : spec.defaultTargetM || 100;

  const depthMatch = q.match(/(\d{3,4}(?:\.\d+)?)\s*m\s+depth/i) || q.match(/depth\s+(?:of\s+)?(\d{3,4}(?:\.\d+)?)\s*m\b/i);
  if (depthMatch) spec.depthM = parseFloat(depthMatch[1]);

  const pMatch = q.match(/(\d+(?:\.\d+)?)\s*mpa\b/i);
  if (pMatch) spec.P = parseFloat(pMatch[1]);

  const tCMatch = q.match(/(\d+(?:\.\d+)?)\s*°\s*c\b/i) || q.match(/(\d+(?:\.\d+)?)\s*deg\s*c\b/i);
  const tKMatch = q.match(/(\d{3}(?:\.\d+)?)\s*k\b/i);
  if (tCMatch) spec.T = parseFloat(tCMatch[1]) + 273.15;
  else if (tKMatch) spec.T = parseFloat(tKMatch[1]);

  const mMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:mol\/kg|molal)\b/i);
  if (mMatch) {
    spec.MCM = parseFloat(mMatch[1]);
    spec.salinity = spec.MCM;
  }

  const nmMatch = q.match(/(\d+(?:\.\d+)?)\s*nm\b/i);
  const umMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:µm|um|microns?)\b/i);
  if (nmMatch) spec.rcUm = parseFloat(nmMatch[1]) / 1000;
  else if (umMatch) spec.rcUm = parseFloat(umMatch[1]);

  const hasExplicitCoords =
    Boolean(spec.siteId) ||
    spec.P !== undefined ||
    spec.T !== undefined ||
    spec.depthM !== undefined ||
    referencesCurrentHud;

  return {
    spec,
    targetColumnM,
    isOptimizationQuery,
    referencesCurrentHud,
    needsParametersInOfflineMode: !hasExplicitCoords,
  };
}

/**
 * Assemble complete deterministic pipeline result from resolved spec.
 */
function buildPipelineResult({
  question,
  spec,
  targetColumnM,
  runOptimization,
  fallbackInputs,
  allowFallbackInputs,
  engineUsed,
}) {
  const resolved = resolveSiteOrDepth(spec, fallbackInputs, allowFallbackInputs);
  const marsResult = evaluateMARSModel(resolved.inputs);
  const audit = auditCompositeTrust(marsResult);
  const envelope = sweepReservoirEnvelope(resolved, 11);
  const propagation = propagateCapillaryAssurance(resolved, marsResult, envelope, targetColumnM);
  const optimization = runOptimization ? optimizeOperatingWindow(resolved) : null;
  const prescription = prescribeEngineeringAction(resolved, marsResult, audit, envelope, propagation, optimization);

  const trace = [
    {
      step: 1,
      tool: 'resolveSiteOrDepth',
      badge: resolved.inputs.eosEstimated ? 'PR-EOS Coupled' : 'Site Benchmark',
      title: 'Formation & Phase Density Resolution',
      detail: `${resolved.siteName}: P = ${resolved.inputs.P.toFixed(2)} MPa, T = ${(resolved.inputs.T - 273.15).toFixed(2)} °C, MCM = ${resolved.inputs.MCM} mol/kg, Δρ = ${resolved.inputs.drho.toFixed(4)} g/cm³`,
    },
    {
      step: 2,
      tool: 'evaluateMARSModel',
      badge: marsResult.regime === 'sup' ? 'Sup-MARS-35t' : 'Sub-MARS-16t',
      title: 'Closed-Form MARS Inference',
      detail: `P90 = ${marsResult.p90.toFixed(2)} mN/m · P50 = ${marsResult.p50.toFixed(2)} mN/m · P10 = ${marsResult.p10.toFixed(2)} mN/m`,
    },
    {
      step: 3,
      tool: 'auditCompositeTrust',
      badge: audit.compositeVerdict,
      title: '5-Gate Composite Trust Audit',
      detail: `Leverage h = ${audit.leverageH} (threshold h* = ${audit.leverageThreshold}) · UIF_interval = ${audit.uifPortability.toFixed(2)} · Applied multiplier = ${audit.uifApplied.toFixed(2)}×`,
    },
    {
      step: 4,
      tool: 'sweepReservoirEnvelope',
      badge: `${envelope.nSlices} Horizons`,
      title: 'Reservoir Depth & P–T Envelope Sweep',
      detail: `Crest-to-base (${envelope.crestSlice.label} → ${envelope.baseSlice.label}): IFT span [${envelope.envelopeIftMin.toFixed(2)}, ${envelope.envelopeIftMax.toFixed(2)}] mN/m`,
    },
    {
      step: 5,
      tool: 'propagateCapillaryAssurance',
      badge: `${propagation.clearancePct}% Clearance`,
      title: 'MICP Caprock Seal Propagation',
      detail: `r_c = ${propagation.rcLabel}, θ = ${propagation.thetaDeg}° → H_cap = ${propagation.H_m.p90} / ${propagation.H_m.p50} / ${propagation.H_m.p10} m (target ≥ ${targetColumnM} m)`,
    },
  ];

  if (optimization) {
    trace.push({
      step: 6,
      tool: 'optimizeOperatingWindow',
      badge: `${optimization.greenCount}/${optimization.evaluatedCount} GREEN`,
      title: 'Operating Window Optimization',
      detail: `Certified window P ∈ [${optimization.safeWindowP_MPa[0].toFixed(1)}, ${optimization.safeWindowP_MPa[1].toFixed(1)}] MPa, T ∈ [${optimization.safeWindowT_C[0].toFixed(1)}, ${optimization.safeWindowT_C[1].toFixed(1)}] °C → Optimal P* = ${optimization.bestBalanced.P.toFixed(2)} MPa, T* = ${optimization.bestBalanced.T_C.toFixed(1)} °C (H90 = ${optimization.bestBalanced.H90} m)`,
    });
  }

  trace.push({
    step: trace.length + 1,
    tool: 'prescribeEngineeringAction',
    badge: prescription.decision,
    title: 'Regulatory Verdict & Action Plan',
    detail: prescription.experimentalGapSpec
      ? `${prescription.decision} — Targeted laboratory verification prescribed`
      : `${prescription.decision} — Certified within validated domain`,
  });

  return {
    needsClarification: false,
    engineUsed,
    question,
    resolved,
    marsResult,
    audit,
    envelope,
    propagation,
    optimization,
    prescription,
    llmNarrative: null,
    trace,
  };
}

/**
 * Execute offline deterministic workflow (never silently fakes Sleipner on unknown formations!).
 */
export function runDeterministicWorkflow(question, currentInputs = null) {
  const parsed = parseDecisionQuestion(question);

  if (parsed.needsParametersInOfflineMode) {
    return {
      needsClarification: true,
      engineUsed: 'SEAL · Local Verified Physics Engine',
      question,
      clarificationMessage:
        `The query "${question}" names a formation or scenario not in the 20-basin built-in atlas and does not include explicit pressure (MPa), temperature (°C), or depth (m) values. ` +
        `Rather than substituting another preset, please either: (1) include pressure & temperature or depth in your prompt (e.g. "at 22 MPa and 110 °C" or "at 2100 m depth"), ` +
        `(2) name one of the 20 built-in formations (Sleipner, In Salah, Sarawak Kasawari, Malay Basin, Sabah, Natuna, Northern Lights, Porthos, Peterhead, UAE, Saudi Basalt, Vietnam, Snøhvit, Quest, Gorgon, Decatur, Permian, Niger Delta, Gippsland), ` +
        `or (3) connect a Google AI Studio key so SEAL can resolve published regional basin parameters automatically.`,
    };
  }

  return buildPipelineResult({
    question,
    spec: parsed.spec,
    targetColumnM: parsed.targetColumnM,
    runOptimization: parsed.isOptimizationQuery,
    fallbackInputs: currentInputs,
    allowFallbackInputs: parsed.referencesCurrentHud,
    engineUsed: 'SEAL · Local Verified Physics Engine',
  });
}

/**
 * Gemini Tool Declarations (Evaluating specific decision OR Optimizing operating window).
 */
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'evaluateAndOptimizeFormation',
        description:
          'Executes the deterministic IFT-SafePredict Peng-Robinson EOS, closed-form MARS (Sub-16t/Sup-35t), 5-gate conformal trust, depth-envelope sweep, MICP capillary column propagation, and optional 25-point operating-window optimizer. Always call this tool first and NEVER invent any IFT or column numbers yourself. If the user names a geological formation not in siteId, infer realistic published reservoir P_MPa, T_C, MCM, BCM, rcUm, and basisNote from geological literature.',
        parameters: {
          type: 'OBJECT',
          properties: {
            siteId: {
              type: 'STRING',
              description:
                'Known atlas id if matched: sleipner, insalah, sarawak, malay_basin, sabah, natuna, northern_lights, porthos, permian, niger_delta, gippsland, peterhead, uae_mid, uae_deep, saudi_basalt, vietnam, snohvit, quest, gorgon, decatur. Leave empty if inferring a different formation.',
            },
            siteLabel: {
              type: 'STRING',
              description: 'Full human-readable formation & basin name, e.g. "Sarawak Basin (Central Luconia Carbonate, Malaysia)"',
            },
            basisNote: {
              type: 'STRING',
              description: 'Short geological source note explaining the reservoir depth/pressure/temperature basis',
            },
            runOptimization: {
              type: 'BOOLEAN',
              description: 'Set true when the user asks for best values, optimal conditions, operating window, or recommendations.',
            },
            targetColumnM: {
              type: 'NUMBER',
              description: 'Required CO2 column height threshold in meters (default 100–200 for caprock seal, 15–25 for intra-reservoir pay)',
            },
            depthM: { type: 'NUMBER', description: 'Optional reservoir depth in meters' },
            P_MPa: { type: 'NUMBER', description: 'Representative reservoir pressure in MPa' },
            T_C: { type: 'NUMBER', description: 'Representative reservoir temperature in degrees Celsius' },
            MCM: { type: 'NUMBER', description: 'Monovalent cation molality (Na+ + K+) in mol/kg (note: 35,000 mg/L NaCl ≈ 0.60 mol/kg)' },
            BCM: { type: 'NUMBER', description: 'Bivalent cation molality (Ca2+ + Mg2+) in mol/kg. Set to 0 (NaCl-equivalent brine default) unless divalent salt is explicitly requested.' },
            x_CH4: { type: 'NUMBER', description: 'CH4 mole fraction in [0, 0.89]. Set to 0 (pure pipeline CO2 default) unless CH4 co-injection is explicitly mentioned.' },
            x_N2: { type: 'NUMBER', description: 'N2 mole fraction in [0, 0.76]. Set to 0 (pure pipeline CO2 default) unless N2 co-injection is explicitly mentioned.' },
            rcUm: { type: 'NUMBER', description: 'Caprock MICP pore throat radius in micrometers (e.g. 0.025 for 25 nm shale seal; 1.0 for sandstone pay)' },
            theta: { type: 'NUMBER', description: 'CO2-brine-rock contact angle in degrees (typically 30–40)' },
            trap: { type: 'STRING', description: '"open" for caprock seal integrity or "structural" for closed trap capacity' },
          },
          required: ['siteLabel', 'runOptimization', 'targetColumnM'],
        },
      },
    ],
  },
];

// Resilient 2026+ Google AI Studio Flash model cascade (auto-failover across 503/429/404/timeouts)
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
];

async function callGeminiModelCascade(apiKey, payload, preferredModel = null) {
  const orderedModels = preferredModel
    ? [preferredModel, ...GEMINI_MODELS.filter(m => m !== preferredModel)]
    : GEMINI_MODELS;

  let lastError = null;
  for (const modelName of orderedModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resolvedPayload = typeof payload === 'function' ? payload(modelName) : payload;
    const bodyWithConfig = {
      ...resolvedPayload,
      generationConfig: modelName.startsWith('gemini-3')
        ? { thinkingConfig: { thinkingBudget: 256 }, temperature: 0.2 }
        : { temperature: 0.2 },
    };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyWithConfig),
        signal: AbortSignal.timeout(18000),
      });
      if (res.ok) {
        return { data: await res.json(), modelName };
      }
      const errJson = await res.json().catch(() => ({}));
      lastError = new Error(errJson?.error?.message || `HTTP ${res.status} on ${modelName}`);
      // Stop immediately only on invalid API key / auth failure (401/403);
      // cascade automatically on 404, 429, 500, 502, 503 ("high demand"), 504, etc.
      if (res.status === 401 || res.status === 403) break;
    } catch (fetchErr) {
      lastError = fetchErr;
    }
  }
  throw lastError || new Error('Gemini API request failed');
}

/**
 * Run Hybrid Agentic Workflow: uses Google AI Studio (`gemini-3.8-flash` / `gemini-flash-latest`)
 * when an API key is available, strictly grounded on the deterministic JS physics tools.
 */
export async function runAgentAssurance(question, currentInputs = null, geminiApiKey = '') {
  const cleanKey = (geminiApiKey || '').trim();
  if (!cleanKey) {
    return runDeterministicWorkflow(question, currentInputs);
  }

  const parsed = parseDecisionQuestion(question);

  try {
    const systemInstruction = {
      parts: [
        {
          text:
            'You are SEAL (Subsurface Evaluation & Assurance Lead), the executive containment assurance agent inside IFT-SafePredict (DNV-RP-J203 / NSTA compliance). ' +
            'STRICT SCIENTIFIC RULE: NEVER invent or calculate IFT, density, leverage, UIF, or column height yourself. ' +
            'Always call evaluateAndOptimizeFormation first. When a user asks about any regional formation (e.g. Sarawak / Kasawari, ' +
            'Permian, Malay Basin, Gippsland, etc.), match siteId if listed (leaving depthM, P_MPa, and T_C unset so curated atlas values are preserved unless the user explicitly specified numbers) ' +
            'or supply realistic literature thermobaric parameters within reservoir conditions (typically P = 8–45 MPa, T = 35–135 °C; converting salinity wt% or ppm accurately to mol/kg: 35,000 ppm NaCl = 0.60 mol/kg). ' +
            'FORMATTING RULE: Write a crisp 4-bullet executive engineering synthesis (`* **Heading:** text`) citing ONLY the verified tool output numbers. ' +
            'Use clean Unicode engineering symbols (CO₂, Δρ, r_c, θ, °C, kg/m³, g/cm³, mN/m, ≤, ≥, ×) — NEVER output raw LaTeX dollar signs ($...$) or \\text{...} commands.',
        },
      ],
    };

    // Turn 1: Gemini parses intent/geology and invokes evaluateAndOptimizeFormation
    const { data: turn1Data, modelName } = await callGeminiModelCascade(cleanKey, {
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: question }] }],
      tools: GEMINI_TOOLS,
      toolConfig: { functionCallingConfig: { mode: 'ANY' } },
    });

    const modelContent = turn1Data?.candidates?.[0]?.content;
    const fnCallPart = (modelContent?.parts || []).find(p => p.functionCall);

    if (!fnCallPart?.functionCall) {
      return runDeterministicWorkflow(question, currentInputs);
    }

    const args = fnCallPart.functionCall.args || {};
    const matchedSiteId =
      args.siteId && REGIONAL_BASINS.some(b => b.id === args.siteId)
        ? args.siteId
        : parsed.spec.siteId || undefined;

    // CRITICAL: When matchedSiteId resolves to a curated basin (e.g., Sarawak), NEVER let LLM-invented
    // depthM or basisNote override the verified curated preset unless the USER explicitly typed depth/P/T!
    const llmSpec = {
      siteId: matchedSiteId,
      siteLabel: matchedSiteId ? undefined : args.siteLabel,
      basisNote: matchedSiteId ? undefined : args.basisNote,
      literatureInferred: !matchedSiteId,
      depthM: parsed.spec.depthM ?? (!matchedSiteId && typeof args.depthM === 'number' ? args.depthM : undefined),
      P: parsed.spec.P ?? (!matchedSiteId && typeof args.P_MPa === 'number' ? args.P_MPa : undefined),
      T: parsed.spec.T ?? (!matchedSiteId && typeof args.T_C === 'number' ? args.T_C + 273.15 : undefined),
      MCM: parsed.spec.MCM ?? (!matchedSiteId && typeof args.MCM === 'number' ? args.MCM : undefined),
      BCM: !matchedSiteId && typeof args.BCM === 'number' ? args.BCM : undefined,
      x_CH4: !matchedSiteId && typeof args.x_CH4 === 'number' ? args.x_CH4 : undefined,
      x_N2: !matchedSiteId && typeof args.x_N2 === 'number' ? args.x_N2 : undefined,
      rcUm: parsed.spec.rcUm ?? (!matchedSiteId && typeof args.rcUm === 'number' ? args.rcUm : undefined),
      theta: !matchedSiteId && typeof args.theta === 'number' ? args.theta : undefined,
      trap: !matchedSiteId && args.trap ? args.trap : undefined,
    };

    const runOptimization = Boolean(args.runOptimization || parsed.isOptimizationQuery);
    const targetColumnM =
      typeof args.targetColumnM === 'number' && args.targetColumnM > 0
        ? args.targetColumnM
        : parsed.targetColumnM;

    const activeRun = buildPipelineResult({
      question,
      spec: llmSpec,
      targetColumnM,
      runOptimization,
      fallbackInputs: currentInputs,
      allowFallbackInputs: parsed.referencesCurrentHud,
      engineUsed: 'SEAL · Cloud AI + Verified MARS Engine',
    });

    // Turn 2: Echo exact modelContent (preserving Gemini 3.x thoughtSignature!) + deterministic tool response
    const fnResponseObj = {
      name: fnCallPart.functionCall.name,
      response: {
        siteName: activeRun.resolved.siteName,
        basisNote: activeRun.resolved.basisNote,
        inputs: activeRun.resolved.inputs,
        marsIFT_mNm: {
          p90: Number(activeRun.marsResult.p90.toFixed(2)),
          p50: Number(activeRun.marsResult.p50.toFixed(2)),
          p10: Number(activeRun.marsResult.p10.toFixed(2)),
          equation: activeRun.prescription.eqCited,
        },
        trustAudit: activeRun.audit,
        capillaryPropagation: activeRun.propagation,
        optimizationWindow: activeRun.optimization || null,
        verdict: {
          decision: activeRun.prescription.decision,
          oddsPct: activeRun.prescription.oddsPct,
          primaryRisk: activeRun.prescription.primaryRisk,
          nextAction: activeRun.prescription.nextAction,
        },
      },
    };
    if (fnCallPart.functionCall.id) {
      fnResponseObj.id = fnCallPart.functionCall.id;
    }

    const { data: turn2Data, modelName: turn2Model } = await callGeminiModelCascade(
      cleanKey,
      (candidateModel) =>
        candidateModel === modelName
          ? {
              systemInstruction,
              contents: [
                { role: 'user', parts: [{ text: question }] },
                modelContent,
                {
                  role: 'user',
                  parts: [{ functionResponse: fnResponseObj }],
                },
              ],
            }
          : {
              systemInstruction,
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text:
                        `User question: ${question}\n\n` +
                        `Verified deterministic IFT-SafePredict tool output (cite ONLY these exact numbers):\n` +
                        JSON.stringify(fnResponseObj.response),
                    },
                  ],
                },
              ],
            },
      modelName
    );

    if (turn2Model && turn2Model !== modelName) {
      activeRun.engineUsed = 'SEAL · Cloud AI + Verified MARS Engine';
    }

    const textOut = (turn2Data?.candidates?.[0]?.content?.parts || [])
      .filter(p => typeof p.text === 'string' && !p.thought)
      .map(p => p.text)
      .join('\n')
      .trim();

    if (textOut) {
      activeRun.llmNarrative = textOut;
    }

    return activeRun;
  } catch (err) {
    return runDeterministicWorkflow(question, currentInputs);
  }
}
