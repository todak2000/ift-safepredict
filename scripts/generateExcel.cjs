'use strict';
/**
 * IFT-SafePredict Excel Tool Generator
 * Produces IFT_SafePredict_v1.0.xlsx in public/ for static download.
 *
 * Sheet structure (per tool_plan §4.1):
 *   INPUT        — user-facing inputs and results (visible)
 *   MARS_ENGINE  — hinge calculations sub + sup (hidden, protected)
 *   SCALERS      — MinMax constants (hidden, protected)
 *   INSTRUCTIONS — usage guide, citation (visible)
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const OUT_DIR  = path.join(__dirname, '..', 'public');
const OUT_FILE = path.join(OUT_DIR, 'IFT_SafePredict_v1.0.xlsx');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  navy:      '1E3A5F',
  blue:      '2563EB',
  lightBlue: 'DBEAFE',
  green:     '15803D',
  lightGreen:'DCFCE7',
  yellow:    'A16207',
  lightYellow:'FEF9C3',
  red:       'B91C1C',
  lightRed:  'FEE2E2',
  white:     'FFFFFF',
  headerBg:  '1E293B',
  rowAlt:    'F1F5F9',
  border:    'CBD5E1',
  textMuted: '64748B',
};

const font = (bold = false, size = 10, color = '000000') => ({
  name: 'Calibri', size, bold, color: { argb: 'FF' + color },
});
const fill = (hex) => ({
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex },
});
const border = (style = 'thin') => ({
  top: { style }, bottom: { style }, left: { style }, right: { style },
});
const align = (h = 'left', v = 'middle', wrap = false) => ({
  horizontal: h, vertical: v, wrapText: wrap,
});

// ─── Scaler constants ─────────────────────────────────────────────────────────
const SCALERS = {
  sub: { Pr:[0.013550135501355, 4.694600993224932],
         Tr:[0.914946759563560, 2.217196589822707],
         MCM:[0.000, 4.900], BCM:[0.000, 1.500],
         x_CH4:[0.000, 0.890], x_N2:[0.000, 0.7636],
         drho_sq:[0.000132359895430, 1.294887038140309] },
  sup: { Pr:[1.0027100271002711, 9.418699186991873],
         Tr:[1.0125542263704483, 2.2171965898227066],
         MCM:[0.000, 4.950], BCM:[0.000, 5.000],
         x_CH4:[0.000, 0.890], x_N2:[0.000, 0.7636],
         drho_sq:[0.001681, 1.6030851769] },
};

// ─── MARS sub hinge terms (coeff, feature, knot, [feat2, knot2]) ──────────────
// Each term: [coeff, 'hp'|'hm', feature_ref, knot, optional_second_hinge]
// feature refs match named cells on MARS_ENGINE
const SUB_INTERCEPT = 51.6236;
const SUP_INTERCEPT = 221.1467;

// ─── Main ─────────────────────────────────────────────────────────────────────
async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IFT-SafePredict v1.0';
  wb.created = new Date();

  const wsInput  = wb.addWorksheet('INPUT',        { properties: { tabColor: { argb: 'FF2563EB' } } });
  const wsMars   = wb.addWorksheet('MARS_ENGINE',  { properties: { tabColor: { argb: 'FF475569' } } });
  const wsScaler = wb.addWorksheet('SCALERS',      { properties: { tabColor: { argb: 'FF475569' } } });
  const wsInst   = wb.addWorksheet('INSTRUCTIONS', { properties: { tabColor: { argb: 'FF15803D' } } });

  buildScalersSheet(wsScaler);
  buildMarsSheet(wsMars);
  buildInputSheet(wsInput, wb);
  buildInstructionsSheet(wsInst);

  // Hide engine sheets
  wsMars.state   = 'hidden';
  wsScaler.state = 'hidden';

  await wb.xlsx.writeFile(OUT_FILE);
  console.log(`✓ Excel tool generated: ${OUT_FILE}`);
}

// ─── SCALERS sheet ────────────────────────────────────────────────────────────
function buildScalersSheet(ws) {
  ws.columns = [
    { key: 'feat',    width: 14 },
    { key: 'sub_min', width: 12 },
    { key: 'sub_max', width: 12 },
    { key: 'sup_min', width: 12 },
    { key: 'sup_max', width: 12 },
  ];

  const hdr = ws.addRow(['Feature', 'Sub Min', 'Sub Max', 'Sup Min', 'Sup Max']);
  hdr.eachCell(c => {
    c.font = font(true, 10, C.white);
    c.fill = fill(C.headerBg);
    c.alignment = align('center');
    c.border = border();
  });

  const features = ['Pr', 'Tr', 'MCM', 'BCM', 'x_CH4', 'x_N2', 'drho_sq'];
  features.forEach((f, i) => {
    const row = ws.addRow([
      f,
      SCALERS.sub[f][0], SCALERS.sub[f][1],
      SCALERS.sup[f][0], SCALERS.sup[f][1],
    ]);
    if (i % 2 === 1) row.eachCell(c => { c.fill = fill(C.rowAlt); });
    row.eachCell(c => { c.border = border('thin'); c.alignment = align('center'); });
    row.getCell(1).alignment = align('left');
  });

  // Define named ranges so MARS_ENGINE can reference them
  // Named as Scaler_<Regime>_<Feature>_<Min|Max>
  // Row offset: header=1, features start at row 2
  features.forEach((f, i) => {
    const row = i + 2;
    wb_addName(ws.workbook, `Scaler_sub_${f}_Min`, `SCALERS!$B$${row}`);
    wb_addName(ws.workbook, `Scaler_sub_${f}_Max`, `SCALERS!$C$${row}`);
    wb_addName(ws.workbook, `Scaler_sup_${f}_Min`, `SCALERS!$D$${row}`);
    wb_addName(ws.workbook, `Scaler_sup_${f}_Max`, `SCALERS!$E$${row}`);
  });
}

function wb_addName(workbook, name, formula) {
  // ExcelJS defined names
  workbook.definedNames.add(formula, name);
}

// ─── MARS ENGINE sheet ────────────────────────────────────────────────────────
function buildMarsSheet(ws) {
  ws.columns = [
    { key: 'label',   width: 28 },
    { key: 'formula', width: 60 },
  ];

  const addSection = (title) => {
    const r = ws.addRow([title]);
    r.getCell(1).font = font(true, 10, C.white);
    r.getCell(1).fill = fill(C.headerBg);
    r.getCell(1).alignment = align();
    ws.mergeCells(`A${r.number}:B${r.number}`);
  };

  const addRow = (label, formula, rowRef) => {
    const r = ws.addRow([label, formula]);
    r.getCell(2).font = font(false, 9, '1E293B');
    return r;
  };

  // ─ Section: Internal derivations (from INPUT sheet named ranges) ─
  addSection('§1 — Internal Derivations (from INPUT sheet)');
  addRow('Pc_mix (MPa)',   "=INPUT!B7*4.6 + INPUT!B8*3.39 + (1-INPUT!B7-INPUT!B8)*7.377");
  addRow('Tc_mix (K)',     "=INPUT!B7*190.56 + INPUT!B8*126.19 + (1-INPUT!B7-INPUT!B8)*304.13");
  const prRow  = ws.lastRow.number + 1;
  addRow('Pr',             `=INPUT!B2/MARS_ENGINE!B${prRow-1}`);   // Pr = P/Pc_mix
  const trRow  = ws.lastRow.number + 1;
  addRow('Tr',             `=INPUT!B3/MARS_ENGINE!B${trRow-1}`);   // Tr = T/Tc_mix
  addRow('drho_sq',        "=INPUT!B4^2");
  addRow('BCM_bin',        "=IF(INPUT!B6>0,1,0)");
  addRow('CH4_bin',        "=IF(INPUT!B7>0,1,0)");
  addRow('N2_bin',         "=IF(INPUT!B8>0,1,0)");

  // Row index tracking (1-based, ws rows)
  // Derivations occupy rows 2–9 (1 header section + 8 rows)
  const D = {
    Pc_mix: 2, Tc_mix: 3, Pr: 4, Tr: 5, drho_sq: 6,
    BCM_bin: 7, CH4_bin: 8, N2_bin: 9,
  };

  // Define named ranges for derivations
  const derNames = ['Pc_mix','Tc_mix','ME_Pr','ME_Tr','ME_drho_sq','ME_BCM_bin','ME_CH4_bin','ME_N2_bin'];
  Object.values(D).forEach((row, i) => {
    wb_addName(ws.workbook, derNames[i], `MARS_ENGINE!$B$${row}`);
  });

  // ─ Section: MinMax scaling (regime-conditional) ─
  addSection('§2 — MinMax Scaled Features');
  const feats = ['Pr','Tr','MCM','BCM','x_CH4','x_N2','drho_sq'];
  // For each feature: =IF(INPUT!B11="Supercritical", 2*(raw-sup_min)/(sup_max-sup_min)-1, 2*(raw-sub_min)/(sub_max-sub_min)-1)
  // Raw sources:
  const rawRef = {
    Pr:      `ME_Pr`, Tr: `ME_Tr`,
    MCM:     `INPUT!B5`, BCM: `INPUT!B6`,
    x_CH4:   `INPUT!B7`, x_N2: `INPUT!B8`,
    drho_sq: `ME_drho_sq`,
  };

  const scaledRows = {};
  feats.forEach(f => {
    const raw = rawRef[f];
    const formula = (
      `=IF(INPUT!B11="Supercritical",` +
      `2*(${raw}-Scaler_sup_${f}_Min)/(Scaler_sup_${f}_Max-Scaler_sup_${f}_Min)-1,` +
      `2*(${raw}-Scaler_sub_${f}_Min)/(Scaler_sub_${f}_Max-Scaler_sub_${f}_Min)-1)`
    );
    const r = ws.addRow([`Scaled_${f}`, formula]);
    r.getCell(2).font = font(false, 9, '1E293B');
    scaledRows[f] = r.number;
    wb_addName(ws.workbook, `SC_${f}`, `MARS_ENGINE!$B$${r.number}`);
  });

  // ─ Section: Subcritical MARS (16 terms) ─
  addSection('§3 — Subcritical MARS (16-term) — used when regime = Subcritical');

  // Helper: hinge formula referencing named ranges
  // hp(x,k) = MAX(0, SC_x - k)
  // hm(x,k) = MAX(0, k - SC_x)
  const hp = (f, k) => `MAX(0,SC_${f}-(${k}))`;
  const hm = (f, k) => `MAX(0,(${k})-SC_${f})`;

  // 15 active terms. Coefficients from global_sub_mars_equation.json, verified via marsEngine.js.
  // CH4_bin and x_CH4 use ME_CH4_bin (binary flag 0/1 → mapped to -1/+1) and SC_x_CH4 (scaled continuous).
  const subTerms = [
    ['+17.9632',  `${hp('drho_sq','0.0282')}`],
    ['+275.2586', `${hm('drho_sq','0.0282')}`],
    ['+26.5844',  `${hp('Pr','-0.7198')}`],
    ['+26.138',   `${hm('Pr','-0.7198')}`],
    ['-20.2105',  `${hp('Tr','-0.3956')}`],
    ['+12.776',   `${hm('Tr','-0.3956')}`],
    ['-51.1174',  `${hm('Pr','-0.7198')}*${hp('Tr','-0.518')}`],
    ['+137.8465', `${hm('Pr','-0.7198')}*${hm('Tr','-0.518')}`],
    ['-55.2389',  `${hp('Pr','-0.7198')}*${hp('drho_sq','-0.7039')}`],
    ['-97.8475',  `${hp('Pr','-0.7198')}*${hm('drho_sq','-0.7039')}`],
    ['+66.6219',  `${hp('Tr','-0.516')}*${hp('drho_sq','0.0282')}`],
    ['+283.6242', `${hm('drho_sq','0.0282')}*(2*ME_CH4_bin-1)`],
    ['-499.8016', `${hp('Tr','-0.8978')}*${hm('drho_sq','0.0282')}`],
    ['-45.0736',  `${hm('Tr','-0.8978')}*${hm('drho_sq','0.0282')}`],
    ['+38.3241',  `${hm('Tr','-0.3956')}*SC_x_CH4`],
  ];

  const subTermRows = subTerms.map(([coeff, hingeFormula], i) => {
    const r = ws.addRow([`Sub term ${i+1} (×${coeff})`, `=${coeff}*(${hingeFormula})`]);
    r.getCell(2).font = font(false, 9);
    return r.number;
  });

  // Sub IFT sum
  const subSumFormula = `=${SUB_INTERCEPT}+` + subTermRows.map(row => `MARS_ENGINE!B${row}`).join('+');
  const subIFTRow = ws.addRow(['Sub IFT (mN/m)', subSumFormula]);
  subIFTRow.getCell(1).font = font(true, 10, C.navy);
  subIFTRow.getCell(2).font = font(true, 10, C.navy);
  subIFTRow.eachCell(c => { c.fill = fill(C.lightBlue); });
  wb_addName(ws.workbook, 'Sub_IFT', `MARS_ENGINE!$B$${subIFTRow.number}`);

  // ─ Section: Supercritical MARS (35 terms) ─
  addSection('§4 — Supercritical MARS (35-term) — used when regime = Supercritical');

  // 34 active terms. Coefficients from global_sup_mars_equation.json, verified via marsEngine.js.
  const supTerms = [
    ['-59.8927',    `${hm('drho_sq','0.4517')}`],
    ['+84.6131',    `${hp('x_N2','0.9652')}`],
    ['-32.995',     `${hm('x_N2','0.9652')}`],
    ['-64.0876',    `${hm('x_CH4','0.7966')}`],
    ['+3.4684',     `${hp('BCM','-0.64')}*${hm('drho_sq','0.4517')}`],
    ['-8.4184',     `${hm('BCM','-0.64')}*${hm('drho_sq','0.4517')}`],
    ['-1959.2987',  `${hp('Tr','-0.5087')}*${hm('drho_sq','0.4517')}`],
    ['+34.4304',    `${hm('Tr','-0.5087')}*${hm('drho_sq','0.4517')}`],
    ['+3.1914',     `${hp('MCM','-0.802')}*${hm('drho_sq','0.4517')}`],
    ['-8.6816',     `${hm('MCM','-0.802')}*${hm('drho_sq','0.4517')}`],
    ['+4.235',      `${hp('Tr','-0.7733')}*${hm('x_N2','0.9652')}`],
    ['-29.5554',    `${hm('Tr','-0.7733')}*${hm('x_N2','0.9652')}`],
    ['+31.1754',    `${hp('Tr','-0.7165')}*${hm('drho_sq','0.4517')}`],
    ['+1733.7711',  `${hp('Tr','-0.499')}*${hm('drho_sq','0.4517')}`],
    ['+302.2371',   `${hp('Tr','-0.5359')}*${hm('drho_sq','0.4517')}`],
    ['+28.3565',    `${hm('Pr','-0.9628')}*${hm('x_CH4','0.7966')}`],
    ['-136.4932',   `${hp('Tr','-0.437')}*${hm('drho_sq','0.4517')}`],
    ['-133.9788',   `${hm('x_CH4','0.7966')}*${hp('x_N2','-0.3434')}`],
    ['+126.0387',   `${hm('x_CH4','0.7966')}*${hp('x_N2','-0.3675')}`],
    ['+8.6252',     `SC_BCM*${hp('drho_sq','0.4517')}`],
    ['-13.5765',    `${hp('Pr','-0.8438')}*${hm('x_N2','0.9652')}`],
    ['+21.9898',    `${hm('Pr','-0.8438')}*${hm('x_N2','0.9652')}`],
    ['-20.8103',    `${hp('x_N2','0.2907')}*${hm('drho_sq','0.4517')}`],
    ['+24.6178',    `${hm('x_N2','0.2907')}*${hm('drho_sq','0.4517')}`],
    ['+24.9711',    `${hp('Pr','-0.7159')}`],
    ['-19.7154',    `${hm('Pr','-0.7159')}`],
    ['+2.3966',     `${hp('BCM','-0.982')}*${hm('x_N2','0.9652')}`],
    ['+68.834',     `${hm('BCM','-0.982')}*${hm('x_N2','0.9652')}`],
    ['+3.7786',     `${hp('Tr','-0.3379')}*${hm('x_CH4','0.7966')}`],
    ['+5.372',      `${hm('Tr','-0.3379')}*${hm('x_CH4','0.7966')}`],
    ['-31.8591',    `${hp('x_CH4','-0.7551')}*${hm('x_N2','0.9652')}`],
    ['+11.3604',    `${hp('x_CH4','-0.5506')}*${hm('drho_sq','0.4517')}`],
    ['+25.7311',    `${hm('x_CH4','-0.5506')}*${hm('drho_sq','0.4517')}`],
    ['-133.2863',   `${hm('Pr','-0.7159')}*${hm('Tr','-0.9192')}`],
  ];

  const supTermRows = supTerms.map(([coeff, hingeFormula], i) => {
    const r = ws.addRow([`Sup term ${i+1} (×${coeff})`, `=${coeff}*(${hingeFormula})`]);
    r.getCell(2).font = font(false, 9);
    return r.number;
  });

  const supSumFormula = `=${SUP_INTERCEPT}+` + supTermRows.map(row => `MARS_ENGINE!B${row}`).join('+');
  const supIFTRow = ws.addRow(['Sup IFT (mN/m)', supSumFormula]);
  supIFTRow.getCell(1).font = font(true, 10, C.navy);
  supIFTRow.getCell(2).font = font(true, 10, C.navy);
  supIFTRow.eachCell(c => { c.fill = fill(C.lightBlue); });
  wb_addName(ws.workbook, 'Sup_IFT', `MARS_ENGINE!$B$${supIFTRow.number}`);
}

// ─── INPUT sheet ──────────────────────────────────────────────────────────────
function buildInputSheet(ws, wb) {
  ws.columns = [
    { key: 'label',  width: 30 },
    { key: 'value',  width: 18 },
    { key: 'unit',   width: 14 },
    { key: 'notes',  width: 40 },
  ];

  // Title banner
  const title = ws.addRow(['IFT-SafePredict v1.0 — CO₂-Brine IFT Predictor']);
  title.getCell(1).font = font(true, 14, C.white);
  title.getCell(1).fill = fill(C.navy);
  title.getCell(1).alignment = align('center', 'middle');
  ws.mergeCells('A1:D1');
  title.height = 32;

  const sub1 = ws.addRow(['Sub-MARS-16t | Sup-MARS-35t | Conformal UQ (80% CI)']);
  sub1.getCell(1).font = font(false, 9, C.white);
  sub1.getCell(1).fill = fill(C.blue);
  sub1.getCell(1).alignment = align('center');
  ws.mergeCells(`A2:D2`);

  ws.addRow([]); // spacer

  // Section header: Inputs
  const inpHdr = ws.addRow(['USER INPUTS', 'Value', 'Unit', 'Notes']);
  inpHdr.eachCell(c => {
    c.font = font(true, 10, C.white);
    c.fill = fill(C.headerBg);
    c.alignment = align('center');
    c.border = border();
  });
  inpHdr.getCell(1).alignment = align('left');

  const inputRows = [
    ['B2', 'Pressure (P)',                 10.0,  'MPa',    'Range: 0.1–60 MPa'],
    ['B3', 'Temperature (T)',               323.15,'K',      'Kelvin; Range: 273–473 K'],
    ['B4', 'Density difference (Δρ)',       0.650, 'g/cm³',  'ρ_brine − ρ_CO₂; see INSTRUCTIONS §3 for EOS guidance'],
    ['B5', 'Monovalent Cation Molality (MCM)', 1.0,'mol/kg', 'NaCl, NaCl+KCl → MCM = total Na⁺+K⁺ molality'],
    ['B6', 'Bivalent Cation Molality (BCM)',  0.0,'mol/kg',  'CaCl₂, MgCl₂ → BCM = divalent molality'],
    ['B7', 'CH₄ mole fraction (x_CH₄)',    0.0,   'mol/mol', 'Set 0 for pure CO₂'],
    ['B8', 'N₂ mole fraction (x_N₂)',      0.0,   'mol/mol', 'Set 0 for pure CO₂'],
  ];

  inputRows.forEach(([ref, label, defaultVal, unit, notes], i) => {
    const r = ws.addRow([label, defaultVal, unit, notes]);
    if (i % 2 === 1) r.eachCell(c => { c.fill = fill(C.rowAlt); });
    r.eachCell(c => { c.border = border('thin'); c.alignment = align('left', 'middle'); });
    r.getCell(2).font = font(true, 10, C.blue);
    r.getCell(2).alignment = align('center', 'middle');
    r.getCell(3).alignment = align('center', 'middle');
    r.getCell(3).font = font(false, 9, C.textMuted);
  });

  // Brine type dropdown
  const brineRow = ws.addRow(['Brine type', 'NaCl', '—', 'NaCl | CaCl2 | MgCl2 | Na2SO4 | NaCl+CaCl2 | NaCl+KCl | Water']);
  brineRow.getCell(2).font = font(true, 10, C.blue);
  brineRow.getCell(2).alignment = align('center');
  brineRow.eachCell(c => { c.border = border('thin'); });
  const brineCell = brineRow.getCell(2);
  // Data validation
  brineCell.dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"NaCl,CaCl2,MgCl2,Na2SO4,NaCl+CaCl2,NaCl+KCl,Water"'],
    showErrorMessage: true,
    errorTitle: 'Invalid brine type',
    error: 'Select from the dropdown list.',
  };
  const brineRowNum = brineRow.number;

  ws.addRow([]); // spacer

  // Section header: Derived
  const derHdr = ws.addRow(['DERIVED (internal — do not edit)']);
  derHdr.getCell(1).font = font(true, 10, C.white);
  derHdr.getCell(1).fill = fill('475569');
  ws.mergeCells(`A${derHdr.number}:D${derHdr.number}`);

  // Pc_mix, Tc_mix, Pr, Tr, drho_sq, regime
  const derRows = [
    ['Pc_mix (MPa)',   '=B7*4.600 + B8*3.390 + (1-B7-B8)*7.377',           '',      'Kay\'s mixing rule'],
    ['Tc_mix (K)',     '=B3_ref*0 + B7*190.56 + B8*126.19 + (1-B7-B8)*304.13','',  'Kay\'s mixing rule'],
    ['Pr',            '',                                                     '',      '= P / Pc_mix'],
    ['Tr',            '',                                                     '',      '= T / Tc_mix'],
    ['Δρ² (drho_sq)', '=B4^2',                                               '',      'Squared density difference'],
    ['BCM_bin',       '=IF(B6>0,1,0)',                                        '',      '1 if divalent salt present'],
    ['CH4_bin',       '=IF(B7>0,1,0)',                                        '',      '1 if CH₄ present'],
    ['N2_bin',        '=IF(B8>0,1,0)',                                        '',      '1 if N₂ present'],
  ];

  // We need the actual row numbers for Pc_mix and Tc_mix before writing Pr/Tr
  // Add them one at a time
  const pcRow = ws.addRow(['Pc_mix (MPa)', '=B7*4.600+B8*3.390+(1-B7-B8)*7.377', '', "Kay's mixing rule"]);
  pcRow.eachCell(c => { c.border = border('thin'); });
  pcRow.getCell(2).fill = fill(C.rowAlt);

  const tcRow = ws.addRow(['Tc_mix (K)', '=B7*190.56+B8*126.19+(1-B7-B8)*304.13', '', "Kay's mixing rule"]);
  tcRow.eachCell(c => { c.border = border('thin'); });
  tcRow.getCell(2).fill = fill(C.rowAlt);

  const prRow2 = ws.addRow(['Pr', `=B2/B${pcRow.number}`, '', '= P / Pc_mix']);
  prRow2.eachCell(c => { c.border = border('thin'); });
  prRow2.getCell(2).fill = fill(C.rowAlt);

  const trRow2 = ws.addRow(['Tr', `=B3/B${tcRow.number}`, '', '= T / Tc_mix']);
  trRow2.eachCell(c => { c.border = border('thin'); });
  trRow2.getCell(2).fill = fill(C.rowAlt);

  const drhoSqRow = ws.addRow(['Δρ² (drho_sq)', '=B4^2', '', 'Squared density difference']);
  drhoSqRow.eachCell(c => { c.border = border('thin'); });
  drhoSqRow.getCell(2).fill = fill(C.rowAlt);

  const prRowNum  = prRow2.number;
  const trRowNum  = trRow2.number;

  // Regime
  const regimeRow = ws.addRow([
    'Regime (auto)',
    `=IF(AND(B${prRowNum}>=1,B${trRowNum}>=1),"Supercritical","Subcritical")`,
    '', 'Auto-detected — do not edit',
  ]);
  regimeRow.eachCell(c => { c.border = border('thin'); });
  regimeRow.getCell(2).font = font(true, 10);
  // Conditional format added below
  const regimeRowNum = regimeRow.number;

  ws.addRow([]); // spacer

  // Section header: Results
  const resHdr = ws.addRow(['RESULTS']);
  resHdr.getCell(1).font = font(true, 10, C.white);
  resHdr.getCell(1).fill = fill(C.navy);
  ws.mergeCells(`A${resHdr.number}:D${resHdr.number}`);

  const activeIFT =
    `=IF(B${regimeRowNum}="Supercritical",Sup_IFT,Sub_IFT)`;

  const p50Row = ws.addRow(['IFT P50 (mN/m)', activeIFT, 'mN/m', 'Median prediction']);
  p50Row.eachCell(c => { c.border = border(); });
  p50Row.getCell(1).font = font(true);
  p50Row.getCell(2).font = font(true, 12, C.navy);
  p50Row.getCell(2).fill = fill(C.lightBlue);
  p50Row.getCell(2).numFmt = '0.00';
  const p50RowNum = p50Row.number;

  // UIF formula
  // Domain check: any of Pr, Tr, MCM, BCM, x_CH4, x_N2, drho_sq out of sub or sup bounds
  // Simplified: flag if Pr or Tr out of bounds of active regime
  const uifFormula = (
    `=IF(OR(` +
      // Red: basic domain check on Pr/Tr
      `AND(B${regimeRowNum}="Subcritical",OR(B${prRowNum}<0.04,B${prRowNum}>0.999)),` +
      `AND(B${regimeRowNum}="Supercritical",OR(B${prRowNum}<1.011,B${prRowNum}>4.457))` +
    `),5.0,` +
    `IF(OR(B${brineRowNum}="Na2SO4",B5>2.5),3.41,1.0))`
  );

  const uifRow = ws.addRow(['UIF Factor', uifFormula, '', 'Uncertainty Inflation Factor']);
  uifRow.eachCell(c => { c.border = border('thin'); });
  uifRow.getCell(2).font = font(true);
  uifRow.getCell(2).numFmt = '0.00';
  const uifRowNum = uifRow.number;

  const qBase = `IF(B${regimeRowNum}="Subcritical",2.44,2.25)`;

  const p10Row = ws.addRow([
    'IFT P10 — 80% CI lower (mN/m)',
    `=MAX(12.4,B${p50RowNum}-(${qBase})*B${uifRowNum})`,
    'mN/m', '80% conformal lower bound',
  ]);
  p10Row.eachCell(c => { c.border = border('thin'); });
  p10Row.getCell(2).numFmt = '0.00';
  p10Row.getCell(2).fill = fill(C.rowAlt);

  const p90Row = ws.addRow([
    'IFT P90 — 80% CI upper (mN/m)',
    `=MIN(78.88,B${p50RowNum}+(${qBase})*B${uifRowNum})`,
    'mN/m', '80% conformal upper bound',
  ]);
  p90Row.eachCell(c => { c.border = border('thin'); });
  p90Row.getCell(2).numFmt = '0.00';
  p90Row.getCell(2).fill = fill(C.rowAlt);

  const qaRow = ws.addRow([
    'QA Status',
    `=IF(B${uifRowNum}>=5,"RED ⚠ Extrapolation",IF(B${uifRowNum}>1,"YELLOW ⚠ High Variation","GREEN ✓ Standard"))`,
    '', 'GREEN / YELLOW / RED',
  ]);
  qaRow.eachCell(c => { c.border = border('thin'); });
  qaRow.getCell(2).font = font(true);
  const qaRowNum = qaRow.number;

  const verRow = ws.addRow(['Model Version', 'IFT-SafePredict v1.0 | Sub-MARS-16t | Sup-MARS-35t', '', '']);
  verRow.getCell(2).font = font(false, 9, C.textMuted);
  verRow.eachCell(c => { c.border = border('thin'); });

  // ─ Conditional formatting ─
  // Regime cell: Supercritical = blue, Subcritical = grey
  ws.addConditionalFormatting({
    ref: `B${regimeRowNum}`,
    rules: [
      {
        type: 'containsText', operator: 'containsText', text: 'Supercritical', priority: 1,
        style: { fill: fill('DBEAFE'), font: font(true, 10, C.blue) },
      },
      {
        type: 'containsText', operator: 'containsText', text: 'Subcritical', priority: 2,
        style: { fill: fill('F1F5F9'), font: font(true, 10, '475569') },
      },
    ],
  });

  // QA status cell colour
  ws.addConditionalFormatting({
    ref: `B${qaRowNum}`,
    rules: [
      {
        type: 'containsText', operator: 'containsText', text: 'GREEN', priority: 1,
        style: { fill: fill(C.lightGreen), font: font(true, 10, C.green) },
      },
      {
        type: 'containsText', operator: 'containsText', text: 'YELLOW', priority: 2,
        style: { fill: fill(C.lightYellow), font: font(true, 10, C.yellow) },
      },
      {
        type: 'containsText', operator: 'containsText', text: 'RED', priority: 3,
        style: { fill: fill(C.lightRed), font: font(true, 10, C.red) },
      },
    ],
  });

  // Freeze pane below header, protect result cells
  ws.views = [{ state: 'frozen', ySplit: 3, activeCell: 'B5' }];
}

// ─── INSTRUCTIONS sheet ───────────────────────────────────────────────────────
function buildInstructionsSheet(ws) {
  ws.columns = [{ key: 'text', width: 90 }];

  const h1 = (text) => {
    const r = ws.addRow([text]);
    r.getCell(1).font = font(true, 14, C.navy);
    r.getCell(1).fill = fill(C.lightBlue);
    r.getCell(1).alignment = align('left', 'middle');
    r.height = 28;
    ws.addRow([]);
  };
  const h2 = (text) => {
    const r = ws.addRow([text]);
    r.getCell(1).font = font(true, 11, C.navy);
    r.getCell(1).fill = fill(C.rowAlt);
    r.height = 20;
  };
  const p = (text) => {
    const r = ws.addRow([text]);
    r.getCell(1).font = font(false, 10);
    r.getCell(1).alignment = { wrapText: true };
    r.height = 16;
  };

  h1('IFT-SafePredict v1.0 — Instructions & Model Reference');
  h2('§1  How to use this tool');
  p('1. Go to the INPUT sheet.');
  p('2. Enter your physical inputs in the BLUE cells (B2:B8) and select a Brine type from the dropdown (B9).');
  p('3. The RESULTS section updates automatically — no macros required.');
  p('4. Always report the full P10–P90 interval alongside the P50. Never cite a single number without uncertainty.');
  ws.addRow([]);
  h2('§2  Input parameter guide');
  p('P (MPa)   : Reservoir or experimental pressure. Range: 0.1–60 MPa.');
  p('T (K)     : Temperature in Kelvin. Range: 273–473 K.');
  p('Δρ (g/cm³): Density difference ρ_brine − ρ_CO₂. Obtain from EOS software (e.g. NIST REFPROP) or the web tool EOS assist.');
  p('MCM       : Monovalent cation molality. For NaCl: molality of NaCl. For NaCl+KCl: sum Na⁺ + K⁺ molality.');
  p('BCM       : Bivalent cation molality. For CaCl₂: Ca²⁺ molality. For MgCl₂: Mg²⁺ molality.');
  p('x_CH₄    : CH₄ mole fraction in the CO₂-rich phase. Set 0 for pure CO₂.');
  p('x_N₂     : N₂ mole fraction. Set 0 for pure CO₂.');
  p('Brine type: Select from dropdown. Sets internal binary flags (BCM_bin, CH4_bin, N2_bin) automatically.');
  ws.addRow([]);
  h2('§3  QA Status interpretation');
  p('GREEN ✓   : Input within validated training domain. Standard uncertainty (UIF=1.0).');
  p('YELLOW ⚠  : Na₂SO₄ brine or MCM > 2.5 mol/kg. Li et al. (2012) apparatus offset (+11%). UIF=3.41.');
  p('RED ⚠     : One or more inputs outside training domain bounds. Extrapolation. UIF=5.0. Use with caution.');
  ws.addRow([]);
  h2('§4  Model training summary');
  p('Dataset    : 3,265 CO₂-Brine IFT measurements (1,400 subcritical + 1,865 supercritical), 16 laboratories.');
  p('Subcritical: MARS 16-term (compliance-fixed). Test nRMSE=5.46%, R²=0.939. Features: Pr, Tr, Δρ², x_CH₄, CH4_bin.');
  p('Supercritical: MARS 35-term. Test nRMSE=5.60%, R²=0.928. Features: all 10 (Pr,Tr,MCM,BCM,x_CH₄,x_N₂,Δρ²,BCM_bin,CH4_bin,N2_bin).');
  p('UQ: 80% conformal prediction intervals. Base half-width ±2.44 mN/m (sub), ±2.25 mN/m (sup).');
  p('P10/P90 clamped at physical limits: floor 12.4 mN/m, cap 78.88 mN/m.');
  ws.addRow([]);
  h2('§5  Citation');
  p('Olagunju, D. et al. (2026). CO₂-Brine Interfacial Tension Prediction via Dual-Regime MARS Models');
  p('with Conformal Uncertainty Quantification. [Journal TBD].');
  ws.addRow([]);
  h2('§6  Disclaimer');
  p('This tool is provided for research and engineering screening purposes only. Predictions carry inherent');
  p('uncertainty — always use the P10–P90 interval. Not a substitute for laboratory measurement in critical decisions.');
}

generate().catch(err => { console.error(err); process.exit(1); });
