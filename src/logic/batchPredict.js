import { predict } from './predict.js'

const REQUIRED_COLUMNS = ['P', 'T']

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

  const headers = lines[0].split(',').map(h => h.trim())
  const colMap = {}
  headers.forEach((h, i) => {
    const key = h.replace(/["']/g, '').trim()
    if (key === 'CH4' || key === 'x_CH4' || key === 'xCH4') colMap[i] = 'x_CH4'
    else if (key === 'N2' || key === 'x_N2' || key === 'xN2') colMap[i] = 'x_N2'
    else colMap[i] = key
  })

  // Validate required columns
  const found = Object.values(colMap)
  for (const col of REQUIRED_COLUMNS) {
    if (!found.includes(col)) throw new Error(`Missing required column: ${col}`)
  }

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    if (vals.length < 2) continue

    const row = {}
    vals.forEach((v, idx) => {
      const field = colMap[idx]
      if (!field) return
      if (field === 'brineType' || field === 'brine_type' || field === 'salt_type') {
        row.brineType = v
      } else {
        row[field] = parseFloat(v)
        if (isNaN(row[field])) row[field] = 0
      }
    })

    if (row.P === undefined || row.T === undefined) continue
    row.salinity = row.salinity ?? (row.sal ?? 1.0)
    row.drho = row.drho ?? 0.4
    row.MCM = row.MCM ?? 0
    row.BCM = row.BCM ?? 0
    row.x_CH4 = row.x_CH4 ?? 0
    row.x_N2 = row.x_N2 ?? 0
    row.brineType = row.brineType ?? 'NaCl'
    row.eosEstimated = false
    row._line = i + 1

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
        inputs,
        result,
        error: null,
      })
    } catch (err) {
      results.push({
        line: inputs._line,
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
    'Line', 'P (MPa)', 'T (K)', 'Salinity', 'drho', 'MCM', 'BCM',
    'x_CH4', 'x_N2', 'Brine', 'Regime', 'IFT_P50', 'IFT_P10', 'IFT_P90',
    'QA_Status', 'UIF', 'Error',
  ]

  const rows = results.map(r => [
    r.line,
    r.inputs.P, r.inputs.T, r.inputs.salinity, r.inputs.drho,
    r.inputs.MCM, r.inputs.BCM, r.inputs.x_CH4, r.inputs.x_N2, r.inputs.brineType,
    r.result?.regime === 'sup' ? 'Supercritical' : 'Subcritical',
    r.result?.p50?.toFixed(2) ?? '',
    r.result?.p10?.toFixed(2) ?? '',
    r.result?.p90?.toFixed(2) ?? '',
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
    inputs: r.inputs,
    result: r.result ? {
      p50: r.result.p50, p10: r.result.p10, p90: r.result.p90,
      status: r.result.status, uif: r.result.uif, regime: r.result.regime,
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
