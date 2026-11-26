import { predict } from './predict.js'
import { computeDrho } from './eosEngine.js'

/**
 * Parse batch CSV text.
 * Supports:
 *   - Optional `Site` / `Formation` / `Name` string column
 *   - Either `T` (Kelvin) OR `T_C` (Celsius; auto-converted to K)
 *   - Automatic Peng–Robinson + Rowe–Chou EOS `drho` whenever `drho` is omitted or blank!
 */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'))
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

  const headers = lines[0].split(',').map(h => h.trim())
  const colMap = {}
  headers.forEach((h, i) => {
    const key = h.replace(/["']/g, '').trim()
    const low = key.toLowerCase()
    if (low === 'site' || low === 'formation' || low === 'name' || low === 'label') colMap[i] = 'site'
    else if (low === 'p' || low === 'p_mpa' || low === 'pressure') colMap[i] = 'P'
    else if (low === 't' || low === 't_k' || low === 'temp_k') colMap[i] = 'T'
    else if (low === 't_c' || low === 'temp_c' || low === 'temperature_c') colMap[i] = 'T_C'
    else if (low === 'ch4' || low === 'x_ch4' || low === 'xch4') colMap[i] = 'x_CH4'
    else if (low === 'n2' || low === 'x_n2' || low === 'xn2') colMap[i] = 'x_N2'
    else if (low === 'brinetype' || low === 'brine_type' || low === 'salt_type' || low === 'brine') colMap[i] = 'brineType'
    else if (low === 'drho' || low === 'delta_rho') colMap[i] = 'drho'
    else if (low === 'salinity' || low === 'sal') colMap[i] = 'salinity'
    else if (low === 'mcm') colMap[i] = 'MCM'
    else if (low === 'bcm') colMap[i] = 'BCM'
    else colMap[i] = key
  })

  const found = Object.values(colMap)
  if (!found.includes('P')) throw new Error('Missing required column: P (MPa)')
  if (!found.includes('T') && !found.includes('T_C')) {
    throw new Error('Missing required temperature column: provide T (Kelvin) or T_C (Celsius)')
  }

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    if (vals.length < 2) continue

    const row = {}
    let hasExplicitDrho = false

    vals.forEach((v, idx) => {
      const field = colMap[idx]
      if (!field) return
      if (field === 'site' || field === 'brineType') {
        row[field] = v
      } else if (field === 'drho') {
        if (v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) > 0) {
          row.drho = parseFloat(v)
          hasExplicitDrho = true
        }
      } else {
        const num = parseFloat(v)
        if (!isNaN(num)) row[field] = num
      }
    })

    if (row.P === undefined) continue
    if (row.T === undefined && row.T_C !== undefined) {
      row.T = parseFloat((row.T_C + 273.15).toFixed(2))
    } else if (row.T !== undefined && row.T < 220) {
      // Safeguard: values < 220 are clearly Celsius, convert to Kelvin automatically
      row.T = parseFloat((row.T + 273.15).toFixed(2))
    }
    if (row.T === undefined) continue

    row.brineType = row.brineType || 'NaCl'
    row.MCM = row.MCM ?? (row.brineType === 'Water' ? 0 : (row.salinity ?? 1.0))
    row.BCM = row.BCM ?? 0
    row.salinity = row.salinity ?? parseFloat((row.MCM + row.BCM).toFixed(3))
    row.x_CH4 = row.x_CH4 ?? 0
    row.x_N2 = row.x_N2 ?? 0

    if (!hasExplicitDrho) {
      const eos = computeDrho(row.P, row.T, row.salinity, {
        BCM: row.BCM,
        x_CH4: row.x_CH4,
        x_N2: row.x_N2,
      })
      row.drho = parseFloat(eos.drho.toFixed(4))
      row.eosEstimated = true
    } else {
      row.eosEstimated = false
    }

    row.site = row.site || `Row ${i}`
    row._line = i
    rows.push(row)
  }

  return rows
}

export function batchPredict(rows, onProgress) {
  const results = []
  const total = rows.length

  rows.forEach((inputs, i) => {
    try {
      const result = predict(inputs)
      results.push({
        line: inputs._line,
        site: inputs.site,
        inputs,
        result,
        error: null,
      })
    } catch (err) {
      results.push({
        line: inputs._line,
        site: inputs.site,
        inputs,
        result: null,
        error: err.message || 'Prediction failed',
      })
    }
    if (onProgress) onProgress(Math.round(((i + 1) / total) * 100))
  })

  return results
}

export function exportBatchCSV(results) {
  const header = [
    'Row', 'Site', 'P (MPa)', 'T (K)', 'T (°C)', 'Salinity (mol/kg)', 'drho (g/cm³)', 'drho_Source',
    'MCM', 'BCM', 'x_CH4', 'x_N2', 'Brine', 'Regime',
    'IFT_P90_Conservative', 'IFT_P50_Expected', 'IFT_P10_Optimistic',
    'Composite_Verdict', 'UIF', 'Error',
  ]

  const rows = results.map(r => [
    r.line,
    r.site || '',
    r.inputs.P,
    r.inputs.T,
    (r.inputs.T - 273.15).toFixed(2),
    r.inputs.salinity,
    r.inputs.drho,
    r.inputs.eosEstimated ? 'PR-EOS' : 'Manual/Lit',
    r.inputs.MCM,
    r.inputs.BCM,
    r.inputs.x_CH4,
    r.inputs.x_N2,
    r.inputs.brineType,
    r.result?.regime === 'sup' ? 'Supercritical' : 'Subcritical',
    r.result?.p90?.toFixed(2) ?? '',
    r.result?.p50?.toFixed(2) ?? '',
    r.result?.p10?.toFixed(2) ?? '',
    r.result?.status ?? '',
    r.result?.uif ?? '',
    r.error ?? '',
  ])

  const csv = [header, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `IFT_Batch_Predictions_${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportBatchJSON(results) {
  const data = results.map(r => ({
    site: r.site,
    inputs: r.inputs,
    result: r.result ? {
      p90: Number(r.result.p90.toFixed(2)),
      p50: Number(r.result.p50.toFixed(2)),
      p10: Number(r.result.p10.toFixed(2)),
      status: r.result.status,
      adStatus: r.result.adStatus,
      uif: r.result.uif,
      regime: r.result.regime,
    } : null,
    error: r.error,
  }))
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `IFT_Batch_Predictions_${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}
