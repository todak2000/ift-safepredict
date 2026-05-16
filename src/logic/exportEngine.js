/**
 * Export engine — generates PDF and CSV reports.
 * Every export includes model version, UIF factor, and regime metadata.
 * Uses jsPDF (browser-native, no server call).
 */

const MODEL_VERSION = 'IFT-SafePredict v1.0 | Sub-MARS-16t | Sup-MARS-35t';
const CITATION =
  'Olagunju, D. et al. (2026). CO₂-Brine Interfacial Tension Prediction via ' +
  'Dual-Regime MARS Models with Conformal Uncertainty Quantification.';

/**
 * Format a prediction result object into a plain-text summary.
 */
const formatSummary = (inputs, result, regime) => {
  const { p10, p50, p90, status, uif, message } = result;
  return [
    `Model Version : ${MODEL_VERSION}`,
    `Generated     : ${new Date().toISOString()}`,
    `Regime        : ${regime === 'sup' ? 'Supercritical' : 'Subcritical'}`,
    ``,
    `--- Inputs ---`,
    `Pressure (P)           : ${inputs.P} MPa`,
    `Temperature (T)        : ${inputs.T} K`,
    `Density diff (Δρ)      : ${inputs.drho} g/cm³${inputs.eosEstimated ? ' [EOS-estimated]' : ''}`,
    `MCM                    : ${inputs.MCM} mol/kg`,
    `BCM                    : ${inputs.BCM} mol/kg`,
    `x_CH₄                  : ${inputs.x_CH4}`,
    `x_N₂                   : ${inputs.x_N2}`,
    `Brine type             : ${inputs.brineType}`,
    ``,
    `--- Derived (internal) ---`,
    `Pr                     : ${inputs.Pr?.toFixed(4)}`,
    `Tr                     : ${inputs.Tr?.toFixed(4)}`,
    `drho_sq                : ${inputs.drho_sq?.toFixed(6)}`,
    ``,
    `--- Results ---`,
    `IFT P50 (mN/m)         : ${p50.toFixed(2)}`,
    `IFT P10 (mN/m)         : ${p10.toFixed(2)}`,
    `IFT P90 (mN/m)         : ${p90.toFixed(2)}`,
    `QA Status              : ${status}`,
    `UIF Factor             : ${uif}`,
    `QA Message             : ${message}`,
    ``,
    `--- Citation ---`,
    CITATION,
  ].join('\n');
};

/**
 * Export a single prediction as CSV (triggers browser download).
 * @param {object} inputs — physical inputs + derived quantities
 * @param {object} result — { p10, p50, p90, status, uif, message }
 * @param {'sub'|'sup'} regime
 */
