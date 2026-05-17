import React, { useState } from 'react'
import QualityBadge from './QualityBadge.jsx'
import { exportCSV, exportPDF } from '../logic/exportEngine.js'
import { buildShareUrl } from '../logic/tracking.js'

export default function PredictionDisplay({ result, inputs }) {
  const [copied, setCopied] = useState(false)
  if (!result) {
    return (
      <div className="card">
        <p className="card-title">Results</p>
        <div className="prediction-box" style={{ opacity: 0.4 }}>
          <div className="percentile-row">
            {['P10', 'P50', 'P90'].map(label => (
              <div key={label} className={`percentile-cell${label === 'P50' ? ' percentile-cell--main' : ''}`}>
                <div className="percentile-label">{label}</div>
                <div className="percentile-value">—</div>
              </div>
            ))}
          </div>
          <div className="prediction-interval">Enter inputs and click Predict IFT</div>
        </div>
      </div>
    )
  }

  const { p10, p50, p90, status, message, uif, violatingFeatures, regime, Pr, Tr, drho_sq,
          eosEstimated, p50Clipped, rawP50 } = result

  const fullInputs = {
    ...inputs,
    Pr, Tr, drho_sq,
    drho: inputs.drho,
    eosEstimated,
  }

  const handleCSV = () => exportCSV(fullInputs, result, regime)
  const handlePDF = () => exportPDF(fullInputs, result, regime)

  return (
    <div className="card">
      <div className="flex-between">
        <span className="card-title" style={{ marginBottom: 0 }}>Results</span>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={handleCSV}>↓ CSV</button>
          <button className="btn btn-ghost" onClick={handlePDF}>↓ PDF</button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              navigator.clipboard.writeText(buildShareUrl(inputs))
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            title="Copy shareable link"
          >
            {copied ? '✓ Copied' : '🔗 Share'}
          </button>
        </div>
      </div>

      <div className="prediction-box" style={{ marginTop: '0.75rem' }}>
        <div className="percentile-row">
          <div className="percentile-cell">
            <div className="percentile-label">P10</div>
            <div className="percentile-value">{p10.toFixed(2)}</div>
            <div className="percentile-unit">mN/m</div>
          </div>
          <div className="percentile-cell percentile-cell--main">
            <div className="percentile-label">P50</div>
            <div className="percentile-value-main">
              {p50.toFixed(2)}<span className="unit">mN/m</span>
            </div>
          </div>
          <div className="percentile-cell">
            <div className="percentile-label">P90</div>
            <div className="percentile-value">{p90.toFixed(2)}</div>
            <div className="percentile-unit">mN/m</div>
          </div>
        </div>

        <div className="prediction-interval" style={{ marginTop: '0.6rem' }}>
          80% Conformal Prediction Interval
        </div>

        {eosEstimated && (
          <div style={{ marginTop: '0.35rem' }}>
            <span className="eos-tag">Δρ EOS-estimated</span>
          </div>
        )}

        {p50Clipped && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.35rem 0.6rem',
            background: '#1e3a5f',
            border: '1px solid #3b82f6',
            borderRadius: '4px',
            fontSize: '0.72rem',
            color: '#bfdbfe',
            lineHeight: 1.5,
          }}>
            ℹ P50 clipped from {rawP50.toFixed(2)} → {p50.toFixed(2)} mN/m (dataset range 12.4–78.88).
          </div>
        )}
      </div>

      <QualityBadge
        status={status}
        message={message}
        uif={uif}
        violatingFeatures={violatingFeatures}
      />

      <div className="text-muted mt-2" style={{ fontSize: '0.72rem' }}>
        Pr = {Pr?.toFixed(4)} | Tr = {Tr?.toFixed(4)} | Δρ² = {drho_sq?.toFixed(5)}
      </div>
    </div>
  )
}
