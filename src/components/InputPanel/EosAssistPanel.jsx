import React, { useState } from 'react'
import { computeDrho } from '../../logic/eosEngine.js'

export default function EosAssistPanel({ onResult }) {
  const [open, setOpen] = useState(false)
  const [P, setP] = useState(10)
  const [T, setT] = useState(323.15)
  const [sal, setSal] = useState(1.0)
  const [result, setResult] = useState(null)

  const handleCompute = () => {
    const r = computeDrho(P, T, sal)
    setResult(r)
    onResult(r)
  }

  return (
    <div className="eos-panel">
      <div className="eos-panel-header" onClick={() => setOpen(o => !o)}>
        <span>Calculate Δρ from P, T, salinity (EOS assist)</span>
        <span>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="eos-panel-body">
          <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
            Optional: estimate Δρ = ρ_brine − ρ_CO₂ using Span-Wagner + Rowe-Chou correlations.
            Override anytime in the main input.
          </p>
          <div className="field-group">
            <div className="field-label"><span>P</span><span className="unit">MPa</span></div>
            <input type="number" value={P} min={1} max={50} step={0.5}
              onChange={e => setP(Number(e.target.value))} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>T</span><span className="unit">K</span></div>
            <input type="number" value={T} min={273} max={473} step={1}
              onChange={e => setT(Number(e.target.value))} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Total salinity (NaCl-equiv.)</span><span className="unit">mol/kg</span></div>
            <input type="number" value={sal} min={0} max={6} step={0.1}
              onChange={e => setSal(Number(e.target.value))} />
          </div>
          <button className="btn btn-secondary" onClick={handleCompute} style={{ marginTop: '0.25rem' }}>
            Compute Δρ
          </button>
          {result && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
              <div>ρ_brine = <strong>{result.rho_brine.toFixed(4)}</strong> g/cm³</div>
              <div>ρ_CO₂  = <strong>{result.rho_co2.toFixed(4)}</strong> g/cm³</div>
              <div>
                Δρ = <strong>{result.drho.toFixed(4)}</strong> g/cm³{' '}
                <span className="eos-tag">EOS-estimated</span>
              </div>
              <p className="text-muted" style={{ marginTop: '0.3rem' }}>
                Value auto-populated into Δρ input above.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
