import React, { useState, useMemo, useEffect } from 'react'
import { Landmark, Info, AlertTriangle } from 'lucide-react'
import { CAP_PRESETS, formatThroatRadius } from '../logic/presetsData.js'

export { CAP_PRESETS, formatThroatRadius }

const G = 9.81
const toRad = deg => (deg * Math.PI) / 180

export default function CapillaryHeightCalculator({ result, inputs }) {
  const [preset, setPreset] = useState('sleipner')
  const [trap, setTrap] = useState(CAP_PRESETS.sleipner.trap)
  const [mode, setMode] = useState(CAP_PRESETS.sleipner.mode) // 'micp' | 'pe'
  const [rcUm, setRcUm] = useState(CAP_PRESETS.sleipner.rcUm)
  const [Pe, setPe] = useState(CAP_PRESETS.sleipner.Pe)
  const [theta, setTheta] = useState(CAP_PRESETS.sleipner.theta)
  const [drho, setDrho] = useState(CAP_PRESETS.sleipner.drho)
  const [gammaLit, setGammaLit] = useState(CAP_PRESETS.sleipner.gammaLit)
  const [A, setA] = useState(CAP_PRESETS.sleipner.A)
  const [phi, setPhi] = useState(CAP_PRESETS.sleipner.phi)
  const [rhoCO2, setRhoCO2] = useState(CAP_PRESETS.sleipner.rhoCO2)
  const [SCO2max, setSCO2max] = useState(CAP_PRESETS.sleipner.SCO2max)

  const applyPreset = (key, liveInputs = inputs, liveResult = result) => {
    const p = CAP_PRESETS[key] || CAP_PRESETS.custom
    setPreset(key)
    setTrap(p.trap)
    setMode(p.mode)
    setRcUm(p.rcUm)
    setPe(p.Pe)
    setTheta(p.theta)
    if (key === 'custom' && liveInputs?.drho) {
      setDrho(Number((liveInputs.drho * 1000).toFixed(1)))
      setRhoCO2(Number(((liveResult?.rho_co2 ?? 0.6) * 1000).toFixed(1)))
    } else {
      setDrho(p.drho)
      setRhoCO2(p.rhoCO2)
    }
    setGammaLit(p.gammaLit)
    setA(p.A)
    setPhi(p.phi)
    setSCO2max(p.SCO2max)
  }

  useEffect(() => {
    const pName = (inputs?.presetName || '').toLowerCase()
    if (pName.includes('sleipner')) {
      applyPreset('sleipner', inputs, result)
    } else if (pName.includes('in salah')) {
      applyPreset('insalah', inputs, result)
    } else if (pName.includes('sarawak') || pName.includes('kasawari')) {
      applyPreset('sarawak', inputs, result)
    } else if (inputs?.drho) {
      setPreset('custom')
      setDrho(Number((inputs.drho * 1000).toFixed(1)))
      if (result?.rho_co2) {
        setRhoCO2(Number((result.rho_co2 * 1000).toFixed(1)))
      }
    }
  }, [inputs?.presetName, inputs?.drho, result?.rho_co2])

  const ift10 = result?.p10
  const ift50 = result?.p50
  const ift90 = result?.p90

  const pNameLower = (inputs?.presetName || '').toLowerCase()
  const presetMismatch =
    (preset.startsWith('insalah') && pNameLower.includes('sleipner')) ||
    (preset === 'sleipner' && pNameLower.includes('in salah'))

  const calcs = useMemo(() => {
    if (!ift50 || !drho || drho <= 0) return null
    const cosTheta = Math.cos(toRad(theta))
    if (cosTheta <= 0) return null

    const rcMeters = mode === 'micp'
      ? Math.max(1e-10, rcUm * 1e-6)
      : (2 * Math.max(1, gammaLit) * 1e-3 * cosTheta) / (Math.max(0.05, Pe) * 1e6)

    const rcDrhoG = rcMeters * drho * G
    if (rcDrhoG <= 0) return null

    const H = gamma => (2 * gamma * 1e-3 * cosTheta) / rcDrhoG
    const PcEntryMPa = (gamma) => (2 * gamma * 1e-3 * cosTheta) / rcMeters / 1e6

    const H90 = H(ift90 ?? ift50)
    const H50 = H(ift50)
    const H10 = H(ift10 ?? ift50)
    const Hlit = gammaLit > 0 ? H(gammaLit) : null
    const toMt = hVal => (A * hVal * phi * rhoCO2 * SCO2max * 1e6) / 1e9

    return {
      rcMeters,
      Pc50: PcEntryMPa(ift50),
      H90,
      H50,
      H10,
      Hlit,
      M90: toMt(H90),
      M50: toMt(H50),
      M10: toMt(H10),
      Mlit: Hlit !== null ? toMt(Hlit) : null,
    }
  }, [ift10, ift50, ift90, mode, rcUm, Pe, theta, drho, gammaLit, A, phi, rhoCO2, SCO2max])

  return (
    <div className="card">
      <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
        <div className="card-title-group">
          <span className="card-title">
            <Landmark size={16} color="var(--accent)" />
            Capillary Column Height &amp; Static Patch Sensitivity
          </span>
          <span className="card-subtitle">
            Non-circular MICP core propagation: H<sub>cap</sub>(γ) = 2γ&middot;cos&theta; / (r<sub>c</sub>&middot;&Delta;&rho;&middot;g)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`preset-chip ${mode === 'micp' ? 'active' : ''}`}
            onClick={() => setMode('micp')}
            title="Independent Mercury Injection Capillary Pressure (MICP) throat radius — non-circular"
          >
            MICP Core r<sub>c</sub> (Recommended)
          </button>
          <button
            type="button"
            className={`preset-chip ${mode === 'pe' ? 'active' : ''}`}
            onClick={() => setMode('pe')}
            title="Back-calculate throat radius from entry pressure and literature IFT"
          >
            Legacy P<sub>e</sub> Ratio
          </button>
        </div>
      </div>

      {presetMismatch && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.65rem 0.9rem',
          background: 'var(--yellow-dim)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: 'var(--yellow)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Cross-Site Warning:</strong> Operating Parameters are set to <strong>{inputs.presetName}</strong> (MARS P50 = {ift50?.toFixed(2)} mN/m), while this calculator is using <strong>{CAP_PRESETS[preset]?.label}</strong> rock geometry.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        {Object.entries(CAP_PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            className={`preset-chip ${preset === key ? 'active' : ''}`}
            onClick={() => applyPreset(key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {mode === 'pe' && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.65rem 0.9rem',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.84rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Info size={15} color="var(--yellow)" style={{ flexShrink: 0 }} />
          <span>
            Note: Deriving r<sub>c</sub> = 2&gamma;<sub>lit</sub>&middot;cos&theta; / P<sub>e</sub> makes H(&gamma;) = [P<sub>e</sub>/(&Delta;&rho;&middot;g)]&middot;(&gamma;/&gamma;<sub>lit</sub>). Use <strong>MICP Core r<sub>c</sub></strong> mode for non-circular physical propagation.
          </span>
        </div>
      )}

      {/* Spacious 2-to-3 column parameter grid — prevents label wrapping & select truncation */}
      <div className="cap-param-grid">
        {mode === 'micp' ? (
          <div className="cap-field">
            <div className="cap-field-header">
              <span className="param-label">Pore Throat Radius (r<sub>c</sub>)</span>
              <span className="param-val-pill mono">
                {rcUm < 0.1 ? `${(rcUm * 1000).toFixed(1)} nm` : `${rcUm.toFixed(2)} µm`}
              </span>
            </div>
            <input type="number" value={rcUm} min={0.005} max={50} step={0.005} onChange={e => setRcUm(+e.target.value)} />
          </div>
        ) : (
          <div className="cap-field">
            <div className="cap-field-header">
              <span className="param-label">Entry Pressure (P<sub>e</sub>)</span>
              <span className="param-val-pill mono">{Pe.toFixed(2)} MPa</span>
            </div>
            <input type="number" value={Pe} min={0.1} max={20} step={0.1} onChange={e => setPe(+e.target.value)} />
          </div>
        )}

        <div className="cap-field">
          <div className="cap-field-header">
            <span className="param-label">Contact Angle (&theta;)</span>
            <span className="param-val-pill mono">{theta}°</span>
          </div>
          <input type="number" value={theta} min={0} max={85} step={1} onChange={e => setTheta(+e.target.value)} />
        </div>

        <div className="cap-field">
          <div className="cap-field-header">
            <span className="param-label">Density Contrast (&Delta;&rho;)</span>
            <span className="param-val-pill mono">{drho.toFixed(1)} kg/m³</span>
          </div>
          <input type="number" value={drho} min={50} max={1100} step={5} onChange={e => setDrho(+e.target.value)} />
        </div>

        <div className="cap-field">
          <div className="cap-field-header">
            <span className="param-label">Trapping Setting</span>
            <span className="param-val-pill mono">{trap === 'open' ? 'Seal Only' : 'Patch Mass'}</span>
          </div>
          <select value={trap} onChange={e => setTrap(e.target.value)}>
            <option value="open">Open Aquifer (Seal Height)</option>
            <option value="structural">Structural Patch (Height &amp; Mass)</option>
          </select>
        </div>

        <div className="cap-field">
          <div className="cap-field-header">
            <span className="param-label">Literature IFT (&gamma;<sub>lit</sub>)</span>
            <span className="param-val-pill mono">{gammaLit.toFixed(1)} mN/m</span>
          </div>
          <input type="number" value={gammaLit} min={10} max={80} step={0.5} onChange={e => setGammaLit(+e.target.value)} />
        </div>
      </div>

      {trap === 'structural' && (
        <div className="cap-param-grid" style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="cap-field">
            <div className="cap-field-header">
              <span className="param-label">Patch Area (A)</span>
              <span className="param-val-pill mono">{A} km²</span>
            </div>
            <input type="number" value={A} min={1} max={1000} step={1} onChange={e => setA(+e.target.value)} />
          </div>
          <div className="cap-field">
            <div className="cap-field-header">
              <span className="param-label">Porosity (&phi;)</span>
              <span className="param-val-pill mono">{phi.toFixed(2)}</span>
            </div>
            <input type="number" value={phi} min={0.02} max={0.40} step={0.01} onChange={e => setPhi(+e.target.value)} />
          </div>
          <div className="cap-field">
            <div className="cap-field-header">
              <span className="param-label">In-Situ &rho;<sub>CO₂</sub></span>
              <span className="param-val-pill mono">{rhoCO2.toFixed(1)} kg/m³</span>
            </div>
            <input type="number" value={rhoCO2} min={100} max={1000} step={5} onChange={e => setRhoCO2(+e.target.value)} />
          </div>
          <div className="cap-field">
            <div className="cap-field-header">
              <span className="param-label">Max Saturation (S<sub>CO₂,max</sub>)</span>
              <span className="param-val-pill mono">{SCO2max.toFixed(2)}</span>
            </div>
            <input type="number" value={SCO2max} min={0.10} max={0.90} step={0.05} onChange={e => setSCO2max(+e.target.value)} />
          </div>
        </div>
      )}

      {calcs && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem',
            margin: '1.1rem 0 0.9rem',
            padding: '0.65rem 0.95rem',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}>
            <span>Throat Radius <strong>r<sub>c</sub> = <span className="mono" style={{ color: 'var(--text-main)' }}>{formatThroatRadius(calcs.rcMeters)}</span></strong></span>
            <span>Entry Pressure <strong>P<sub>c</sub>(P50) = <span className="mono" style={{ color: 'var(--accent-text)' }}>{calcs.Pc50.toFixed(2)} MPa</span></strong></span>
            <span>MARS IFT Interval: <strong className="mono" style={{ color: 'var(--text-main)' }}>[{ift90.toFixed(2)}, {ift50.toFixed(2)}, {ift10.toFixed(2)}] mN/m</strong></span>
          </div>

          <div className="cap-stat-grid">
            <div className="stat-card">
              <div className="stat-label">MARS P90 Conservative</div>
              <div className="stat-value mono" style={{ fontSize: '1.55rem', color: 'var(--yellow)' }}>
                {calcs.H90.toFixed(1)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>m</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Driven by &gamma;<sub>P90</sub> = {ift90.toFixed(2)} mN/m
              </div>
              {trap === 'structural' && (
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Static Patch: <strong className="mono">{calcs.M90.toFixed(1)} Mt</strong>
                </div>
              )}
            </div>

            <div className="stat-card" style={{ borderColor: 'rgba(8, 145, 178, 0.45)', background: 'var(--bg-input)' }}>
              <div className="stat-label">MARS P50 Expected</div>
              <div className="stat-value mono" style={{ fontSize: '1.8rem', color: 'var(--accent-text)' }}>
                {calcs.H50.toFixed(1)} <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>m</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Driven by &gamma;<sub>P50</sub> = {ift50.toFixed(2)} mN/m
              </div>
              {trap === 'structural' && (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Static Patch: <strong className="mono" style={{ color: 'var(--text-main)' }}>{calcs.M50.toFixed(1)} Mt</strong>
                </div>
              )}
            </div>

            <div className="stat-card">
              <div className="stat-label">MARS P10 Optimistic</div>
              <div className="stat-value mono" style={{ fontSize: '1.55rem', color: 'var(--green)' }}>
                {calcs.H10.toFixed(1)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>m</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Driven by &gamma;<sub>P10</sub> = {ift10.toFixed(2)} mN/m
              </div>
              {trap === 'structural' && (
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Static Patch: <strong className="mono">{calcs.M10.toFixed(1)} Mt</strong>
                </div>
              )}
            </div>

            {calcs.Hlit !== null && (
              <div className="stat-card" style={{ borderStyle: 'dashed' }}>
                <div className="stat-label">Literature Comparator</div>
                <div className="stat-value mono" style={{ fontSize: '1.55rem', color: 'var(--text-muted)' }}>
                  {calcs.Hlit.toFixed(1)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>m</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Driven by &gamma;<sub>lit</sub> = {gammaLit.toFixed(2)} mN/m
                </div>
                {trap === 'structural' && calcs.Mlit !== null && (
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Lit Patch: <span className="mono">{calcs.Mlit.toFixed(1)} Mt</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--text-main)' }}>Engineering Scope Note:</strong> First-order static capillary sensitivity illustration holding r<sub>c</sub> and &theta; fixed ({CAP_PRESETS[preset]?.plumeRef}). Does not replace dynamic multiphase reservoir simulation or site core certification.
          </div>
        </>
      )}
    </div>
  )
}
