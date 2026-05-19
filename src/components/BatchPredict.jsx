import React, { useState, useRef } from 'react'
import { FileText, Upload } from 'lucide-react'
import { parseCSV, batchPredict, exportBatchCSV, exportBatchJSON } from '../logic/batchPredict.js'

const TEMPLATE_CSV = `P,T,salinity,MCM,BCM,x_CH4,x_N2,brineType
10,323,1.0,1.0,0,0,0,NaCl
20,350,3.5,3.5,0,0.02,0,NaCl
8,310,0.5,1.5,0.5,0.1,0.05,NaCl+CaCl2`

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'IFT_batch_template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function BatchPredict() {
  const fileRef = useRef(null)
  const [data, setData] = useState(null)
  const [results, setResults] = useState(null)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState('')

  const loadCSV = (text) => {
    try {
      const rows = parseCSV(text)
      setData(rows)
      setResults(null)
      setParseError('')
      setPasteMode(false)
    } catch (err) {
      setParseError(err.message)
    }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      loadCSV(ev.target.result)
    }
    reader.readAsText(file)
  }

  const handlePaste = () => {
    if (!pasteText.trim()) return
    loadCSV(pasteText)
  }

  const handleRun = () => {
    if (!data || data.length === 0) return
    setRunning(true)
    setProgress(0)
    setResults(null)
    setTimeout(() => {
      const res = batchPredict(data, setProgress)
      setResults(res)
      setRunning(false)
    }, 50)
  }

  const successCount = results ? results.filter(r => !r.error).length : 0
  const failCount = results ? results.filter(r => r.error).length : 0

  return (
    <div className="card" style={{ maxWidth: '100%' }}>
      <p className="card-title">Batch Prediction</p>
      <p className="text-muted" style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
        Only <code>P</code> and <code>T</code> are required — missing fields default to sensible values.
        Download all predictions as CSV or JSON.
      </p>

      {/* Template download */}
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-ghost" onClick={downloadTemplate}>
          ↓ Download Template CSV
        </button>
      </div>

      {/* Upload or Paste */}
      <div className="batch-upload-area">
        {!pasteMode ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
            <button className="btn btn-secondary" onClick={() => fileRef.current.click()}>
              {data ? <><FileText size={16} /> {data.length} rows loaded</> : <><Upload size={16} /> Upload CSV</>}
            </button>
            {data && (
              <span className="text-muted" style={{ marginLeft: '0.75rem', fontSize: '0.75rem' }}>
                {data.length} rows · {Object.keys(data[0]).filter(k => k !== '_line').join(', ')}
              </span>
            )}
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setPasteMode(true)} style={{ fontSize: '0.78rem' }}>
                or paste CSV instead
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setParseError('') }}
              placeholder={`P,T,salinity,MCM,BCM,x_CH4,x_N2,brineType\n10,323,1.0,1.0,0,0,0,NaCl\n20,350,3.5,3.5,0,0.02,0,NaCl`}
              style={{
                width: '100%', minHeight: 140, resize: 'vertical',
                background: 'var(--color-surface)', color: 'var(--color-text)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                padding: '0.75rem', fontSize: '0.78rem', fontFamily: 'monospace',
              }}
            />
            {parseError && <p style={{ color: 'var(--color-red)', fontSize: '0.75rem', marginTop: '0.35rem' }}>{parseError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={handlePaste}>Parse CSV</button>
              <button className="btn btn-ghost" onClick={() => { setPasteMode(false); setPasteText(''); setParseError('') }}>Cancel</button>
            </div>
          </>
        )}
      </div>

      {/* Run */}
      {data && !running && (
        <button className="btn btn-primary" onClick={handleRun} style={{ marginTop: '1rem', maxWidth: 300 }}>
          Run Batch Prediction ({data.length} rows)
        </button>
      )}

      {/* Progress */}
      {running && (
        <div style={{ marginTop: '1rem' }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-muted" style={{ marginTop: '0.35rem', fontSize: '0.75rem' }}>
            Processing… {progress}%
          </p>
        </div>
      )}

      {/* Results Summary */}
      {results && (
        <div style={{ marginTop: '1rem' }}>
          <div className="batch-summary">
            <span className="batch-summary-item">
              Total: <strong>{results.length}</strong>
            </span>
            <span className="batch-summary-item" style={{ color: 'var(--color-green)' }}>
              Success: <strong>{successCount}</strong>
            </span>
            {failCount > 0 && (
              <span className="batch-summary-item" style={{ color: 'var(--color-red)' }}>
                Failed: <strong>{failCount}</strong>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => exportBatchCSV(results)}>
              ↓ Download CSV
            </button>
            <button className="btn btn-ghost" onClick={() => exportBatchJSON(results)}>
              ↓ Download JSON
            </button>
          </div>

          {/* Results Table */}
          <div className="batch-table-wrapper">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>P (MPa)</th>
                  <th>T (K)</th>
                  <th>Brine</th>
                  <th>Regime</th>
                  <th>P50</th>
                  <th>P10</th>
                  <th>P90</th>
                  <th>QA</th>
                  <th>UIF</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={r.error ? 'batch-row-error' : ''}>
                    <td>{r.line}</td>
                    <td>{r.inputs.P}</td>
                    <td>{r.inputs.T}</td>
                    <td>{r.inputs.brineType}</td>
                    <td>{r.result ? (r.result.regime === 'sup' ? 'Sup' : 'Sub') : '—'}</td>
                    <td className="batch-val">{r.result ? r.result.p50.toFixed(2) : '—'}</td>
                    <td className="batch-val">{r.result ? r.result.p10.toFixed(2) : '—'}</td>
                    <td className="batch-val">{r.result ? r.result.p90.toFixed(2) : '—'}</td>
                    <td>
                      {r.result ? (
                        <span className={`history-status ${r.result.status?.toLowerCase() || ''}`}>
                          {r.result.status}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{r.result ? r.result.uif : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
