import { describe, test, expect } from '@jest/globals';

import { predict } from '../src/logic/predict.js';
import { marsSubcritical, marsSupercritical } from '../src/logic/marsEngine.js';
import { scaleFeatures, minMaxScale, DOMAIN_BOUNDS } from '../src/logic/scalers.js';
import { computeADStatus } from '../src/logic/qaValidator.js';
import { H_STAR } from '../src/logic/hatMatrix.js';
import { co2Density, computeDrho } from '../src/logic/eosEngine.js';
import { runDeterministicWorkflow, sanitizeExecutiveNarrative } from '../src/logic/agentEngine.js';
import { formatThroatRadius } from '../src/logic/presetsData.js';
import { parseCSV, batchPredict } from '../src/logic/batchPredict.js';
import { cleanScientificText, parseExecutiveBlocks, toPdfSafeText, tokenizeRichScientific } from '../src/logic/formatText.js';

const bounds = (regime) => DOMAIN_BOUNDS[regime];

describe('scalers — MinMax bounds match training scaler', () => {
  test('boundary values scale to exactly ±1 (sub)', () => {
    const sub = bounds('sub');
    for (const [, [min, max]] of Object.entries(sub)) {
      expect(minMaxScale(min, min, max)).toBeCloseTo(-1, 10);
      expect(minMaxScale(max, min, max)).toBeCloseTo(1, 10);
    }
  });

  test('boundary values scale to exactly ±1 (sup)', () => {
    const sup = bounds('sup');
    for (const [, [min, max]] of Object.entries(sup)) {
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

describe('eosEngine — Volume-translated Peng–Robinson + Rowe–Chou EOS', () => {
  test('matches NIST Span–Wagner CO2 densities across gas & supercritical states', () => {
    expect(co2Density(5.2, 305.15)).toBeCloseTo(0.133, 1);
    expect(co2Density(10.0, 323.0)).toBeCloseTo(0.383, 2);
    expect(co2Density(21.41, 373.15)).toBeCloseTo(0.503, 1);
    expect(co2Density(44.85, 407.21)).toBeCloseTo(0.710, 1);
  });

  test('computeDrho returns consistent positive density difference', () => {
    const r = computeDrho(18.0, 363.15, 0.44);
    expect(r.drho).toBeCloseTo(0.5482, 3);
    expect(r.rho_brine).toBeGreaterThan(r.rho_co2);
    expect(r.eosEstimated).toBe(true);
  });
});

describe('marsEngine & hatMatrix', () => {
  test('subcritical & supercritical references return finite physical IFT', () => {
    const sSub = scaleFeatures({ Pr: 2.35, Tr: 1.56, MCM: 2.45, BCM: 0.75, x_CH4: 0.445, x_N2: 0.3818, drho_sq: 0.65 }, 'sub');
    sSub.CH4_bin = 1; sSub.BCM_bin = -1; sSub.N2_bin = -1;
    expect(marsSubcritical(sSub)).toBeGreaterThan(10);

    const sSup = scaleFeatures({ Pr: 2.034, Tr: 1.095, MCM: 1.0, BCM: 0.0, x_CH4: 0, x_N2: 0, drho_sq: 0.1225 }, 'sup');
    sSup.BCM_bin = -1; sSup.CH4_bin = -1; sSup.N2_bin = -1;
    expect(marsSupercritical(sSup)).toBeGreaterThan(10);
  });

  test('h* = 3(p+1)/n matches thesis values and gates GREEN / AMBER / RED', () => {
    expect(H_STAR.sub).toBeCloseTo(3 * 11 / 965, 5);
    expect(H_STAR.sup).toBeCloseTo(3 * 11 / 1417, 5);

    const sGrn = scaleFeatures({ Pr: 1.3962, Tr: 1.0193, MCM: 0.6, BCM: 0, x_CH4: 0, x_N2: 0, drho_sq: 0.3916 * 0.3916 }, 'sup');
    sGrn.BCM_bin = -1; sGrn.CH4_bin = -1; sGrn.N2_bin = -1;
    expect(computeADStatus(sGrn, 'sup').adStatus).toBe('GREEN');
  });
});

describe('predict — Synchronized Thesis & Paper 4 Field Case Studies', () => {
  test('Sleipner → Supercritical p50=30.87 GREEN [28.62, 33.12] and boundary-adjacent regime label', () => {
    const r = predict({ P: 10.30, T: 310.15, drho: 0.3916, MCM: 0.60, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.regime).toBe('sup');
    expect(r.isNearCritical).toBe(false);
    expect(r.isBoundaryAdjacent).toBe(true);
    expect(r.p50).toBeCloseTo(30.87, 2);
    expect(r.p90).toBeCloseTo(28.62, 2);
    expect(r.p10).toBeCloseTo(33.12, 2);
    expect(r.status).toBe('GREEN');
    expect(r.uifPortability).toBeCloseTo(1.06, 2);
    const regChk = r.checks.find(c => c.id === 'regime');
    expect(regChk.detail).toContain('boundary-adjacent');
    expect(regChk.detail).not.toContain('unambiguous');
  });

  test('In Salah (MCM=0.44, EOS drho=0.5482) → Supercritical p50=30.54 GREEN [28.29, 32.79]', () => {
    const r = predict({ P: 18.00, T: 363.15, drho: 0.5482, MCM: 0.44, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.regime).toBe('sup');
    expect(r.p50).toBeCloseTo(30.54, 2);
    expect(r.status).toBe('GREEN');
  });

  test('Peterhead shallow subcritical → Subcritical p50=44.05, 2.5× escalated screening interval (capped), UIF 3.59 Red band → AMBER', () => {
    const r = predict({ P: 5.20, T: 305.15, drho: 0.9169, MCM: 1.50, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.regime).toBe('sub');
    expect(r.p50).toBeCloseTo(44.05, 2);
    expect(r.status).toBe('AMBER');
    expect(r.uif).toBe(2.5);
    expect(r.uifPortability).toBeCloseTo(3.59, 2);
    expect(r.message).toContain('2.5× escalated screening interval (capped)');
    expect(r.message).not.toContain('95% PI');
    const portChk = r.checks.find(c => c.id === 'portability');
    expect(portChk.detail).toContain('Red band');
    expect(portChk.detail).toContain('capped at 2.5×');
  });

  test('Deep UAE 10,865 ft (>125 °C) flags highTKnotFlag and downgrades to AMBER', () => {
    const r = predict({ P: 44.85, T: 407.21, drho: 0.3941, MCM: 1.90, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.highTKnotFlag).toBe(true);
    expect(r.status).toBe('AMBER');
  });

  test('Out-of-training temperature (>140 °C / 413.15 K) is never marked GREEN even below 35 MPa', () => {
    const r = predict({ P: 34.56, T: 431.55, drho: 0.5672, MCM: 0.60, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl' });
    expect(r.status).not.toBe('GREEN');
    expect(r.uif).toBe(2.5);
  });
});

describe('SEAL Agent, LaTeX Text Sanitizer, & Batch Predictor', () => {
  test('"what is the best values for sarawak foramtion" resolves Sarawak at P=22.50 MPa, T=112 °C and runs 25-point optimization', () => {
    const sleipnerHud = { P: 10.3, T: 310.15, MCM: 0.6, drho: 0.3916, presetName: 'Sleipner (Utsira Fm, North Sea)' };
    const out = runDeterministicWorkflow('what is the best values for sarawak foramtion', sleipnerHud);
    expect(out.needsClarification).toBe(false);
    expect(out.resolved.siteId).toBe('sarawak');
    expect(out.resolved.inputs.P).toBeCloseTo(22.50, 2);
    expect(out.resolved.inputs.T).toBeCloseTo(385.15, 2);
    expect(out.marsResult.p50).toBeCloseTo(30.12, 2);
    expect(out.optimization).not.toBeNull();
    expect(out.optimization.evaluatedCount).toBe(25);
    expect(out.optimization.greenCount).toBeGreaterThan(0);
    expect(out.prescription.plainReport).not.toContain('\\text{');
  });

  test('cleanScientificText, tokenizeRichScientific & toPdfSafeText format subscripts, multiline bold, and PDF labels cleanly', () => {
    const raw =
      '* **Executive\n\nVerdict:** Established at $31.02\\text{ MPa}$ and $138.3^\\circ\\text{C}$ ($411.45\\text{ K}$), ' +
      'yielding a $\\text{CO}_2$ density of $536\\text{ kg/m}^3$ and buoyancy ($\\Delta\\rho$) of $0.5232\\text{ g/cm}^3$ ' +
      'with $h = 0.0077 \\le 0.0233$, r_c = 25.0 nm, γ_P90 = 25.3 mN/m, and $\\text{UIF\\_interval} = 1.06$.';
    const cleaned = cleanScientificText(raw);
    expect(cleaned).not.toContain('$');
    expect(cleaned).not.toContain('\\text');
    expect(cleaned).toContain('0.5232 g/cm³');
    expect(cleaned).toContain('CO₂');
    expect(cleaned).toContain('Δρ');
    expect(cleaned).toContain('≤');

    const blocks = parseExecutiveBlocks(raw);
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('bullet');
    expect(blocks[0].segments[0]).toEqual({ bold: true, text: 'Executive Verdict:' });
    expect(blocks[0].plainText).not.toContain('**');

    const richTokens = tokenizeRichScientific(cleaned);
    expect(richTokens.some(t => t.type === 'sub' && t.value === 'c')).toBe(true);
    expect(richTokens.some(t => t.type === 'sub' && t.value === 'P90')).toBe(true);
    expect(richTokens.some(t => t.type === 'sub' && t.value === 'interval')).toBe(true);

    const pdfSafe = toPdfSafeText(raw);
    expect(pdfSafe).not.toContain('**');
    expect(pdfSafe).toContain('0.5232 g/cm³');
    expect(pdfSafe).toContain('CO2');
    expect(pdfSafe).toContain('Density Contrast');
    expect(pdfSafe).toContain('Cross-Lab UIF');
    expect(pdfSafe).toContain('<=');
  });

  test('Unrecognized formation in offline mode refuses to fake Sleipner and returns needsClarification=true', () => {
    const sleipnerHud = { P: 10.3, T: 310.15, MCM: 0.6, drho: 0.3916, presetName: 'Sleipner (Utsira Fm, North Sea)' };
    const out = runDeterministicWorkflow('what is the best values for Atlantis mythical formation', sleipnerHud);
    expect(out.needsClarification).toBe(true);
  });

  test('Sleipner 200 m decision query resolves Nordland Shale caprock, 11 horizons, zero MICP claims, and sanitizes LLM terminology', () => {
    const out = runDeterministicWorkflow('Can the Sleipner caprock safely hold a 200 m CO₂ column?');
    expect(out.resolved.siteId).toBe('sleipner');
    expect(out.resolved.rock.sealName).toBe('Nordland Shale caprock');
    expect(out.envelope.slices.length).toBe(11);
    expect(out.propagation.H_m.p50).toBeCloseTo(467.1, 0);
    expect(out.prescription.decision).toBe('GO');
    expect(out.prescription.nextAction).not.toContain('MICP');
    expect(out.trace[4].title).toBe('Capillary Seal Propagation (Young\u2013Laplace)');

    const badDraft =
      'The Utsira shale caprock can safely hold a 200 m column with IFT supporting a pore throat radius of 29.8 nm; DNV-RP-J203 audit reports GREEN within certified domain.';
    const sanitized = sanitizeExecutiveNarrative(badDraft, out);
    expect(sanitized).toContain('Nordland Shale caprock');
    expect(sanitized).not.toMatch(/Utsira shale/i);
    expect(sanitized).toContain('composite trust audit');
    expect(sanitized).not.toMatch(/DNV-RP-J203 audit/i);
    expect(sanitized).toContain('passes the static screening check for');
    expect(sanitized).not.toMatch(/can safely hold/i);
    expect(sanitized).toContain('assumed input pore-throat radius');
    expect(sanitized).not.toMatch(/certified/i);
  });

  test('Batch Predictor parses Site + T_C + blank drho (auto-PR-EOS) and evaluates accurately', () => {
    const csv = [
      'Site,P,T_C,MCM,BCM,x_CH4,x_N2,brineType,drho',
      'Sleipner,10.30,37.00,0.60,0,0,0,NaCl,0.3916',
      'In Salah,18.00,90.00,0.44,0,0,0,NaCl,',
      'Sarawak,22.50,112.00,0.60,0,0,0,NaCl,',
    ].join('\n');
    const rows = parseCSV(csv);
    expect(rows.length).toBe(3);
    expect(rows[0].eosEstimated).toBe(false);
    expect(rows[1].eosEstimated).toBe(true);
    expect(rows[1].drho).toBeCloseTo(0.5482, 3);

    const res = batchPredict(rows);
    expect(res[0].result.p50).toBeCloseTo(30.87, 2);
    expect(res[1].result.p50).toBeCloseTo(30.54, 2);
    expect(res[2].result.p50).toBeCloseTo(30.12, 2);
    expect(res[2].result.status).toBe('GREEN');
  });

  test('formatThroatRadius eliminates 0.000 µm rounding bug', () => {
    expect(formatThroatRadius(2.98e-8)).toBe('29.8 nm (0.0298 µm)');
    expect(formatThroatRadius(1.0e-6)).toBe('1.00 µm');
  });
});
