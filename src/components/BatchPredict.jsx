import React, { useState, useRef } from 'react'
import { FileText, Upload, Download, Zap } from 'lucide-react'
import { parseCSV, batchPredict, exportBatchCSV, exportBatchJSON } from '../logic/batchPredict.js'

export const DEMO_BATCH_CSV = `Site,P,T_C,MCM,BCM,x_CH4,x_N2,brineType,drho
Sleipner (Utsira North Sea),10.30,37.00,0.60,0.00,0.00,0.00,NaCl,0.3916
In Salah (Krechba Algeria),18.00,90.00,0.44,0.00,0.00,0.00,NaCl,
Sarawak Kasawari (Luconia Malaysia),22.50,112.00,0.60,0.00,0.00,0.00,NaCl,
Malay Basin (Offshore Malaysia),19.50,108.00,0.45,0.00,0.00,0.00,NaCl,
Peterhead Shallow (UK Subcritical),5.20,32.00,1.50,0.00,0.00,0.00,NaCl,
UAE Carbonate (8727 ft),38.22,107.98,1.90,0.00,0.00,0.00,NaCl,
UAE Carbonate (10865 ft High-T),44.85,134.06,1.90,0.00,0.00,0.00,NaCl,
Saudi Basalt (10 MPa),10.00,49.85,3.419,0.00,0.00,0.00,NaCl,
Vietnam Deep Saline (Zero-Salt),21.41,100.00,0.00,0.00,0.00,0.00,Water,
Snohvit (Tubaen Barents Sea),28.00,96.85,2.60,0.00,0.00,0.00,NaCl,`

function downloadTemplate() {
  const blob = new Blob([DEMO_BATCH_CSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'IFT_SafePredict_Batch_Template.csv'
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

  const loadCSV = (text, autoRun = false) => {
    try {
      const rows = parseCSV(text)
      setData(rows)
      setParseError('')
      setPasteMode(false)
      if (autoRun) {
        setRunning(true)
        setProgress(0)
        setTimeout(() => {
          const res = batchPredict(rows, setProgress)
          setResults(res)
          setRunning(false)
        }, 40)
      } else {
        setResults(null)
      }
    } catch (err) {
      setParseError(err.message)
    }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      loadCSV(ev.target.result, true)
    }
    reader.readAsText(file)
  }

  const handlePaste = () => {
    if (!pasteText.trim()) return
    loadCSV(pasteText, true)
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
    }, 40)
  }

  const successCount = results ? results.filter(r => !r.error).length : 0
  const failCount = results ? results.filter(r => r.error).length : 0

  return (
    <div className="card" style={{ maxWidth: '100%' }}>
      <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="card-title-group">
          <span className="card-title">Multi-Site Batch Screening &amp; Portfolio Audit</span>
          <span className="card-subtitle">
            Upload CSV with <code>P</code> (MPa) and <code>T_C</code> (°C) or <code>T</code> (K) — blank <code>drho</code> cells auto-compute via Peng–Robinson + Rowe–Chou EOS
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
            <Download size={14} />
            <span className="btn-label-long">Download Template</span>
            <span className="btn-label-short">Template</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => loadCSV(DEMO_BATCH_CSV, true)}
            title="Instantly load and evaluate 10 global & Malaysian CCS formations"
          >
            <Zap size={14} />
            <span className="btn-label-long">Load &amp; Run 10-Basin Demo</span>
            <span className="btn-label-short">Demo Batch</span>
          </button>
        </div>
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
            <button type="button" className="btn btn-secondary" onClick={() => fileRef.current.click()}>
              {data ? <><FileText size={16} /> {data.length} formations loaded (Upload another CSV)</> : <><Upload size={16} /> Upload Filled CSV File</>}
            </button>
            {data && (
              <span className="text-muted" style={{ marginLeft: '0.75rem', fontSize: '0.75rem' }}>
                {data.length} rows ready
              </span>
            )}
            <div style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setPasteText(DEMO_BATCH_CSV)
                  setPasteMode(true)
                }}
                style={{ fontSize: '0.76rem' }}
              >
                or paste / edit CSV inline
              </button>
            </div>
            {parseError && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.45rem' }}>{parseError}</p>}
          </>
        ) : (
          <>
            <textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setParseError('') }}
              placeholder={DEMO_BATCH_CSV}
              style={{
                width: '100%', minHeight: 160, resize: 'vertical',
                background: 'var(--bg-surface)', color: 'var(--text-main)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                padding: '0.75rem', fontSize: '0.76rem', fontFamily: 'var(--font-mono)',
              }}
            />
            {parseError && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.35rem' }}>{parseError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={handlePaste}>Parse &amp; Run CSV</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setPasteMode(false); setParseError('') }}>Cancel</button>
            </div>
          </>
        )}
      </div>

      {/* Manual Re-run */}
      {data && !running && !results && (
        <button type="button" className="btn btn-primary" onClick={handleRun} style={{ marginTop: '0.5rem', maxWidth: 300 }}>
          Run Batch Prediction ({data.length} rows)
        </button>
      )}

      {/* Progress */}
      {running && (
        <div style={{ marginTop: '1rem' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem' }}>
            Evaluating MARS + PR-EOS + 5-Gate Trust… {progress}%
          </p>
        </div>
      )}

      {/* Results Summary & Table */}
      {results && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
              <span>Total Sites: <strong className="mono">{results.length}</strong></span>
              <span style={{ color: 'var(--green)' }}>Evaluated: <strong className="mono">{successCount}</strong></span>
              {failCount > 0 && (
                <span style={{ color: 'var(--red)' }}>Failed: <strong className="mono">{failCount}</strong></span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => exportBatchCSV(results)}>
                <Download size={13} />
                <span className="btn-label-long">Export CSV</span>
                <span className="btn-label-short">CSV</span>
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => exportBatchJSON(results)}>
                <Download size={13} />
                <span className="btn-label-long">Export JSON</span>
                <span className="btn-label-short">JSON</span>
              </button>
            </div>
          </div>

          <div className="batch-table-container">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Formation / Site</th>
                  <th>P (MPa)</th>
                  <th>T (°C)</th>
                  <th><span style={{ textTransform: 'none' }}>Δρ (g/cm³)</span></th>
                  <th>Brine</th>
                  <th>Regime</th>
                  <th>P90</th>
                  <th>P50</th>
                  <th>P10</th>
                  <th>Verdict</th>
                  <th>UIF</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={r.error ? 'batch-row-error' : ''}>
                    <td>{r.line}</td>
                    <td style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{r.site}</td>
                    <td>{r.inputs.P.toFixed(2)}</td>
                    <td>{(r.inputs.T - 273.15).toFixed(1)}</td>
                    <td>
                      {r.inputs.drho.toFixed(4)}{' '}
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                        {r.inputs.eosEstimated ? 'EOS' : 'Lit'}
                      </span>
                    </td>
                    <td>{r.inputs.brineType}</td>
                    <td>{r.result ? (r.result.regime === 'sup' ? 'Sup' : 'Sub') : '—'}</td>
                    <td>{r.result ? r.result.p90.toFixed(2) : '—'}</td>
                    <td style={{ color: 'var(--accent-text)', fontWeight: 700 }}>{r.result ? r.result.p50.toFixed(2) : '—'}</td>
                    <td>{r.result ? r.result.p10.toFixed(2) : '—'}</td>
                    <td>
                      {r.result ? (
                        <span className={`history-status ${r.result.status?.toLowerCase() || ''}`}>
                          {r.result.status}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{r.result ? `${r.result.uif.toFixed(2)}×` : '—'}</td>
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
