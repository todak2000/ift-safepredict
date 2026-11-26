import React from 'react'
import { X } from 'lucide-react'
import { exportScenariosCSV } from '../logic/exportEngine.js'

const STATUS_COLORS = { GREEN: 'var(--green)', AMBER: 'var(--yellow)', RED: 'var(--red)' }

export default function ScenarioComparison({ scenarios, onRemove }) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="card" style={{ opacity: 0.65 }}>
        <p className="card-title">Scenario Comparison</p>
        <p className="text-muted">Save up to 3 runs from Predictor &amp; HUD to compare side-by-side.</p>
      </div>
    )
  }

  const handleExport = () => exportScenariosCSV(scenarios)

  return (
    <div className="card">
      <div className="flex-between">
        <span className="card-title" style={{ marginBottom: 0 }}>Scenario Comparison</span>
        <button className="btn btn-ghost" onClick={handleExport}>&darr; Export CSV</button>
      </div>
      <div className="scenario-grid">
        {scenarios.map((s, i) => {
          const uifPort = Number(s.result.uifPortability ?? s.result.uif)
          const mult = Number(s.result.uif ?? 1.0)
          return (
            <div key={i} className="scenario-card">
              <button className="remove-btn" onClick={() => onRemove(i)} title="Remove"><X size={14} /></button>
              <div className="scenario-label" style={{ textTransform: 'none', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                {s.inputs.presetName || `Scenario ${i + 1}`}
              </div>
              <div className="scenario-ift" style={{ color: STATUS_COLORS[s.result.status] }}>
                {s.result.p50.toFixed(2)}
                <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 5 }}>mN/m</span>
              </div>
              <div className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                [{Math.min(s.result.p10, s.result.p90).toFixed(2)} &ndash; {Math.max(s.result.p10, s.result.p90).toFixed(2)}] mN/m
              </div>
              <div style={{ marginTop: '0.65rem', fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                <div>P = <span className="mono">{s.inputs.P} MPa</span> &middot; T = <span className="mono">{s.inputs.T} K ({(s.inputs.T - 273.15).toFixed(1)} °C)</span></div>
                <div>Brine: <span className="mono">{s.inputs.brineType}</span> (MCM = {s.inputs.MCM} mol/kg)</div>
                <div>Regime: <strong>{s.result.regime === 'sup' ? 'Supercritical (35-term)' : 'Subcritical (16-term)'}</strong></div>
                <div className="mono" style={{ color: STATUS_COLORS[s.result.status], fontWeight: 700, marginTop: '0.35rem' }}>
                  {s.result.status} &middot; UIF {uifPort.toFixed(2)} &middot; &times;{mult.toFixed(1)}{mult >= 2.5 ? ' (capped)' : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
