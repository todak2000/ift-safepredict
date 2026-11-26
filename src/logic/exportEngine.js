/**
 * Executive Export Engine — Publication-Grade Branded PDF Briefs & CSV Reports.
 * Zero overlapping text, dynamic multi-line card sizing, crisp vector logo crest,
 * clean human-readable engineering labels (zero raw JS function names or underscore clutter).
 */

import { toPdfSafeText, parseExecutiveBlocks } from './formatText.js';

const MODEL_VERSION = 'IFT-SafePredict v2.0 | Sub-MARS-16t | Sup-MARS-35t | PR-EOS | SEAL Assurance';
const CITATION =
  'Olagunju, D., Agwu, O. E., & Md Yusof, M. A. (2026). Closed-Form MARS Equations with Calibrated Conformal ' +
  'Uncertainty and Cross-Laboratory Portability Diagnostics for CO2-Brine Interfacial Tension in Geological Carbon Storage. ' +
  'Universiti Teknologi PETRONAS.';

const STATUS_RGB = {
  GREEN: [5, 150, 105],
  AMBER: [217, 119, 6],
  RED: [225, 29, 72],
};

// Reserve 26mm at the bottom of every page so tables NEVER collide with the 2-row executive footer
const TABLE_MARGIN = { top: 18, right: 14, bottom: 26, left: 14 };

/**
 * Draw crisp executive dark-navy masthead with high-contrast vector logo crest.
 */
function drawExecutiveMasthead(doc, { subtitle, badgeText, badgeTier = 'GREEN', reportCode }) {
  const pageW = doc.internal.pageSize.getWidth();

  // Deep obsidian-navy banner
  doc.setFillColor(11, 21, 40);
  doc.rect(0, 0, pageW, 33, 'F');

  // Cyan bottom accent line
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 32.2, pageW, 0.9, 'F');

  // Vector Brand Crest at (14, 7) — 18x18mm rounded badge
  doc.setFillColor(14, 116, 144);
  doc.roundedRect(14, 7, 18, 18, 3.2, 3.2, 'F');
  doc.setDrawColor(125, 211, 252);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 7, 18, 18, 3.2, 3.2, 'S');

  // Crisp white caprock horizon bars + bright white "IFT" monogram
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.8);
  doc.line(17.2, 11.2, 28.8, 11.2);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.45);
  doc.line(18.8, 13.2, 27.2, 13.2);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('IFT', 23, 21.2, { align: 'center' });

  // Main Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text('IFT SafePredict', 36, 13.8);

  // SEAL Emerald Badge
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(78, 9.6, 15, 5.2, 1.4, 1.4, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 24, 38);
  doc.text('SEAL', 85.5, 13.2, { align: 'center' });

  // Subtitle & Institutional Affiliation
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(186, 230, 253);
  doc.text(toPdfSafeText(subtitle), 36, 19.8);

  doc.setFontSize(7.6);
  doc.setTextColor(148, 163, 184);
  doc.text('Universiti Teknologi PETRONAS  |  DNV-RP-J203 Subsurface Containment Assurance', 36, 25.0);

  // Right-side Verdict Stamp & Reference Metadata
  if (badgeText) {
    const cleanBadge = toPdfSafeText(badgeText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    const pillW = Math.max(30, doc.getTextWidth(cleanBadge) + 9);
    const [r, g, b] = STATUS_RGB[badgeTier] || [71, 85, 105];
    doc.setFillColor(r, g, b);
    doc.roundedRect(pageW - 14 - pillW, 7.8, pillW, 7.2, 1.8, 1.8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(cleanBadge, pageW - 14 - pillW / 2, 12.5, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(148, 163, 184);
  doc.text(`Ref: ${reportCode}`, pageW - 14, 19.8, { align: 'right' });
  doc.text(new Date().toLocaleString(), pageW - 14, 24.6, { align: 'right' });

  doc.setTextColor(15, 23, 42);
}

/**
 * Draw strictly separated 2-row page footer so citation and page numbers NEVER overlap.
 */
function addExecutiveFooters(doc, docLabel) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Divider rule at pageH - 20mm
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 20, pageW - 14, pageH - 20);

    // Row 1 (pageH - 16 to pageH - 11): Full-width academic citation
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.9);
    doc.setTextColor(100, 116, 139);
    const citLines = doc.splitTextToSize(toPdfSafeText(CITATION), pageW - 28);
    doc.text(citLines, 14, pageH - 16);

    // Row 2 (pageH - 6.5): Left document label, Right page counter (zero overlap!)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(71, 85, 105);
    doc.text(toPdfSafeText(docLabel), 14, pageH - 6.5);
    doc.text(`Page ${p} of ${totalPages}`, pageW - 14, pageH - 6.5, { align: 'right' });
  }
}

