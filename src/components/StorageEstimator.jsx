import React, { useState, useMemo } from 'react'

const DEFAULT_RHO = 700
const E_REF = 0.03
const SIGMA_REF = 30
const N_EXP = 0.7

export default function StorageEstimator({ result }) {
  const [area, setArea] = useState(100)
  const [thickness, setThickness] = useState(50)
  const [porosity, setPorosity] = useState(0.15)
  const [rhoCO2, setRhoCO2] = useState(DEFAULT_RHO)
  const [efficiency, setEfficiency] = useState(0.03)

  const ift = result?.p50

  const trappingEff = useMemo(() => {
    if (!ift || ift <= 0) return null
    return Math.min(0.12, E_REF * Math.pow(SIGMA_REF / ift, N_EXP))
  }, [ift])

  const storage = useMemo(() => {
    if (!trappingEff || !area || !thickness || !porosity || !rhoCO2) return null
    const poreVol = area * thickness * porosity
    const massKg = poreVol * rhoCO2 * trappingEff * 1e6
    return massKg / 1e9
  }, [area, thickness, porosity, rhoCO2, trappingEff])

  if (!result || !ift) {
    return (
      <div className="card" style={{ opacity: 0.4 }}>
        <p className="card-title">CO₂ Storage Capacity Estimator</p>
        <p className="text-muted">Run a prediction first to estimate trapping efficiency from IFT.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <p className="card-title">CO₂ Storage Capacity Estimator</p>
      <p className="text-muted" style={{ marginBottom: '0.75rem', lineHeight: 1.5, fontSize: '0.75rem' }}>
        Estimate residual trapping capacity from IFT. Lower IFT → lower capillary pressure →
        higher CO₂ saturation → greater storage capacity.
        Uses power-law model: <em>E = E₀ · (σ₀/σ)^n</em> with E₀=3%, σ₀=30 mN/m, n=0.7.
      </p>

      <div className="storage-layout">
        <div className="storage-inputs">
          <div className="field-group">
            <div className="field-label"><span>Reservoir area</span><span className="unit">km²</span></div>
            <input type="number" value={area} min={1} max={10000} step={10} onChange={e => setArea(+e.target.value)} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Formation thickness</span><span className="unit">m</span></div>
            <input type="number" value={thickness} min={1} max={500} step={5} onChange={e => setThickness(+e.target.value)} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>Porosity</span><span className="unit">frac.</span></div>
            <input type="number" value={porosity} min={0.01} max={0.4} step={0.01} onChange={e => setPorosity(+e.target.value)} />
          </div>
          <div className="field-group">
            <div className="field-label"><span>CO₂ density (est.)</span><span className="unit">kg/m³</span></div>
            <input type="number" value={rhoCO2} min={100} max={1200} step={10} onChange={e => setRhoCO2(+e.target.value)} />
          </div>
        </div>

        <div className="storage-results">
          <div className="stat-card">
            <div className="stat-label">IFT (P50)</div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>{ift.toFixed(2)}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>mN/m</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Trapping Efficiency</div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>{(trappingEff * 100).toFixed(1)}%</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>vs {(E_REF * 100).toFixed(0)}% ref.</div>
          </div>
          <div className="stat-card" style={{ borderColor: '#3b82f6' }}>
            <div className="stat-label">Storage Capacity</div>
            <div className="stat-value" style={{ color: '#3b82f6', fontSize: '1.6rem' }}>
              {storage ? storage.toFixed(1) : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Mt CO₂</div>
          </div>
        </div>
      </div>

      {storage > 0 && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius)', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6 }}>
          At IFT = {ift.toFixed(1)} mN/m, trapping efficiency ≈ {(trappingEff * 100).toFixed(1)}%.
          A {area} km² × {thickness} m reservoir (φ = {porosity}) could store{' '}
          <strong style={{ color: '#f1f5f9' }}>~{storage.toFixed(1)} Mt CO₂</strong>.
          This is equivalent to ~{(storage / 4).toFixed(0)} years of a 1 Mtpa CCS project.
        </div>
      )}
    </div>
  )
}
