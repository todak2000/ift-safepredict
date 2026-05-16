import React from 'react'
import { exportScenariosCSV } from '../logic/exportEngine.js'

const STATUS_COLORS = { GREEN: '#22c55e', YELLOW: '#eab308', RED: '#ef4444' }

export default function ScenarioComparison({ scenarios, onRemove }) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="card" style={{ opacity: 0.4 }}>
        <p className="card-title">Scenario Comparison</p>
        <p className="text-muted">Save up to 3 runs to compare side-by-side.</p>
      </div>
    )
  }

  const handleExport = () => exportScenariosCSV(scenarios)

  return (
    <div className="card">
      <div className="flex-between">
        <span className="card-title" style={{ marginBottom: 0 }}>Scenario Comparison</span>
        <button className="btn btn-ghost" onClick={handleExport}>↓ Export CSV</button>
      </div>
      <div className="scenario-grid">
        {scenarios.map((s, i) => (
          <div key={i} className="scenario-card">
            <button className="remove-btn" onClick={() => onRemove(i)} title="Remove">✕</button>
            <div className="scenario-label">Scenario {i + 1}</div>
            <div className="scenario-ift" style={{ color: STATUS_COLORS[s.result.status] }}>
              {s.result.p50.toFixed(1)}
              <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>mN/m</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              [{s.result.p10.toFixed(1)} – {s.result.p90.toFixed(1)}] mN/m
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.72rem' }}>
              <div>P = {s.inputs.P} MPa | T = {s.inputs.T} K</div>
              <div>Brine: {s.inputs.brineType}</div>
              <div>Regime: {s.result.regime === 'sup' ? 'Supercritical' : 'Subcritical'}</div>
              <div style={{ color: STATUS_COLORS[s.result.status], fontWeight: 600, marginTop: '0.25rem' }}>
                {s.result.status} | UIF {s.result.uif}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