/**
 * Export a single HUD prediction as CSV.
 */
export const exportCSV = (inputs, result, regime) => {
  const { p10, p50, p90, status, uif, message } = result;
  const rows = [
    ['Field', 'Value', 'Unit'],
    ['Model Version', MODEL_VERSION, ''],
    ['Generated', new Date().toISOString(), ''],
    ['Regime', regime === 'sup' ? 'Supercritical' : 'Subcritical', ''],
    ['Pressure (P)', inputs.P, 'MPa'],
    ['Temperature (T)', inputs.T, 'K'],
    ['Phase Density Contrast', inputs.drho, `g/cm3${inputs.eosEstimated ? ' [PR-EOS]' : ''}`],
    ['Monovalent Cations (MCM)', inputs.MCM, 'mol/kg'],
    ['Bivalent Cations (BCM)', inputs.BCM, 'mol/kg'],
    ['Methane Mole Fraction', inputs.x_CH4, 'mol/mol'],
    ['Nitrogen Mole Fraction', inputs.x_N2, 'mol/mol'],
    ['Brine Chemistry', inputs.brineType, ''],
    ['Reduced Pressure (Pr)', inputs.Pr?.toFixed(4), ''],
    ['Reduced Temperature (Tr)', inputs.Tr?.toFixed(4), ''],
    ['IFT P90 (Conservative)', p90.toFixed(2), 'mN/m'],
    ['IFT P50 (Expected)', p50.toFixed(2), 'mN/m'],
    ['IFT P10 (Optimistic)', p10.toFixed(2), 'mN/m'],
    ['Composite Verdict', status, ''],
    ['Applied Interval Multiplier', uif, ''],
    ['Assurance Summary', toPdfSafeText(message), ''],
    ['Citation', CITATION, ''],
  ];

  const csvContent = rows
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
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
 * Export a single HUD prediction as a clean, well-proportioned Executive PDF Report.
 */
export const exportPDF = async (inputs, result, regime) => {
  const { jsPDF } = await import('jspdf');
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const code = `HUD-${Date.now().toString().slice(-6)}`;

  drawExecutiveMasthead(doc, {
    subtitle: 'Single-State Interfacial Tension & Composite Conformal Assurance Report',
    badgeText: `VERDICT: ${result.status}`,
    badgeTier: result.status,
    reportCode: code,
  });

  // 3 KPI Summary Cards across top (P90, P50, P10)
  const yKpi = 40;
  const gap = 4;
  const tileW = (pageW - 28 - gap * 2) / 3;
  const kpis = [
    { label: 'P90 CONSERVATIVE (LOW IFT)', val: `${result.p90.toFixed(2)} mN/m`, sub: 'Lower 80% Conformal Bound', rgb: [100, 116, 139] },
    { label: 'P50 EXPECTED IFT', val: `${result.p50.toFixed(2)} mN/m`, sub: regime === 'sup' ? 'Supercritical (Sup-MARS-35t)' : 'Subcritical (Sub-MARS-16t)', rgb: [14, 116, 144] },
    { label: 'P10 OPTIMISTIC (HIGH IFT)', val: `${result.p10.toFixed(2)} mN/m`, sub: 'Upper 80% Conformal Bound', rgb: [5, 150, 105] },
  ];

  kpis.forEach((k, idx) => {
    const tx = 14 + idx * (tileW + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(tx, yKpi, tileW, 20, 2, 2, 'FD');
    doc.setFillColor(...k.rgb);
    doc.rect(tx, yKpi, tileW, 1.4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, tx + 3.5, yKpi + 6);

    doc.setFontSize(12);
    doc.setTextColor(...k.rgb);
    doc.text(k.val, tx + 3.5, yKpi + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(71, 85, 105);
    doc.text(k.sub, tx + 3.5, yKpi + 17.8);
  });

  // Table 1: Well-proportioned Assurance Audit Table (explicit column widths prevent narrow wrapping!)
  autoTable(doc, {
    startY: yKpi + 26,
    margin: TABLE_MARGIN,
    head: [['Containment Assurance Metric', 'Certified Result', 'Reference Basis']],
    body: [
      ['Composite Trust Verdict', result.status, `Multiplier = ${Number(result.uif).toFixed(2)}x`],
      ['Thermodynamic Regime', regime === 'sup' ? 'Supercritical (Sup-MARS-35t)' : 'Subcritical (Sub-MARS-16t)', 'Kay\'s Mixing Rule'],
      ['Applicability Domain Leverage', `h = ${result.h?.toFixed(4)} (Threshold h* = ${result.hStar?.toFixed(4)})`, `AD Status: ${result.adStatus || result.status}`],
      ['5-Gate Assurance Finding', toPdfSafeText(result.message), 'Conformal Audit'],
    ],
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold' },
      1: { cellWidth: 92 },
      2: { cellWidth: 38 },
    },
    styles: { fontSize: 9.0, cellPadding: 3.0, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Table 2: Reservoir Input Conditions
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 7,
    margin: TABLE_MARGIN,
    head: [['Reservoir Operating Parameter', 'Input Value', 'Engineering Unit']],
    body: [
      ['Geological Formation / Preset', toPdfSafeText(inputs.presetName || 'Custom Reservoir State'), '-'],
      ['Reservoir Pressure (P)', Number(inputs.P).toFixed(2), 'MPa'],
      ['Reservoir Temperature (T)', `${(Number(inputs.T) - 273.15).toFixed(2)} °C (${Number(inputs.T).toFixed(2)} K)`, '°C (K)'],
      [`Phase Density Contrast${inputs.eosEstimated ? ' (PR-EOS Coupled)' : ''}`, Number(inputs.drho).toFixed(4), 'g/cm³'],
      ['Brine Electrolyte System', toPdfSafeText(inputs.brineType || 'NaCl'), '-'],
      ['Monovalent Cations (Na+ + K+)', String(inputs.MCM), 'mol/kg'],
      ['Bivalent Cations (Ca2+ + Mg2+)', String(inputs.BCM), 'mol/kg'],
      ['Gas Impurities (CH4 / N2)', `${inputs.x_CH4} / ${inputs.x_N2}`, 'mol/mol'],
      ['Reduced Coordinates (Pr / Tr)', `${inputs.Pr?.toFixed(3)} / ${inputs.Tr?.toFixed(3)}`, 'dimensionless'],
    ],
    columnStyles: {
      0: { cellWidth: 74, fontStyle: 'bold' },
      1: { cellWidth: 72 },
      2: { cellWidth: 36 },
    },
    styles: { fontSize: 9.0, cellPadding: 2.8 },
    headStyles: { fillColor: [14, 116, 144], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addExecutiveFooters(doc, 'IFT-SafePredict Technical Assurance Report');
  doc.save(`IFT_SafePredict_Report_${code}.pdf`);
};

/**
 * Export a full SEAL Containment Assurance Executive Brief as a clean, boardroom-ready PDF.
 */
export const exportAssuranceBriefPDF = async (report) => {
  if (!report || report.needsClarification) return;

  const { jsPDF } = await import('jspdf');
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const innerW = pageW - 28;
  const code = `SEAL-${(report.resolved.siteId || 'CCS').toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-5)}`;

  drawExecutiveMasthead(doc, {
    subtitle: 'SEAL Executive Containment Assurance & Operating-Window Brief',
    badgeText: report.prescription.decision,
    badgeTier: report.prescription.badgeColor,
    reportCode: code,
  });

  let y = 39;

  // 1. Dynamically sized Formation & Query Callout Box (NEVER overlaps even on long basis strings!)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4);
  const basisLines = doc.splitTextToSize(
    toPdfSafeText(`${report.resolved.basisNote}  |  ${report.engineUsed}`),
    innerW - 8
  );
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.6);
  const queryLines = doc.splitTextToSize(
    toPdfSafeText(`Executive Query: "${report.question}"`),
    innerW - 8
  );

  const boxH = 11 + basisLines.length * 3.9 + queryLines.length * 4.0 + 3.5;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, y, innerW, boxH, 2.2, 2.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  doc.setTextColor(15, 23, 42);
  doc.text(toPdfSafeText(report.resolved.siteName), 18, y + 6.5);

  const yBasis = y + 11.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4);
  doc.setTextColor(71, 85, 105);
  doc.text(basisLines, 18, yBasis);

  const yQuery = yBasis + basisLines.length * 3.9 + 1.2;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.6);
  doc.setTextColor(14, 116, 144);
  doc.text(queryLines, 18, yQuery);

  y += boxH + 5;

  // 2. Four Executive KPI Tiles
  const gap = 3.5;
  const tileW = (innerW - gap * 3) / 4;
  const tileH = 21;
  const [vr, vg, vb] = STATUS_RGB[report.prescription.badgeColor] || [14, 116, 144];

  const kpis = [
    {
      label: 'ASSURANCE VERDICT',
      val: report.prescription.decision,
      sub: `Composite Trust: ${report.audit.compositeVerdict}`,
      rgb: [vr, vg, vb],
    },
    {
      label: 'CLEARANCE ODDS',
      val: `${report.propagation.clearancePct.toFixed(1)}%`,
      sub: `Clears >= ${report.propagation.targetColumnM} m column`,
      rgb: [vr, vg, vb],
    },
    {
      label: 'MARS IFT (P50)',
      val: `${report.marsResult.p50.toFixed(2)} mN/m`,
      sub: `[${report.marsResult.p90.toFixed(2)}, ${report.marsResult.p10.toFixed(2)}] mN/m`,
      rgb: [14, 116, 144],
    },
    {
      label: 'SEAL COLUMN (P50)',
      val: `${report.propagation.H_m.p50.toFixed(1)} m`,
      sub: `P90 = ${report.propagation.H_m.p90.toFixed(1)} m (${toPdfSafeText(report.propagation.rcLabel)})`,
      rgb: [15, 23, 42],
    },
  ];

  kpis.forEach((k, idx) => {
    const tx = 14 + idx * (tileW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(tx, y, tileW, tileH, 2, 2, 'FD');
    doc.setFillColor(...k.rgb);
    doc.rect(tx, y, tileW, 1.4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, tx + 3, y + 5.6);

    doc.setFontSize(10.2);
    doc.setTextColor(...k.rgb);
    doc.text(toPdfSafeText(k.val), tx + 3, y + 12.4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.9);
    doc.setTextColor(71, 85, 105);
    doc.text(toPdfSafeText(k.sub), tx + 3, y + 17.6, { maxWidth: tileW - 6 });
  });

  y += tileH + 5.5;

  // 3. Optimal Operating Window Table (if optimization ran)
  if (report.optimization) {
    const opt = report.optimization;
    const b = opt.bestBalanced;
    const m = opt.maxSealPoint;
    autoTable(doc, {
      startY: y,
      margin: TABLE_MARGIN,
      head: [['Operating Window Analysis (25-State Grid)', 'Pressure', 'Temperature', 'Fluid Densities', 'MARS IFT & P90 Seal']],
      body: [
        [
          `Certified GREEN Corridor (${opt.greenCount}/${opt.evaluatedCount} states)`,
          `${opt.safeWindowP_MPa[0].toFixed(1)} - ${opt.safeWindowP_MPa[1].toFixed(1)} MPa`,
          `${opt.safeWindowT_C[0].toFixed(1)} - ${opt.safeWindowT_C[1].toFixed(1)} °C`,
          'PR-EOS Coupled',
          'Verified In-Domain',
        ],
        [
          'Optimal Storage-Efficiency State (P*, T*)',
          `${b.P.toFixed(2)} MPa`,
          `${b.T_C.toFixed(1)} °C`,
          `${b.drho.toFixed(4)} g/cm³ (${b.rho_co2} kg/m³)`,
          `${b.p50.toFixed(2)} mN/m | H90 = ${b.H90.toFixed(1)} m`,
        ],
        [
          'Maximum Capillary Seal State',
          `${m.P.toFixed(2)} MPa`,
          `${m.T_C.toFixed(1)} °C`,
          `${m.drho.toFixed(4)} g/cm³ (${m.rho_co2} kg/m³)`,
          `${m.p50.toFixed(2)} mN/m | H90 = ${m.H90.toFixed(1)} m`,
        ],
      ],
      columnStyles: {
        0: { cellWidth: 58, fontStyle: 'bold' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 36 },
        4: { cellWidth: 38 },
      },
      styles: { fontSize: 8.3, cellPadding: 2.4 },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
    });
    y = doc.lastAutoTable.finalY + 5.5;
  }

  // 4. Risk Diagnosis & Engineering Prescription Table
  autoTable(doc, {
    startY: y,
    margin: TABLE_MARGIN,
    head: [['Containment Assessment', 'Engineering Finding & Regulatory Prescription']],
    body: [
      [
        'Thermobaric & Brine State',
        toPdfSafeText(
          `P = ${report.resolved.inputs.P.toFixed(2)} MPa, T = ${(report.resolved.inputs.T - 273.15).toFixed(2)} °C (${report.resolved.inputs.T.toFixed(2)} K), ` +
          `${report.resolved.inputs.brineType} (MCM = ${report.resolved.inputs.MCM}, BCM = ${report.resolved.inputs.BCM} mol/kg), Density Contrast = ${report.resolved.inputs.drho.toFixed(4)} g/cm³`
        ),
      ],
      [
        '5-Gate Composite Trust',
        toPdfSafeText(
          `${report.audit.compositeVerdict} | Model: ${report.prescription.eqCited} | Leverage h = ${report.audit.leverageH} (h* = ${report.audit.leverageThreshold}) | Cross-Lab UIF = ${report.audit.uifPortability.toFixed(2)}`
        ),
      ],
      ['Primary Risk Diagnosis', toPdfSafeText(report.prescription.primaryRisk)],
      ['Recommended Next Action', toPdfSafeText(report.prescription.nextAction)],
    ],
    columnStyles: { 0: { cellWidth: 46, fontStyle: 'bold' }, 1: { cellWidth: 136 } },
    styles: { fontSize: 8.5, cellPadding: 2.6 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = doc.lastAutoTable.finalY + 5.5;

  // 5. SEAL Executive Narrative (cleanly stripped of any ** across newlines!)
  if (report.llmNarrative) {
    const blocks = parseExecutiveBlocks(report.llmNarrative);
    const narrativeRows = blocks.map(b => [
      toPdfSafeText((b.type === 'bullet' ? '•  ' : '') + b.plainText).replace(/^\?\s*/, '- '),
    ]);
    // Use WinAnsi bullet char \x95 or clean dash
    const cleanRows = blocks.map(b => [toPdfSafeText((b.type === 'bullet' ? '- ' : '') + b.plainText)]);

    if (y > pageH - 60) {
      doc.addPage();
      y = 18;
    }

    autoTable(doc, {
      startY: y,
      margin: TABLE_MARGIN,
      head: [['SEAL Executive Engineering Synthesis (Grounded on Verified Physics Outputs)']],
      body: cleanRows.length > 0 ? cleanRows : narrativeRows,
      styles: { fontSize: 8.5, cellPadding: 2.6, textColor: [15, 23, 42] },
      headStyles: { fillColor: [14, 116, 144], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 249, 255] },
    });
    y = doc.lastAutoTable.finalY + 5.5;
  }

  if (y > pageH - 65) {
    doc.addPage();
    y = 18;
  }

  // 6. Verification Workflow Summary (NO raw JS function names like propagateCapillaryAssurance!)
  autoTable(doc, {
    startY: y,
    margin: TABLE_MARGIN,
    head: [['Stage', 'Verification Stage', 'Key Finding', 'Status']],
    body: report.trace.map(t => [
      String(t.step),
      toPdfSafeText(t.title),
      toPdfSafeText(t.detail),
      toPdfSafeText(t.badge || 'Verified'),
    ]),
    columnStyles: {
      0: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 48, fontStyle: 'bold' },
      2: { cellWidth: 93 },
      3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
    },
    styles: { fontSize: 8.2, cellPadding: 2.3 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = doc.lastAutoTable.finalY + 5.5;
  if (y > pageH - 58) {
    doc.addPage();
    y = 18;
  }

  // 7. Formation Crest-to-Base Envelope Sweep Table
  autoTable(doc, {
    startY: y,
    margin: TABLE_MARGIN,
    head: [['Horizon', 'Pressure (MPa)', 'Temp (°C)', 'Density Contrast (g/cm³)', 'MARS [P90, P10]', 'MARS P50', 'Verdict']],
    body: report.envelope.slices.filter((_, idx) => idx % 2 === 0).map(s => [
      toPdfSafeText(s.label),
      s.P.toFixed(2),
      (s.T - 273.15).toFixed(1),
      s.drho.toFixed(3),
      `[${s.p90.toFixed(2)}, ${s.p10.toFixed(2)}] mN/m`,
      `${s.p50.toFixed(2)} mN/m`,
      s.status,
    ]),
    styles: { fontSize: 8.2, cellPadding: 2.3 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addExecutiveFooters(doc, 'IFT-SafePredict  |  SEAL Containment Assurance Brief');
  const safeSlug = (report.resolved.siteId || 'formation').replace(/[^a-z0-9_-]/gi, '_');
  doc.save(`IFT_SafePredict_SEAL_Brief_${safeSlug}.pdf`);
};

/**
 * Export multiple scenario comparison results as CSV.
 */
export const exportScenariosCSV = (scenarios) => {
  const header = [
    'Scenario', 'Regime', 'P (MPa)', 'T (K)', 'Density Contrast (g/cm3)', 'MCM', 'BCM',
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
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
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
