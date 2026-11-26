import React, { useState, useMemo, useEffect } from 'react'
import { Database, ShieldCheck } from 'lucide-react'

const DEFAULT_RHO = 700
const E_REF = 0.03
const SIGMA_REF = 30
const N_EXP = 0.7

export default function StorageEstimator({ result }) {
  const [area, setArea] = useState(100)
  const [thickness, setThickness] = useState(50)
  const [porosity, setPorosity] = useState(0.15)
  const [rhoCO2, setRhoCO2] = useState(DEFAULT_RHO)

  useEffect(() => {
    if (result?.rho_co2) {
      setRhoCO2(Math.round(result.rho_co2 * 1000))
    }
  }, [result?.rho_co2])

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
      <div className="card" style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>
        <p className="card-title" style={{ justifyContent: 'center' }}>CO₂ Storage Capacity Estimator</p>
        <p className="text-muted" style={{ fontSize: '0.78rem' }}>Run a prediction first to estimate residual trapping efficiency.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title-row">
        <div className="card-title-group">
          <span className="card-title">
            <Database size={15} color="var(--accent)" />
            CO₂ Storage Capacity & Trapping Intelligence
          </span>
          <span className="card-subtitle">
            Power-law residual trapping: E = E<sub>0</sub> &middot; (&sigma;<sub>0</sub>/&sigma;)<sup>0.7</sup> (E<sub>0</sub> = 3%, &sigma;<sub>0</sub> = 30 mN/m)
          </span>
        </div>
      </div>

      <div className="storage-layout">
        <div className="storage-inputs">
          <div className="param-group">
            <div className="param-header">
              <span className="param-label">Reservoir Extent</span>
              <span className="param-val-pill mono">{area} km²</span>
            </div>
            <input type="number" value={area} min={1} max={10000} step="any" onChange={e => setArea(+e.target.value)} />
          </div>

          <div className="param-group">
            <div className="param-header">
              <span className="param-label">Net Formation Thickness</span>
              <span className="param-val-pill mono">{thickness} m</span>
            </div>
            <input type="number" value={thickness} min={1} max={500} step="any" onChange={e => setThickness(+e.target.value)} />
          </div>

          <div className="param-group">
            <div className="param-header">
              <span className="param-label">Average Porosity (φ)</span>
              <span className="param-val-pill mono">{porosity} frac</span>
            </div>
            <input type="number" value={porosity} min={0.01} max={0.4} step="any" onChange={e => setPorosity(+e.target.value)} />
          </div>

          <div className="param-group">
            <div className="param-header">
              <span className="param-label">CO₂ Density</span>
              <span className="param-val-pill mono">{rhoCO2} kg/m³</span>
            </div>
            <input type="number" value={rhoCO2} min={100} max={1200} step="any" onChange={e => setRhoCO2(+e.target.value)} />
          </div>
        </div>

        <div className="storage-results">
          <div className="stat-card">
            <div className="stat-label">In-situ IFT (P50)</div>
            <div className="stat-value mono" style={{ fontSize: '1.45rem', color: 'var(--text-main)' }}>
              {ift.toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mN/m</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Residual Trapping Efficiency</div>
            <div className="stat-value mono" style={{ fontSize: '1.45rem', color: 'var(--green)' }}>
              {(trappingEff * 100).toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>vs 3.0% reference benchmark</div>
          </div>

          <div className="stat-card" style={{ borderColor: 'rgba(0, 240, 255, 0.4)', background: 'linear-gradient(180deg, var(--bg-input) 0%, rgba(0, 240, 255, 0.05) 100%)' }}>
            <div className="stat-label">Estimated Storage Capacity</div>
            <div className="stat-value mono" style={{ color: 'var(--accent)', fontSize: '2rem' }}>
              {storage ? storage.toFixed(2) : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Megatonnes CO₂ (Mt)</div>
          </div>
        </div>
      </div>

      {storage > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
        }}>
          <ShieldCheck size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div>
            At IFT = <strong style={{ color: 'var(--text-main)' }}>{ift.toFixed(1)} mN/m</strong>, capillary trapping capacity provides{' '}
            <strong style={{ color: 'var(--accent-text)' }}>~{storage.toFixed(1)} Mt CO₂</strong> of permanent residual storage,
            supporting <strong style={{ color: 'var(--text-main)' }}>~{(storage / 4).toFixed(1)} years</strong> of continuous 1.0 Mtpa commercial injection.
          </div>
        </div>
      )}
    </div>
  )
}