export const exportCSV = (inputs, result, regime) => {
  const { p10, p50, p90, status, uif, message } = result;
  const rows = [
    ['Field', 'Value', 'Unit'],
    ['Model Version', MODEL_VERSION, ''],
    ['Generated', new Date().toISOString(), ''],
    ['Regime', regime === 'sup' ? 'Supercritical' : 'Subcritical', ''],
    ['Pressure', inputs.P, 'MPa'],
    ['Temperature', inputs.T, 'K'],
    ['Density difference (Δρ)', inputs.drho, `g/cm³${inputs.eosEstimated ? ' [EOS-estimated]' : ''}`],
    ['MCM', inputs.MCM, 'mol/kg'],
    ['BCM', inputs.BCM, 'mol/kg'],
    ['x_CH4', inputs.x_CH4, 'mol/mol'],
    ['x_N2', inputs.x_N2, 'mol/mol'],
    ['Brine type', inputs.brineType, ''],
    ['Pr (derived)', inputs.Pr?.toFixed(4), ''],
    ['Tr (derived)', inputs.Tr?.toFixed(4), ''],
    ['drho_sq (derived)', inputs.drho_sq?.toFixed(6), ''],
    ['IFT P50', p50.toFixed(2), 'mN/m'],
    ['IFT P10', p10.toFixed(2), 'mN/m'],
    ['IFT P90', p90.toFixed(2), 'mN/m'],
    ['QA Status', status, ''],
    ['UIF Factor', uif, ''],
    ['QA Message', message, ''],
    ['Citation', CITATION, ''],
  ];

  const csvContent = rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `IFT_SafePredict_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Export a single prediction as PDF (triggers browser download).
 * Uses jsPDF loaded dynamically to avoid SSR issues.
 * @param {object} inputs
 * @param {object} result
 * @param {'sub'|'sup'} regime
 */
export const exportPDF = async (inputs, result, regime) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('IFT-SafePredict — Prediction Report', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${MODEL_VERSION}`, 14, 25);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

  // Regime badge
  const regimeLabel = regime === 'sup' ? 'SUPERCRITICAL' : 'SUBCRITICAL';
  doc.setFillColor(regime === 'sup' ? 59 : 100, regime === 'sup' ? 130 : 100, 246);
  doc.roundedRect(14, 33, 42, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(regimeLabel, 18, 38);
  doc.setTextColor(0, 0, 0);

  // QA status badge
  const statusColors = { GREEN: [34, 197, 94], YELLOW: [234, 179, 8], RED: [239, 68, 68] };
  const [r, g, b] = statusColors[result.status] || [150, 150, 150];
  doc.setFillColor(r, g, b);
  doc.roundedRect(60, 33, 30, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(result.status, 64, 38);
  doc.setTextColor(0, 0, 0);

  // Results table
  autoTable(doc, {
    startY: 45,
    head: [['Result', 'Value', 'Unit']],
    body: [
      ['IFT P50', result.p50.toFixed(2), 'mN/m'],
      ['IFT P10 (80% CI lower)', result.p10.toFixed(2), 'mN/m'],
      ['IFT P90 (80% CI upper)', result.p90.toFixed(2), 'mN/m'],
      ['UIF Factor', String(result.uif), ''],
      ['QA Message', result.message, ''],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  // Inputs table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Input', 'Value', 'Unit']],
    body: [
      ['Pressure (P)', inputs.P, 'MPa'],
      ['Temperature (T)', inputs.T, 'K'],
      [`Density diff (Δρ)${inputs.eosEstimated ? ' [EOS]' : ''}`, inputs.drho, 'g/cm³'],
      ['MCM', inputs.MCM, 'mol/kg'],
      ['BCM', inputs.BCM, 'mol/kg'],
      ['x_CH₄', inputs.x_CH4, 'mol/mol'],
      ['x_N₂', inputs.x_N2, 'mol/mol'],
      ['Brine type', inputs.brineType, ''],
      ['Pr (derived)', inputs.Pr?.toFixed(4), ''],
      ['Tr (derived)', inputs.Tr?.toFixed(4), ''],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [71, 85, 105] },
  });

  // Citation
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Citation:', 14, finalY);
  doc.text(CITATION, 14, finalY + 5, { maxWidth: 182 });

  doc.save(`IFT_SafePredict_${Date.now()}.pdf`);
};

/**
 * Export multiple scenario comparison results as CSV.
 * @param {Array<{inputs, result, regime}>} scenarios
 */
export const exportScenariosCSV = (scenarios) => {
  const header = [
    'Scenario', 'Regime', 'P (MPa)', 'T (K)', 'Δρ (g/cm³)', 'MCM', 'BCM',
    'x_CH4', 'x_N2', 'Brine', 'IFT P50', 'IFT P10', 'IFT P90', 'QA Status', 'UIF',
  ];

  const rows = scenarios.map((s, i) => [
    `Scenario ${i + 1}`,
    s.regime === 'sup' ? 'Supercritical' : 'Subcritical',
    s.inputs.P, s.inputs.T, s.inputs.drho,
    s.inputs.MCM, s.inputs.BCM, s.inputs.x_CH4, s.inputs.x_N2, s.inputs.brineType,
    s.result.p50.toFixed(2), s.result.p10.toFixed(2), s.result.p90.toFixed(2),
    s.result.status, s.result.uif,
  ]);

  const csv = [header, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `IFT_SafePredict_scenarios_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export { MODEL_VERSION };
